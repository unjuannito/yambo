interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
}

export function Checkbox({
  label,
  description,
  className = "",
  ...props
}: CheckboxProps) {
  return (
    <label className="flex items-start cursor-pointer group">
      <input
        type="checkbox"
        className={`mr-2 mt-1 h-4 w-4 text-yambo-green-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yambo-green-500/50 ${className}`}
        {...props}
      />
      <div>
        <span className="font-medium text-gray-900 group-hover:text-yambo-green-700 transition-colors">
          {label}
        </span>
        {description && (
          <p className="text-sm text-gray-500">{description}</p>
        )}
      </div>
    </label>
  );
}
