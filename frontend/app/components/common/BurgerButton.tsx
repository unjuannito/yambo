import { twMerge } from "tailwind-merge";
import ButtonComponent from "./forms/ButtonComponent";

interface BurgerButtonProps {
  isOpen: boolean;
  onClick: () => void;
  className?: string;
}

export function BurgerButton({ isOpen, onClick, className = "" }: BurgerButtonProps) {
  return (
    <ButtonComponent
      tabIndex={0}
      variant="base"
      aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
      aria-expanded={isOpen}
      className={twMerge(`focus:outline-none cursor-pointer text-black ${className}`)}
      onClick={onClick}
    >
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
        />
      </svg>
    </ButtonComponent>
  );
}
