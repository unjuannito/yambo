import { useLoaderData, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBullhorn, faThumbtack } from "@fortawesome/free-solid-svg-icons";
import type { Notice } from "~/services/noticeService";
import { getPublicNotices } from "~/services/publicService.server";

function getImageSrc(notice: Notice): string | null {
    if (!notice.image) return null;
    return notice.image.startsWith("/") ? `/api${notice.image}` : notice.image;
}
import { getSiteUrl } from "~/utils/env.server";
import { collectionPageJsonLd, breadcrumbJsonLd, itemListJsonLd } from "~/utils/jsonld";
import { buildMeta } from "~/utils/seo";
import type { Route } from "./+types/anuncios";

export async function loader() {
    const notices = await getPublicNotices();
    return { notices, siteUrl: getSiteUrl() };
}

export function meta({ data }: Route.MetaArgs) {
    const { t } = useTranslation();
    const siteUrl = data?.siteUrl ?? "";
    const title = t("public.noticesTitle");
    const description = t("public.noticesMetaDescription");

    return [
        ...buildMeta({
            siteUrl,
            path: "/anuncios",
            title,
            description,
        }),
        { "script:ld+json": collectionPageJsonLd({ name: title, description, url: `${siteUrl}/anuncios` }) },
        { "script:ld+json": breadcrumbJsonLd([
            { name: t("nav.home"), url: siteUrl },
            { name: title, url: `${siteUrl}/anuncios` },
        ]) },
        { "script:ld+json": itemListJsonLd(
            (data?.notices ?? []).map((n) => ({ name: n.title, url: `${siteUrl}/anuncios/${n.slug ?? n.id}` })),
        ) },
    ];
}

export default function PublicNotices() {
    const { t } = useTranslation();
    const { notices } = useLoaderData<typeof loader>();

    return (
        <section className="w-full bg-gradient-to-b from-yambo-green-50/30 to-yambo-white min-h-screen pt-12 pb-16">
            <div className="max-w-4xl mx-auto px-4">
                <div className="fade-up">
                    <h1 className="text-4xl font-extrabold text-yambo-black mb-2 font-display">
                        {t("public.noticesTitle")}
                    </h1>
                    <p className="text-gray-500 mb-10">{t("public.noticesSubtitle")}</p>
                </div>

                {notices.length === 0 ? (
                    <div className="text-center py-24 fade-up">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-yambo-green-50 mb-6">
                            <FontAwesomeIcon icon={faBullhorn} className="w-10 h-10 text-yambo-green-300" />
                        </div>
                        <h2 className="text-xl font-bold text-yambo-black mb-2">{t("public.noticesEmpty")}</h2>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notices.map((notice) => (
                            <Link
                                key={notice.id}
                                to={`/anuncios/${notice.slug ?? notice.id}`}
                                className="flex flex-col sm:flex-row gap-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md hover:border-yambo-green-200 transition-all fade-up"
                            >
                                {getImageSrc(notice) && (
                                    <div className="shrink-0 sm:w-48 overflow-hidden rounded-xl bg-gray-50">
                                        <img
                                            src={getImageSrc(notice)!}
                                            alt={notice.title}
                                            className="w-full h-32 sm:h-full object-cover"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0">
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
                                    <h2 className="text-xl font-bold text-yambo-black font-display">
                                        {notice.title}
                                    </h2>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
