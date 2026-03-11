import { twMerge } from "tailwind-merge";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "primary-outline"
    | "secondary"
    | "neutral"
    | "base"
    | "danger"
    | "danger-text"
    | "destructive"
    | "destructive-text"
    | "success"
    | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-gradient-to-r from-yambo-green-500 to-yambo-green-600 border-yambo-green-500 text-white hover:from-yambo-green-600 hover:to-yambo-green-700 shadow-md hover:shadow-lg shadow-yambo-green-500/20",
  "primary-outline":
    "bg-white border-yambo-green-500 text-yambo-green-600 hover:bg-yambo-green-50",
  secondary:
    "bg-gray-100 border-gray-200 hover:bg-gray-200 text-gray-700",
  neutral:
    "bg-white border-gray-200 text-yambo-green-600 hover:bg-yambo-green-50 hover:border-yambo-green-400 shadow-sm",
  base:
    "bg-transparent border-transparent text-yambo-green-600 hover:text-yambo-green-700",
  danger:
    "bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/20",
  "danger-text":
    "bg-white border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-400",
  destructive:
    "bg-gradient-to-r from-red-500 to-red-600 border-red-500 text-white hover:from-red-600 hover:to-red-700 shadow-md shadow-red-500/20",
  "destructive-text":
    "bg-white border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-400",
  success:
    "bg-gradient-to-r from-yambo-green-400 to-yambo-green-500 border-yambo-green-400 text-white hover:from-yambo-green-500 hover:to-yambo-green-600 shadow-md",
  ghost:
    "bg-transparent border-transparent hover:bg-yambo-green-50 text-gray-700",
};

const sizeClasses = {
  sm: "px-4 py-1.5 text-sm",
  md: "px-5 py-2.5 text-base",
  lg: "px-6 py-3 text-lg",
};

export default function ButtonComponent({
  variant = "neutral",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const busy = isLoading;
  return (
    <button
      disabled={disabled || busy}
      className={twMerge(
        `inline-flex items-center justify-center text-center font-semibold
         border border-solid rounded-full transition-all duration-200 ease-out
         select-none whitespace-normal cursor-pointer
         disabled:cursor-not-allowed disabled:opacity-50 active:scale-95
         ${sizeClasses[size]} ${variantClasses[variant]}
         ${busy ? "disabled:cursor-wait" : ""}`,
        className,
      )}
      {...props}
    >
      {busy ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Procesando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
