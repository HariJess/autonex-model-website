import "@/lib/leafletDefaultIcon";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { formatCoordinates, isValidListingCoordinates } from "@/lib/mapCoordinates";

interface PublishLocationMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

function MapRecenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!isValidListingCoordinates(lat, lng)) return;
    const z = Math.max(map.getZoom(), 13);
    map.setView([lat, lng], z);
  }, [lat, lng, map]);
  return null;
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/**
 * Interactive map: click or drag the marker to set exact listing coordinates.
 */
const PublishLocationMap = ({ lat, lng, onPositionChange }: PublishLocationMapProps) => {
  const { t } = useTranslation();

  if (!isValidListingCoordinates(lat, lng)) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-sans flex items-start gap-2">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
        {t(
          "publish.mapHint",
          "Cliquez sur la carte ou déplacez le marqueur pour indiquer l’emplacement exact du bien. Les acheteurs le verront sur la fiche annonce."
        )}
      </p>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        className="h-[280px] md:h-[320px] w-full rounded-xl border border-border z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapRecenter lat={lat} lng={lng} />
        <MapClickHandler onPick={onPositionChange} />
        <Marker
          position={[lat, lng]}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const m = e.target;
              const ll = m.getLatLng();
              onPositionChange(ll.lat, ll.lng);
            },
          }}
        />
      </MapContainer>
      <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
        {formatCoordinates(lat, lng)}
      </p>
    </div>
  );
};

export default PublishLocationMap;
