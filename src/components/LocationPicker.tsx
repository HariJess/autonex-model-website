import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { villes, getVille } from "@/data/madagascar-locations";

interface LocationPickerProps {
  ville: string;
  arrondissement: string;
  quartier: string;
  quartierLibre: string;
  onVilleChange: (v: string) => void;
  onArrondissementChange: (a: string) => void;
  onQuartierChange: (q: string) => void;
  onQuartierLibreChange: (q: string) => void;
  compact?: boolean;
}

const LocationPicker = ({
  ville,
  arrondissement,
  quartier,
  quartierLibre,
  onVilleChange,
  onArrondissementChange,
  onQuartierChange,
  onQuartierLibreChange,
  compact = false,
}: LocationPickerProps) => {
  const selectedVille = getVille(ville);
  const selectedArr = selectedVille?.arrondissements.find((a) => a.name === arrondissement);

  return (
    <div className={`space-y-4 ${compact ? "" : ""}`}>
      <div className="space-y-2">
        {!compact && <Label className="font-sans text-sm">Ville *</Label>}
        <Select value={ville} onValueChange={(v) => { onVilleChange(v); onArrondissementChange(""); onQuartierChange(""); }}>
          <SelectTrigger className="font-sans">
            <SelectValue placeholder="Choisir une ville" />
          </SelectTrigger>
          <SelectContent>
            {villes.map((v) => (
              <SelectItem key={v.name} value={v.name}>
                {v.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {ville && selectedVille && (
        <div className="space-y-2">
          {!compact && <Label className="font-sans text-sm">Zone / Arrondissement</Label>}
          <Select value={arrondissement} onValueChange={(a) => { onArrondissementChange(a); onQuartierChange(""); }}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Zone (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              {selectedVille.arrondissements.map((a) => (
                <SelectItem key={a.name} value={a.name}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {arrondissement && selectedArr && (
        <div className="space-y-2">
          {!compact && <Label className="font-sans text-sm">Quartier</Label>}
          <Select value={quartier} onValueChange={onQuartierChange}>
            <SelectTrigger className="font-sans">
              <SelectValue placeholder="Quartier (optionnel)" />
            </SelectTrigger>
            <SelectContent>
              {selectedArr.quartiers.map((q) => (
                <SelectItem key={q.name} value={q.name}>
                  {q.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className={`space-y-2 ${!compact ? "form-surface-muted" : ""}`}>
        {!compact && (
          <Label className="font-sans text-sm text-foreground">
            Autre quartier <span className="font-normal text-muted-foreground">(optionnel)</span>
          </Label>
        )}
        <Input
          value={quartierLibre}
          onChange={(e) => onQuartierLibreChange(e.target.value)}
          placeholder="Ex. : zone industrielle, lotissement…"
          className="font-sans text-sm"
        />
      </div>
    </div>
  );
};

export default LocationPicker;
