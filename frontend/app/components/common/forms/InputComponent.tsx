import React, { useState, forwardRef } from "react";
import { useTranslation } from "react-i18next";
import LabelComponent from "./LabelComponent";
import { twMerge } from "tailwind-merge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const InputComponent = forwardRef<HTMLInputElement, InputProps>(({
    label,
    className = "",
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const { t } = useTranslation();

    const validationRules = {
        email: {
            pattern: undefined,
            title: t("component.emailValidationTitle"),
        },
        tel: {
            pattern: "[0-9]{9}",
            title: t("component.phoneValidationTitle"),
        },
        password: {
            pattern: props.pattern || ".{6,}",
            title: t("component.passwordValidationTitle"),
        },
    };

    const currentRule = validationRules[props.type as keyof typeof validationRules];
    const inputPattern = props.pattern ?? currentRule?.pattern;
    const inputTitle = props.title ?? currentRule?.title ?? "";

    const baseClasses = `w-full border border-gray-200 rounded-2xl text-sm px-4 py-2.5
        focus:outline-none focus:ring-2 focus:ring-yambo-green-300 focus:border-yambo-green-400
        placeholder-gray-400 bg-white
        transition-all duration-200 shadow-sm hover:shadow`;

    const inputPassword = (
        <div className="relative">
            <input
                ref={ref}
                className={twMerge(`${baseClasses} pr-10 ${className}`)}
                pattern={inputPattern}
                title={inputTitle}
                name={label || undefined}
                {...props}
                type={showPassword ? "text" : "password"}
            />
            <button
                type="button"
                tabIndex={0}
                aria-label={
                    showPassword ? t("component.toggleHidePassword") : t("component.toggleShowPassword")
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yambo-green-600 cursor-pointer transition-colors"
                onClick={() => setShowPassword(!showPassword)}
            >
                <FontAwesomeIcon
                    icon={showPassword ? faEyeSlash : faEye}
                    className="w-5 h-5"
                />
            </button>
        </div>
    );

    const input =
        props.type === "password" ? (
            inputPassword
        ) : (
            <input
                ref={ref}
                className={twMerge(`${baseClasses} ${className}`)}
                pattern={inputPattern}
                title={inputTitle}
                name={label || undefined}
                {...props}
            />
        );

    if (!label) {
        return input;
    }

    return <LabelComponent label={label} required={props.required}>{input}</LabelComponent>;
});

InputComponent.displayName = "InputComponent";

export default InputComponent;
