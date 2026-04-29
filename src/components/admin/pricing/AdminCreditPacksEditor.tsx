import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatAriary } from "@/config/monetization";
import {
  useAdminCreditPacksList,
  useAdminPricingActions,
  type AdminCreditPackRow,
} from "@/hooks/admin/useAdminPricing";

function AdminCreditPacksEditor() {
  const { data, isLoading, error } = useAdminCreditPacksList();
  const { updatePack } = useAdminPricingActions();

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="font-sans">Packs de crédits</CardTitle>
        <CardDescription className="font-sans">
          Offres de crédits vendues aux utilisateurs. La création et la
          suppression passent par migration SQL (intégrité historique des
          transactions). Édition uniquement ici.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-sans">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        ) : error ? (
          <p className="text-sm text-destructive font-sans">
            {error instanceof Error ? error.message : "Erreur de chargement"}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground font-sans">
            Aucun pack configuré.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">ID</th>
                  <th className="p-3 font-medium">Nom</th>
                  <th className="p-3 font-medium w-28">Crédits</th>
                  <th className="p-3 font-medium w-36">Prix (Ar)</th>
                  <th className="p-3 font-medium w-28">Ar / crédit</th>
                  <th className="p-3 font-medium w-24">Ordre</th>
                  <th className="p-3 font-medium w-28"></th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <CreditPackRow
                    key={row.id}
                    row={row}
                    onSave={(updated) => updatePack.mutate(updated)}
                    isPending={
                      updatePack.isPending && updatePack.variables?.id === row.id
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CreditPackRowProps {
  row: AdminCreditPackRow;
  onSave: (input: AdminCreditPackRow) => void;
  isPending: boolean;
}

function CreditPackRow({ row, onSave, isPending }: CreditPackRowProps) {
  const [name, setName] = useState(row.name);
  const [creditsStr, setCreditsStr] = useState(String(row.credits_amount));
  const [priceStr, setPriceStr] = useState(String(row.price_mga));
  const [sortStr, setSortStr] = useState(String(row.sort_order));

  useEffect(() => {
    setName(row.name);
    setCreditsStr(String(row.credits_amount));
    setPriceStr(String(row.price_mga));
    setSortStr(String(row.sort_order));
  }, [row.name, row.credits_amount, row.price_mga, row.sort_order]);

  const credits = Number.parseInt(creditsStr, 10);
  const price = Number.parseInt(priceStr, 10);
  const sortOrder = Number.parseInt(sortStr, 10);

  const nameTrimmed = name.trim();
  const nameValid = nameTrimmed.length > 0;
  const creditsValid = Number.isFinite(credits) && credits > 0;
  const priceValid = Number.isFinite(price) && price > 0;
  const sortValid = Number.isFinite(sortOrder) && sortOrder >= 0;
  const allValid = nameValid && creditsValid && priceValid && sortValid;

  const isDirty =
    nameTrimmed !== row.name.trim() ||
    credits !== row.credits_amount ||
    price !== row.price_mga ||
    sortOrder !== row.sort_order;

  const canSave = allValid && isDirty && !isPending;

  const perCredit =
    creditsValid && priceValid && credits > 0 ? Math.round(price / credits) : null;

  return (
    <tr className="border-t border-border">
      <td className="p-3 align-top">
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{row.id}</code>
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pack-name-${row.id}`} className="sr-only">
          Nom du pack {row.id}
        </label>
        <Input
          id={`pack-name-${row.id}`}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pack-credits-${row.id}`} className="sr-only">
          Crédits du pack {row.id}
        </label>
        <Input
          id={`pack-credits-${row.id}`}
          type="number"
          inputMode="numeric"
          min={1}
          value={creditsStr}
          onChange={(e) => setCreditsStr(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pack-price-${row.id}`} className="sr-only">
          Prix Ariary du pack {row.id}
        </label>
        <Input
          id={`pack-price-${row.id}`}
          type="number"
          inputMode="numeric"
          min={1}
          value={priceStr}
          onChange={(e) => setPriceStr(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {priceValid ? formatAriary(price) : "—"}
        </p>
      </td>
      <td className="p-3 align-top text-xs text-muted-foreground whitespace-nowrap">
        {perCredit != null ? `${perCredit} Ar` : "—"}
      </td>
      <td className="p-3 align-top">
        <label htmlFor={`pack-sort-${row.id}`} className="sr-only">
          Ordre du pack {row.id}
        </label>
        <Input
          id={`pack-sort-${row.id}`}
          type="number"
          inputMode="numeric"
          min={0}
          value={sortStr}
          onChange={(e) => setSortStr(e.target.value)}
          className="h-8 text-sm"
          disabled={isPending}
        />
      </td>
      <td className="p-3 align-top">
        <Button
          type="button"
          size="sm"
          className="font-sans"
          disabled={!canSave}
          onClick={() =>
            onSave({
              id: row.id,
              name: nameTrimmed,
              credits_amount: credits,
              price_mga: price,
              sort_order: sortOrder,
            })
          }
          aria-label={`Enregistrer le pack ${row.id}`}
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-1" /> Enregistrer
            </>
          )}
        </Button>
      </td>
    </tr>
  );
}

export default AdminCreditPacksEditor;
