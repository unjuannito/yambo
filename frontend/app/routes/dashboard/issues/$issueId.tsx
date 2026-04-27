import { useParams } from 'react-router';
import { IssueDetailComponent } from '~/components/issues';
import { useAuth } from '~/hooks/useAuth';

export default function IssueDetailPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const { user } = useAuth();

    const isAdmin = user?.permissions?.some(
        (perm) => perm.obj === 'issue' && perm.actions.includes('update')
    ) || false;

    if (!issueId) {
        return (
            <div className="p-8 text-center text-gray-400">
                ID de incidencia no proporcionado
            </div>
        );
    }

    return (
        <main className="flex flex-col p-4 md:p-5 w-full md:w-[calc(100vw-16rem)]">
            <IssueDetailComponent
                issueId={issueId}
                isAdmin={isAdmin}
            />
        </main>
    );
}
