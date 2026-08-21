import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

type DepositAccount = Database["public"]["Tables"]["deposit_accounts"]["Row"];

export const Route = createFileRoute("/cuentas")({
  head: () => ({ meta: [{ title: "Cuentas" }] }),
  component: CuentasPage,
});

function CuentasPage() {
  const { data, isLoading } = useQuery<DepositAccount[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposit_accounts")
        .select("*")
        .order("bank", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
  const [q, setQ] = useState("");
  const rows = (data ?? []).filter(
    (c) =>
      !q ||
      c.bank.toLowerCase().includes(q.toLowerCase()) ||
      (c.currency ?? "").toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="min-h-screen fondo">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas de Depósito</h1>
          <p className="text-sm text-muted-foreground">
            Cuentas Disponibles para Recibir Depósitos.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar Cuenta por Moneda o Banco…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((a) => (
              <div
                key={a.id}
                id={a.id}
                className={`rounded-lg border bg-card p-4 ${a.is_active ? "" : "opacity-50"} fondo-opuesto`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{a.bank}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.currency ?? ""}
                      {a.account_type ? ` · ${a.account_type}` : ""}
                    </div>
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row label="Titular" value={a.holder} />
                  {a.email && <Row label="Correo" value={a.email} />}
                  <Row
                    label="Número"
                    value={
                      <span className="flex items-center gap-2">
                        <span className="font-mono">{a.account_number}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => {
                            navigator.clipboard.writeText(a.account_number);
                            toast.success("Copiado");
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </span>
                    }
                  />
                  {a.notes && <Row label="Notas" value={a.notes} />}
                </dl>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay Cuentas Cargadas, escribe a Soporte solicitando la cuenta.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
