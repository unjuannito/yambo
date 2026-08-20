import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";

export default function ProjectIndex() {
    const { projectId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (projectId) {
            navigate(`/mi-espacio/proyectos/${projectId}/equipos`, { replace: true });
        }
    }, [projectId, navigate]);

    return null;
}
