ALTER TABLE public.currencies
  ADD COLUMN IF NOT EXISTS deposit_account_id uuid
  REFERENCES public.deposit_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS currencies_deposit_account_id_idx
  ON public.currencies(deposit_account_id);