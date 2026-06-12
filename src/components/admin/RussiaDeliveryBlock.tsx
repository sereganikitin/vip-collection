'use client';

import { useEffect, useState, useCallback } from 'react';
import { Check, Truck, Package } from 'lucide-react';
import { findGeoId } from '@/lib/russia-geo';

interface City   { name: string; geoId: number }
interface Point  { id: string; name?: string; address: string; workingHours?: string }
interface Offer {
  offerId: string;
  priceRub: number;
  deliveryFromIso?: string;
  deliveryToIso?: string;
  partner?: string;
}

/**
 * Достаём название города из адреса заказа.
 * Поддерживаемые шаблоны:
 *   "г. Калуга, ул. Пухова, 27/25"   → "Калуга"
 *   "Калуга, ул. Пухова, 27/25"      → "Калуга"
 *   "Россия, Калуга, ул. ..."        → "Калуга"
 *   "г Москва, ул. ..."              → "Москва"
 */
function extractCityFromAddress(addr: string): string {
  if (!addr) return '';
  const trimmed = addr.trim().replace(/^россия\s*,?\s*/i, '');
  const mGorod = trimmed.match(/^г\.?\s+([^,]+?)(?:[,]|\s+ул|\s+пр|$)/i);
  if (mGorod) return mGorod[1].trim();
  const mFirst = trimmed.match(/^([^,]+?)(?:[,]|$)/);
  if (mFirst) return mFirst[1].trim();
  return '';
}

type Mode = 'pickup' | 'door';

/**
 * meta из БД (Order.yandexRussiaMeta — JSON). Появляется у заказов,
 * которые клиент оформил уже через новый чекаут-флоу.
 */
export interface SavedRussiaMeta {
  mode?: Mode;
  city?: string;
  geoId?: number;
  pointId?: string;
  pointAddress?: string;
  doorAddress?: string;
  doorGeopoint?: { lat: number; lng: number };
  offerId?: string;
  priceRub?: number;
  partner?: string;
  deliveryFrom?: string;
  deliveryTo?: string;
}

interface Props {
  orderId: string;
  initialAddress: string;
  /** Если у заказа есть сохранённый выбор из чекаута — пред-заполнить форму. */
  savedMeta?: SavedRussiaMeta | null;
  onConfirmed: () => void;
}

function formatPrice(p: number): string {
  return new Intl.NumberFormat('ru-RU').format(Math.round(p)) + ' ₽';
}

function formatDateRange(from?: string, to?: string): string | null {
  if (!from || !to) return null;
  const a = from.slice(0, 10);
  const b = to.slice(0, 10);
  return a === b ? a : `${a} – ${b}`;
}

