import { useEffect } from "react";
import { useNavigate } from "react-router";
import type { Route } from "./+types/index";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Guías y Wiki" },
        { name: "description", content: "Guías paso a paso para configurar y mantener la web de Yambo" },
    ];
}

export default function GuidesIndex() {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/mi-espacio/admin/guias/configuracion", { replace: true });
    }, [navigate]);

    return null;
}
