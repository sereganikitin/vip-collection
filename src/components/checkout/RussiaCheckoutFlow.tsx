'use client';

// Чекаут-флоу Я.Доставки по России.
//
// UX-принципы:
//   1. Подсказки появляются после 2+ символов (не вываливают весь список).
//   2. Клик по ПВЗ на карте = выбор + автоматический расчёт стоимости.
//   3. Под картой показывается одна цена (минимальная из офферов),
//      без длинного списка вариантов и без дубликатов одинаковой цены.
//   4. Адрес «до двери» — кастомный автокомплит от Geocoder с дебаунсом.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Truck, Package, MapPin, Check } from 'lucide-react';
import { listCities, findGeoId } from '@/lib/russia-geo';

const PickupPointsMap = dynamic(() => import('./PickupPointsMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-lg border border-border flex items-center justify-center bg-bg text-text-muted text-sm">
      Загружаем карту…
    </div>
  ),
});

export type Mode = 'pickup' | 'door';

export interface RussiaSelection {
  ready: boolean;
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
  /** Какой провайдер выиграл — Я.Доставка или СДЭК. Сохраняется в заказе. */
  provider?: 'yandex' | 'cdek';
  deliveryFromIso?: string;
  deliveryToIso?: string;
  eta?: string;
}

interface Suggestion {
  street: string;     // короткое имя улицы для UI («ул. Ленина»)
  full: string;       // адрес для отправки в Я.Доставку («ул. Ленина, Калуга»)
  house?: string;
  lat: number;
  lng: number;
  kind: string;
}

type Provider = 'yandex' | 'cdek';
interface PickupPoint {
  id: string;
  provider: Provider;
  name?: string;
  address: string;
  workingHours?: string;
  lat?: number;
  lng?: number;
}
interface Offer {
  offerId: string;
  priceRub: number;
  deliveryFromIso?: string;
  deliveryToIso?: string;
  partner?: string;
  /** Провайдер: 'yandex' (Я.Доставка) или 'cdek'. По умолчанию 'yandex'. */
  provider?: 'yandex' | 'cdek';
  /** ETA-строка для отображения, когда нет точных дат (например, у СДЭК — «3-5 дн.»). */
  eta?: string;
}

