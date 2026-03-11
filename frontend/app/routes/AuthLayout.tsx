import { useNavigate } from "react-router";
import ButtonComponent from "../components/common/forms/ButtonComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

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
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yambo-green-100 via-yambo-purple-100 to-yambo-green-50 py-12 px-4 relative overflow-hidden">
            {/* Decorative blobs */}
            <div className="blob-green w-72 h-72 -top-20 -left-20 opacity-20" />
            <div className="blob-purple w-64 h-64 -bottom-16 -right-16 opacity-15" />
            <div className="blob-green w-48 h-48 top-1/3 right-10 opacity-10" />

            <div className="bg-white/90 backdrop-blur-sm shadow-xl rounded-3xl px-8 py-10 max-w-md w-full space-y-6 relative z-10 bounce-in">
                {/* Back button */}
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-5 left-5 w-9 h-9 rounded-full bg-gray-100 hover:bg-yambo-green-50 text-gray-400 hover:text-yambo-green-600 transition-all flex items-center justify-center"
                    aria-label="Volver a inicio"
                >
                    <FontAwesomeIcon icon={faArrowLeft} className="h-4 w-4" />
                </button>

                <div className="text-center pt-4">
                    <h1 className="text-2xl font-extrabold text-yambo-black font-display">{title}</h1>
                    <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                    {banner && <div className="mt-3">{banner}</div>}
                </div>

                {children}

                {footer && <div className="border-t border-gray-100 pt-4">{footer}</div>}

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
