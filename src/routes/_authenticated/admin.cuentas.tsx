import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listAccounts, upsertAccount, deleteAccount, getMyRole } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/cuentas")({
  head: () => ({ meta: [{ title: "Admin cuentas" }] }),
  component: AdminCuentasPage,
});

type AccountForm = {
  id?: string;
  bank: string;
  holder: string;
  email: string;
  account_number: string;
  account_type: string;
  currency: string;
  notes: string;
};

const empty: AccountForm = {
  bank: "",
  holder: "",
  email: "",
  account_number: "",
  account_type: "",
  currency: "",
  notes: "",
};

function AdminCuentasPage() {
  const getRole = useServerFn(getMyRole);
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["me-role"],
    queryFn: () => getRole(),
  });

  const listFn = useServerFn(listAccounts);
  const upsertFn = useServerFn(upsertAccount);
  const deleteFn = useServerFn(deleteAccount);
  const qc = useQueryClient();
  const { data } = useQuery<Database["public"]["Tables"]["deposit_accounts"]["Row"][]>({
    queryKey: ["accounts"],
    queryFn: () => listFn(),
    enabled: !!role?.isAdmin,
  });

  const upsert = useMutation({
    mutationFn: (input: AccountForm) => upsertFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Guardado");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      toast.success("Eliminado");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const [form, setForm] = useState<AccountForm>(empty);

  if (roleLoading) return <p>Cargando…</p>;
  if (!role?.isAdmin)
    return <p className="text-sm text-destructive">Acceso solo para administrador.</p>;

  function fld(k: keyof AccountForm) {
    return {
      value: form[k] ?? "",
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm({ ...form, [k]: e.target.value }),
    };
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Administrar cuentas de depósito</h1>

      <form
        className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.bank || !form.holder || !form.account_number) {
            toast.error("Banco, titular y número son obligatorios");
            return;
          }
          upsert.mutate(form, { onSuccess: () => setForm(empty) });
        }}
      >
        <div>
          <Label>Banco *</Label>
          <Input {...fld("bank")} required />
        </div>
        <div>
          <Label>Titular *</Label>
          <Input {...fld("holder")} required />
        </div>
        <div>
          <Label>Número *</Label>
          <Input {...fld("account_number")} required />
        </div>
        <div>
          <Label>Correo</Label>
          <Input type="email" {...fld("email")} />
        </div>
        <div>
          <Label>Tipo</Label>
          <Input {...fld("account_type")} placeholder="Ahorro / Corriente / Wallet…" />
        </div>
        <div>
          <Label>Moneda</Label>
          <Input {...fld("currency")} />
        </div>
        <div className="md:col-span-3">
          <Label>Notas</Label>
          <Input {...fld("notes")} />
        </div>
        <div className="md:col-span-3">
          <Button type="submit">
            <Plus className="mr-1 h-4 w-4" />
            {form.id ? "Actualizar" : "Agregar cuenta"}
          </Button>
          {form.id && (
            <Button type="button" variant="ghost" className="ml-2" onClick={() => setForm(empty)}>
              Cancelar edición
            </Button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Banco</th>
              <th className="px-3 py-2">Titular</th>
              <th className="px-3 py-2">Número</th>
              <th className="px-3 py-2">Moneda</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((a) => (
              <tr key={a.id}>
                <td className="px-3 py-2">{a.bank}</td>
                <td className="px-3 py-2">{a.holder}</td>
                <td className="px-3 py-2 font-mono text-xs">{a.account_number}</td>
                <td className="px-3 py-2">{a.currency}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setForm({
                        id: a.id,
                        bank: a.bank,
                        holder: a.holder,
                        email: a.email ?? "",
                        account_number: a.account_number,
                        account_type: a.account_type ?? "",
                        currency: a.currency ?? "",
                        notes: a.notes ?? "",
                      })
                    }
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => del.mutate(a.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
            {(data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-sm text-muted-foreground">
                  Sin cuentas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
