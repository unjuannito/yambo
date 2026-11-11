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
import MarkdownInsertImageButton from "./MarkdownInsertImageButton";

async function handleImageUpload(file: File): Promise<string> {
    const uploaded = await fileService.upload(file);
    return uploaded.url;
}

import "@mdxeditor/editor/style.css";

export type MarkdownEditorToolbarOption =
    | "bold"
    | "italic"
    | "underline"
    | "blockType"
    | "lists"
    | "link"
    | "image"
    | "table";

const DEFAULT_TOOLBAR_OPTIONS: MarkdownEditorToolbarOption[] = [
    "bold",
    "italic",
    "underline",
    "blockType",
    "lists",
    "link",
    "image",
    "table",
];

const TEXT_STYLE_TOOLBAR_OPTIONS = ["bold", "italic", "underline"] as const;

function getTextStyleOptions(toolbarOptions: MarkdownEditorToolbarOption[]) {
    return TEXT_STYLE_TOOLBAR_OPTIONS.filter((option) =>
        toolbarOptions.includes(option),
    ).map(
        (option) =>
            option.charAt(0).toUpperCase() +
            option.slice(1),
    ) as ("Bold" | "Italic" | "Underline")[];
}

type MarkdownEditorImplProps = {
    value: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    className?: string;
    toolbarOptions?: MarkdownEditorToolbarOption[];
};

export default function MarkdownEditorImpl({
    value,
    onChange,
    readOnly = false,
    className = "",
    toolbarOptions = DEFAULT_TOOLBAR_OPTIONS,
}: MarkdownEditorImplProps) {
    const textStyleOptions = getTextStyleOptions(toolbarOptions);
    const shouldShowToolbar = !readOnly && toolbarOptions.length > 0;
    const toolbarPlugins = shouldShowToolbar
        ? [
              toolbarPlugin({
                  toolbarContents: () => (
                      <>
                          {textStyleOptions.length > 0 ? (
                              <BoldItalicUnderlineToggles
                                  options={textStyleOptions}
                              />
                          ) : null}
                          {toolbarOptions.includes("blockType") ? (
                              <BlockTypeSelect />
                          ) : null}
                          {toolbarOptions.includes("lists") ? (
                              <ListsToggle />
                          ) : null}
                          {toolbarOptions.includes("link") ? (
                              <CreateLink />
                          ) : null}
                          {toolbarOptions.includes("image") ? (
                              <MarkdownInsertImageButton />
                          ) : null}
                          {toolbarOptions.includes("table") ? (
                              <InsertTable />
                          ) : null}
                      </>
                  ),
              }),
          ]
        : [];

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
            // The settings/edit dialog on an already-inserted image is the same
            // unstyled native dialog our own toolbar button replaces above, and
            // isn't exposed as a swappable component — simplest to just hide it;
            // delete + re-insert covers the same ground.
            disableImageSettingsButton: true,
        }),
        sandpackPlugin(),
        directivesPlugin(),
        linkPlugin(),
        ...toolbarPlugins,
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
