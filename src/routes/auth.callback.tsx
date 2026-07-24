import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  component: () => {
    const navigate = useNavigate();
    useEffect(() => {
      supabase.auth.getSession().then(() => navigate({ to: "/", replace: true }));
    }, [navigate]);
    return <p className="p-6 text-sm text-muted-foreground">Iniciando sesión…</p>;
  },
});
