import React, { Suspense } from "react";

const LazyMDXEditor = React.lazy(() => import("./MarkdownEditorImpl"));

import type { MarkdownEditorToolbarOption } from "./MarkdownEditorImpl";

type MarkdownEditorProps = {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    className?: string;
    toolbarOptions?: MarkdownEditorToolbarOption[];
};

export default function MarkdownEditor(props: MarkdownEditorProps) {
    return (
        <Suspense
            fallback={
                <div className="prose animate-pulse rounded-lg bg-gray-100 h-48" />
            }
        >
            <LazyMDXEditor {...props} />
        </Suspense>
    );
}
