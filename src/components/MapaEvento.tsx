import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type * as LeafletNS from "leaflet";

interface Props {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
  className?: string;
}

export function MapaEvento({ lat, lng, label, height = 260, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markerRef = useRef<LeafletNS.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (typeof window === "undefined" || !ref.current) return;
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;

      L.Marker.prototype.options.icon = L.icon({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!mapRef.current) {
        const map = L.map(ref.current, { zoomControl: true, scrollWheelZoom: false }).setView([lat, lng], 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        markerRef.current = L.marker([lat, lng]).addTo(map);
        if (label) markerRef.current.bindPopup(label).openPopup();
        mapRef.current = map;
      } else {
        mapRef.current.setView([lat, lng], 15);
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
          if (label) markerRef.current.bindPopup(label);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [lat, lng, label]);

  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={ref} className={className} style={{ height, width: "100%", borderRadius: 16, overflow: "hidden", zIndex: 0 }} />;
}