interface Props {
  items: Array<{ productId: string; quantity: number }>;
  customer: { name: string; phone: string; email?: string };
  onChange: (sel: RussiaSelection) => void;
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

function normalizeCityKey(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').trim();
}

export default function RussiaCheckoutFlow({ items, customer, onChange }: Props) {
  // ── Шаг 1: город ──
  const cities = useMemo(() => listCities(), []);
  const [cityInput, setCityInput] = useState<string>('');
  const [city, setCity] = useState<string>('');     // подтверждённое имя из cities
  const [showCitySuggest, setShowCitySuggest] = useState(false);

  const filteredCities = useMemo(() => {
    const q = cityInput.trim();
    if (q.length < 2) return [];
    const key = normalizeCityKey(q);
    return cities
      .filter((c) => normalizeCityKey(c.name).includes(key))
      .slice(0, 8);
  }, [cityInput, cities]);

  const geoId = city ? findGeoId(city) : null;

  // ── Шаг 2: режим ──
  const [mode, setMode] = useState<Mode>('pickup');

  // ── Шаг 3a: ПВЗ ──
  // points хранит все ПВЗ из обоих источников (Я.Доставка + СДЭК).
  // На карте они показываются разными цветами; при клике запоминаем
  // не только id, но и провайдера, чтобы расчёт ушёл нужному API.
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<Provider>('yandex');
  // Pre-flight результат: какой перевозчик не принимает этот заказ.
  // Эти маркеры скрываются с карты, чтобы не тыкать в них и не получать
  // ошибку «Dimensions exceed limit» и т.п.
  const [carrierRejected, setCarrierRejected] = useState<{ yandex?: string; cdek?: string }>({});

  // ── Шаг 3b: адрес (двери) — три отдельных поля ──
  // 1) Улица — автокомплит из Nominatim (показываем только название улицы);
  // 2) Дом, корпус — свободный текст;
  // 3) Квартира / офис — свободный текст.
  // Полный адрес собирается на отправке как "улица, город, дом N, кв. M".
  const [streetInput, setStreetInput] = useState<string>('');
  const [streetSelected, setStreetSelected] = useState<Suggestion | null>(null);
  const [houseInput, setHouseInput] = useState<string>('');
  const [aptInput, setAptInput] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [showStreetSuggest, setShowStreetSuggest] = useState(false);

  // Полный адрес для отправки в API
  const doorFullAddress = streetSelected
    ? `${streetSelected.full}${houseInput.trim() ? `, ${houseInput.trim()}` : ''}${aptInput.trim() ? `, кв. ${aptInput.trim()}` : ''}`
    : '';

  // ── Шаг 4: офферы ──
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [freeDelivery, setFreeDelivery] = useState<{ active: boolean; reason?: string }>({ active: false });
  // Партиальные ошибки от конкретных перевозчиков. Показываются как
  // мелкая жёлтая подсказка, даже если другой перевозчик дал офферы —
  // чтобы пользователь видел причину, когда вариантов меньше ожидаемого.
  const [partialErrors, setPartialErrors] = useState<{ yandex?: string; cdek?: string }>({});

  // Загружаем ПВЗ из обоих источников параллельно при смене города
  // (только в pickup-режиме). Маркеры на карте красятся по провайдеру.
  useEffect(() => {
    if (mode !== 'pickup' || !city) {
      setPoints([]); setPointsError(null); setCarrierRejected({}); return;
    }
    setPointsLoading(true); setPointsError(null);
    setPoints([]); setSelectedPointId(''); setOffers([]);
    setCarrierRejected({});

    const ydQs = geoId ? `geoId=${geoId}` : `city=${encodeURIComponent(city)}`;
    const cdekQs = `city=${encodeURIComponent(city)}`;

    Promise.allSettled([
      fetch(`/api/yandex-russia/pickup-points?${ydQs}`).then((r) => r.json()),
      fetch(`/api/cdek/pickup-points?${cdekQs}`).then((r) => r.json()),
    ])
      .then(async ([yd, cdek]) => {
        const all: PickupPoint[] = [];
        if (yd.status === 'fulfilled' && yd.value?.ok && Array.isArray(yd.value.points)) {
          for (const p of yd.value.points) all.push({ ...p, provider: 'yandex' });
        }
        if (cdek.status === 'fulfilled' && cdek.value?.ok && Array.isArray(cdek.value.points)) {
          // CDEK отдаёт идентификатор ПВЗ в поле `code`, а фронт ждёт `id`.
          for (const p of cdek.value.points) {
            const id = (p.id ?? p.code) as string | undefined;
            if (!id) continue;
            all.push({ ...p, id, provider: 'cdek' });
          }
        }
        setPoints(all);
        if (all.length === 0) {
          const errs: string[] = [];
          if (yd.status === 'fulfilled' && yd.value?.error) errs.push(`Я.Доставка: ${yd.value.error}`);
          if (cdek.status === 'fulfilled' && cdek.value?.error) errs.push(`СДЭК: ${cdek.value.error}`);
          setPointsError(errs.join(' | ') || 'Ни один поставщик не вернул ПВЗ');
          return;
        }

        // ── Pre-flight: проверяем, что перевозчики вообще принимают этот
        // заказ (вес/габариты/маршрут). Если один отказал — прячем его
        // маркеры, чтобы клиент не тыкал по ним и не получал ошибку.
        const firstYandex = all.find((p) => p.provider === 'yandex');
        const items = itemsRef.current;
        const ydPreflight = firstYandex
          ? fetch('/api/checkout/russia-quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items, mode: 'pickup', destPlatformId: firstYandex.id, city }),
            }).then((r) => r.json()).catch(() => null)
          : Promise.resolve(null);
        const cdekPreflight = all.some((p) => p.provider === 'cdek')
          ? fetch('/api/checkout/cdek-quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items, mode: 'pickup', city }),
            }).then((r) => r.json()).catch(() => null)
          : Promise.resolve(null);

        const [ydCheck, cdekCheck] = await Promise.all([ydPreflight, cdekPreflight]);
        const rejected: { yandex?: string; cdek?: string } = {};
        if (ydCheck && ydCheck.ok === false && ydCheck.error) rejected.yandex = String(ydCheck.error);
        if (cdekCheck && cdekCheck.ok === false && cdekCheck.error) rejected.cdek = String(cdekCheck.error);
        setCarrierRejected(rejected);
      })
      .finally(() => setPointsLoading(false));
  }, [mode, city, geoId]);

  // Подсказки улицы (door): debounce 250 мс, минимум 2 символа.
  // После того как пользователь выбрал улицу из подсказок, suggest больше
  // не дёргаем — он редактирует дом/квартиру в отдельных полях.
  useEffect(() => {
    if (mode !== 'door' || !city || streetInput.trim().length < 2) {
      setSuggestions([]); return;
    }
    if (streetSelected && streetSelected.street === streetInput) {
      return;
    }
    const t = window.setTimeout(() => {
      setSuggLoading(true);
      const url = new URL('/api/yandex-russia/suggest', window.location.origin);
      url.searchParams.set('text', streetInput.trim());
      url.searchParams.set('city', city);
      fetch(url.toString())
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.suggestions)) setSuggestions(d.suggestions);
          else setSuggestions([]);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggLoading(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [streetInput, mode, city, streetSelected]);

  // Если выбранный ПВЗ оказался отфильтрован (carrierRejected) —
  // сбрасываем выбор, чтобы под картой не висела «мёртвая» карточка.
  useEffect(() => {
    if (selectedPointId && carrierRejected[selectedProvider]) {
      setSelectedPointId('');
    }
  }, [carrierRejected, selectedProvider, selectedPointId]);

  // Сохраняем последние props в refs, чтобы авто-расчёт не дёргался
  // на каждом ре-рендере родителя (родитель пересоздаёт items/customer
  // как новые объекты при каждом setState — без refs возникает бесконечный
  // цикл fetch → setState → ре-рендер → fetch).
  const itemsRef = useRef(items);
  const customerRef = useRef(customer);
  useEffect(() => { itemsRef.current = items; });
  useEffect(() => { customerRef.current = customer; });

  // ── Автоматический расчёт при выборе ПВЗ или адреса ──
  // Дебаунсим, чтобы при быстром перещёлкивании по маркерам не спамить API.
  const lastQuoteKey = useRef<string>('');
  const calculate = useCallback(async (key: string, body: Record<string, unknown>) => {
    lastQuoteKey.current = key;
    setOffersLoading(true); setOffersError(null); setOffers([]);
    setFreeDelivery({ active: false });
    try {
      // В pickup-режиме идём только к выбранному перевозчику (его ПВЗ
      // покупатель кликнул). В door-режиме оба, так как там нет привязки
      // к конкретному ПВЗ — пусть пользователь сравнивает.
      const provider = body.provider as Provider | undefined;
      const callYandex = !provider || provider === 'yandex';
      const callCdek = !provider || provider === 'cdek';

      const [yandex, cdek] = await Promise.allSettled([
        callYandex
          ? fetch('/api/checkout/russia-quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }).then((r) => r.json())
          : Promise.resolve(null),
        callCdek
          ? fetch('/api/checkout/cdek-quote', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }).then((r) => r.json())
          : Promise.resolve(null),
      ]);

      if (lastQuoteKey.current !== key) return;

      const merged: Offer[] = [];
      let freeActive = false;
      let freeReason: string | undefined;
      const partial: { yandex?: string; cdek?: string } = {};

      // Я.Доставка — учитываем только если её действительно вызывали
      if (!callYandex) {
        // намеренно пропустили — никаких partial-сообщений
      } else if (yandex.status === 'fulfilled' && yandex.value?.ok && Array.isArray(yandex.value.offers) && yandex.value.offers.length > 0) {
        for (const o of yandex.value.offers) {
          merged.push({ ...o, provider: 'yandex', partner: o.partner ?? 'Я.Доставка' });
        }
        if (yandex.value.freeDelivery) {
          freeActive = true;
          freeReason = yandex.value.freeDeliveryReason;
        }
      } else if (yandex.status === 'fulfilled' && yandex.value?.error) {
        partial.yandex = String(yandex.value.error);
      } else if (yandex.status === 'rejected') {
        partial.yandex = 'сетевая ошибка';
      } else {
        partial.yandex = 'нет вариантов';
      }

      // СДЭК — учитываем только если её действительно вызывали
      if (!callCdek) {
        // намеренно пропустили
      } else if (cdek.status === 'fulfilled' && cdek.value?.ok && Array.isArray(cdek.value.offers) && cdek.value.offers.length > 0) {
        for (const o of cdek.value.offers) {
          merged.push({ ...o, provider: 'cdek', partner: o.partner ?? 'СДЭК' });
        }
        if (cdek.value.freeDelivery) {
          freeActive = true;
          freeReason = freeReason ?? cdek.value.freeDeliveryReason;
        }
      } else if (cdek.status === 'fulfilled' && cdek.value?.error) {
        partial.cdek = String(cdek.value.error);
      } else if (cdek.status === 'rejected') {
        partial.cdek = 'сетевая ошибка';
      } else {
        partial.cdek = 'нет вариантов';
      }

      setOffers(merged);
      setFreeDelivery({ active: freeActive, reason: freeReason });
      setPartialErrors(partial);

      if (merged.length === 0) {
        // Если активен только один перевозчик — показываем его сообщение
        // как есть (без префикса). Если оба упали — каждое с префиксом.
        let msg = '';
        if (partial.yandex && partial.cdek) {
          msg = `Я.Доставка: ${partial.yandex} • СДЭК: ${partial.cdek}`;
        } else if (partial.yandex) {
          msg = partial.yandex;
        } else if (partial.cdek) {
          msg = partial.cdek;
        }
        setOffersError(msg || 'Не удалось получить варианты доставки');
      }
    } catch (e) {
      if (lastQuoteKey.current === key) setOffersError(String(e));
    } finally {
      if (lastQuoteKey.current === key) setOffersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mode !== 'pickup' || !selectedPointId) return;
    const t = window.setTimeout(() => {
      const c = customerRef.current;
      calculate(`pickup:${selectedProvider}:${selectedPointId}`, {
        items: itemsRef.current, mode: 'pickup',
        destPlatformId: selectedPointId,
        provider: selectedProvider,
        city,
        customerName: c.name || undefined,
        customerPhone: c.phone || undefined,
        customerEmail: c.email || undefined,
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [mode, selectedPointId, selectedProvider, city, calculate]);

  useEffect(() => {
    if (mode !== 'door' || !streetSelected) return;
    // Без номера дома расчёт не запускаем — Яндекс отдаст ошибку про
    // неполный адрес, и она будет светиться красным. Покажем нейтральную
    // подсказку «введите номер дома» вместо этого.
    if (!houseInput.trim()) {
      // Чистим стейл-офферы и ошибку, чтобы пользователь не видел
      // старую цену/ошибку, пока редактирует адрес.
      setOffers([]);
      setOffersError(null);
      return;
    }
    // Дебаунс 400 мс, чтобы не дёргать при наборе каждого символа дома.
    const t = window.setTimeout(() => {
      const c = customerRef.current;
      calculate(`door:${doorFullAddress}`, {
        items: itemsRef.current, mode: 'door',
        destAddress: doorFullAddress,
        destLocality: city,
        // Структурированные поля для Я.Доставки (Platform требует
        // country/city/region/house в custom_location.details, иначе 400)
        destStreet: streetSelected.street,
        destHouse: houseInput.trim(),
        destApartment: aptInput.trim() || undefined,
        // city для СДЭК-кода и бизнес-правил (бесплатная Москва)
        city,
        destGeopoint: { lat: streetSelected.lat, lng: streetSelected.lng },
        customerName: c.name || undefined,
        customerPhone: c.phone || undefined,
        customerEmail: c.email || undefined,
      });
    }, 400);
    return () => window.clearTimeout(t);
  }, [mode, streetSelected, houseInput, aptInput, doorFullAddress, city, calculate]);

  // ── Какой оффер показываем как итоговый ──
  // Берём минимальную цену. Округляем priceRub до целого, чтобы итог
  // в корзине не выходил с копейками (Яндекс отдаёт 325.7 — показывать
  // 326 в одной строке и 325,7 в другой нелогично).
  const bestOffer = useMemo<Offer | null>(() => {
    if (offers.length === 0) return null;
    const cheapest = [...offers].sort((a, b) => a.priceRub - b.priceRub)[0];
    return { ...cheapest, priceRub: Math.round(cheapest.priceRub) };
  }, [offers]);
  const uniquePrices = useMemo(() => {
    const s = new Set(offers.map((o) => Math.round(o.priceRub)));
    return s.size;
  }, [offers]);

  // ── onChange родителю ──
  useEffect(() => {
    const selPoint = points.find((p) => p.id === selectedPointId);
    const ready = !!bestOffer;
    onChange({
      ready,
      mode,
      city: city || undefined,
      geoId: geoId ?? undefined,
      ...(mode === 'pickup'
        ? { pointId: selectedPointId || undefined, pointAddress: selPoint?.address }
        : {
            doorAddress: doorFullAddress || undefined,
            doorGeopoint: streetSelected ? { lat: streetSelected.lat, lng: streetSelected.lng } : undefined,
          }),
      ...(bestOffer
        ? {
            offerId: bestOffer.offerId,
            priceRub: bestOffer.priceRub,
            partner: bestOffer.partner,
            provider: bestOffer.provider ?? 'yandex',
            deliveryFromIso: bestOffer.deliveryFromIso,
            deliveryToIso: bestOffer.deliveryToIso,
            eta: bestOffer.eta,
          }
        : {}),
    });
  }, [mode, city, geoId, selectedPointId, points, streetSelected, doorFullAddress, bestOffer, onChange]);

  // Центр карты — среднее по координатам ПВЗ
  const fallbackCenter = useMemo(() => {
    const withCoords = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (withCoords.length === 0) return undefined;
    return {
      lat: withCoords.reduce((s, p) => s + (p.lat ?? 0), 0) / withCoords.length,
      lng: withCoords.reduce((s, p) => s + (p.lng ?? 0), 0) / withCoords.length,
    };
  }, [points]);

  // Видимые маркеры: фильтруем тех перевозчиков, кто отказался на pre-flight,
  // и тех, у кого нет координат.
  const visiblePoints = useMemo(
    () => points.filter((p) => !carrierRejected[p.provider]),
    [points, carrierRejected]
  );

  const mapPoints = useMemo(
    () => visiblePoints
      .filter((p): p is PickupPoint & { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({
        id: p.id,
        provider: p.provider,
        address: p.address,
        workingHours: p.workingHours,
        lat: p.lat,
        lng: p.lng,
      })),
    [visiblePoints]
  );

  const selectedPoint = visiblePoints.find((p) => p.id === selectedPointId && p.provider === selectedProvider);
  const yandexCount = visiblePoints.filter((p) => p.provider === 'yandex').length;
  const cdekCount = visiblePoints.filter((p) => p.provider === 'cdek').length;
  const bestRange = bestOffer ? formatDateRange(bestOffer.deliveryFromIso, bestOffer.deliveryToIso) : null;

  return (
    <div className="space-y-4">
      {/* Город — кастомный автокомплит, подсказки только при 2+ символах */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1.5">Город получателя *</label>
        <input
          type="text"
          value={cityInput}
          onChange={(e) => {
            setCityInput(e.target.value);
            setCity('');
            setShowCitySuggest(true);
            // При смене текста сбрасываем выбор ПВЗ/адреса
            setSelectedPointId('');
            setStreetSelected(null);
            setStreetInput('');
            setHouseInput('');
            setAptInput('');
          }}
          onFocus={() => setShowCitySuggest(true)}
          onBlur={() => window.setTimeout(() => setShowCitySuggest(false), 150)}
          placeholder="Начните вводить название города (например, «Кал…»)"
          autoComplete="off"
          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {showCitySuggest && cityInput.length >= 2 && !city && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {filteredCities.map((c) => (
              <button
                key={c.geoId}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setCity(c.name); setCityInput(c.name); setShowCitySuggest(false); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-b-0"
              >
                {c.name}
              </button>
            ))}
            {/* Если ни один город из таблицы не совпал — даём опцию использовать
                то, что пользователь ввёл (Барвиха, Малые Колодки и т.п.).
                Бэкенд найдёт ПВЗ через Yandex Геокодер. */}
            {filteredCities.length === 0 && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  const value = cityInput.trim();
                  setCity(value); setCityInput(value); setShowCitySuggest(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-bg"
              >
                Использовать «{cityInput.trim()}» — найдём ПВЗ автоматически
              </button>
            )}
          </div>
        )}
        {city && (
          <p className="mt-1.5 text-xs text-success flex items-center gap-1">
            <Check size={12} /> Город выбран: {city}
          </p>
        )}
      </div>

      {/* Режим */}
      {city && (
        <div>
          <p className="text-sm font-medium mb-1.5">Способ получения *</p>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setMode('pickup')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ${
                mode === 'pickup'
                  ? 'bg-accent text-primary border-accent font-medium'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              <Package size={14} /> ПВЗ-получатель
            </button>
            <button
              type="button"
              onClick={() => setMode('door')}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg border transition-colors ${
                mode === 'door'
                  ? 'bg-accent text-primary border-accent font-medium'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              <Truck size={14} /> Курьер до двери
            </button>
          </div>
        </div>
      )}

      {/* ПВЗ-режим: только карта (без длинного списка) */}
      {city && mode === 'pickup' && (
        <div className="space-y-3">
          {pointsLoading && <p className="text-sm text-text-muted">Загружаем ПВЗ в городе {city}…</p>}
          {pointsError && <p className="text-sm text-danger break-words">Ошибка: {pointsError}</p>}
          {!pointsLoading && !pointsError && points.length === 0 && (
            <p className="text-sm text-text-muted">В этом городе ПВЗ не найдены. Попробуйте курьер до двери.</p>
          )}

          {/* Баннер про скрытые маркеры: показываем причину, по которой
              перевозчик не принимает этот заказ — клиент сразу понимает,
              почему на карте мало точек или одного цвета не видно. */}
          {!pointsLoading && (carrierRejected.yandex || carrierRejected.cdek) && (
            <div className="text-xs space-y-1 p-3 bg-bg border border-border rounded-lg">
              {carrierRejected.yandex && (
                <p>
                  <span className="font-semibold" style={{ color: '#1E88E5' }}>Я.Доставка</span> скрыта:{' '}
                  <span className="text-text-muted">{carrierRejected.yandex}</span>
                </p>
              )}
              {carrierRejected.cdek && (
                <p>
                  <span className="font-semibold" style={{ color: '#22C55E' }}>СДЭК</span> скрыт:{' '}
                  <span className="text-text-muted">{carrierRejected.cdek}</span>
                </p>
              )}
            </div>
          )}

          {!pointsLoading && mapPoints.length > 0 && (
            <>
              <p className="text-xs text-text-muted">
                Кликните по маркеру на карте, чтобы выбрать ПВЗ.{' '}
                {yandexCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#1E88E5' }} />
                    Я.Доставка ({yandexCount})
                  </span>
                )}
                {yandexCount > 0 && cdekCount > 0 && ' · '}
                {cdekCount > 0 && (
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
                    СДЭК ({cdekCount})
                  </span>
                )}
              </p>
              <PickupPointsMap
                points={mapPoints}
                selectedId={selectedPointId}
                selectedProvider={selectedProvider}
                onSelect={(p) => { setSelectedPointId(p.id); setSelectedProvider(p.provider); }}
                fallbackCenter={fallbackCenter}
              />
              {visiblePoints.length > mapPoints.length && (
                <p className="text-[11px] text-text-muted">
                  ({visiblePoints.length - mapPoints.length} ПВЗ без координат — на карте не видны)
                </p>
              )}
            </>
          )}

          {/* Случай: все маркеры скрыты pre-flight'ом. Видны причины из баннера выше. */}
          {!pointsLoading && points.length > 0 && mapPoints.length === 0 && (carrierRejected.yandex || carrierRejected.cdek) && (
            <p className="text-sm text-text-muted">
              Ни один перевозчик не принимает этот заказ через ПВЗ. Попробуйте курьер до двери.
            </p>
          )}

          {/* Подтверждение выбора ПВЗ */}
          {selectedPoint && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
              <p className="text-[11px] uppercase font-semibold mb-1"
                 style={{ color: selectedPoint.provider === 'cdek' ? '#22C55E' : '#1E88E5' }}>
                {selectedPoint.provider === 'cdek' ? 'СДЭК' : 'Я.Доставка'}
              </p>
              <p className="text-sm font-medium flex items-start gap-1.5">
                <MapPin size={14} className="text-accent flex-shrink-0 mt-0.5" />
                <span>{selectedPoint.address}</span>
              </p>
              {selectedPoint.workingHours && (
                <p className="text-xs text-text-muted mt-1">Часы работы: {selectedPoint.workingHours}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Курьер-режим: 3 отдельных поля — улица, дом, квартира */}
      {city && mode === 'door' && (
        <div className="space-y-3">
          {/* Улица — автокомплит, только название улицы */}
          <div className="relative">
            <label className="block text-sm font-medium mb-1.5">Улица в городе «{city}» *</label>
            <input
              type="text"
              value={streetInput}
              onChange={(e) => {
                setStreetInput(e.target.value);
                if (streetSelected && streetSelected.street !== e.target.value) {
                  setStreetSelected(null);
                }
                setShowStreetSuggest(true);
              }}
              onFocus={() => setShowStreetSuggest(true)}
              onBlur={() => window.setTimeout(() => setShowStreetSuggest(false), 150)}
              placeholder="Например, «Ленина» или «Тверская»"
              autoComplete="off"
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            {showStreetSuggest && suggestions.length > 0 && !streetSelected && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.lat}-${s.lng}-${i}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setStreetSelected(s);
                      setStreetInput(s.street);
                      setSuggestions([]);
                      setShowStreetSuggest(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-b-0"
                  >
                    {s.street}
                  </button>
                ))}
              </div>
            )}
            {suggLoading && !streetSelected && streetInput.length >= 2 && (
              <p className="text-xs text-text-muted mt-1.5">Ищем улицы…</p>
            )}
            {streetSelected && (
              <p className="mt-1.5 text-xs text-success flex items-center gap-1">
                <Check size={12} /> Улица распознана: {streetSelected.street}
              </p>
            )}
          </div>

          {/* Дом, корпус — текст */}
          {streetSelected && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1.5">Дом, корпус, строение *</label>
                <input
                  type="text"
                  value={houseInput}
                  onChange={(e) => setHouseInput(e.target.value)}
                  placeholder="например, 10 или 12к2 стр. 3"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5">Квартира / офис</label>
                <input
                  type="text"
                  value={aptInput}
                  onChange={(e) => setAptInput(e.target.value)}
                  placeholder="необязательно"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>
          )}

          {/* Итог собранного адреса — чтобы было видно, что улетит в Я.Доставку */}
          {streetSelected && houseInput.trim() && (
            <p className="text-xs text-text-muted">
              Полный адрес: <span className="text-text">{doorFullAddress}</span>
            </p>
          )}
        </div>
      )}

      {/* Подсказка для двери без номера дома — нейтральная, не алармит */}
      {mode === 'door' && streetSelected && !houseInput.trim() && !offersLoading && (
        <p className="text-sm text-text-muted">
          Введите номер дома, чтобы посчитать стоимость доставки.
        </p>
      )}

      {/* Итоговая стоимость доставки */}
      {offersLoading && (
        <p className="text-sm text-text-muted">Считаем стоимость доставки…</p>
      )}
      {offersError && (
        <div className="text-sm text-danger break-words space-y-1">
          <p>Ошибка расчёта: {offersError}</p>
          {/* Если в ПВЗ-режиме выбранный перевозчик отказал, а на карте
              есть точки другого — предлагаем перекликнуть на них. */}
          {mode === 'pickup' && offers.length === 0 && (
            (selectedProvider === 'yandex' && cdekCount > 0) ||
            (selectedProvider === 'cdek' && yandexCount > 0)
          ) && (
            <p className="text-xs text-text-muted">
              💡 Попробуйте кликнуть по {selectedProvider === 'yandex' ? 'зелёному (СДЭК)' : 'синему (Я.Доставка)'} маркеру —
              у другого перевозчика могут быть другие лимиты или тарифы.
            </p>
          )}
        </div>
      )}

      {/* Партиальные ошибки: один перевозчик упал, второй сработал */}
      {!offersLoading && offers.length > 0 && (partialErrors.yandex || partialErrors.cdek) && (
        <div className="text-[11px] text-text-muted space-y-0.5">
          {partialErrors.yandex && !offers.some((o) => o.provider === 'yandex') && (
            <p>⚠ Я.Доставка не отдала варианты: {partialErrors.yandex}</p>
          )}
          {partialErrors.cdek && !offers.some((o) => o.provider === 'cdek') && (
            <p>⚠ СДЭК не отдал варианты: {partialErrors.cdek}</p>
          )}
        </div>
      )}
      {bestOffer && !offersLoading && (
        <div className="p-3 bg-success/5 border border-success/30 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm">
                <span className="text-text-muted">Стоимость доставки: </span>
                {freeDelivery.active ? (
                  <span className="font-bold text-lg text-success">Бесплатно</span>
                ) : (
                  <span className="font-bold text-lg text-success">{formatPrice(bestOffer.priceRub)}</span>
                )}
              </p>
              {freeDelivery.active && freeDelivery.reason && (
                <p className="text-xs text-success/80">{freeDelivery.reason}</p>
              )}
              {(bestRange || bestOffer.eta) && (
                <p className="text-xs text-text-muted">
                  Срок: {bestRange ?? bestOffer.eta}
                </p>
              )}
              {bestOffer.partner && !freeDelivery.active && (
                <p className="text-xs text-text-muted">Перевозчик: {bestOffer.partner}</p>
              )}
            </div>
            {uniquePrices > 1 && !freeDelivery.active && (
              <p className="text-[11px] text-text-muted text-right max-w-[40%]">
                Показана минимальная из {uniquePrices} вариантов.<br />
                Уточним на этапе подтверждения заказа.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
