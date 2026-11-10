import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight, faBullhorn } from "@fortawesome/free-solid-svg-icons";
import { noticeService, type Notice } from "~/services/noticeService";

function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function LatestNoticesList() {
    const { t } = useTranslation();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        noticeService
            .getActiveNotices()
            .then((data) => setNotices(data.slice(0, 5)))
            .catch(() => setNotices([]))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return null;
    }

    if (notices.length === 0) {
        return null;
    }

    return (
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
                <h2 className="text-sm font-bold font-display text-gray-500 uppercase tracking-wider">
                    {t("dashboard.latestNotices")}
                </h2>
                <Link
                    to="/mi-espacio/admin/anuncios"
                    className="text-sm text-yambo-green-600 hover:text-yambo-green-700 font-semibold inline-flex items-center gap-1.5 transition-colors shrink-0"
                >
                    {t("dashboard.viewAll")}
                    <FontAwesomeIcon icon={faArrowRight} className="w-3 h-3" />
                </Link>
            </div>

            <div className="divide-y divide-gray-50 pb-2">
                {notices.map((notice) => (
                    <div key={notice.id} className="flex items-start gap-3 px-4 py-2.5 mx-2">
                        <FontAwesomeIcon icon={faBullhorn} className="w-4 h-4 text-yambo-green-500 mt-1 shrink-0" />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-yambo-black truncate">
                                {notice.title}
                            </p>
                            <p className="text-xs text-gray-400">{formatDate(notice.publishedAt)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
