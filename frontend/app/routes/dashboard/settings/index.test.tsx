import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import Settings, { meta } from "./index";

const { serviceMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
    serviceMock: {
        getAllSettings: vi.fn(),
        getDomain: vi.fn(),
        getIban: vi.fn(),
        getEmailConfig: vi.fn(),
        getSmtpAdvancedConfig: vi.fn(),
        getIssueCreationWindowDays: vi.fn(),
        getUploadConfig: vi.fn(),
        getOllamaConfig: vi.fn(),
        updateSettingsBulk: vi.fn(),
        setDomain: vi.fn(),
        setIssueCreationWindowDays: vi.fn(),
        setIban: vi.fn(),
        updateEmailConfig: vi.fn(),
        updateSmtpAdvancedConfig: vi.fn(),
        updateUploadConfig: vi.fn(),
        updateOllamaConfig: vi.fn(),
    },
    toastSuccessMock: vi.fn(),
    toastErrorMock: vi.fn(),
}));

vi.mock("~/components/common/RequirePermission", () => ({
    RequirePermission: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("~/components/common/forms/InputComponent", () => ({
    default: ({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (e: any) => void; type?: string }) => (
        <label>
            {label}
            <input aria-label={label} value={value} type={type} onChange={onChange} />
        </label>
    ),
}));

vi.mock("~/components/common/forms/ButtonComponent", () => ({
    default: ({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) => (
        <button onClick={onClick} disabled={disabled}>{children}</button>
    ),
}));

vi.mock("~/components/common/LoadingSpinner", () => ({
    LoadingSpinner: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("~/components/common/ErrorMessage", () => ({
    ErrorMessage: ({ message }: { message: string }) => <div>{message}</div>,
}));

vi.mock("~/services/settingsService", () => ({
    settingsService: serviceMock,
}));

vi.mock("react-hot-toast", () => ({
    default: {
        success: (...args: any[]) => toastSuccessMock(...args),
        error: (...args: any[]) => toastErrorMock(...args),
    },
}));

vi.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => null,
}));

describe("Settings Route", () => {
    beforeEach(() => {
        vi.clearAllMocks();

        serviceMock.getAllSettings.mockResolvedValue([]);
        serviceMock.getDomain.mockResolvedValue("https://yambo.test");
        serviceMock.getIban.mockResolvedValue("ES0000000000000000000000");
        serviceMock.getEmailConfig.mockResolvedValue({
            host: "smtp.example.com",
            port: "587",
            username: "mail",
            password: "",
            from: "mail@example.com",
            fromName: "Yambo",
        });
        serviceMock.getSmtpAdvancedConfig.mockResolvedValue({
            auth: true,
            starttlsEnable: true,
            starttlsRequired: true,
            connectionTimeout: 5000,
            timeout: 5000,
            writeTimeout: 5000,
        });
        serviceMock.getIssueCreationWindowDays.mockResolvedValue(30);
        serviceMock.getUploadConfig.mockResolvedValue({ maxFileSizeMb: 5 });
        serviceMock.getOllamaConfig.mockResolvedValue({ apiUrl: "http://localhost:11434", model: "phi3:mini" });

        serviceMock.setDomain.mockResolvedValue(undefined);
        serviceMock.setIssueCreationWindowDays.mockResolvedValue(undefined);
    });

    it("returns expected meta", () => {
        expect(meta({} as any)).toEqual([
            { title: "Yambo - Configuración" },
            { name: "description", content: "Configuración general del sistema" },
        ]);
    });

    it("validates issue creation days before saving application settings", async () => {
        render(<Settings />);

        expect(screen.getByText("Cargando configuración...")).toBeInTheDocument();

        await screen.findByText("Configuración General");
        fireEvent.click(screen.getByRole("button", { name: "Aplicación" }));

        const daysInput = await screen.findByLabelText("Días para crear incidencias tras cerrar pedido");
        fireEvent.change(daysInput, { target: { value: "-1" } });

        fireEvent.click(screen.getByRole("button", { name: "Guardar Configuración de la Aplicación" }));

        expect(toastErrorMock).toHaveBeenCalledWith("¡Los días deben ser un número entero de 0 en adelante!");
        expect(serviceMock.setIssueCreationWindowDays).not.toHaveBeenCalled();
    });

    it("saves application settings when days value is valid", async () => {
        render(<Settings />);

        await screen.findByText("Configuración General");
        fireEvent.click(screen.getByRole("button", { name: "Aplicación" }));

        const domainInput = await screen.findByLabelText("Dominio de la Aplicación");
        const daysInput = await screen.findByLabelText("Días para crear incidencias tras cerrar pedido");

        fireEvent.change(domainInput, { target: { value: "https://nuevo.yambo.test" } });
        fireEvent.change(daysInput, { target: { value: "15" } });

        fireEvent.click(screen.getByRole("button", { name: "Guardar Configuración de la Aplicación" }));

        await waitFor(() => {
            expect(serviceMock.setDomain).toHaveBeenCalledWith("https://nuevo.yambo.test");
            expect(serviceMock.setIssueCreationWindowDays).toHaveBeenCalledWith(15);
        });
        expect(toastSuccessMock).toHaveBeenCalledWith("Configuración de la aplicación guardada correctamente");
    });
});