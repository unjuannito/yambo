import { useEffect } from "react";
import { useParams, useNavigate } from "react-router";

export default function UserIndex() {
    const { userId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        if (userId) {
            navigate(`/mi-espacio/admin/usuarios/${userId}/perfil`, { replace: true });
        }
    }, [userId, navigate]);

    return null;
}
