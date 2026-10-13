import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { adminUserService } from "~/services/adminUserService";
import { getErrorMessage } from "~/types/error";
import type { User } from "~/types/userType";

/** Búsqueda de usuarios por nombre o correo, con espera de 300 ms entre pulsaciones. */
export function useUserSearch(query: string) {
    const { t } = useTranslation();
    const [results, setResults] = useState<User[]>([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        const trimmed = query.trim();
        if (!trimmed) {
            setResults([]);
            setSearching(false);
            return;
        }
        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await adminUserService.listUsers({ query: trimmed, page: 0, size: 10 });
                setResults(res.content);
            } catch (err) {
                toast.error(getErrorMessage(err, t("staff.usersLoadError")));
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [query]);

    return { results, searching };
}