export default function RussiaDeliveryBlock({ orderId, initialAddress, savedMeta, onConfirmed }: Props) {
  // Базовый стейт
  const [mode, setMode] = useState<Mode>(savedMeta?.mode ?? 'pickup');
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<string>(savedMeta?.city ?? '');
  const [customGeoId, setCustomGeoId] = useState<string>(
    savedMeta?.geoId && !savedMeta?.city ? String(savedMeta.geoId) : ''
  );

  // ПВЗ
  const [points, setPoints] = useState<Point[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string>(savedMeta?.pointId ?? '');

  // Адрес (для режима door)
  const [doorAddress, setDoorAddress] = useState<string>(savedMeta?.doorAddress ?? initialAddress ?? '');

  // Офферы
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  // Подтверждение
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Подгружаем список городов один раз
  useEffect(() => {
    fetch('/api/yandex-russia/cities')
      .then((r) => r.json())
      .then((d) => setCities(Array.isArray(d.cities) ? d.cities : []))
      .catch(() => {});
  }, []);

  // Когда города загружены — пытаемся автоматически выставить город заказа.
  // Если совпадает с таблицей — выставляем в select.
  // Если нет — пытаемся через findGeoId; если и там нет — оставляем пустым,
  // оператор введёт geo_id вручную.
  useEffect(() => {
    if (!cities.length || city || customGeoId) return;
    const parsed = extractCityFromAddress(initialAddress);
    if (!parsed) return;
    const geoId = findGeoId(parsed);
    if (geoId) {
      const found = cities.find((c) => c.geoId === geoId);
      if (found) {
        setCity(found.name);
        return;
      }
      setCustomGeoId(String(geoId));
    }
  }, [cities, initialAddress, city, customGeoId]);

  // При смене города/geoId или режима — сбрасываем офферы и ПВЗ.
  // ПВЗ грузим только в режиме pickup.
  const loadPoints = useCallback(async () => {
    if (mode !== 'pickup') return;
    if (!city && !customGeoId) {
      setPoints([]); setPointsError(null); return;
    }
    setPointsLoading(true);
    setPointsError(null);
    setPoints([]);
    setSelectedPointId('');
    try {
      const sp = customGeoId
        ? `geoId=${encodeURIComponent(customGeoId)}`
        : `city=${encodeURIComponent(city)}`;
      const r = await fetch(`/api/yandex-russia/pickup-points?${sp}`);
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setPointsError(d.error || `HTTP ${r.status}`);
      } else {
        setPoints(Array.isArray(d.points) ? d.points : []);
      }
    } catch (e) {
      setPointsError(String(e));
    } finally {
      setPointsLoading(false);
    }
  }, [mode, city, customGeoId]);

  useEffect(() => {
    setOffers([]); setOffersError(null);
    loadPoints();
  }, [loadPoints]);

  async function calculate() {
    setOffersLoading(true);
    setOffersError(null);
    setOffers([]);
    try {
      const body: Record<string, unknown> = { mode };
      if (mode === 'pickup') {
        if (!selectedPointId) {
          setOffersError('Выберите ПВЗ-получатель');
          setOffersLoading(false);
          return;
        }
        body.destPlatformId = selectedPointId;
      } else {
        if (!doorAddress.trim()) {
          setOffersError('Укажите адрес получателя');
          setOffersLoading(false);
          return;
        }
        body.destAddress = doorAddress.trim();
        if (city) body.destLocality = city;
      }
      const r = await fetch(`/api/orders/${orderId}/russia-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setOffersError(d.error || `HTTP ${r.status}`);
      } else {
        setOffers(Array.isArray(d.offers) ? d.offers : []);
      }
    } catch (e) {
      setOffersError(String(e));
    } finally {
      setOffersLoading(false);
    }
  }

  async function confirmOffer(offer: Offer) {
    if (!confirm(`Создать заявку на доставку за ${formatPrice(offer.priceRub)}?`)) return;
    setConfirmingId(offer.offerId);
    setConfirmError(null);
    try {
      const r = await fetch(`/api/orders/${orderId}/russia-offer/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offerId: offer.offerId,
          mode,
          priceRub: offer.priceRub,
          eta: formatDateRange(offer.deliveryFromIso, offer.deliveryToIso) ?? undefined,
        }),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setConfirmError(d.error || `HTTP ${r.status}`);
      } else {
        onConfirmed();
      }
    } catch (e) {
      setConfirmError(String(e));
    } finally {
      setConfirmingId(null);
    }
  }

  const canCalculate =
    (mode === 'pickup' && selectedPointId) ||
    (mode === 'door' && doorAddress.trim().length > 0);

  return (
    <div className="space-y-3">
      {/* Режим */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMode('pickup'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            mode === 'pickup'
              ? 'bg-accent text-primary border-accent font-medium'
              : 'bg-surface border-border text-text-muted hover:border-accent'
          }`}
        >
          <Package size={12} /> ПВЗ-получатель
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setMode('door'); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
            mode === 'door'
              ? 'bg-accent text-primary border-accent font-medium'
              : 'bg-surface border-border text-text-muted hover:border-accent'
          }`}
        >
          <Truck size={12} /> Курьер до двери
        </button>
      </div>

      {/* Город (для обоих режимов используется для ПВЗ-списка и/или locality) */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[11px] text-text-muted mb-1">Город получателя</label>
          <select
            value={city}
            onChange={(e) => { e.stopPropagation(); setCity(e.target.value); setCustomGeoId(''); }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
          >
            <option value="">— выберите —</option>
            {cities.map((c) => (
              <option key={c.geoId} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-text-muted mb-1">
            или geo_id вручную <span className="text-text-muted/60">(если города нет в списке)</span>
          </label>
          <input
            type="text"
            value={customGeoId}
            onChange={(e) => { e.stopPropagation(); setCustomGeoId(e.target.value.replace(/\D/g, '')); setCity(''); }}
            onClick={(e) => e.stopPropagation()}
            placeholder="например, 213"
            className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      {/* Для ПВЗ-режима: список ПВЗ */}
      {mode === 'pickup' && (
        <div>
          <label className="block text-[11px] text-text-muted mb-1">ПВЗ получателя</label>
          {pointsLoading ? (
            <p className="text-xs text-text-muted">Загружаем список ПВЗ…</p>
          ) : pointsError ? (
            <p className="text-xs text-danger break-words">Ошибка: {pointsError}</p>
          ) : points.length === 0 ? (
            <p className="text-xs text-text-muted">
              {city || customGeoId ? 'В этом городе ПВЗ не найдены.' : 'Выберите город или укажите geo_id.'}
            </p>
          ) : (
            <select
              value={selectedPointId}
              onChange={(e) => { e.stopPropagation(); setSelectedPointId(e.target.value); }}
              onClick={(e) => e.stopPropagation()}
              className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
            >
              <option value="">— выберите ПВЗ из {points.length} —</option>
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.address || p.name || p.id}{p.workingHours ? ` · ${p.workingHours}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Для двери-режима: адрес */}
      {mode === 'door' && (
        <div>
          <label className="block text-[11px] text-text-muted mb-1">Полный адрес получателя</label>
          <input
            type="text"
            value={doorAddress}
            onChange={(e) => { e.stopPropagation(); setDoorAddress(e.target.value); }}
            onClick={(e) => e.stopPropagation()}
            placeholder="г. Калуга, ул. Ленина, д. 10, кв. 5"
            className="w-full px-2 py-1.5 text-sm bg-surface border border-border rounded-lg focus:outline-none focus:border-accent"
          />
          <p className="text-[11px] text-text-muted/70 mt-1">
            Режим «до двери» (last_mile_policy=time_interval) — гипотеза по документации Platform.
            Если Яндекс ругнётся на схему, скажите ошибку — поправим.
          </p>
        </div>
      )}

      {/* Кнопка расчёта */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); calculate(); }}
        disabled={!canCalculate || offersLoading}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-bg border border-border rounded-lg hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
      >
        {offersLoading ? 'Считаем…' : 'Посчитать стоимость'}
      </button>

      {/* Ошибка расчёта */}
      {offersError && <p className="text-xs text-danger break-words">Ошибка: {offersError}</p>}

      {/* Офферы */}
      {offers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-text-muted">Варианты от Яндекса ({offers.length}):</p>
          <div className="space-y-1.5">
            {offers.map((o) => {
              const range = formatDateRange(o.deliveryFromIso, o.deliveryToIso);
              return (
                <div key={o.offerId} className="flex items-center justify-between gap-2 p-2 bg-surface border border-border rounded-lg">
                  <div className="flex items-center gap-3 min-w-0 flex-wrap">
                    <span className="font-semibold text-sm">{formatPrice(o.priceRub)}</span>
                    {o.partner && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {o.partner}
                      </span>
                    )}
                    {range && <span className="text-xs text-text-muted">{range}</span>}
                    <span className="text-[10px] font-mono text-text-muted/70 truncate">{o.offerId.slice(0, 8)}…</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); confirmOffer(o); }}
                    disabled={confirmingId === o.offerId}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-primary font-medium rounded-lg hover:bg-accent-hover disabled:opacity-50 whitespace-nowrap"
                  >
                    <Check size={12} />
                    {confirmingId === o.offerId ? 'Создаём…' : 'Создать заявку'}
                  </button>
                </div>
              );
            })}
          </div>
          {!offers.some((o) => o.partner || o.deliveryFromIso) && offers.length > 1 && (
            <p className="text-[11px] text-text-muted">
              Яндекс прислал {offers.length} офферов одной цены — обычно это разные перевозчики/сроки,
              но в ответе отсутствуют поля partner/date. Можете выбирать любой —
              или скажите, и я добавлю подробный вывод raw-ответа для отладки.
            </p>
          )}
          {confirmError && <p className="text-xs text-danger break-words">Ошибка подтверждения: {confirmError}</p>}
        </div>
      )}
    </div>
  );
}
