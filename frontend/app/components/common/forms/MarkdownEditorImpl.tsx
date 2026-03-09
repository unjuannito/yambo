import {
    MDXEditor,
    headingsPlugin,
    listsPlugin,
    quotePlugin,
    thematicBreakPlugin,
    markdownShortcutPlugin,
    toolbarPlugin,
    BoldItalicUnderlineToggles,
    BlockTypeSelect,
    ListsToggle,
    CreateLink,
    InsertImage,
    codeBlockPlugin,
    codeMirrorPlugin,
    frontmatterPlugin,
    tablePlugin,
    linkDialogPlugin,
    imagePlugin,
    sandpackPlugin,
    directivesPlugin,
    linkPlugin,
    InsertTable,
} from "@mdxeditor/editor";

import { fileService } from "~/services/fileService";

async function handleImageUpload(file: File): Promise<string> {
    const uploaded = await fileService.upload(file);
    return uploaded.url;
}

import "@mdxeditor/editor/style.css";

type MarkdownEditorImplProps = {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    className?: string;
};

export default function MarkdownEditorImpl({
    value,
    onChange,
    readOnly = false,
    className = "",
}: MarkdownEditorImplProps) {
    const plugins = [
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        markdownShortcutPlugin(),
        codeBlockPlugin(),
        codeMirrorPlugin(),
        frontmatterPlugin(),
        tablePlugin(),
        linkDialogPlugin(),
        imagePlugin({
            imageUploadHandler: handleImageUpload,
            allowSetImageDimensions: true,
        }),
        sandpackPlugin(),
        directivesPlugin(),
        linkPlugin(),
        ...(readOnly
            ? []
            : [
                  toolbarPlugin({
                      toolbarContents: () => (
                          <>
                              <BoldItalicUnderlineToggles />
                              <BlockTypeSelect />
                              <ListsToggle />
                              <CreateLink />
                              <InsertImage />
                              <InsertTable />
                          </>
                      ),
                  }),
              ]),
    ];

    return (
        <div className={`prose`}>
            <MDXEditor
                markdown={value}
                onChange={onChange}
                readOnly={readOnly}
                plugins={plugins}
                className={
                    readOnly ? `prose mdxeditor-viewer ${className}` : className
                }
            />
        </div>
    );
}
