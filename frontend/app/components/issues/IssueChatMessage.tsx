import React from "react";
import { useTranslation } from "react-i18next";
import { ISSUE_STATUS_CONFIG } from "~/types/issueType";
import { ChatContentRenderer } from "./ChatContentRenderer";

interface IssueChatMessageProps {
    message: {
        id: string;
        text: string;
        createdAt: string;
        userId: string;
        userName: string;
        status?: string;
        isDescription?: boolean;
    };
    isRight: boolean;
    isFromCreator: boolean;
    isGroupedWithPrevious?: boolean;
    isGroupedWithNext?: boolean;
    hideRepeatedStatus?: boolean;
}

export const IssueChatMessage: React.FC<IssueChatMessageProps> = ({
    message,
    isRight,
    isFromCreator,
    isGroupedWithPrevious = false,
    isGroupedWithNext = false,
    hideRepeatedStatus = false,
}) => {
    const { t } = useTranslation();
    return (
        <div className={`flex flex-col ${isRight ? "items-end" : "items-start"} ${isGroupedWithPrevious ? "space-y-0.5" : "space-y-1"}`}>
            {!isGroupedWithPrevious && (
                <div className={`flex items-center gap-1.5 px-0.5 ${isRight ? "flex-row-reverse" : ""}`}>
                    <div className={`h-6 w-6 rounded-full text-[10px] font-black flex items-center justify-center text-white shadow-sm ring-2 ring-white ${isFromCreator ? "bg-blue-500" : "bg-yambo-green-500"}`}>
                       {(message.userName || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-extrabold text-yambo-black/70">{message.userName}</span>
                            {message.status && !hideRepeatedStatus && (
                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-1 ring-inset ${ISSUE_STATUS_CONFIG[message.status as keyof typeof ISSUE_STATUS_CONFIG].className}`}>
                                    {ISSUE_STATUS_CONFIG[message.status as keyof typeof ISSUE_STATUS_CONFIG].label}
                                </span>
                            )}
                            {message.isDescription && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full ring-1 ring-inset bg-slate-100 text-slate-500 ring-slate-200">{t('issues.description')}</span>}
                        </div>
                    </div>
                </div>
            )}
            <div className={`max-w-[85%] lg:max-w-[75%] px-3 py-2.5 rounded-[10px] text-[13px] shadow-sm relative group transition-all hover:shadow-md ${isRight ? "bg-yambo-green-600 text-white border-2 border-yambo-green-700" : "bg-white text-yambo-black border-2 border-slate-100"} ${isRight ? (isGroupedWithPrevious ? "rounded-tr-md" : "rounded-tr-none") : (isGroupedWithPrevious ? "rounded-tl-md" : "rounded-tl-none")} ${isRight ? (isGroupedWithNext ? "rounded-br-md" : "rounded-br-[10px]") : (isGroupedWithNext ? "rounded-bl-md" : "rounded-bl-[22px]")}`}>
                <ChatContentRenderer text={message.text || ""} isRightSide={isRight} />
                <p className={`text-[8px] font-bold mt-1 ${isRight ? "text-yambo-green-100/60" : "text-gray-300"} text-right uppercase tracking-tight`}>
                    {new Date(message.createdAt).toLocaleTimeString("es-ES", { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
        </div>
    );
};
