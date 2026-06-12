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
  deliveryFromIso?: string;
  deliveryToIso?: string;
}

interface Suggestion { text: string; full: string; lat: number; lng: number; kind: string }
interface PickupPoint { id: string; name?: string; address: string; workingHours?: string; lat?: number; lng?: number }
interface Offer {
  offerId: string;
  priceRub: number;
  deliveryFromIso?: string;
  deliveryToIso?: string;
  partner?: string;
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
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string>('');

  // ── Шаг 3b: адрес (двери) ──
  const [doorInput, setDoorInput] = useState<string>('');
  const [doorSelected, setDoorSelected] = useState<Suggestion | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);
  const [showDoorSuggest, setShowDoorSuggest] = useState(false);

  // ── Шаг 4: офферы ──
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  // Загружаем ПВЗ при смене города (только в pickup-режиме)
  useEffect(() => {
    if (mode !== 'pickup' || !geoId) {
      setPoints([]); setPointsError(null); return;
    }
    setPointsLoading(true); setPointsError(null);
    setPoints([]); setSelectedPointId(''); setOffers([]);
    fetch(`/api/yandex-russia/pickup-points?geoId=${geoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) setPointsError(d.error || 'Не удалось получить ПВЗ');
        else setPoints(Array.isArray(d.points) ? d.points : []);
      })
      .catch((e) => setPointsError(String(e)))
      .finally(() => setPointsLoading(false));
  }, [mode, geoId]);

  // Подсказки адреса (door): debounce, 2+ символа
  useEffect(() => {
    if (mode !== 'door' || !city || doorInput.trim().length < 2) {
      setSuggestions([]); return;
    }
    if (doorSelected && doorSelected.full === doorInput) {
      // Текст совпадает с выбранным — не дёргаем suggest
      return;
    }
    const t = window.setTimeout(() => {
      setSuggLoading(true);
      const url = new URL('/api/yandex-russia/suggest', window.location.origin);
      url.searchParams.set('text', doorInput.trim());
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
  }, [doorInput, mode, city, doorSelected]);

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
    try {
      const r = await fetch('/api/checkout/russia-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      // Игнорируем устаревший ответ, если пользователь уже перевыбрал
      if (lastQuoteKey.current !== key) return;
      if (!r.ok || !d.ok) setOffersError(d.error || `HTTP ${r.status}`);
      else setOffers(Array.isArray(d.offers) ? d.offers : []);
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
      calculate(`pickup:${selectedPointId}`, {
        items: itemsRef.current, mode: 'pickup',
        destPlatformId: selectedPointId,
        customerName: c.name || undefined,
        customerPhone: c.phone || undefined,
        customerEmail: c.email || undefined,
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [mode, selectedPointId, calculate]);

  useEffect(() => {
    if (mode !== 'door' || !doorSelected) return;
    const t = window.setTimeout(() => {
      const c = customerRef.current;
      calculate(`door:${doorSelected.full}`, {
        items: itemsRef.current, mode: 'door',
        destAddress: doorSelected.full,
        destLocality: city,
        destGeopoint: { lat: doorSelected.lat, lng: doorSelected.lng },
        customerName: c.name || undefined,
        customerPhone: c.phone || undefined,
        customerEmail: c.email || undefined,
      });
    }, 200);
    return () => window.clearTimeout(t);
  }, [mode, doorSelected, city, calculate]);

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
        : { doorAddress: doorSelected?.full, doorGeopoint: doorSelected ? { lat: doorSelected.lat, lng: doorSelected.lng } : undefined }),
      ...(bestOffer
        ? {
            offerId: bestOffer.offerId,
            priceRub: bestOffer.priceRub,
            partner: bestOffer.partner,
            deliveryFromIso: bestOffer.deliveryFromIso,
            deliveryToIso: bestOffer.deliveryToIso,
          }
        : {}),
    });
  }, [mode, city, geoId, selectedPointId, points, doorSelected, bestOffer, onChange]);

  // Центр карты — среднее по координатам ПВЗ
  const fallbackCenter = useMemo(() => {
    const withCoords = points.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number');
    if (withCoords.length === 0) return undefined;
    return {
      lat: withCoords.reduce((s, p) => s + (p.lat ?? 0), 0) / withCoords.length,
      lng: withCoords.reduce((s, p) => s + (p.lng ?? 0), 0) / withCoords.length,
    };
  }, [points]);

  const mapPoints = useMemo(
    () => points
      .filter((p): p is PickupPoint & { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({ id: p.id, address: p.address, workingHours: p.workingHours, lat: p.lat, lng: p.lng })),
    [points]
  );

  const selectedPoint = points.find((p) => p.id === selectedPointId);
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
            setSelectedPointId(''); setDoorSelected(null); setDoorInput('');
          }}
          onFocus={() => setShowCitySuggest(true)}
          onBlur={() => window.setTimeout(() => setShowCitySuggest(false), 150)}
          placeholder="Начните вводить название города (например, «Кал…»)"
          autoComplete="off"
          className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        {showCitySuggest && filteredCities.length > 0 && !city && (
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
          </div>
        )}
        {cityInput.length >= 2 && filteredCities.length === 0 && !city && (
          <p className="mt-1.5 text-xs text-text-muted">
            Не нашли «{cityInput}». Если это посёлок или село — попробуйте ближайший
            крупный город (например, Барвиха → Одинцово, Болшево → Королёв). Или свяжитесь
            с нами через форму обратной связи — добавим ваш город вручную.
          </p>
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
          {!pointsLoading && mapPoints.length > 0 && (
            <>
              <p className="text-xs text-text-muted">Кликните по маркеру на карте, чтобы выбрать ПВЗ:</p>
              <PickupPointsMap
                points={mapPoints}
                selectedId={selectedPointId}
                onSelect={setSelectedPointId}
                fallbackCenter={fallbackCenter}
              />
              {points.length > mapPoints.length && (
                <p className="text-[11px] text-text-muted">
                  ({points.length - mapPoints.length} ПВЗ без координат — на карте не видны)
                </p>
              )}
            </>
          )}

          {/* Подтверждение выбора ПВЗ */}
          {selectedPoint && (
            <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
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

      {/* Курьер-режим: адрес с подсказками от 2 символов */}
      {city && mode === 'door' && (
        <div className="relative">
          <label className="block text-sm font-medium mb-1.5">Адрес получателя в городе «{city}» *</label>
          <input
            type="text"
            value={doorInput}
            onChange={(e) => {
              setDoorInput(e.target.value);
              if (doorSelected && doorSelected.full !== e.target.value) setDoorSelected(null);
              setShowDoorSuggest(true);
            }}
            onFocus={() => setShowDoorSuggest(true)}
            onBlur={() => window.setTimeout(() => setShowDoorSuggest(false), 150)}
            placeholder="Начните вводить улицу (например, «Лен…»)"
            autoComplete="off"
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {showDoorSuggest && suggestions.length > 0 && !doorSelected && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); setDoorSelected(s); setDoorInput(s.full); setSuggestions([]); setShowDoorSuggest(false); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-b-0"
                >
                  {s.full}
                </button>
              ))}
            </div>
          )}
          {suggLoading && !doorSelected && doorInput.length >= 2 && (
            <p className="text-xs text-text-muted mt-1.5">Ищем адреса…</p>
          )}
          {doorSelected && (
            <p className="mt-1.5 text-xs text-success flex items-center gap-1">
              <Check size={12} /> Адрес распознан: {doorSelected.full}
            </p>
          )}
        </div>
      )}

      {/* Итоговая стоимость доставки */}
      {offersLoading && (
        <p className="text-sm text-text-muted">Считаем стоимость доставки…</p>
      )}
      {offersError && <p className="text-sm text-danger break-words">Ошибка расчёта: {offersError}</p>}
      {bestOffer && !offersLoading && (
        <div className="p-3 bg-success/5 border border-success/30 rounded-lg">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm">
                <span className="text-text-muted">Стоимость доставки: </span>
                <span className="font-bold text-lg text-success">{formatPrice(bestOffer.priceRub)}</span>
              </p>
              {bestRange && (
                <p className="text-xs text-text-muted">Срок: {bestRange}</p>
              )}
              {bestOffer.partner && (
                <p className="text-xs text-text-muted">Перевозчик: {bestOffer.partner}</p>
              )}
            </div>
            {uniquePrices > 1 && (
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
