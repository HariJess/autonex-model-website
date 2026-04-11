import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useCurrency } from "@/contexts/CurrencyContext";
import type { SeedListing } from "@/data/seed-listings";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface ListingsMapProps {
  listings: SeedListing[];
  hoveredId?: string;
  onMarkerClick?: (id: string) => void;
}

const ListingsMap = ({ listings, hoveredId, onMarkerClick }: ListingsMapProps) => {
  const { formatPrice } = useCurrency();

  const center: [number, number] = listings.length > 0
    ? [listings[0].lat, listings[0].lng]
    : [-18.8792, 47.5079];

  const bounds = listings.length > 1
    ? L.latLngBounds(listings.map((l) => [l.lat, l.lng] as [number, number]))
    : undefined;

  return (
    <MapContainer
      center={center}
      zoom={6}
      bounds={bounds}
      className="h-full w-full rounded-xl"
      style={{ minHeight: 400 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {listings.map((listing) => (
        <Marker
          key={listing.id}
          position={[listing.lat, listing.lng]}
          eventHandlers={{
            click: () => onMarkerClick?.(listing.id),
          }}
        >
          <Popup>
            <div className="font-sans text-sm">
              <p className="font-semibold">{listing.title}</p>
              <p className="text-primary font-bold">{formatPrice(listing.price_mga)}</p>
              <p className="text-muted-foreground text-xs">{listing.city}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default ListingsMap;
