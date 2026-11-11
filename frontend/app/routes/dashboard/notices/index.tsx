import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCloudUploadAlt, faSpinner } from "@fortawesome/free-solid-svg-icons";
import type { Route } from "./+types/index";
import { RequirePermission } from "~/components/common/RequirePermission";
import type { FilterableColumn } from "~/components/common/FilterableTable";
import { Modal } from "~/components/common/Modal";
import { ConfirmDialog } from "~/components/common/ConfirmDialog";
import ButtonComponent from "~/components/common/forms/ButtonComponent";
import ListPageShell from "~/components/common/ListPageShell";
import InputComponent from "~/components/common/forms/InputComponent";
import CheckboxComponent from "~/components/common/forms/CheckboxComponent";
import MarkdownEditor from "~/components/common/forms/MarkdownEditor";
import { noticeService, type Notice, type NoticeRequest } from "~/services/noticeService";
import { fileService } from "~/services/fileService";
import { LoadingSpinner } from "~/components/common/LoadingSpinner";
import { getErrorMessage } from "~/types/error";
import toast from "react-hot-toast";
import { PageContainer } from "~/components/common/PageContainer";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Yambo - Anuncios" },
        { name: "description", content: "Tablón de anuncios para los socios" },
    ];
}

interface NoticeForm {
    title: string;
    content: string;
    image: string;
    pinned: boolean;
    isPublic: boolean;
    expiresAt: string;
}

const EMPTY_FORM: NoticeForm = {
    title: "",
    content: "",
    image: "",
    pinned: false,
    isPublic: false,
    expiresAt: "",
};

function resolveImageSrc(value: string): string {
    if (!value) return "";
    return value.startsWith("/") ? `/api${value}` : value;
}

