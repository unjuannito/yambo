import { useLoaderData } from "react-router";
import { getPublishedLegalPage } from "~/services/publicService.server";
import type { LegalPage } from "~/services/legalPageService";

export async function loader({ params }: { params: { id: string } }) {
    const page = await getPublishedLegalPage(params.id);
    return page;
}

export function meta({ data }: { data: LegalPage }) {
    return [
        { title: `Yambo - ${data.title}` },
        { name: "description", content: data.title },
    ];
}

export default function LegalPageView() {
    const page = useLoaderData<typeof loader>();

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
