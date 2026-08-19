import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// ---- Currencies ----

export const listCurrencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("currencies")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const currencyInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  country: z.string().trim().max(80).nullable().optional(),
  deposit_account_id: z.string().uuid().nullable().optional(),
  buy_price: z.number().nonnegative(),
  notes: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

type ServerContext = { supabase: SupabaseClient<Database>; userId: string };

async function assertAdmin(context: ServerContext) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: se requiere rol admin");
}

export const upsertCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => currencyInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const payload = { ...data, updated_by: context.userId, updated_at: new Date().toISOString() };
    const q = data.id
      ? context.supabase.from("currencies").update(payload).eq("id", data.id).select().single()
      : context.supabase.from("currencies").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteCurrency = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("currencies").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Deposit accounts ----

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("deposit_accounts")
      .select("*")
      .order("bank", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const accountInput = z.object({
  id: z.string().uuid().optional(),
  bank: z.string().trim().min(1).max(120),
  holder: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).nullable().optional().or(z.literal("")),
  account_number: z.string().trim().min(1).max(120),
  account_type: z.string().trim().max(80).nullable().optional(),
  currency: z.string().trim().max(80).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
});

export const upsertAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => accountInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const email = data.email === "" ? null : (data.email ?? null);
    const payload = {
      ...data,
      email,
      updated_by: context.userId,
      updated_at: new Date().toISOString(),
    };
    const q = data.id
      ? context.supabase
          .from("deposit_accounts")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : context.supabase.from("deposit_accounts").insert(payload).select().single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("deposit_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Current user role ----

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (error) throw new Error(error.message);
    return { isAdmin: !!data, userId: context.userId };
  });
