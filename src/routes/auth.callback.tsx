import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
<<<<<<< HEAD
  component: () => {
    const navigate = useNavigate();
    useEffect(() => {
      supabase.auth.getSession().then(() => navigate({ to: "/", replace: true }));
    }, [navigate]);
    return <p className="p-6 text-sm text-muted-foreground">Iniciando sesión…</p>;
  },
});
=======
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(() => navigate({ to: "/", replace: true }));
  }, [navigate]);
  return <p className="p-6 text-sm text-muted-foreground">Iniciando sesión…</p>;
}
>>>>>>> 9f61cefcb526b5cd717ecec664f84d55773fd664
