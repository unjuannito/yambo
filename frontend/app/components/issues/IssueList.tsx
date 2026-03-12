import React, { useState, useEffect } from "react";
import type { Issue } from "~/types/issueType";
import { issueService } from "~/services/issueService";
import { IssueStatusBadge } from "./IssueStatusBadge";
import { IssueForm } from "./IssueForm";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import ButtonComponent from "~/components/common/forms/ButtonComponent";

interface IssueListProps {
    orderId: string;
    orderedProducts?: { id: string; name: string }[];
    onSelectIssue?: (issueId: string) => void;
}

export const IssueList: React.FC<IssueListProps> = ({
    orderId,
    orderedProducts = [],
    onSelectIssue,
}) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);

    const loadIssues = async () => {
        try {
            setLoading(true);
            const data = await issueService.getIssuesByOrder(orderId);
            setIssues(data);
            setError(null);
        } catch (err) {
            setError(
                getErrorMessage(err, "Error al cargar las incidencias"),
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadIssues();
    }, [orderId]);

    const handleFormSuccess = () => {
        setShowForm(false);
        loadIssues();
    };

    if (loading) {
        return <div className="text-center py-4 text-gray-400">Cargando incidencias...</div>;
    }

    return (
        <div className="space-y-4">
            {error && <ErrorMessage message={error} onRetry={loadIssues} />}

            {issues.length === 0 && !showForm ? (
                <div className="bg-yambo-green-50/30 rounded-2xl p-8 text-center border border-gray-100">
                    <p className="text-gray-400 mb-4">
                        No hay incidencias reportadas para este pedido
                    </p>
                    <ButtonComponent
                        onClick={() => setShowForm(true)}
                        variant="primary"
                    >
                        Reportar incidencia
                    </ButtonComponent>
                </div>
            ) : (
                <>
                    {issues.length > 0 && (
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold font-display text-yambo-black">
                                Incidencias reportadas ({issues.length})
                            </h2>
                            <ButtonComponent
                                onClick={() => setShowForm(!showForm)}
                                variant="primary"
                            >
                                {showForm ? "Cancelar" : "Nueva incidencia"}
                            </ButtonComponent>
                        </div>
                    )}

                    {showForm && (
                        <IssueForm
                            orderedProducts={orderedProducts}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setShowForm(false)}
                        />
                    )}

                    {issues.length > 0 && (
                        <div className="grid gap-4">
                            {issues.map((issue) => (
                                <div
                                    key={issue.id}
                                    onClick={() =>
                                        onSelectIssue && onSelectIssue(issue.id)
                                    }
                                    className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-yambo-black">
                                            {issue.title}
                                        </h3>
                                        <IssueStatusBadge
                                            status={issue.status}
                                        />
                                    </div>
                                    <p className="text-gray-400 text-sm mb-2">
                                        {issue.description}
                                    </p>
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>ID: {issue.id}</span>
                                        <span>
                                            {new Date(
                                                issue.createdAt,
                                            ).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
