import "@/lib/leafletDefaultIcon";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { isValidListingCoordinates } from "@/lib/mapCoordinates";

export interface ListingLocationMapProps {
  lat: number;
  lng: number;
  title?: string;
  /** Human-readable address line under the title */
  addressLine?: string;
}

/**
 * Read-only single-marker map for a listing detail page.
 * Parent must only mount when coordinates are valid, or this returns null.
 */
const ListingLocationMap = ({ lat, lng, title, addressLine }: ListingLocationMapProps) => {
  const { t } = useTranslation();

  if (!isValidListingCoordinates(lat, lng)) {
    return null;
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className="h-[min(360px,55vh)] w-full min-h-[240px] rounded-2xl border border-border z-0 shadow-sm"
      scrollWheelZoom
      attributionControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]}>
        <Popup>
          <div className="font-sans text-sm min-w-[160px]">
            {title ? (
              <p className="font-semibold text-foreground mb-0.5">{title}</p>
            ) : (
              <p className="font-semibold text-foreground mb-0.5">{t("listing.mapPin", "Emplacement du véhicule")}</p>
            )}
            {addressLine ? (
              <p className="text-muted-foreground text-xs flex items-start gap-1">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" />
                {addressLine}
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">{t("listing.mapApproximate", "Position indiquée sur la carte.")}</p>
            )}
          </div>
        </Popup>
      </Marker>
    </MapContainer>
  );
};

export default ListingLocationMap;