export default function Notices() {
    const { t } = useTranslation();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState<NoticeForm>(EMPTY_FORM);
    const [editing, setEditing] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadNotices();
    }, []);

    const loadNotices = async () => {
        try {
            setLoading(true);
            setNotices(await noticeService.listNotices());
        } catch (err) {
            toast.error(getErrorMessage(err, t("notices.loadError")));
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(true);
    };

    const startEdit = (notice: Notice) => {
        setForm({
            title: notice.title,
            content: notice.content,
            image: notice.image || "",
            pinned: notice.pinned,
            isPublic: notice.public,
            expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 16) : "",
        });
        setEditing(notice.id);
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setForm({ ...EMPTY_FORM });
        setEditing(null);
        setIsModalOpen(false);
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingImage(true);
            const uploaded = await fileService.upload(file);
            setForm((prev) => ({ ...prev, image: uploaded.url }));
        } catch (err) {
            toast.error(getErrorMessage(err, t("notices.imageUploadError")));
        } finally {
            setUploadingImage(false);
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        if (!form.title.trim()) {
            toast.error(t("notices.titleRequired"));
            return;
        }
        if (!form.content.trim()) {
            toast.error(t("notices.contentRequired"));
            return;
        }

        const payload: NoticeRequest = {
            title: form.title,
            content: form.content,
            image: form.image || null,
            pinned: form.pinned,
            isPublic: form.isPublic,
            expiresAt: form.expiresAt || null,
        };

        try {
            setSaving(true);
            if (editing) {
                await noticeService.updateNotice(editing, payload);
                toast.success(t("notices.updated"));
            } else {
                await noticeService.createNotice(payload);
                toast.success(t("notices.created"));
            }
            resetForm();
            await loadNotices();
        } catch (err) {
            toast.error(getErrorMessage(err, t("notices.saveError")));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id: string) => {
        setConfirmDelete(id);
    };

    const executeDelete = async () => {
        if (!confirmDelete) return;
        try {
            await noticeService.deleteNotice(confirmDelete);
            toast.success(t("notices.deleted"));
            await loadNotices();
        } catch (err) {
            toast.error(getErrorMessage(err, t("notices.deleteError")));
        } finally {
            setConfirmDelete(null);
        }
    };

    const columns: FilterableColumn<Notice>[] = useMemo(
        () => [
            {
                key: "title",
                header: t("notices.columnTitle"),
                filter: {
                    enabled: true,
                    type: "search",
                    placeholder: t("notices.searchByTitle"),
                },
                render: (notice) => (
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-yambo-black">{notice.title}</span>
                        {notice.pinned && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-normal">
                                {t("notices.pinned")}
                            </span>
                        )}
                        {notice.public && (
                            <span className="px-2 py-0.5 bg-yambo-green-50 text-yambo-green-700 rounded-full text-xs font-normal">
                                {t("notices.public")}
                            </span>
                        )}
                    </div>
                ),
            },
            {
                key: "publishedAt",
                header: t("notices.columnPublished"),
                render: (notice) => (
                    <span className="text-sm text-gray-600">
                        {new Date(notice.publishedAt).toLocaleDateString()}
                    </span>
                ),
            },
            {
                key: "expiresAt",
                header: t("notices.columnExpires"),
                render: (notice) => (
                    <span className="text-sm text-gray-600">
                        {notice.expiresAt ? new Date(notice.expiresAt).toLocaleDateString() : "—"}
                    </span>
                ),
            },
            {
                key: "actions",
                header: t("common.actions"),
                requiredPerms: [{ obj: "notice", action: "update" }],
                render: (notice) => (
                    <div className="flex gap-2">
                        <ButtonComponent variant="primary" size="sm" onClick={() => startEdit(notice)}>
                            {t("common.edit")}
                        </ButtonComponent>
                        <ButtonComponent variant="destructive" size="sm" onClick={() => handleDelete(notice.id)}>
                            {t("common.delete")}
                        </ButtonComponent>
                    </div>
                ),
            },
        ],
        [t],
    );

    if (loading) {
        return (
            <RequirePermission permission={{ obj: "notice", action: "read" }} redirectTo="/mi-espacio">
                <PageContainer>
                    <h1 className="text-3xl font-extrabold font-display text-yambo-black mb-6">{t("notices.title")}</h1>
                    <div className="flex justify-center py-12">
                        <LoadingSpinner size="lg" message={t("notices.loading")} />
                    </div>
                </PageContainer>
            </RequirePermission>
        );
    }

    return (
        <RequirePermission permission={{ obj: "notice", action: "read" }} redirectTo="/mi-espacio">
            <ListPageShell<Notice>
                title={t("notices.title")}
                actions={
                    <RequirePermission permission={{ obj: "notice", action: "create" }} redirect={false}>
                        <ButtonComponent variant="primary" onClick={openCreateModal}>
                            {t("notices.createNew")}
                        </ButtonComponent>
                    </RequirePermission>
                }
                columns={columns}
                keyField="id"
                data={notices}
                display={{
                    emptyMessage: t("notices.noNotices"),
                    loadingMessage: t("notices.loading"),
                }}
                features={{ globalSearch: true }}
            />
            <Modal
                isOpen={isModalOpen}
                onClose={resetForm}
                title={editing ? t("notices.editTitle") : t("notices.newTitle")}
                size="lg"
                footer={
                    <>
                        <ButtonComponent onClick={resetForm} variant="neutral" disabled={saving}>
                            {t("common.cancel")}
                        </ButtonComponent>
                        <ButtonComponent onClick={handleSave} variant="primary" disabled={saving}>
                            {saving ? t("common.saving") : t("common.save")}
                        </ButtonComponent>
                    </>
                }
            >
                <div className="grid gap-6">
                    <InputComponent
                        label={t("notices.titleLabel")}
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder={t("notices.titlePlaceholder")}
                        required
                    />

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t("notices.contentLabel")}
                        </label>
                        <MarkdownEditor
                            value={form.content}
                            onChange={(value) => setForm({ ...form, content: value })}
                            className="min-h-[200px] border border-gray-200 rounded-xl"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        {form.image ? (
                            <img
                                src={resolveImageSrc(form.image)}
                                alt={t("dashboard.preview")}
                                className="w-20 h-20 shrink-0 rounded-2xl object-cover border-2 border-yambo-green-100"
                            />
                        ) : (
                            <div className="w-20 h-20 shrink-0 rounded-2xl bg-yambo-green-50 border-2 border-dashed border-yambo-green-200 flex items-center justify-center">
                                <FontAwesomeIcon icon={faCloudUploadAlt} className="text-yambo-green-300" />
                            </div>
                        )}
                        <div className="flex flex-col gap-2 min-w-0">
                            <span className="text-sm font-semibold text-gray-700">{t("notices.imageLabel")}</span>
                            <div className="flex flex-wrap gap-2">
                                <ButtonComponent
                                    type="button"
                                    variant="primary"
                                    size="sm"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={uploadingImage}
                                >
                                    {uploadingImage ? (
                                        <><FontAwesomeIcon icon={faSpinner} spin className="mr-1" /> {t("notices.imageUploading")}</>
                                    ) : (
                                        form.image ? t("notices.imageChange") : t("notices.imageUpload")
                                    )}
                                </ButtonComponent>
                                {form.image && (
                                    <ButtonComponent
                                        type="button"
                                        variant="danger-text"
                                        size="sm"
                                        onClick={() => setForm({ ...form, image: "" })}
                                        disabled={uploadingImage}
                                    >
                                        {t("dashboard.removeImage")}
                                    </ButtonComponent>
                                )}
                            </div>
                        </div>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageChange}
                            className="hidden"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <CheckboxComponent
                            label={t("notices.pinnedLabel")}
                            variantType="toggle"
                            variant="right"
                            checked={form.pinned}
                            onChange={(e) => setForm({ ...form, pinned: e.target.checked })}
                        />
                        <CheckboxComponent
                            label={t("notices.publicLabel")}
                            description={t("notices.publicDescription")}
                            variantType="toggle"
                            variant="right-with-description"
                            checked={form.isPublic}
                            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
                        />
                    </div>

                    <InputComponent
                        type="datetime-local"
                        label={t("notices.expiresAtLabel")}
                        value={form.expiresAt}
                        onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    />
                </div>
            </Modal>
            <ConfirmDialog
                isOpen={confirmDelete !== null}
                onClose={() => setConfirmDelete(null)}
                onConfirm={executeDelete}
                title={t("notices.confirmDeleteTitle")}
                message={t("notices.confirmDelete")}
                confirmLabel={t("common.delete")}
                variant="danger"
            />
        </RequirePermission>
    );
}
