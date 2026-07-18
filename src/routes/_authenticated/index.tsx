import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCurrencies } from "@/lib/catalog.functions";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Tasas — Catálogo de remesas" }] }),
  component: TasasPage,
});

function formatPrice(n: number) {
  if (!n) return "—";
  return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 4 }).format(n);
}

function TasasPage() {
  const listFn = useServerFn(listCurrencies);
  const { data, isLoading } = useQuery({
    queryKey: ["currencies"],
    queryFn: () => listFn(),
  });
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter((c: any) =>
    !q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.country ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tasas de remesas</h1>
        <p className="text-sm text-muted-foreground">Precios actualizados por el administrador.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar moneda o país…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Moneda / Medio</th>
                <th className="px-4 py-2 text-right">Compra</th>
                <th className="px-4 py-2 text-right">Venta</th>
                <th className="hidden px-4 py-2 md:table-cell">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((c: any) => (
                <tr key={c.id} className={c.is_active ? "" : "opacity-50"}>
                  <td className="px-4 py-3 font-medium">
                    {c.name}
                    {c.country && <div className="text-xs text-muted-foreground">{c.country}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(Number(c.buy_price))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatPrice(Number(c.sell_price))}</td>
                  <td className="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">{c.notes}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    Sin resultados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
