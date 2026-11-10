import { useLoaderData } from "react-router";
import { getPublicNotice } from "~/services/publicService.server";
import type { Notice } from "~/services/noticeService";
import { getSiteUrl } from "~/utils/env.server";
import { webPageJsonLd } from "~/utils/jsonld";
import { buildMeta } from "~/utils/seo";
import { noticeCard, shareImagePaths } from "~/utils/shareCards";

export async function loader({ params }: { params: { id: string } }) {
    const siteUrl = getSiteUrl();
    try {
        const notice = await getPublicNotice(params.id);
        return { notice, notFound: false, siteUrl };
    } catch {
        return { notice: null, notFound: true, siteUrl };
    }
}

export function meta({ data: routeData }: { data: { notice: Notice | null; notFound: boolean; siteUrl: string } }) {
    if (routeData.notFound || !routeData.notice) {
        return [
            { title: "Anuncio no encontrado - Yambo" },
            { name: "description", content: "El anuncio solicitado no está disponible." },
            { name: "robots", content: "noindex" },
        ];
    }
    const notice = routeData.notice;
    return [
        ...buildMeta({
            siteUrl: routeData.siteUrl,
            path: `/anuncios/${notice.slug ?? notice.id}`,
            title: `${notice.title} | Yambo`,
            description: notice.title,
            image: shareImagePaths.notice(notice, noticeCard(notice)),
            imageAlt: notice.title,
        }),
        { "script:ld+json": webPageJsonLd({
            name: notice.title,
            description: notice.title,
            url: `${routeData.siteUrl}/anuncios/${notice.slug ?? notice.id}`,
        })},
    ];
}

export default function NoticeDetailView() {
    const { notice, notFound } = useLoaderData<typeof loader>();

    if (notFound || !notice) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 text-center">
                <h1 className="text-4xl font-extrabold font-display text-yambo-black mb-4">
                    Anuncio no encontrado
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    El anuncio que buscas no está disponible o ha sido retirado.
                </p>
                <a
                    href="/anuncios"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                >
                    Volver al tablón →
                </a>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <p className="text-sm text-gray-400 mb-2">
                {new Date(notice.publishedAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                })}
            </p>
            <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-8">
                {notice.title}
            </h1>
            <div
                className="prose prose-yambo max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: notice.content }}
            />
        </div>
    );
}
