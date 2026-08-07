import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { listCurrencies, upsertCurrency, deleteCurrency, getMyRole } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/admin/tasas")({
  head: () => ({ meta: [{ title: "Admin tasas" }] }),
  component: AdminTasasPage,
});

function AdminTasasPage() {
  const getRole = useServerFn(getMyRole);
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["me-role"],
    queryFn: () => getRole(),
  });

  const listFn = useServerFn(listCurrencies);
  const upsertFn = useServerFn(upsertCurrency);
  const deleteFn = useServerFn(deleteCurrency);
  const qc = useQueryClient();
  const { data } = useQuery<Database["public"]["Tables"]["currencies"]["Row"][]>({
    queryKey: ["currencies"],
    queryFn: () => listFn(),
    enabled: !!role?.isAdmin,
  });

  const upsert = useMutation({
    mutationFn: (input: CurrencyInput) => upsertFn({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Guardado");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["currencies"] });
      toast.success("Eliminado");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const [newName, setNewName] = useState("");

  if (roleLoading) return <p>Cargando…</p>;
  if (!role?.isAdmin)
    return <p className="text-sm text-destructive">Acceso solo para administrador.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Administrar tasas</h1>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          upsert.mutate({ name: newName.trim(), buy_price: 0});
          setNewName("");
        }}
      >
        <Input
          placeholder="Nueva moneda / medio…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit">
          <Plus className="mr-1 h-4 w-4" /> Agregar
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">País</th>
              <th className="px-3 py-2">Compra</th>
              <th className="px-3 py-2">Venta</th>
              <th className="px-3 py-2">Notas</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(data ?? []).map((c) => (
              <EditableRow
                key={c.id}
                row={c}
                onSave={(u) => upsert.mutate(u)}
                onDelete={() => del.mutate(c.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type CurrencyRow = Database["public"]["Tables"]["currencies"]["Row"];

type EditableRowProps = {
  row: CurrencyRow;
  onSave: (
    u:
      | Database["public"]["Tables"]["currencies"]["Update"]
      | Database["public"]["Tables"]["currencies"]["Insert"],
  ) => void;
  onDelete: () => void;
};

function EditableRow({ row, onSave, onDelete }: EditableRowProps) {
  const [name, setName] = useState(row.name);
  const [country, setCountry] = useState(row.country ?? "");
  const [buy, setBuy] = useState(String(row.buy_price ?? 0));
  const [notes, setNotes] = useState(row.notes ?? "");
  return (
    <tr>
      <td className="px-2 py-1">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <Input value={country} onChange={(e) => setCountry(e.target.value)} />
      </td>
      <td className="px-2 py-1 w-28">
        <Input type="number" step="0.0001" value={buy} onChange={(e) => setBuy(e.target.value)} />
      </td>
      <td className="px-2 py-1">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </td>
      <td className="px-2 py-1 whitespace-nowrap">
        <Button
          size="sm"
          onClick={() =>
            onSave({
              id: row.id,
              name,
              country: country || null,
              buy_price: Number(buy) || 0,
              notes: notes || null,
            })
          }
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </td>
    </tr>
  );
}

type CurrencyInput = TablesInsert<"currencies"> | TablesUpdate<"currencies">;
