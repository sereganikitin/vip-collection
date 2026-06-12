'use client';

// Leaflet-карта с маркерами ПВЗ. Используется в чекауте.
//
// Важно: Leaflet требует window/document — компонент должен импортироваться
// через next/dynamic с ssr: false. Не использовать напрямую в серверных RSC.

import { useEffect, useMemo, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Дефолтные пути к иконкам Leaflet ломаются в webpack-бандлах — фиксим.
// Используем CDN unpkg, лишних копий в /public не делаем.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Иконка для выбранного ПВЗ — золотая, остальные стандартные.
const selectedIcon = new L.Icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [30, 49],
  iconAnchor: [15, 49],
  popupAnchor: [1, -34],
  shadowSize: [49, 49],
  className: 'leaflet-marker-selected',
});

export interface MapPoint {
  id: string;
  address: string;
  workingHours?: string;
  lat: number;
  lng: number;
}

interface Props {
  points: MapPoint[];
  selectedId?: string;
  onSelect: (id: string) => void;
  /** Центр карты, если ПВЗ нет (например, центр выбранного города). */
  fallbackCenter?: { lat: number; lng: number };
}

/**
 * Внутренний хелпер: при изменении набора точек подгоняем bounds карты.
 */
function FitBounds({ points, fallbackCenter }: { points: MapPoint[]; fallbackCenter?: { lat: number; lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) {
      if (fallbackCenter) {
        map.setView([fallbackCenter.lat, fallbackCenter.lng], 11);
      }
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

export default function PickupPointsMap({ points, selectedId, onSelect, fallbackCenter }: Props) {
  const initialCenter = useMemo(() => {
    if (points.length > 0) return { lat: points[0].lat, lng: points[0].lng };
    if (fallbackCenter) return fallbackCenter;
    return { lat: 55.751244, lng: 37.618423 }; // дефолт — центр Москвы
  }, [points, fallbackCenter]);

  const popupRefs = useRef<Record<string, L.Popup>>({});

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
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={p.id === selectedId ? selectedIcon : new L.Icon.Default()}
            eventHandlers={{
              click: () => onSelect(p.id),
            }}
            ref={(m) => {
              if (m) {
                const popup = m.getPopup();
                if (popup) popupRefs.current[p.id] = popup;
              }
            }}
          >
            <Popup>
              <div className="text-sm space-y-1">
                <p className="font-medium">{p.address}</p>
                {p.workingHours && <p className="text-xs text-gray-600">{p.workingHours}</p>}
                <button
                  type="button"
                  onClick={() => onSelect(p.id)}
                  className="mt-1 inline-block px-2 py-1 bg-accent text-primary font-medium rounded text-xs"
                >
                  {p.id === selectedId ? '✓ Выбран' : 'Выбрать этот ПВЗ'}
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
