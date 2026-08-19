import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/catalog.functions";
import { Button } from "@/components/ui/button";
import { Coins, Wallet, Shield, LogOut, LogIn } from "lucide-react";

export function AppHeader() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const getRole = useServerFn(getMyRole);
  const { data: role, isLoading: roleLoading } = useQuery({
    queryKey: ["me-role"],
    queryFn: () => getRole(),
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      if (data.session) {
        queryClient.invalidateQueries({ queryKey: ["me-role"] });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user.email ?? null);
      queryClient.invalidateQueries({ queryKey: ["me-role"] });
    });

    return () => sub.subscription.unsubscribe();
  }, [queryClient]);

  const isAdmin = role?.isAdmin;
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link
            to="/"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100 hover:bg-accent"
            activeProps={{ className: "bg-accent" }}
            activeOptions={{ exact: true }}
          >
            <Coins className="h-4 w-4" /> Tasas
          </Link>
          <Link
            to="/cuentas"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100 hover:bg-accent"
            activeProps={{ className: "bg-accent" }}
          >
            <Wallet className="h-4 w-4" /> Cuentas
          </Link>
          {!roleLoading && isAdmin && (
            <>
              <Link
                to="/admin/tasas"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100 hover:bg-accent"
                activeProps={{ className: "bg-accent" }}
              >
                <Shield className="h-4 w-4" /> Admin tasas
              </Link>
              <Link
                to="/admin/cuentas"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all duration-100 hover:bg-accent"
                activeProps={{ className: "bg-accent" }}
              >
                <Shield className="h-4 w-4" /> Admin cuentas
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {email ? (
            <>
              <span className="hidden text-xs text-muted-foreground sm:block">
                {email}
                {roleLoading ? null : isAdmin ? (
                  <span className="ml-1 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                    admin
                  </span>
                ) : null}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/auth">
                <LogIn className="mr-1 h-4 w-4 transition-all duration-100" /> Iniciar sesión
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
