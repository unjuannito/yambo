import { Navigate } from "react-router";

/** «Equipo» vive ahora dentro de «Proyectos y equipo»; se conserva la URL antigua. */
export default function StaffRedirect() {
    return <Navigate to="/mi-espacio/proyectos" replace />;
}
