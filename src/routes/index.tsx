import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import type { Database } from "@/integrations/supabase/types";

type CurrencyRow = Database["public"]["Tables"]["currencies"]["Row"];

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Catálogo de Remesas" }] }),
  component: TasasPage,
});

function formatPrice(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 4 }).format(n);
}

function TasasPage() {
  const { data, isLoading } = useQuery<CurrencyRow[]>({
    queryKey: ["currencies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("currencies")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter(
    (c) =>
      !q ||
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.country ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Tasas de remesas</h1>
          <p className="text-sm text-muted-foreground">
            Precios actualizados por el administrador EL ARTE.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar moneda o país…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Moneda</th>
                  <th className="px-4 py-2 text-right">Compra</th>
                  <th className="hidden px-4 py-2 md:table-cell">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((c) => (
                  <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                    <td className="px-4 py-3 font-medium">
                      {c.name}
                      {c.country && (
                        <div className="text-xs text-muted-foreground">{c.country}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(Number(c.buy_price))}
                    </td>
                    <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
                      {c.notes}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Sin resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
