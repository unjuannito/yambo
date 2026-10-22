import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthService } from '~/services/authService';
import LoginPage from '~/routes/login';

// Mock auth service
vi.mock('~/services/authService', () => ({
    AuthService: vi.fn().mockImplementation(() => ({
        getOAuth2Config: vi.fn().mockResolvedValue({ providers: [{ name: 'google', displayName: 'Google', clientId: 'test-id' }] }),
        setToken: vi.fn(),
    })),
}));

// Mock useAuth
const mockLogin = vi.fn();
const mockIsAuthenticated = vi.fn().mockReturnValue(false);
const mockReload = vi.fn().mockResolvedValue(undefined);

vi.mock('~/hooks/useAuth', () => ({
    useAuth: () => ({
        login: mockLogin,
        isAuthenticated: mockIsAuthenticated,
        reload: mockReload,
    }),
}));

// Mock react-router
const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('react-router', () => ({
    useNavigate: () => mockNavigate,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
        <a href={to}>{children}</a>
    ),
}));

// Mock i18next
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'login.pageTitle': 'Yambo - Login',
                'login.title': 'Área de Socios',
                'login.subtitle': 'Inicia sesión para acceder',
                'login.emailLabel': 'Correo electrónico',
                'login.passwordLabel': 'Contraseña',
                'login.forgotPassword': '¿Olvidaste tu contraseña?',
                'login.loginButton': 'Iniciar sesión',
                'login.notMember': '¿No eres socio?',
                'login.contactUs': 'Contacta con Yambo.',
                'login.googleLogin': 'Iniciar sesión con Google',
                'login.orContinueWith': 'O continúa con',
                'login.googleError': 'Error al iniciar sesión con Google',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock other dependencies
vi.mock('~/services/invitationService', () => ({
    invitationService: {
        acceptInvitation: vi.fn(),
    },
}));

vi.mock('~/utils/confetti', () => ({
    fireRainbow: vi.fn(),
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
    Toaster: () => null,
}));

vi.mock('@fortawesome/react-fontawesome', () => ({
    FontAwesomeIcon: ({ icon }: { icon: any }) => <span data-testid="fa-icon" data-icon={icon?.iconName || 'unknown'} />,
}));

vi.mock('@fortawesome/free-solid-svg-icons', () => ({
    faGift: { iconName: 'gift' },
}));

vi.mock('@fortawesome/free-brands-svg-icons', () => ({
    faGoogle: { iconName: 'google' },
}));

vi.mock('~/utils/auth', () => ({
    getSafeReturnTo: (path: string | null) => path || '/mi-espacio',
}));

vi.mock('~/components/common/forms/InputComponent', () => ({
    default: ({ label, type, required }: { label: string; type: string; required?: boolean }) => (
        <div>
            <label>{label}</label>
            <input type={type} required={required} data-testid={`input-${label}`} />
        </div>
    ),
}));

vi.mock('~/components/common/forms/ButtonComponent', () => ({
    default: ({ children, onClick, type, isLoading, variant, className }: any) => (
        <button
            onClick={onClick}
            type={type}
            disabled={isLoading}
            data-testid="submit-button"
            className={className}
        >
            {isLoading ? 'Cargando...' : children}
        </button>
    ),
}));

vi.mock('~/routes/AuthLayout', () => ({
    AuthLayout: ({ children, title, subtitle, footer }: any) => (
        <div data-testid="auth-layout">
            <h1>{title}</h1>
            <p>{subtitle}</p>
            {children}
            {footer}
        </div>
    ),
}));

describe('LoginPage - Google OAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSearchParams = new URLSearchParams();
        mockIsAuthenticated.mockReturnValue(false);
    });

    it('should render Google login button', async () => {
        render(<LoginPage />);
        expect(await screen.findByText('Iniciar sesión con Google')).toBeDefined();
    });

    it('should show "O continúa con" separator', () => {
        render(<LoginPage />);
        expect(screen.getByText('O continúa con')).toBeDefined();
    });

    it('should redirect to Google OAuth endpoint on button click', async () => {
        const originalLocation = window.location;
        const mockAssign = vi.fn();

        Object.defineProperty(window, 'location', {
            value: { ...originalLocation, href: '', origin: 'http://localhost:5173' },
            writable: true,
            configurable: true,
        });

        render(<LoginPage />);
        const googleButton = await screen.findByText('Iniciar sesión con Google');
        fireEvent.click(googleButton);

        expect(window.location.href).toBe('http://localhost:5173/api/auth/oauth2/google');

        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true,
            configurable: true,
        });
    });

    it('should handle google_token in URL and set token', async () => {
        mockSearchParams = new URLSearchParams('google_token=test.jwt.token');

        render(<LoginPage />);

        await waitFor(() => {
            const AuthServiceMock = vi.mocked(AuthService);
            expect(AuthServiceMock).toHaveBeenCalled();
        });
    });
});
