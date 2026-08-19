-- ============================================
-- BACKUP COMPLETO: remesas-express
-- Fecha: 2026-08-17
-- ============================================

-- ============================================
-- 1. ENUM de roles
-- ============================================
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

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

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
SET search_path TO 'public'
AS $$
BEGIN
  IF lower(NEW.email) IN ('enriquealejandrofloresmarin@gmail.com','juanenriquefm2006@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- ============================================
-- 5. Función updated_at
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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
GRANT SELECT ON public.currencies TO anon;

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read currencies" ON public.currencies;
CREATE POLICY "Anyone can read currencies" ON public.currencies FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert currencies" ON public.currencies;
CREATE POLICY "Admins can insert currencies" ON public.currencies
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update currencies" ON public.currencies;
CREATE POLICY "Admins can update currencies" ON public.currencies
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete currencies" ON public.currencies;
CREATE POLICY "Admins can delete currencies" ON public.currencies
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deposit_accounts TO authenticated;
GRANT ALL ON public.deposit_accounts TO service_role;
GRANT SELECT ON public.deposit_accounts TO anon;

ALTER TABLE public.deposit_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read deposit accounts" ON public.deposit_accounts;
CREATE POLICY "Anyone can read deposit accounts" ON public.deposit_accounts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert deposit accounts" ON public.deposit_accounts;
CREATE POLICY "Admins can insert deposit accounts" ON public.deposit_accounts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update deposit accounts" ON public.deposit_accounts;
CREATE POLICY "Admins can update deposit accounts" ON public.deposit_accounts
  FOR UPDATE TO authenticated 
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete deposit accounts" ON public.deposit_accounts;
CREATE POLICY "Admins can delete deposit accounts" ON public.deposit_accounts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_deposit_accounts_updated ON public.deposit_accounts;
CREATE TRIGGER trg_deposit_accounts_updated
BEFORE UPDATE ON public.deposit_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 8. DATOS REALES (exportados el 2026-08-17)
-- ============================================
-- NOTA: user_roles NO se inserta aquí porque depende de auth.users
-- El trigger handle_new_user_role() asignará roles automáticamente al registrarse.
-- Los campos updated_by se ponen NULL porque los usuarios aún no existen.

-- deposit_accounts (1 registro)
INSERT INTO public.deposit_accounts (id, bank, holder, email, account_number, account_type, currency, notes, is_active, updated_at, updated_by) VALUES
('b27731a1-36c2-4c34-86cc-e1bb92f41c00', 'KAST', 'Ruben Nicolas Rojas', NULL, 'CVU: 0000266200000000011592', NULL, NULL, 'Mínimo 20mil arg', true, '2026-08-10 01:44:03.678935+00', NULL);

-- currencies (38 registros)
INSERT INTO public.currencies (id, name, country, buy_price, notes, is_active, sort_order, updated_at, updated_by) VALUES
('0233b5c0-50ec-4291-9cab-f88fbb718dc3', 'China', NULL, 30.0000, NULL, true, 180, '2026-08-07 15:31:03.741365+00', NULL),
('06a23c41-0a0c-4b7e-905b-e6bd7bf8e946', 'Revolut', NULL, 520.0000, NULL, true, 50, '2026-08-07 15:28:03.243009+00', NULL),
('0c686637-656a-47d5-98f1-52d75d2826f2', 'Tropipay', NULL, 700.0000, NULL, true, 40, '2026-08-07 15:27:49.357293+00', NULL),
('1cd5796e-c31f-45a1-9d1b-389aee67a437', 'Rep. Dominicana', NULL, 7.0000, NULL, true, 290, '2026-08-07 15:34:08.615144+00', NULL),
('1fec422c-750c-4685-9d22-f8cceca2741b', 'MLC', NULL, 0.0000, 'Min 25, más de 100 a 500cup', true, 20, '2026-08-10 01:34:00.071405+00', NULL),
('2b5510a5-f140-468e-a2e5-b9c8d3e26758', 'Soles', NULL, 150.0000, NULL, true, 150, '2026-08-07 15:30:38.826318+00', NULL),
('2ffc03aa-fc4f-47fa-a3d6-6f274e0547bf', 'Postepay', NULL, 700.0000, NULL, true, 330, '2026-08-07 15:33:21.111245+00', NULL),
('34126ba8-49b0-4156-8ec9-198cf628da47', 'Dolar en Perú', NULL, 645.0000, NULL, true, 160, '2026-08-07 15:30:48.660816+00', NULL),
('385f36cd-53c8-402d-ad2f-bb5476c429ff', 'Portugal', NULL, 650.0000, NULL, true, 340, '2026-08-07 15:33:28.107398+00', NULL),
('3ddb892f-78ca-4783-a3a9-6ef411627748', 'Canadá', NULL, 370.0000, NULL, true, 170, '2026-08-07 15:30:56.070449+00', NULL),
('4788a2ce-1b70-4588-8406-8a5d3b2709e0', 'Córdobas', NULL, 13.0000, NULL, true, 360, '2026-08-07 15:33:40.759507+00', NULL),
('51f8e181-3d2a-4679-bfce-55f7b49fff02', 'Ecuador', NULL, 650.0000, NULL, true, 130, '2026-08-07 15:30:26.203455+00', NULL),
('5db36f32-6daf-4f51-a5f3-9be660a16f77', 'Dolar Uruguay', NULL, 640.0000, NULL, true, 200, '2026-08-07 15:31:15.165322+00', NULL),
('636d85b5-ff2c-4f40-9f67-bec1261875bd', 'Costa Rica', NULL, 0.4000, NULL, true, 380, '2026-08-07 15:33:53.83921+00', NULL),
('64cd861d-03a7-4c37-a93d-fceece23e1bc', 'Paypal (USD)', NULL, 580.0000, NULL, true, 80, '2026-08-07 15:28:22.111224+00', NULL),
('6db9d634-38b2-4b66-8c30-62da2e2f8402', 'BIZUM', NULL, 790.0000, 'Solo familiares y min 50, menos a 600', true, 100, '2026-08-07 15:29:46.300398+00', NULL),
('7136312e-ca2b-4b68-8fa7-9cc76959ac16', 'Guyana', NULL, 1.6000, NULL, true, 310, '2026-08-07 15:33:20.454875+00', NULL),
('742809f6-f39e-4e3b-a180-33e1c5d4f187', 'Suriname', NULL, 13.0000, NULL, true, 300, '2026-08-07 15:32:57.852847+00', NULL),
('75207ef9-9d8c-4a9e-90f9-cc3c0a72adc5', 'Zelle', NULL, 750.0000, 'Min 25, menos a 690cup', true, 30, '2026-08-07 15:27:40.35121+00', NULL),
('79526e1c-94da-4360-9a22-ec1a4a5e793c', 'Pesos Uruguayos', NULL, 13.0000, NULL, true, 190, '2026-08-07 15:31:14.578557+00', NULL),
('7e15928a-e4aa-467e-a421-72768d2f97fd', 'Colombia', NULL, 0.1200, NULL, true, 260, '2026-08-07 15:32:08.664934+00', NULL),
('82f15ce1-b5c3-4ccf-84d2-2caf8e1c2e31', 'Paypal (€)', NULL, 710.0000, NULL, true, 90, '2026-08-07 15:28:30.180999+00', NULL),
('834770df-595b-4fef-ae2d-6f5f6f3b2d4d', 'Brasil Real', NULL, 115.0000, NULL, true, 140, '2026-08-07 15:30:39.412531+00', NULL),
('8e1cf7b4-f1a0-42e3-9653-bd8aedbf6f88', 'Rublos', NULL, 7.0000, NULL, true, 210, '2026-08-07 15:31:29.211131+00', NULL),
('9317542a-92bb-4937-ae51-267f2114c6c3', 'Chile', NULL, 0.4000, NULL, true, 280, '2026-08-07 15:32:44.201553+00', NULL),
('966455f4-0cbb-477c-a5bf-3b17b47d6c2d', 'Bolivia', NULL, 40.0000, NULL, true, 250, '2026-08-07 15:31:47.142603+00', NULL),
('a63f555d-e006-4d2f-a0d6-d5f6679a21a8', 'Venezuela', NULL, 0.4500, NULL, true, 240, '2026-08-07 15:31:46.414501+00', NULL),
('aaee3963-e895-406f-b1d1-80bdf7423b2c', 'Iban', NULL, 700.0000, 'Min 50, menos a 650cup', true, 110, '2026-08-07 15:29:41.81496+00', NULL),
('b9cf89ee-b487-4bf6-a83c-82e3d97491c6', 'MXN', NULL, 44.0000, 'Más de 500 a 45cup', true, 120, '2026-08-07 15:30:16.853461+00', NULL),
('c0e8c9fd-9534-4b66-aaa5-dfeb146ce5f8', 'Paraguay', NULL, 0.0500, NULL, true, 220, '2026-08-07 15:31:28.865367+00', NULL),
('cfaa53e0-57fb-497b-82cd-c4c4208492a2', 'VENMO', NULL, 550.0000, NULL, true, 60, '2026-08-07 15:28:07.084801+00', NULL),
('d24006d8-61cf-4f92-a15e-d06009d1189e', 'Panamá', NULL, 650.0000, NULL, true, 320, '2026-08-07 15:33:19.92512+00', NULL),
('d9ab8116-9865-4a24-8e71-4cc6fa2f99c1', 'CASHAPP', NULL, 510.0000, NULL, true, 70, '2026-08-07 15:28:13.2772+00', NULL),
('d9ec4a90-3df4-4302-95e8-bf3d1cf40073', 'Argentina', NULL, 0.3000, 'Más de 200k a 0.33cup', true, 270, '2026-08-07 15:32:38.149723+00', NULL),
('e49e89f1-242d-47f9-9a47-8cb7df2c64c6', 'Dubai', NULL, 115.0000, NULL, true, 350, '2026-08-07 15:33:34.834974+00', NULL),
('f4409604-46fd-4dc2-9599-3d58d3b4f79c', 'USDT', NULL, 900.0000, 'Más de 100 a 900cup', true, 10, '2026-08-10 01:33:41.243358+00', NULL),
('f5bec841-a835-4933-aa86-c3c37ad1ac14', 'Dolar en Nic', NULL, 600.0000, NULL, true, 370, '2026-08-07 15:33:47.486975+00', NULL),
('fa3ff9aa-0e05-42a3-8aed-a2458a8db89c', 'Serbia', NULL, 3.0000, NULL, true, 230, '2026-08-07 15:31:33.745806+00', NULL)
ON CONFLICT (id) DO NOTHING;
