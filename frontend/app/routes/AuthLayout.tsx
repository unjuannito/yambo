import { useNavigate } from "react-router";
import ButtonComponent from "../components/common/forms/ButtonComponent";

interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    subtitle: string;
    banner?: React.ReactNode;
    footer?: React.ReactNode;
}

export function AuthLayout({ children, title, subtitle, banner, footer }: AuthLayoutProps) {
    const navigate = useNavigate();

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 py-12 px-4">
            <div className="bg-white shadow-xl rounded-2xl px-8 py-10 max-w-md w-full space-y-6 relative">
                {/* Back button */}
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-4 left-4 text-gray-500 hover:text-gray-700 transition-colors"
                    aria-label="Volver a inicio"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                </button>

                <div className="text-center pt-4">
                    <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
                    <p className="text-sm text-gray-500">{subtitle}</p>
                    {banner && <div className="mt-3">{banner}</div>}
                </div>

                {children}

                {footer && <div className="border-t pt-4">{footer}</div>}

                <div className="text-center pt-2">
                    <ButtonComponent
                        variant="neutral"
                        className="text-xs"
                        onClick={() => navigate("/")}
                    >
                        Volver al inicio
                    </ButtonComponent>
                </div>
            </div>
        </main>
    );
}
