import { twMerge } from "tailwind-merge";
import ButtonComponent from "./forms/ButtonComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars, faXmark } from "@fortawesome/free-solid-svg-icons";

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
      className={twMerge(`focus:outline-none cursor-pointer text-yambo-black ${className}`)}
      onClick={onClick}
    >
      <FontAwesomeIcon icon={isOpen ? faXmark : faBars} className="h-6 w-6" />
    </ButtonComponent>
  );
}
