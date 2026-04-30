import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useHotelSearchStore } from '../../store/hotelSearchStore';
import { Star } from 'lucide-react';

/* Build a price-pill divIcon. Highlighted when hovered/selected. */
function priceIcon(amount, highlighted) {
  const html = `<div class="hm-price-pill ${highlighted ? 'hm-price-pill-active' : ''}">₹${Math.round(amount).toLocaleString('en-IN')}</div>`;
  return L.divIcon({
    html, className: 'hm-price-marker',
    iconSize: [60, 28], iconAnchor: [30, 28],
  });
}

/* Auto-recenter map when results city changes. */
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center?.lat && center?.lng) map.setView([center.lat, center.lng], 12);
  }, [center?.lat, center?.lng, map]);
  return null;
}

export default function HotelMap({ hotels }) {
  const center      = useHotelSearchStore((s) => s.center);
  const hoveredId   = useHotelSearchStore((s) => s.hoveredId);
  const selectedId  = useHotelSearchStore((s) => s.selectedId);
  const setHovered  = useHotelSearchStore((s) => s.setHoveredId);
  const setSelected = useHotelSearchStore((s) => s.setSelectedId);

  const initialCenter = useMemo(
    () => [center?.lat || 20.5937, center?.lng || 78.9629],
    [center?.lat, center?.lng],
  );

  return (
    <MapContainer
      center={initialCenter}
      zoom={12}
      scrollWheelZoom
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Recenter center={center} />

      <MarkerClusterGroup chunkedLoading maxClusterRadius={45}>
        {hotels.map((h) => {
          const highlighted = hoveredId === h.id || selectedId === h.id;
          return (
            <Marker
              key={h.id}
              position={[h.latitude, h.longitude]}
              icon={priceIcon(h.price.amount, highlighted)}
              eventHandlers={{
                mouseover: () => setHovered(h.id),
                mouseout:  () => setHovered(null),
                click:     () => setSelected(h.id),
              }}
            >
              <Popup>
                <div className="hm-popup">
                  <img src={h.photos?.[0]} alt={h.name} />
                  <div className="hm-popup-name">{h.name}</div>
                  <div className="hm-popup-meta">
                    <Star size={12} fill="#ffb400" stroke="#ffb400" />
                    <span>{h.starRating}★</span>
                    <span>·</span>
                    <span>{h.rating.score.toFixed(1)}/10</span>
                  </div>
                  <div className="hm-popup-price">₹{h.price.amount.toLocaleString('en-IN')} <small>/ night</small></div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
