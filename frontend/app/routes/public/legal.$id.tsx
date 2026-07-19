import { useLoaderData } from "react-router";
import { getPublishedLegalPage } from "~/services/publicService.server";
import type { LegalPage } from "~/services/legalPageService";
import { data } from "react-router";

export async function loader({ params }: { params: { id: string } }) {
    try {
        const page = await getPublishedLegalPage(params.id);
        return { page, notFound: false };
    } catch {
        return { page: null, notFound: true };
    }
}

export function meta({ data: routeData }: { data: { page: LegalPage | null; notFound: boolean } }) {
    if (routeData.notFound || !routeData.page) {
        return [
            { title: "Página no encontrada - Yambo" },
            { name: "description", content: "La página legal solicitada no está disponible." },
            { name: "robots", content: "noindex" },
        ];
    }
    const page = routeData.page;
    return [
        { title: `Yambo - ${page.title}` },
        { name: "description", content: page.title },
    ];
}

export default function LegalPageView() {
    const { page, notFound } = useLoaderData<typeof loader>();

    if (notFound || !page) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-24 text-center">
                <h1 className="text-4xl font-extrabold font-display text-yambo-black mb-4">
                    Página no encontrada
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    La página legal que buscas no está disponible o ha sido movida.
                </p>
                <a
                    href="/"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 text-white rounded-full font-semibold hover:shadow-lg transition-all"
                >
                    Volver al inicio →
                </a>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-12">
            <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-8">
                {page.title}
            </h1>
            <div
                className="prose prose-yambo max-w-none text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: page.content }}
            />
            {page.updatedAt && (
                <p className="mt-12 text-xs text-gray-400 border-t border-gray-200 pt-4">
                    Última actualización: {new Date(page.updatedAt).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    })}
                </p>
            )}
        </div>
    );
}
