'use client';

// Чекаут-флоу для Я.Доставки по России.
//
// UX:
//   1. Город — автокомплит из RUSSIA_GEO_IDS, или ручной ввод (для городов
//      вне таблицы оставляем кнопку «не нашёл — задам geo_id вручную»).
//   2. Режим — ПВЗ-получатель или Курьер до двери.
//   3. Для ПВЗ — карта Leaflet + список под ней.
//   4. Для двери — подсказки по адресу через Geocoder.
//   5. Кнопка «Посчитать стоимость» → офферы → клиент выбирает один.
//
// onChange отдаёт родителю всё состояние выбора, чтобы тот:
//   - добавил priceRub к totalPrice,
//   - заблокировал submit пока !ready,
//   - отправил yandexRussiaMeta в /api/orders.

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Check, Truck, Package, MapPin } from 'lucide-react';
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
  ready: boolean;          // готов ли к отправке заказа
  mode?: Mode;
  city?: string;
  geoId?: number;
  // pickup
  pointId?: string;
  pointAddress?: string;
  // door
  doorAddress?: string;
  doorGeopoint?: { lat: number; lng: number };
  // offer
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

export default function RussiaCheckoutFlow({ items, customer, onChange }: Props) {
  // ── шаг 1: город ──
  const cities = useMemo(() => listCities(), []);
  const [city, setCity] = useState<string>('');
  const [customGeoId, setCustomGeoId] = useState<string>('');
  const effectiveGeoId: number | null =
    customGeoId && /^\d+$/.test(customGeoId)
      ? parseInt(customGeoId, 10)
      : (city ? findGeoId(city) : null);

  // ── шаг 2: режим ──
  const [mode, setMode] = useState<Mode>('pickup');

  // ── шаг 3: ПВЗ или адрес ──
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [pointsError, setPointsError] = useState<string | null>(null);
  const [selectedPointId, setSelectedPointId] = useState<string>('');

  const [doorAddressInput, setDoorAddressInput] = useState<string>('');
  const [doorSelected, setDoorSelected] = useState<Suggestion | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggLoading, setSuggLoading] = useState(false);

  // ── шаг 4: офферы ──
  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersError, setOffersError] = useState<string | null>(null);
  const [chosenOfferId, setChosenOfferId] = useState<string>('');

  // Загружаем ПВЗ при смене города (только в pickup-режиме)
  useEffect(() => {
    if (mode !== 'pickup' || !effectiveGeoId) {
      setPoints([]); setPointsError(null); return;
    }
    setPointsLoading(true);
    setPointsError(null);
    setPoints([]);
    setSelectedPointId('');
    setOffers([]); setChosenOfferId('');
    fetch(`/api/yandex-russia/pickup-points?geoId=${effectiveGeoId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) {
          setPointsError(d.error || 'Не удалось получить ПВЗ');
        } else {
          // Фильтруем точки без координат — на карту их не вывести.
          const withCoords = (d.points as PickupPoint[] | undefined)?.filter(
            (p) => typeof p.lat === 'number' && typeof p.lng === 'number'
          ) ?? [];
          setPoints(withCoords);
        }
      })
      .catch((e) => setPointsError(String(e)))
      .finally(() => setPointsLoading(false));
  }, [mode, effectiveGeoId]);

  // Загрузка адресных подсказок с дебаунсом (только в door-режиме)
  useEffect(() => {
    if (mode !== 'door' || !city || doorAddressInput.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = window.setTimeout(() => {
      setSuggLoading(true);
      const url = new URL('/api/yandex-russia/suggest', window.location.origin);
      url.searchParams.set('text', doorAddressInput.trim());
      url.searchParams.set('city', city);
      url.searchParams.set('kind', 'house');
      fetch(url.toString())
        .then((r) => r.json())
        .then((d) => {
          if (d.ok && Array.isArray(d.suggestions)) {
            setSuggestions(d.suggestions);
          } else {
            setSuggestions([]);
          }
        })
        .catch(() => setSuggestions([]))
        .finally(() => setSuggLoading(false));
    }, 250);
    return () => window.clearTimeout(t);
  }, [doorAddressInput, mode, city]);

  // Сброс выбранного оффера при смене режима/города/ПВЗ/адреса
  useEffect(() => {
    setOffers([]);
    setChosenOfferId('');
  }, [mode, effectiveGeoId, selectedPointId, doorSelected]);

  const canCalculate =
    (mode === 'pickup' && !!selectedPointId) ||
    (mode === 'door' && !!doorSelected);

  const calculate = useCallback(async () => {
    setOffersLoading(true);
    setOffersError(null);
    setOffers([]);
    try {
      const body: Record<string, unknown> = {
        items,
        mode,
        customerName: customer.name || undefined,
        customerPhone: customer.phone || undefined,
        customerEmail: customer.email || undefined,
      };
      if (mode === 'pickup') {
        body.destPlatformId = selectedPointId;
      } else if (doorSelected) {
        body.destAddress = doorSelected.full;
        body.destLocality = city;
        body.destGeopoint = { lat: doorSelected.lat, lng: doorSelected.lng };
      }
      const r = await fetch('/api/checkout/russia-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        setOffersError(d.error || `HTTP ${r.status}`);
      } else {
        const list = Array.isArray(d.offers) ? d.offers as Offer[] : [];
        setOffers(list);
        if (list.length > 0) setChosenOfferId(list[0].offerId); // дефолт — первый
      }
    } catch (e) {
      setOffersError(String(e));
    } finally {
      setOffersLoading(false);
    }
  }, [items, mode, customer, selectedPointId, doorSelected, city]);

  // Уведомляем родителя об изменениях
  useEffect(() => {
    const chosen = offers.find((o) => o.offerId === chosenOfferId);
    const ready = !!chosen;
    const selPoint = points.find((p) => p.id === selectedPointId);
    const sel: RussiaSelection = {
      ready,
      mode,
      city: city || undefined,
      geoId: effectiveGeoId ?? undefined,
      ...(mode === 'pickup'
        ? { pointId: selectedPointId || undefined, pointAddress: selPoint?.address }
        : { doorAddress: doorSelected?.full, doorGeopoint: doorSelected ? { lat: doorSelected.lat, lng: doorSelected.lng } : undefined }),
      ...(chosen
        ? {
            offerId: chosen.offerId,
            priceRub: chosen.priceRub,
            partner: chosen.partner,
            deliveryFromIso: chosen.deliveryFromIso,
            deliveryToIso: chosen.deliveryToIso,
          }
        : {}),
    };
    onChange(sel);
  }, [
    mode, city, effectiveGeoId, selectedPointId, doorSelected,
    points, offers, chosenOfferId, onChange,
  ]);

  // Координаты центра города для карты, когда ПВЗ ещё не загружены
  // (берём средние координаты загруженных ПВЗ, либо ничего)
  const fallbackCenter = useMemo(() => {
    if (points.length === 0) return undefined;
    const lat = points.reduce((s, p) => s + (p.lat ?? 0), 0) / points.length;
    const lng = points.reduce((s, p) => s + (p.lng ?? 0), 0) / points.length;
    return { lat, lng };
  }, [points]);

  const mapPoints = useMemo(
    () => points
      .filter((p): p is PickupPoint & { lat: number; lng: number } =>
        typeof p.lat === 'number' && typeof p.lng === 'number')
      .map((p) => ({ id: p.id, address: p.address, workingHours: p.workingHours, lat: p.lat, lng: p.lng })),
    [points]
  );

  return (
    <div className="space-y-4">
      {/* Город */}
      <div className="grid sm:grid-cols-[2fr_1fr] gap-3">
        <div>
          <label className="block text-sm font-medium mb-1.5">Город получателя *</label>
          <input
            type="text"
            list="russia-cities-list"
            value={city}
            onChange={(e) => { setCity(e.target.value); setCustomGeoId(''); setDoorSelected(null); setDoorAddressInput(''); }}
            placeholder="Калуга, Казань, Новосибирск…"
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          <datalist id="russia-cities-list">
            {cities.map((c) => <option key={c.geoId} value={c.name} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">
            или geo_id <span className="text-text-muted text-xs">(если города нет в списке)</span>
          </label>
          <input
            type="text"
            value={customGeoId}
            onChange={(e) => { setCustomGeoId(e.target.value.replace(/\D/g, '')); setCity(''); }}
            placeholder="например, 213"
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Режим */}
      {effectiveGeoId && (
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

      {/* ПВЗ-режим: карта + список */}
      {effectiveGeoId && mode === 'pickup' && (
        <div className="space-y-3">
          {pointsLoading && <p className="text-sm text-text-muted">Загружаем список ПВЗ…</p>}
          {pointsError && <p className="text-sm text-danger break-words">Ошибка: {pointsError}</p>}
          {!pointsLoading && !pointsError && points.length === 0 && (
            <p className="text-sm text-text-muted">В этом городе ПВЗ не найдены. Попробуйте курьер до двери.</p>
          )}
          {!pointsLoading && mapPoints.length > 0 && (
            <>
              <p className="text-xs text-text-muted">Нажмите на маркер на карте или выберите из списка:</p>
              <PickupPointsMap
                points={mapPoints}
                selectedId={selectedPointId}
                onSelect={setSelectedPointId}
                fallbackCenter={fallbackCenter}
              />
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {points.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPointId(p.id)}
                    className={`w-full text-left p-3 text-sm hover:bg-bg transition-colors ${
                      selectedPointId === p.id ? 'bg-accent/10' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className={`flex-shrink-0 mt-0.5 ${selectedPointId === p.id ? 'text-accent' : 'text-text-muted'}`} />
                      <div>
                        <p className="font-medium">{p.address}</p>
                        {p.workingHours && <p className="text-xs text-text-muted">{p.workingHours}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* ПВЗ без координат — отдельно списком (без карты) */}
              {points.length > mapPoints.length && (
                <p className="text-xs text-text-muted">
                  {points.length - mapPoints.length} ПВЗ без координат — отображаются только в списке выше.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Курьер-режим: адрес с автодополнением */}
      {effectiveGeoId && mode === 'door' && (
        <div className="space-y-2 relative">
          <label className="block text-sm font-medium">Адрес получателя в городе «{city || effectiveGeoId}» *</label>
          <input
            type="text"
            value={doorAddressInput}
            onChange={(e) => { setDoorAddressInput(e.target.value); setDoorSelected(null); }}
            placeholder="Улица, дом, квартира"
            className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
          {/* Выпадающий список подсказок */}
          {suggestions.length > 0 && !doorSelected && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((s, i) => (
                <button
                  key={`${s.lat}-${s.lng}-${i}`}
                  type="button"
                  onClick={() => { setDoorSelected(s); setDoorAddressInput(s.full); setSuggestions([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-bg border-b border-border last:border-b-0"
                >
                  {s.full}
                </button>
              ))}
            </div>
          )}
          {suggLoading && !doorSelected && (
            <p className="text-xs text-text-muted">Ищем адреса…</p>
          )}
          {doorSelected && (
            <p className="text-xs text-success">
              Выбран адрес: {doorSelected.full}
            </p>
          )}
        </div>
      )}

      {/* Кнопка расчёта */}
      {effectiveGeoId && canCalculate && offers.length === 0 && (
        <button
          type="button"
          onClick={calculate}
          disabled={offersLoading}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-light transition-colors disabled:opacity-50"
        >
          {offersLoading ? 'Считаем…' : 'Посчитать стоимость доставки'}
        </button>
      )}

      {offersError && <p className="text-sm text-danger break-words">Ошибка: {offersError}</p>}

      {/* Офферы */}
      {offers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Выберите вариант доставки:</p>
          <div className="space-y-1.5">
            {offers.map((o) => {
              const range = formatDateRange(o.deliveryFromIso, o.deliveryToIso);
              const isChosen = chosenOfferId === o.offerId;
              return (
                <label
                  key={o.offerId}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    isChosen ? 'border-accent bg-accent/5' : 'border-border hover:border-accent'
                  }`}
                >
                  <input
                    type="radio"
                    name="russia-offer"
                    value={o.offerId}
                    checked={isChosen}
                    onChange={() => setChosenOfferId(o.offerId)}
                    className="accent-accent"
                  />
                  <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
                    <span className="font-semibold">{formatPrice(o.priceRub)}</span>
                    {o.partner && (
                      <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded">{o.partner}</span>
                    )}
                    {range && <span className="text-xs text-text-muted">{range}</span>}
                  </div>
                  {isChosen && <Check size={16} className="text-accent" />}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
