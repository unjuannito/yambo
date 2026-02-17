import { useParams, useNavigate } from 'react-router';
import { IssueDetailComponent } from '~/components/issues';
import ButtonComponent from '~/components/common/forms/ButtonComponent';
import { useAuth } from '~/hooks/useAuth';

export default function IssueDetailPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const isAdmin = user?.permissions?.some(
        (perm) => perm.obj === 'issue' && perm.actions.includes('update')
    ) || false;

    if (!issueId) {
        return <div className="p-8 text-center">ID de incidencia no proporcionado</div>;
    }

    return (
        <main className="flex flex-col p-8 w-full md:w-[calc(100vw-16rem)]">
            <div className="mb-4">
                <ButtonComponent
                    onClick={() => navigate(-1)}
                    variant="neutral"
                    size="sm"
                >
                    ← Volver
                </ButtonComponent>
            </div>
            <IssueDetailComponent
                issueId={issueId}
                isAdmin={isAdmin}
                onClose={() => navigate(-1)}
            />
        </main>
    );
}
