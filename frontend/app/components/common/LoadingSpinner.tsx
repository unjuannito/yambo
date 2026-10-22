import { useTranslation } from "react-i18next";

interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg" | "xl";
    message?: string;
}

const sizeConfig = {
    sm: { dotSize: "w-2 h-2", gap: "gap-1.5", textSize: "text-sm" },
    md: { dotSize: "w-3 h-3", gap: "gap-2", textSize: "text-base" },
    lg: { dotSize: "w-4 h-4", gap: "gap-3", textSize: "text-lg" },
    xl: { dotSize: "w-6 h-6", gap: "gap-4", textSize: "text-xl" },
};

export function LoadingSpinner({
    size = "md",
    message
}: LoadingSpinnerProps) {
    const { t } = useTranslation();
    const cfg = sizeConfig[size];

    return (
        <div className={`flex flex-col items-center justify-center ${cfg.gap}`}>
            <div className={`flex ${cfg.gap}`}>
                {[0, 1, 2].map((i) => (
                    <span
                        key={i}
                        className={`${cfg.dotSize} rounded-full bg-gradient-to-br from-yambo-green-400 to-yambo-purple-400`}
                        style={{
                            animation: `bounce-in 0.6s ease-in-out ${i * 0.15}s infinite alternate`,
                        }}
                    />
                ))}
            </div>
            {message && (
                <span className={`text-gray-500 font-medium ${cfg.textSize}`}>
                    {message}
                </span>
            )}
        </div>
    );
}
