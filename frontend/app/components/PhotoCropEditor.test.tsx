import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoCropEditor } from "./PhotoCropEditor";

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("~/utils/photoCrop", async (importOriginal) => ({
    ...(await importOriginal<typeof import("~/utils/photoCrop")>()),
    renderCrop: vi.fn(async () => new Blob(["crop"], { type: "image/jpeg" })),
}));

/** jsdom no carga imágenes: se simula una foto apaisada de 1200×800. */
class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 1200;
    naturalHeight = 800;
    set src(_: string) {
        queueMicrotask(() => this.onload?.());
    }
}

/** El PointerEvent de jsdom no lleva coordenadas: se lanza como evento de ratón con su puntero. */
function pointer(target: Element, type: string, clientX: number, clientY: number) {
    const event = new MouseEvent(type, { bubbles: true, clientX, clientY });
    Object.defineProperty(event, "pointerId", { value: 1 });
    fireEvent(target, event);
}

describe("PhotoCropEditor", () => {
    const RealImage = globalThis.Image;
    beforeEach(() => {
        globalThis.Image = FakeImage as unknown as typeof Image;
    });
    afterEach(() => {
        globalThis.Image = RealImage;
    });

    const open = async (props: Partial<React.ComponentProps<typeof PhotoCropEditor>> = {}) => {
        const onConfirm = vi.fn();
        const onCancel = vi.fn();
        render(<PhotoCropEditor isOpen src="/uploads/original.jpg" onCancel={onCancel} onConfirm={onConfirm} {...props} />);
        await waitFor(() => expect(screen.getByLabelText("photoEditor.zoom")).not.toBeDisabled());
        return { onConfirm, onCancel };
    };

    it("starts from the saved framing when re-adjusting", async () => {
        const { onConfirm } = await open({ initialEdit: { x: 0.5, y: 0, zoom: 2, rotation: 100 } });

        expect(screen.getByLabelText("photoEditor.zoom")).toHaveValue("2");
        // 100° = una vuelta de 90° y 10° de enderezado
        expect(screen.getByLabelText("photoEditor.straighten")).toHaveValue("10");

        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
        expect(onConfirm.mock.calls[0][0]).toEqual({ x: 0.5, y: 0, zoom: 2, rotation: 100 });
    });

    it("returns the chosen zoom and rotation with the crop", async () => {
        const { onConfirm } = await open();

        fireEvent.change(screen.getByLabelText("photoEditor.zoom"), { target: { value: "2.5" } });
        fireEvent.click(screen.getByRole("button", { name: "photoEditor.rotateRight" }));
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));

        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
        const [edit, crop] = onConfirm.mock.calls[0];
        expect(edit).toMatchObject({ zoom: 2.5, rotation: 90 });
        expect(crop).toBeInstanceOf(Blob);
    });

    it("moves the centre when the photo is dragged", async () => {
        const { onConfirm } = await open({ initialEdit: { x: 0, y: 0, zoom: 2, rotation: 0 } });

        const frame = screen.getByRole("application");
        pointer(frame, "pointerdown", 100, 100);
        pointer(frame, "pointermove", 140, 80);
        pointer(frame, "pointerup", 140, 80);
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));

        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
        const [edit] = onConfirm.mock.calls[0];
        expect(edit.x).toBeGreaterThan(0);
        expect(edit.y).toBeLessThan(0);
    });

    it("straightens on top of the quarter turns and snaps back to level", async () => {
        const { onConfirm } = await open();

        fireEvent.click(screen.getByRole("button", { name: "photoEditor.rotateLeft" }));
        fireEvent.change(screen.getByLabelText("photoEditor.straighten"), { target: { value: "7.5" } });
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
        expect(onConfirm.mock.calls[0][0].rotation).toBe(-82.5);

        fireEvent.change(screen.getByLabelText("photoEditor.straighten"), { target: { value: "1" } });
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
        expect(onConfirm.mock.calls[1][0].rotation).toBe(-90);
    });

    it("moves and zooms with the keyboard and the zoom buttons", async () => {
        const { onConfirm } = await open();

        fireEvent.click(screen.getByRole("button", { name: "photoEditor.zoomIn" }));
        const frame = screen.getByRole("application");
        fireEvent.keyDown(frame, { key: "ArrowRight" });
        fireEvent.keyDown(frame, { key: "+" });
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));

        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
        const [edit] = onConfirm.mock.calls[0];
        expect(edit.zoom).toBe(1.5);
        expect(edit.x).toBeGreaterThan(0);
    });

    it("zooms with the wheel without scrolling the page behind", async () => {
        const { onConfirm } = await open();

        const frame = screen.getByRole("application");
        const notPrevented = fireEvent.wheel(frame, { deltaY: -200, clientX: 30, clientY: -20, cancelable: true });
        expect(notPrevented).toBe(false);
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));

        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
        const [edit] = onConfirm.mock.calls[0];
        expect(edit.zoom).toBeCloseTo(1.3);
        // Acerca hacia el cursor, arriba a la derecha: la foto se desplaza hacia abajo a la izquierda
        expect(edit.x).toBeLessThan(0);
        expect(edit.y).toBeGreaterThan(0);
    });

    it("zooms in on double click and back out on the next one", async () => {
        const { onConfirm } = await open();

        const frame = screen.getByRole("application");
        fireEvent.doubleClick(frame, { clientX: -40, clientY: 0 });
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
        expect(onConfirm.mock.calls[0][0].zoom).toBe(2);
        // Clic a la izquierda del centro: la foto se desplaza a la derecha para acercar ese punto
        expect(onConfirm.mock.calls[0][0].x).toBeGreaterThan(0);

        fireEvent.doubleClick(frame, { clientX: 0, clientY: 0 });
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));
        await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(2));
        expect(onConfirm.mock.calls[1][0].zoom).toBe(1);
    });

    it("marks the avatar circle inside the frame", async () => {
        await open();
        expect(screen.getByTestId("avatar-guide")).toBeInTheDocument();
    });

    it("picks another photo without closing the editor", async () => {
        const onReplaceFile = vi.fn(async () => {});
        await open({ onReplaceFile });

        const file = new File(["x"], "otra.png", { type: "image/png" });
        fireEvent.change(screen.getByTestId("photo-editor-replace-input"), { target: { files: [file] } });
        await waitFor(() => expect(onReplaceFile).toHaveBeenCalledWith(file));
    });

    it("takes a photo dropped on the frame and rejects other files", async () => {
        const onReplaceFile = vi.fn(async () => {});
        await open({ onReplaceFile });

        const frame = screen.getByRole("application");
        const photo = new File(["x"], "soltada.jpg", { type: "image/jpeg" });
        fireEvent.dragOver(frame, { dataTransfer: { types: ["Files"], files: [photo] } });
        expect(screen.getByText("photoEditor.dropHint")).toBeInTheDocument();
        fireEvent.drop(frame, { dataTransfer: { types: ["Files"], files: [photo] } });
        await waitFor(() => expect(onReplaceFile).toHaveBeenCalledWith(photo));
        expect(screen.queryByText("photoEditor.dropHint")).not.toBeInTheDocument();

        const pdf = new File(["x"], "doc.pdf", { type: "application/pdf" });
        fireEvent.drop(frame, { dataTransfer: { types: ["Files"], files: [pdf] } });
        expect(await screen.findByRole("alert")).toHaveTextContent("photoEditor.uploadError");
        expect(onReplaceFile).toHaveBeenCalledTimes(1);
    });

    it("does not offer another photo without a way to upload it", async () => {
        await open();
        expect(screen.queryByRole("button", { name: /photoEditor.replace/ })).not.toBeInTheDocument();
    });

    it("goes back to the default framing with reset", async () => {
        const { onConfirm } = await open({ initialEdit: { x: 0.4, y: -0.2, zoom: 3, rotation: 45 } });

        fireEvent.click(screen.getByRole("button", { name: /photoEditor.reset/ }));
        fireEvent.click(screen.getByRole("button", { name: /photoEditor.confirm/ }));

        await waitFor(() => expect(onConfirm).toHaveBeenCalled());
        expect(onConfirm.mock.calls[0][0]).toEqual({ x: 0, y: 0, zoom: 1, rotation: 0 });
    });
});
