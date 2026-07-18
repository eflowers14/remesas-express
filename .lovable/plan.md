# Plan: Catálogo de tasas de remesas + cuentas de depósito

App web con dos catálogos consultables por cualquier usuario autenticado y editables solo por el admin (`enriquealejandrofloresmarin@gmail.com`).

## Stack

- React + TanStack Start (framework por defecto de Lovable).
- Lovable Cloud para: autenticación (email/contraseña + Google), base de datos y control de rol admin en servidor.
- Tailwind + shadcn/ui para UI limpia y responsive.

## Autenticación

- Login/registro con email + contraseña y Google.
- Ruta pública `/auth`; el resto de la app protegida bajo `_authenticated/`.
- El admin se define por email fijo. Al iniciar sesión, si el email coincide con `enriquealejandrofloresmarin@gmail.com`, se le asigna automáticamente el rol `admin` en la tabla `user_roles` (mediante trigger seguro en servidor). Los demás usuarios reciben rol `user`.
- Rol comprobado siempre en servidor con `has_role(auth.uid(), 'admin')` — nunca en el cliente.

## Modelo de datos (Lovable Cloud)

`**currencies**` — catálogo de monedas/medios y su precio de remesa

- `id` (uuid)
- `name` (text) — ej. "USDT", "Paypal (USD)", "Dolar Uruguay"
- `country` (text, opcional) — agrupador visual
- `buy_price` (numeric) — precio de compra
- `notes` (text, opcional)
- `is_active` (boolean, default true)
- `updated_at`, `updated_by`

Precargar las 38 monedas indicadas: USDT, MLC, Zelle, Tropipay, Revolut, VENMO, CASHAPP, Paypal (USD), Paypal (€), BIZUM, Iban, MXN, Ecuador, Brasil Real, Soles, Dolar en Perú, Canadá, China, Pesos Uruguayos, Dolar Uruguay, Rublos, Paraguay, Serbia, Venezuela, Bolivia, Colombia, Argentina, Chile, Rep. Dominicana, Suriname, Guyana, Panamá, Postepay, Portugal, Dubai, Córdobas, Dolar en Nic, Costa Rica. Precios en 0 hasta que el admin los actualice.

`**deposit_accounts**` — cuentas donde se puede depositar

- `id` (uuid)
- `bank` (text) — banco
- `holder` (text) — titular
- `email` (text, opcional) — correo
- `account_number` (text) — número
- `account_type` (text, opcional) — tipo (ahorro/corriente/wallet…)
- `currency` (text) — moneda
- `notes` (text, opcional)
- `is_active` (boolean, default true)
- `updated_at`

`**user_roles**` + enum `app_role ('admin','user')` con función `has_role` SECURITY DEFINER (patrón estándar).

**RLS**

- `currencies` y `deposit_accounts`: SELECT permitido a cualquier usuario autenticado; INSERT/UPDATE/DELETE solo si `has_role(auth.uid(),'admin')`.
- `user_roles`: SELECT propio; escritura solo por trigger/servidor.

## Pantallas

1. `/auth` — Login/registro (email+password, Google).
2. `/` (protegida) — **Tasas**: tabla/tarjetas con todas las monedas, precio compra/venta, buscador y filtro por país. Botón "Editar" visible solo para admin.
3. `/cuentas` — **Cuentas de depósito**: lista con banco, titular, correo, número, tipo, moneda, notas. Botón de copiar número. "Nueva/Editar/Eliminar" solo admin.
4. `/admin/tasas` (solo admin) — CRUD de monedas con edición inline de precios.
5. `/admin/cuentas` (solo admin) — CRUD de cuentas.
6. Header con nombre de usuario, indicador de rol y cerrar sesión.

## Detalles técnicos

- Todas las lecturas y escrituras vía `createServerFn` con `requireSupabaseAuth`; las mutaciones re-validan el rol admin en servidor antes de tocar la tabla.
- TanStack Query para caché + `router.invalidate()` tras cada mutación para que los precios actualizados aparezcan al instante en todos los clientes al recargar.
- Formato de números con separadores de miles y decimales configurable por moneda.
- Diseño mobile-first (la mayoría consultará desde el móvil).

## Fuera de alcance (confirmar si se desea después)

- Historial de cambios de precios / auditoría visual.
- Cálculo de conversión entre monedas.
- Notificaciones cuando cambia un precio.
- Multi-admin.