import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { LogOut, Coins, Wallet, Shield } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const getRole = useServerFn(getMyRole);
  const { data: role } = useQuery({
    queryKey: ["me-role", user.id],
    queryFn: () => getRole(),
    staleTime: 60_000,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  const isAdmin = role?.isAdmin;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              activeProps={{ className: "bg-accent" }}
              activeOptions={{ exact: true }}
            >
              <Coins className="h-4 w-4" /> Tasas
            </Link>
            <Link
              to="/cuentas"
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
              activeProps={{ className: "bg-accent" }}
            >
              <Wallet className="h-4 w-4" /> Cuentas
            </Link>
            {isAdmin && (
              <>
                <Link
                  to="/admin/tasas"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  activeProps={{ className: "bg-accent" }}
                >
                  <Shield className="h-4 w-4" /> Admin tasas
                </Link>
                <Link
                  to="/admin/cuentas"
                  className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  activeProps={{ className: "bg-accent" }}
                >
                  <Shield className="h-4 w-4" /> Admin cuentas
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:block">
              {user.email} {isAdmin && <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">admin</span>}
            </span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
