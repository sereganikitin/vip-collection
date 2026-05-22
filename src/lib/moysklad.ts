/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from '@/lib/prisma';

const MS_BASE = 'https://api.moysklad.ru/api/remap/1.2';

interface MsConfig {
  token: string;
  organizationId: string;
  storeId: string;
}

interface MsMeta {
  meta: { href: string; type: string; mediaType: string };
}

async function getConfig(): Promise<MsConfig | null> {
  try {
    const rows = await prisma.setting.findMany({
      where: { key: { in: ['ms_token', 'ms_organization_id', 'ms_store_id'] } },
    });
    const m = new Map(rows.map((r) => [r.key, r.value]));
    const token = (m.get('ms_token') ?? '').trim();
    const organizationId = (m.get('ms_organization_id') ?? '').trim();
    const storeId = (m.get('ms_store_id') ?? '').trim();
    if (!token || !organizationId || !storeId) return null;
    return { token, organizationId, storeId };
  } catch {
    return null;
  }
}

function meta(entity: string, id: string): MsMeta {
  return {
    meta: {
      href: `${MS_BASE}/entity/${entity}/${id}`,
      type: entity,
      mediaType: 'application/json',
    },
  };
}

async function msFetch(cfg: MsConfig, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${MS_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json;charset=utf-8',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });
}

// Find a product by externalCode = our product.slug, or create it.
async function ensureProduct(cfg: MsConfig, slug: string, name: string): Promise<MsMeta | null> {
  try {
    const findRes = await msFetch(
      cfg,
      `/entity/product?filter=externalCode=${encodeURIComponent(slug)}&limit=1`,
    );
    if (findRes.ok) {
      const data: any = await findRes.json();
      if (data.rows && data.rows.length > 0) {
        return { meta: data.rows[0].meta };
      }
    } else {
      console.warn('MS find product:', findRes.status);
    }
  } catch (e) {
    console.warn('MS find product error:', e);
  }
  try {
    const createRes = await msFetch(cfg, `/entity/product`, {
      method: 'POST',
      body: JSON.stringify({
        name: name.slice(0, 255),
        externalCode: slug,
        description: `Создано автоматически с сайта vipcoll.ru`,
      }),
    });
    if (!createRes.ok) {
      console.warn('MS create product failed:', createRes.status, (await createRes.text()).slice(0, 200));
      return null;
    }
    const data: any = await createRes.json();
    return { meta: data.meta };
  } catch (e) {
    console.error('MS create product error:', e);
    return null;
  }
}

async function createCounterparty(
  cfg: MsConfig,
  name: string,
  phone: string,
  email?: string,
): Promise<MsMeta | null> {
  try {
    const res = await msFetch(cfg, `/entity/counterparty`, {
      method: 'POST',
      body: JSON.stringify({
        name: (name || 'Розничный покупатель').slice(0, 255),
        phone: phone || undefined,
        email: email || undefined,
        companyType: 'individual',
      }),
    });
    if (!res.ok) {
      console.warn('MS create counterparty failed:', res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const data: any = await res.json();
    return { meta: data.meta };
  } catch (e) {
    console.error('MS counterparty error:', e);
    return null;
  }
}

export interface MsOrderItem {
  productSlug: string;
  productName: string;
  quantity: number;
  price: number; // в рублях
}

export interface MsOrderPayload {
  orderNumber?: number | string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryMethod?: string;
  deliveryAddress?: string;
  comment?: string;
  totalPrice: number;
  items: MsOrderItem[];
}

/**
 * Push a customer order to МойСклад. Best-effort, returns the MS order id on
 * success or null otherwise. Safe to call without configuration — exits early.
 */
export async function pushOrderToMoysklad(order: MsOrderPayload): Promise<string | null> {
  const cfg = await getConfig();
  if (!cfg) {
    console.log('Moysklad: not configured (ms_token/organization/store missing) — skipping');
    return null;
  }

  const counterparty = await createCounterparty(
    cfg,
    order.customerName,
    order.customerPhone,
    order.customerEmail,
  );
  if (!counterparty) return null;

  const positions: any[] = [];
  for (const item of order.items) {
    const product = await ensureProduct(cfg, item.productSlug, item.productName);
    if (!product) continue;
    positions.push({
      quantity: item.quantity,
      price: Math.round(item.price * 100), // МойСклад принимает цену в копейках
      assortment: product,
    });
  }

  if (positions.length === 0) {
    console.warn('Moysklad: no positions resolved, skipping order push');
    return null;
  }

  const descriptionLines = [
    order.orderNumber ? `Заказ с сайта №${order.orderNumber}` : 'Заказ с сайта vipcoll.ru',
    order.deliveryMethod ? `Способ доставки: ${order.deliveryMethod}` : '',
    order.deliveryAddress ? `Адрес: ${order.deliveryAddress}` : '',
    order.comment ? `Комментарий клиента: ${order.comment}` : '',
  ].filter(Boolean);

  try {
    const res = await msFetch(cfg, `/entity/customerorder`, {
      method: 'POST',
      body: JSON.stringify({
        organization: meta('organization', cfg.organizationId),
        store: meta('store', cfg.storeId),
        agent: counterparty,
        positions,
        description: descriptionLines.join('\n').slice(0, 4096),
      }),
    });
    if (!res.ok) {
      console.warn('MS create customer order failed:', res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const data: any = await res.json();
    return data.id ?? null;
  } catch (e) {
    console.error('MS customer order error:', e);
    return null;
  }
}
