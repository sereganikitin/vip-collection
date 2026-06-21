'use client';

// Leaflet-карта с маркерами ПВЗ. Поддерживает несколько перевозчиков
// (Я.Доставка / СДЭК), разделяя их цветом маркера.
//
// Производительность: для городов с сотнями ПВЗ (Москва, СПб) рендеринг
// через <Marker> с SVG-иконками захлёбывался — каждый ПВЗ создавал DOM-узел
// + слой Leaflet, главный поток забивался и любой клик зависал. Переключили
// на canvas-рендеринг + <CircleMarker>: тысяча кругов рисуется одним проходом
// canvas вместо тысячи отдельных DOM-узлов.
//
// Важно: Leaflet требует window/document — компонент должен импортироваться
// через next/dynamic с ssr: false. Не использовать напрямую в серверных RSC.

import { useEffect, useMemo } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const COLOR_YANDEX = '#1E88E5';
const COLOR_CDEK   = '#22C55E';
const COLOR_SELECTED_BORDER = '#FBC608'; // золотой контур выбранного

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
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} fallbackCenter={fallbackCenter} />
        {points.map((p) => {
          const isSelected = p.id === selectedId && p.provider === selectedProvider;
          const fillColor = p.provider === 'cdek' ? COLOR_CDEK : COLOR_YANDEX;
          return (
            <CircleMarker
              key={`${p.provider}-${p.id}`}
              center={[p.lat, p.lng]}
              radius={isSelected ? 9 : 6}
              pathOptions={{
                color: isSelected ? COLOR_SELECTED_BORDER : '#fff',
                weight: isSelected ? 3 : 1.5,
                fillColor,
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => onSelect(p) }}
            >
              <Popup>
                <div className="text-sm space-y-1">
                  <p className="text-xs font-semibold uppercase" style={{ color: fillColor }}>
                    {p.provider === 'cdek' ? 'СДЭК' : 'Я.Доставка'}
                  </p>
                  <p className="font-medium">{p.address}</p>
                  {p.workingHours && <p className="text-xs text-gray-600">{p.workingHours}</p>}
                  {isSelected && <p className="text-xs text-green-700 font-medium">✓ Выбран</p>}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Легенда — что означает каждый цвет */}
      <div className="absolute top-2 right-2 z-[400] bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md px-2.5 py-1.5 shadow-md text-xs space-y-0.5">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR_YANDEX }} />
          <span>Я.Доставка</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLOR_CDEK }} />
          <span>СДЭК</span>
        </div>
      </div>
    </div>
  );
}
