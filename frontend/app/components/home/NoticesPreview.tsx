import { useMemo } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faThumbtack } from "@fortawesome/free-solid-svg-icons";
import type { Notice } from "~/services/noticeService";
import SectionWrapper from "~/components/home/SectionWrapper";

interface NoticesPreviewProps {
    title?: string;
    notices: Notice[];
    sectionIndex: number;
}

function getImageSrc(notice: Notice): string | null {
    if (!notice.image) return null;
    return notice.image.startsWith("/") ? `/api${notice.image}` : notice.image;
}

export default function NoticesPreview({ title, notices, sectionIndex }: NoticesPreviewProps) {
    const { t } = useTranslation();

    const displayNotices = useMemo(() => notices.slice(0, 3), [notices]);

    if (displayNotices.length === 0) return null;

    return (
        <SectionWrapper
            id="anuncios"
            sectionIndex={sectionIndex}
            title={title}
            subtitle={t("public.noticesSubtitle")}
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {displayNotices.map((notice) => {
                    const imageSrc = getImageSrc(notice);
                    return (
                        <Link
                            key={notice.id}
                            to={`/anuncios/${notice.slug ?? notice.id}`}
                            className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-yambo-green-200 transition-all hover-lift"
                        >
                            {imageSrc && (
                                <img src={imageSrc} alt={notice.title} className="w-full h-36 object-cover" />
                            )}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-2">
                                    {notice.pinned && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                                            <FontAwesomeIcon icon={faThumbtack} className="w-3 h-3" />
                                            {t("public.noticesPinned")}
                                        </span>
                                    )}
                                    <span className="text-xs text-gray-400">
                                        {new Date(notice.publishedAt).toLocaleDateString("es-ES", {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-yambo-black font-display">
                                    {notice.title}
                                </h3>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="text-center mt-10">
                <a
                    href="/anuncios"
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-bold text-white bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 hover:shadow-lg hover:shadow-yambo-green-500/25 transition-all duration-300"
                >
                    {t("public.noticesShowAll")}
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                </a>
            </div>
        </SectionWrapper>
    );
}
