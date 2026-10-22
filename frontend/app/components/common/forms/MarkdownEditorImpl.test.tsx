import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import MarkdownEditorImpl from "./MarkdownEditorImpl";

const uploadMock = vi.fn();
let lastImagePluginArgs: any = null;

vi.mock("~/services/fileService", () => ({
    fileService: {
        upload: (...args: any[]) => uploadMock(...args),
    },
}));

vi.mock("@mdxeditor/editor", () => {
    const pluginFactory = (name: string) => () => ({ name });

    const MDXEditor = ({ markdown, onChange, readOnly, className, plugins }: any) => {
        const toolbarPlugin = plugins.find((p: any) => p?.name === "toolbar");
        return (
            <div data-testid="mdx-editor" data-readonly={String(readOnly)} data-classname={className}>
                <div data-testid="markdown-value">{markdown}</div>
                <button onClick={() => onChange?.("updated")}>trigger-change</button>
                {toolbarPlugin ? toolbarPlugin.config.toolbarContents() : null}
            </div>
        );
    };

    const toolbarPlugin = (config: any) => ({ name: "toolbar", config });
    const imagePlugin = (args: any) => {
        lastImagePluginArgs = args;
        return { name: "image" };
    };

    const BoldItalicUnderlineToggles = ({ options }: any) => (
        <div data-testid="toggle-options">{options.join(",")}</div>
    );

    const BlockTypeSelect = () => <div data-testid="block-type" />;
    const ListsToggle = () => <div data-testid="lists" />;
    const CreateLink = () => <div data-testid="link" />;
    const InsertImage = () => <div data-testid="image" />;
    const InsertTable = () => <div data-testid="table" />;

    return {
        MDXEditor,
        headingsPlugin: pluginFactory("headings"),
        listsPlugin: pluginFactory("lists"),
        quotePlugin: pluginFactory("quote"),
        thematicBreakPlugin: pluginFactory("thematic"),
        markdownShortcutPlugin: pluginFactory("shortcut"),
        toolbarPlugin,
        BoldItalicUnderlineToggles,
        BlockTypeSelect,
        ListsToggle,
        CreateLink,
        InsertImage,
        codeBlockPlugin: pluginFactory("codeblock"),
        codeMirrorPlugin: pluginFactory("codemirror"),
        frontmatterPlugin: pluginFactory("frontmatter"),
        tablePlugin: pluginFactory("tableplugin"),
        linkDialogPlugin: pluginFactory("linkdialog"),
        imagePlugin,
        sandpackPlugin: pluginFactory("sandpack"),
        directivesPlugin: pluginFactory("directives"),
        linkPlugin: pluginFactory("linkplugin"),
        InsertTable,
    };
});

describe("MarkdownEditorImpl", () => {
    beforeEach(() => {
        uploadMock.mockReset();
        lastImagePluginArgs = null;
    });

    it("renders read-only editor without toolbar and applies viewer class", () => {
        render(<MarkdownEditorImpl value="hello" readOnly />);

        const editor = screen.getByTestId("mdx-editor");
        expect(editor).toHaveAttribute("data-readonly", "true");
        expect(editor).toHaveAttribute("data-classname", "prose mdxeditor-viewer ");
        expect(screen.queryByTestId("block-type")).not.toBeInTheDocument();
    });

    it("renders toolbar items based on toolbarOptions and calls onChange", () => {
        const onChange = vi.fn();

        render(
            <MarkdownEditorImpl
                value="content"
                onChange={onChange}
                toolbarOptions={["bold", "italic", "blockType", "lists", "link", "image", "table"]}
            />,
        );

        expect(screen.getByTestId("toggle-options").textContent).toBe("Bold,Italic");
        expect(screen.getByTestId("block-type")).toBeInTheDocument();
        expect(screen.getByTestId("lists")).toBeInTheDocument();
        expect(screen.getByTestId("link")).toBeInTheDocument();
        expect(screen.getByTestId("image")).toBeInTheDocument();
        expect(screen.getByTestId("table")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "trigger-change" }));
        expect(onChange).toHaveBeenCalledWith("updated");
    });

    it("hides toolbar when toolbarOptions is empty", () => {
        render(<MarkdownEditorImpl value="content" toolbarOptions={[]} />);

        expect(screen.queryByTestId("toggle-options")).not.toBeInTheDocument();
        expect(screen.queryByTestId("block-type")).not.toBeInTheDocument();
    });

    it("passes image upload handler to image plugin and uploads file", async () => {
        uploadMock.mockResolvedValue({ url: "https://cdn/img.png" });

        render(<MarkdownEditorImpl value="content" />);

        const file = new File(["abc"], "pic.png", { type: "image/png" });
        const uploadedUrl = await lastImagePluginArgs.imageUploadHandler(file);

        expect(uploadMock).toHaveBeenCalledWith(file);
        expect(uploadedUrl).toBe("https://cdn/img.png");
        expect(lastImagePluginArgs.allowSetImageDimensions).toBe(true);
    });
});
