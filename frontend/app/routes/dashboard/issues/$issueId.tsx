import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useParams } from "react-router";
import type { IssueDetail, IssueStatus, IssueWatcher } from "~/types/issueType";
import { issueService } from "~/services/issueService";
import { IssueStatusBadge, IssueCommentForm, IssueSidebarInfo, IssueChatMessage } from "~/components/issues";
import { ErrorMessage } from "~/components/common/ErrorMessage";
import { getErrorMessage } from "~/types/error";
import { useAuth } from "~/hooks/useAuth";

export default function IssueDetailPage() {
    const { issueId } = useParams<{ issueId: string }>();
    const { user: currentUser } = useAuth();
    const scrollRef = useRef<HTMLDivElement>(null);

    const [issue, setIssue] = useState<IssueDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [watchers, setWatchers] = useState<IssueWatcher[]>([]);
    const [watchersLoading, setWatchersLoading] = useState(false);
    const [relatedOrderId, setRelatedOrderId] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    const isAdmin = useMemo(() => 
        currentUser?.permissions?.some(p => p.obj === 'issue' && p.actions.includes('update')) || false,
    [currentUser]);

    const loadIssue = async () => {
        if (!issueId) return;
        try {
            setLoading(true);
            const [data, list] = await Promise.all([
                issueService.getIssue(issueId),
                issueService.getAllIssues(0, 1, undefined, undefined, undefined, undefined, issueId).catch(() => null)
            ]);
            setIssue(data);
            setRelatedOrderId(list?.content?.[0]?.orderId || null);
            setError(null);
        } catch (err) {
            setError(getErrorMessage(err, "Error al cargar la incidencia"));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadIssue(); }, [issueId]);

    useEffect(() => {
        if (!isAdmin || !issueId) return;
        setWatchersLoading(true);
        issueService.getWatchers(issueId)
            .then(setWatchers)
            .catch(() => setWatchers([]))
            .finally(() => setWatchersLoading(false));
    }, [issueId, isAdmin]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [issue?.comments?.length]);

    type IssueMessage = {
        id: string;
        text: string;
        createdAt: string;
        userId: string;
        userName: string;
        status?: IssueStatus;
        isDescription?: boolean;
    };

    const messages = useMemo(() => {
        if (!issue) return [] as IssueMessage[];

        const descriptionMessage: IssueMessage = {
            id: 'description',
            text: issue.description,
            createdAt: issue.createdAt,
            userId: issue.createdBy,
            userName: issue.userName || issue.createdBy,
            isDescription: true,
        };

        const commentMessages: IssueMessage[] = (issue.comments || [])
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
            .map((comment) => ({
                id: comment.id,
                text: comment.text,
                createdAt: comment.createdAt,
                userId: comment.userId,
                userName: comment.userName || "Usuario",
                status: comment.status,
            }));

        return [
            descriptionMessage,
            ...commentMessages,
        ];
    }, [issue]);

    const handleAddWatcher = async (email: string, userId?: string) => {
        const w = await issueService.addWatcher(issueId!, email, userId);
        setWatchers(p => [...p, w]);
    };

    const handleRemoveWatcher = async (email: string) => {
        await issueService.removeWatcher(issueId!, email);
        setWatchers(p => p.filter(w => w.email !== email));
    };

    if (loading) return (
        <div className="flex items-center justify-center h-screen text-xs font-bold uppercase tracking-widest text-gray-400 animate-pulse w-full">
            Cargando incidencia...
        </div>
    );

    if (error || !issue) return (
        <div className="p-8">
            <ErrorMessage message={error || "No encontrada"} onRetry={loadIssue} />
        </div>
    );

    const sidebar = (
        <IssueSidebarInfo
            issue={issue}
            isAdmin={isAdmin}
            relatedOrderId={relatedOrderId}
            watchers={watchers}
            loadingWatchers={watchersLoading}
            onUpdateProducts={() => { }}
            onAddWatcher={handleAddWatcher}
            onRemoveWatcher={handleRemoveWatcher}
        />
    );

    return (
        <main className="flex flex-col h-[calc(100%-24px)] overflow-hidden lg:grid lg:grid-cols-12 bg-white border-2 border-slate-200 lg:rounded-[32px] lg:shadow-xl m-3">
            <header className="p-4 lg:p-6 col-span-12 border-b-2 border-slate-200 bg-slate-50/50 grid grid-rows-12 grid-flow-col">
                <span className="inline-flex items-center text-gray-400 uppercase truncate row-span-6 text-xs">
                    <Link to="/mi-espacio/incidencias" className="hover:text-yambo-green-600 text-base transition-colors font-bold text-yambo-black">Incidencias</Link>
                    / 
                    #{issue.id}
                </span>
                <h1 className="text-xl lg:text-2xl font-black text-yambo-black truncate tracking-tight row-span-6">
                    {issue.title}
                </h1>
                <button type="button" onClick={() => setShowInfo(true)} className="lg:hidden h-9 w-9 rounded-full bg-white flex items-center justify-center text-gray-500 border-2 border-slate-200 active:scale-90 transition-all hover:shadow-sm row-span-12">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                </button>
                <IssueStatusBadge status={issue.status} className="row-span-12 justify-self-end self-start w-fit" />
            </header>

            <main className="flex-1 min-h-0 flex flex-col overflow-hidden lg:col-span-8 bg-white lg:border-r-2 lg:border-slate-200">
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-slate-50/[0.15]">
                    {messages.map((c, i) => {
                        const isRight = c.userId === currentUser?.id;
                        const previousMessage = i > 0 ? messages[i - 1] : null;
                        const nextMessage = i < messages.length - 1 ? messages[i + 1] : null;
                        const hideRepeatedStatus = !!c.status && previousMessage?.status === c.status;
                        const sameDayAsPrevious = previousMessage
                            ? new Date(c.createdAt).toDateString() === new Date(previousMessage.createdAt).toDateString()
                            : false;
                        const sameDayAsNext = nextMessage
                            ? new Date(c.createdAt).toDateString() === new Date(nextMessage.createdAt).toDateString()
                            : false;
                        const isGroupedWithPrevious = !!previousMessage && sameDayAsPrevious && previousMessage.userId === c.userId;
                        const isGroupedWithNext = !!nextMessage && sameDayAsNext && nextMessage.userId === c.userId;
                        const showDate = i === 0 || new Date(c.createdAt).toDateString() !== new Date(messages[i - 1].createdAt).toDateString();

                        return (
                            <React.Fragment key={c.id}>
                                {showDate && (
                                    <div className="flex justify-center my-5">
                                        <span className="bg-white px-4 py-1.5 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] border-2 border-slate-100 shadow-sm">
                                            {new Date(c.createdAt).toLocaleDateString("es-ES", { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                                <div className={isGroupedWithPrevious ? "mt-1" : "mt-3"}>
                                    <IssueChatMessage
                                        message={c}
                                        isRight={isRight}
                                        isFromCreator={c.userId === issue.createdBy}
                                        isGroupedWithPrevious={isGroupedWithPrevious}
                                        isGroupedWithNext={isGroupedWithNext}
                                        hideRepeatedStatus={hideRepeatedStatus}
                                    />
                                </div>
                            </React.Fragment>
                        );
                    })}
                </div>

                <div className="p-4 md:p-6 border-t-2 border-slate-200 bg-white">
                    <IssueCommentForm issueId={issueId!} currentStatus={issue.status} canUpdateStatus={isAdmin} onSuccess={loadIssue} />
                </div>
            </main>

            <aside className="hidden lg:block lg:col-span-4 h-full overflow-y-auto custom-scrollbar bg-slate-50/30 p-4">
                {sidebar}
            </aside>

            {showInfo && (
                <div className="lg:hidden fixed inset-0 z-[100] flex flex-col justify-end">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowInfo(false)} role="presentation" />
                    <div className="relative bg-white rounded-t-[32px] p-6 max-h-[85vh] overflow-y-auto custom-scrollbar animate-in slide-in-from-bottom duration-300">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-6" />
                        {sidebar}
                    </div>
                </div>
            )}
        </main>
    );
}
