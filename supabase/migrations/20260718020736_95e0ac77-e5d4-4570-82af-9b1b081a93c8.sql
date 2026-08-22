
GRANT SELECT ON public.currencies TO anon;
GRANT SELECT ON public.deposit_accounts TO anon;

DROP POLICY IF EXISTS "Authenticated can read currencies" ON public.currencies;
DROP POLICY IF EXISTS "Anyone can read currencies" ON public.currencies;
CREATE POLICY "Anyone can read currencies" ON public.currencies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read deposit accounts" ON public.deposit_accounts;
DROP POLICY IF EXISTS "Anyone can read deposit accounts" ON public.deposit_accounts;
CREATE POLICY "Anyone can read deposit accounts" ON public.deposit_accounts FOR SELECT TO anon, authenticated USING (true);
