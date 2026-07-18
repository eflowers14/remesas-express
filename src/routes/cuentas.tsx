import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/cuentas")({
  head: () => ({ meta: [{ title: "Cuentas — Catálogo de remesas" }] }),
  component: CuentasPage,
});

function CuentasPage() {
  const { data, isLoading } = useQuery({
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-4 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Cuentas de depósito</h1>
          <p className="text-sm text-muted-foreground">Cuentas disponibles para recibir depósitos.</p>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Cargando…</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {(data ?? []).map((a: any) => (
              <div key={a.id} className={`rounded-lg border bg-card p-4 ${a.is_active ? "" : "opacity-50"}`}>
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
            {(data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Aún no hay cuentas cargadas.</p>
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
