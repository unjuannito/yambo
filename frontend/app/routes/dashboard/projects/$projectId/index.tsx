import { Navigate, useParams } from "react-router";

/** La pestaña por defecto de un proyecto, y el destino de las antiguas «equipos» y «personal». */
export default function ProjectIndex() {
    const { projectId } = useParams();
    return <Navigate to={`/mi-espacio/proyectos/${projectId}/equipo`} replace />;
}
