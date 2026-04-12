import "@/lib/leafletDefaultIcon";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useMemo } from "react";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { DisplayListing } from "@/types/listing";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface ListingsMapProps {
  listings: DisplayListing[];
  onMarkerClick?: (id: string) => void;
}

const MADAGASCAR_CENTER: [number, number] = [-18.8792, 47.5079];

const ListingsMap = ({ listings, onMarkerClick }: ListingsMapProps) => {
  const { formatPrice } = useCurrency();

  const mappable = useMemo(
    () => listings.filter((l) => l.lat != null && l.lng != null),
    [listings]
  );

  const { center, bounds } = useMemo(() => {
    if (mappable.length === 0) {
      return { center: MADAGASCAR_CENTER, bounds: undefined as L.LatLngBounds | undefined };
    }
    if (mappable.length === 1) {
      return {
        center: [mappable[0].lat!, mappable[0].lng!] as [number, number],
        bounds: undefined as L.LatLngBounds | undefined,
      };
    }
    const b = L.latLngBounds(mappable.map((l) => [l.lat!, l.lng!] as [number, number]));
    return { center: b.getCenter(), bounds: b };
  }, [mappable]);

  return (
    <MapContainer
      center={center}
      zoom={mappable.length === 0 ? 6 : mappable.length === 1 ? 13 : undefined}
      bounds={bounds}
      className="h-full w-full rounded-xl z-0"
      style={{ minHeight: 280 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mappable.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat!, listing.lng!]}
          eventHandlers={{
            click: () => onMarkerClick?.(listing.id),
          }}
        >
          <Popup>
            <div className="font-sans text-sm">
              <p className="font-semibold">{listing.title}</p>
              <p className="text-primary font-bold">{formatPrice(listing.price_mga)}</p>
              <p className="text-muted-foreground text-xs">{listing.ville}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default ListingsMap;
