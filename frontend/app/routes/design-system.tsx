import { useTranslation } from "react-i18next";

export default function DesignSystemPage() {
    const { t } = useTranslation();

    return (
        <main className="p-8">
            <h1 className="text-3xl font-bold mb-8">{t('seo.title')}</h1>
            <p className="text-gray-600">{t('common.loading')}</p>
        </main>
    );
}
