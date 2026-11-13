import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBold, faItalic, faUnderline, faStrikethrough,
    faListUl, faListOl, faQuoteLeft, faAlignLeft, faAlignCenter, faAlignRight,
    faLink, faLinkSlash, faImage, faMinus, faRotateLeft, faRotateRight, faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { fileService } from "~/services/fileService";

/**
 * Editor visual (WYSIWYG) que guarda HTML real — no Markdown: lo que ves es
 * exactamente lo que se guarda y se muestra en la web/el correo, sin pasar
 * por una conversión intermedia. Calcado del de asocia-generica.
 */
export default function RichTextEditor({
    value,
    onChange,
    placeholder,
    disabled,
    minHeight = 200,
    className = "",
}: {
    value: string;
    onChange: (html: string) => void;
    placeholder?: string;
    disabled?: boolean;
    minHeight?: number;
    className?: string;
}) {
    const { t } = useTranslation();
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false }),
            Underline,
            Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener", target: "_blank" } }),
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            Image.configure({ HTMLAttributes: { class: "rte-img" } }),
            Placeholder.configure({ placeholder: placeholder ?? t("richTextEditor.placeholder") }),
        ],
        content: value,
        editable: !disabled,
        // SSR: el componente se renderiza en el servidor (vite SSR) y ProseMirror
        // solo puede montar en el cliente; sin esto hay error de hidratación.
        immediatelyRender: false,
        editorProps: { attributes: { class: "rte-content focus:outline-none", style: `min-height:${minHeight}px` } },
        onUpdate: ({ editor }) => onChangeRef.current(editor.isEmpty ? "" : editor.getHTML()),
    });

    // Si el valor cambia desde fuera (cargar otro anuncio para editar), se refleja en el editor.
    useEffect(() => {
        if (!editor) return;
        const current = editor.isEmpty ? "" : editor.getHTML();
        if (value !== current) editor.commands.setContent(value, false);
    }, [editor, value]);

    useEffect(() => {
        if (editor && editor.isEditable === !!disabled) editor.setEditable(!disabled, false);
    }, [editor, disabled]);

    return (
        <div className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition focus-within:border-yambo-green-400 focus-within:ring-2 focus-within:ring-yambo-green-100 ${disabled ? "opacity-70" : ""} ${className}`}>
            {editor && !disabled && <Toolbar editor={editor} />}
            <div className="px-4 py-3"><EditorContent editor={editor} /></div>
        </div>
    );
}

function Toolbar({ editor }: { editor: Editor }) {
    const { t } = useTranslation();
    const [, force] = useState(0);
    const [linkOpen, setLinkOpen] = useState(false);
    const [href, setHref] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Repinta la barra al mover el cursor para marcar qué formato está activo.
    useEffect(() => {
        const update = () => force((n) => n + 1);
        editor.on("selectionUpdate", update);
        editor.on("transaction", update);
        return () => {
            editor.off("selectionUpdate", update);
            editor.off("transaction", update);
        };
    }, [editor]);

    const chain = () => editor.chain().focus();

    const openLink = () => {
        setHref(editor.getAttributes("link").href ?? "https://");
        setLinkOpen(true);
    };

    const applyLink = () => {
        const url = href.trim();
        if (!url || url === "https://") chain().extendMarkRange("link").unsetLink().run();
        else chain().extendMarkRange("link").setLink({ href: url }).run();
        setLinkOpen(false);
    };

    const handleUpload = async (files: FileList | null) => {
        const file = files?.[0];
        if (!file || !file.type.startsWith("image/")) return;
        setUploading(true);
        try {
            const uploaded = await fileService.upload(file);
            chain().setImage({ src: uploaded.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className="border-b border-gray-100 bg-gray-50/70">
            <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
                <Tool icon={faRotateLeft} label={t("common.undo")} onClick={() => chain().undo().run()} disabled={!editor.can().undo()} />
                <Tool icon={faRotateRight} label={t("common.redo")} onClick={() => chain().redo().run()} disabled={!editor.can().redo()} />
                <Sep />
                <Tool icon={faBold} label={t("richTextEditor.bold")} active={editor.isActive("bold")} onClick={() => chain().toggleBold().run()} />
                <Tool icon={faItalic} label={t("richTextEditor.italic")} active={editor.isActive("italic")} onClick={() => chain().toggleItalic().run()} />
                <Tool icon={faUnderline} label={t("richTextEditor.underline")} active={editor.isActive("underline")} onClick={() => chain().toggleUnderline().run()} />
                <Tool icon={faStrikethrough} label={t("richTextEditor.strike")} active={editor.isActive("strike")} onClick={() => chain().toggleStrike().run()} />
                <Sep />
                <ToolText label="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
                <ToolText label="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
                <Sep />
                <Tool icon={faListUl} label={t("richTextEditor.bulletList")} active={editor.isActive("bulletList")} onClick={() => chain().toggleBulletList().run()} />
                <Tool icon={faListOl} label={t("richTextEditor.orderedList")} active={editor.isActive("orderedList")} onClick={() => chain().toggleOrderedList().run()} />
                <Tool icon={faQuoteLeft} label={t("richTextEditor.blockquote")} active={editor.isActive("blockquote")} onClick={() => chain().toggleBlockquote().run()} />
                <Sep />
                <Tool icon={faAlignLeft} label={t("richTextEditor.alignLeft")} active={editor.isActive({ textAlign: "left" })} onClick={() => chain().setTextAlign("left").run()} />
                <Tool icon={faAlignCenter} label={t("richTextEditor.alignCenter")} active={editor.isActive({ textAlign: "center" })} onClick={() => chain().setTextAlign("center").run()} />
                <Tool icon={faAlignRight} label={t("richTextEditor.alignRight")} active={editor.isActive({ textAlign: "right" })} onClick={() => chain().setTextAlign("right").run()} />
                <Sep />
                <Tool icon={faLink} label={t("richTextEditor.link")} active={editor.isActive("link") || linkOpen} onClick={openLink} />
                {editor.isActive("link") && (
                    <Tool icon={faLinkSlash} label={t("richTextEditor.unlink")} onClick={() => chain().extendMarkRange("link").unsetLink().run()} />
                )}
                <Tool
                    icon={uploading ? faSpinner : faImage}
                    spin={uploading}
                    label={uploading ? t("component.fileUpload.uploading") : t("richTextEditor.image")}
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                />
                <Tool icon={faMinus} label={t("richTextEditor.horizontalRule")} onClick={() => chain().setHorizontalRule().run()} />
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e.target.files)} />
            </div>
            {linkOpen && (
                <form
                    className="flex items-center gap-2 border-t border-gray-100 px-3 py-2"
                    onSubmit={(e) => { e.preventDefault(); applyLink(); }}
                >
                    <FontAwesomeIcon icon={faLink} className="h-4 w-4 text-gray-400" />
                    <input
                        autoFocus
                        value={href}
                        onChange={(e) => setHref(e.target.value)}
                        placeholder="https://..."
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-yambo-green-400 focus:outline-none"
                    />
                    <button type="submit" className="rounded-lg bg-yambo-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-yambo-green-700">
                        {t("richTextEditor.applyLink")}
                    </button>
                    <button type="button" onClick={() => setLinkOpen(false)} className="rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-100">
                        {t("common.cancel")}
                    </button>
                </form>
            )}
        </div>
    );
}

function Tool({ icon, label, onClick, active, disabled, spin }: {
    icon: IconDefinition; label: string; onClick: () => void; active?: boolean; disabled?: boolean; spin?: boolean;
}) {
    return (
        <button
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`grid h-8 w-8 place-items-center rounded-lg transition disabled:opacity-30 ${
                active ? "bg-yambo-green-100 text-yambo-green-800" : "text-gray-600 hover:bg-white hover:text-yambo-black hover:shadow-sm"
            }`}
        >
            <FontAwesomeIcon icon={icon} spin={spin} className="h-4 w-4" />
        </button>
    );
}

function ToolText({ label, onClick, active }: { label: string; onClick: () => void; active?: boolean }): ReactNode {
    return (
        <button
            type="button"
            title={label}
            aria-pressed={active}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`grid h-8 min-w-8 place-items-center rounded-lg px-1.5 text-xs font-bold transition ${
                active ? "bg-yambo-green-100 text-yambo-green-800" : "text-gray-600 hover:bg-white hover:text-yambo-black hover:shadow-sm"
            }`}
        >
            {label}
        </button>
    );
}

function Sep(): ReactNode {
    return <span className="mx-1 h-5 w-px bg-gray-200" />;
}
