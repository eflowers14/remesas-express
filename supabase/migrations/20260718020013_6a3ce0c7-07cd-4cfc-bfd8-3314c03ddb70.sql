
-- Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- has_role (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;

-- Trigger que asigna rol al crear usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) = 'juanenriquefm2006@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- currencies
CREATE TABLE public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  buy_price numeric(18,4) NOT NULL DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read currencies" ON public.currencies
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert currencies" ON public.currencies
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update currencies" ON public.currencies
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete currencies" ON public.currencies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_currencies_updated
BEFORE UPDATE ON public.currencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- deposit_accounts
CREATE TABLE public.deposit_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank text NOT NULL,
  holder text NOT NULL,
  email text,
  account_number text NOT NULL,
  account_type text,
  currency text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_accounts TO authenticated;
GRANT ALL ON public.deposit_accounts TO service_role;
ALTER TABLE public.deposit_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read deposit accounts" ON public.deposit_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert deposit accounts" ON public.deposit_accounts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update deposit accounts" ON public.deposit_accounts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete deposit accounts" ON public.deposit_accounts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_deposit_accounts_updated
BEFORE UPDATE ON public.deposit_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial currencies
INSERT INTO public.currencies (name, sort_order) VALUES
  ('USDT', 10),
  ('MLC', 20),
  ('Zelle', 30),
  ('Tropipay', 40),
  ('Revolut', 50),
  ('VENMO', 60),
  ('CASHAPP', 70),
  ('Paypal (USD)', 80),
  ('Paypal (€)', 90),
  ('BIZUM', 100),
  ('Iban', 110),
  ('MXN', 120),
  ('Ecuador', 130),
  ('Brasil Real', 140),
  ('Soles', 150),
  ('Dolar en Perú', 160),
  ('Canadá', 170),
  ('China', 180),
  ('Pesos Uruguayos', 190),
  ('Dolar Uruguay', 200),
  ('Rublos', 210),
  ('Paraguay', 220),
  ('Serbia', 230),
  ('Venezuela', 240),
  ('Bolivia', 250),
  ('Colombia', 260),
  ('Argentina', 270),
  ('Chile', 280),
  ('Rep. Dominicana', 290),
  ('Suriname', 300),
  ('Guyana', 310),
  ('Panamá', 320),
  ('Postepay', 330),
  ('Portugal', 340),
  ('Dubai', 350),
  ('Córdobas', 360),
  ('Dolar en Nic', 370),
  ('Costa Rica', 380);
