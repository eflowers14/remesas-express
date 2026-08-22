import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRole } from "@/lib/catalog.functions";

export function AppFooter() {

    return(
        <footer className="bottom-0 z-40 backdrop-blur">
            <div className="pb-6 mx-auto px-4 text-center text-sm text-muted-foreground sm:px-6 lg:max-w-7xl lg:px-8">
                <p>Válido para todas las Remesas:</p>
                <p>- Foto clara de comprobante con fecha, hora y numero de transacción</p>
                <p>- Nombre y Apellido de quien envía</p>
                <p>- No poner nada relacionado con Cuba</p>
                <p>- No hay devolución de remesas, lea bien los precios antes de proceder</p>
                <p>- Usted es responsable de su envío bajo todas las vías legales, si no quiere asumir no envíe nada</p>
                <h4>&copy; 2026 Flowers INC. Todos los derechos reservados.</h4>
            </div>
        </footer>
    );
}
