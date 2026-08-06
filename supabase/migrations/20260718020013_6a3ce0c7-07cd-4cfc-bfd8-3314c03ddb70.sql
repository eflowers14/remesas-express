-- ============================================
-- 1. ENUM de roles (seguro)
-- ============================================
-- NO usar DROP TYPE CASCADE en producción
-- Mejor crear solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'user');
    END IF;
END$$;

-- ============================================
-- 2. user_roles
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Permisos (re-crear para asegurar)
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas (DROP + CREATE para evitar conflictos)
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Función has_role
-- ============================================
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

-- ============================================
-- 4. Trigger para asignar rol automático
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insertar rol admin para emails específicos
  IF lower(NEW.email) IN ('juanenriquefm2006@gmail.com', 'enriquealejandrofloresmarin@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Eliminar trigger si existe y crearlo de nuevo
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================
-- 5. Función updated_at (helper)
-- ============================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN 
  NEW.updated_at = now(); 
  RETURN NEW; 
END;
$$;

-- ============================================
-- 6. Tabla currencies
-- ============================================
CREATE TABLE IF NOT EXISTS public.currencies (
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

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;

-- RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Authenticated can read currencies" ON public.currencies;
DROP POLICY IF EXISTS "Admins can insert currencies" ON public.currencies;
DROP POLICY IF EXISTS "Admins can update currencies" ON public.currencies;
DROP POLICY IF EXISTS "Admins can delete currencies" ON public.currencies;

CREATE POLICY "Authenticated can read currencies" ON public.currencies
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert currencies" ON public.currencies
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update currencies" ON public.currencies
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete currencies" ON public.currencies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger
DROP TRIGGER IF EXISTS trg_currencies_updated ON public.currencies;
CREATE TRIGGER trg_currencies_updated
BEFORE UPDATE ON public.currencies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 7. Tabla deposit_accounts
-- ============================================
CREATE TABLE IF NOT EXISTS public.deposit_accounts (
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

-- Permisos
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_accounts TO authenticated;
GRANT ALL ON public.deposit_accounts TO service_role;

-- RLS
ALTER TABLE public.deposit_accounts ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Authenticated can read deposit accounts" ON public.deposit_accounts;
DROP POLICY IF EXISTS "Admins can insert deposit accounts" ON public.deposit_accounts;
DROP POLICY IF EXISTS "Admins can update deposit accounts" ON public.deposit_accounts;
DROP POLICY IF EXISTS "Admins can delete deposit accounts" ON public.deposit_accounts;

CREATE POLICY "Authenticated can read deposit accounts" ON public.deposit_accounts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert deposit accounts" ON public.deposit_accounts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update deposit accounts" ON public.deposit_accounts
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete deposit accounts" ON public.deposit_accounts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger
DROP TRIGGER IF EXISTS trg_deposit_accounts_updated ON public.deposit_accounts;
CREATE TRIGGER trg_deposit_accounts_updated
BEFORE UPDATE ON public.deposit_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 8. Seed currencies (SOLO si está vacío)
-- ============================================
INSERT INTO public.currencies (name, sort_order)
SELECT * FROM (VALUES
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
  ('Costa Rica', 380)
) AS v(name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.currencies LIMIT 1);