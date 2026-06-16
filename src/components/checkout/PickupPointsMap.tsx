'use client';

// Leaflet-карта с маркерами ПВЗ. Поддерживает несколько перевозчиков
// (Я.Доставка / СДЭК), разделяя их цветом маркера. Используется в чекауте.
//
// Важно: Leaflet требует window/document — компонент должен импортироваться
// через next/dynamic с ssr: false. Не использовать напрямую в серверных RSC.

import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Иконки Leaflet ломаются в webpack-бандлах — берём с CDN.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// SVG-маркеры разных цветов для разных перевозчиков. Inline SVG → data URL
// через btoa (компонент рендерится только на клиенте, SSR выключен).
function makeIcon(fillColor: string, selected = false): L.Icon {
  const stroke = selected ? '#FBC608' : '#fff';
  const strokeW = selected ? 3 : 1.5;
  const w = selected ? 32 : 25;
  const h = selected ? 52 : 41;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 25 41">` +
    `<path d="M12.5 0C5.6 0 0 5.6 0 12.5c0 9.4 12.5 28.5 12.5 28.5S25 21.9 25 12.5C25 5.6 19.4 0 12.5 0z" ` +
    `fill="${fillColor}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
    `<circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>`;
  const b64 = window.btoa(unescape(encodeURIComponent(svg)));
  return new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,' + b64,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -34],
  });
}

const ICON_YANDEX = (selected: boolean) => makeIcon('#1E88E5', selected); // синий — Я.Доставка
const ICON_CDEK   = (selected: boolean) => makeIcon('#22C55E', selected); // зелёный — СДЭК

export type Provider = 'yandex' | 'cdek';

export interface MapPoint {
  id: string;
  provider: Provider;
  address: string;
  workingHours?: string;
  lat: number;
  lng: number;
}

interface Props {
  points: MapPoint[];
  selectedId?: string;
  selectedProvider?: Provider;
  onSelect: (point: MapPoint) => void;
  fallbackCenter?: { lat: number; lng: number };
}

function FitBounds({ points, fallbackCenter }: { points: MapPoint[]; fallbackCenter?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      if (fallbackCenter) map.setView([fallbackCenter.lat, fallbackCenter.lng], 11);
      return;
    }
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }, [points, fallbackCenter, map]);
  return null;
}

export default function PickupPointsMap({ points, selectedId, selectedProvider, onSelect, fallbackCenter }: Props) {
  const initialCenter = useMemo(() => {
    if (points.length > 0) return { lat: points[0].lat, lng: points[0].lng };
    if (fallbackCenter) return fallbackCenter;
    return { lat: 55.751244, lng: 37.618423 };
  }, [points, fallbackCenter]);

  return (
    <div className="relative w-full h-[400px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[initialCenter.lat, initialCenter.lng]}
        zoom={11}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} fallbackCenter={fallbackCenter} />
        {points.map((p) => {
          const isSelected = p.id === selectedId && p.provider === selectedProvider;
          const icon = p.provider === 'cdek' ? ICON_CDEK(isSelected) : ICON_YANDEX(isSelected);
          return (
            <Marker
              key={`${p.provider}-${p.id}`}
              position={[p.lat, p.lng]}
              icon={icon}
              eventHandlers={{ click: () => onSelect(p) }}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <p className="text-xs font-semibold uppercase" style={{ color: p.provider === 'cdek' ? '#22C55E' : '#1E88E5' }}>
                    {p.provider === 'cdek' ? 'СДЭК' : 'Я.Доставка'}
                  </p>
                  <p className="font-medium">{p.address}</p>
                  {p.workingHours && <p className="text-xs text-gray-600">{p.workingHours}</p>}
                  {isSelected && <p className="text-xs text-green-700 font-medium">✓ Выбран</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Легенда — небольшой блок над картой, чтобы пользователь понимал, что какой цвет значит */}
      <div className="absolute top-2 right-2 z-[400] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md px-2.5 py-1.5 shadow-md text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#1E88E5' }} />
          <span>Я.Доставка</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#22C55E' }} />
          <span>СДЭК</span>
        </div>
      </div>
    </div>
  );
}
