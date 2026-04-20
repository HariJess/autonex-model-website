import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminCreditsLedgerRow } from "@/types/admin";
import { cn } from "@/lib/utils";

interface UserDetailTransactionsProps {
  ledger: AdminCreditsLedgerRow[];
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-MG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UserDetailTransactions({ ledger }: UserDetailTransactionsProps) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="font-serif text-lg">
          Transactions crédits ({ledger.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {ledger.length === 0 ? (
          <p className="p-4 text-sm font-sans text-muted-foreground">
            Aucune transaction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium text-right">Delta</th>
                  <th className="p-3 font-medium">Type</th>
                  <th className="p-3 font-medium">Raison</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-t border-border">
                    <td className="p-3 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                    <td
                      className={cn(
                        "p-3 text-right font-medium",
                        entry.delta > 0
                          ? "text-green-700"
                          : entry.delta < 0
                            ? "text-red-700"
                            : "text-muted-foreground",
                      )}
                    >
                      {entry.delta > 0 ? "+" : ""}
                      {entry.delta}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {entry.ref_type ?? "—"}
                    </td>
                    <td className="p-3">{entry.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
