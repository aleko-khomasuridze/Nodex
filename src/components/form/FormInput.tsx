
import type { ChangeEventHandler } from "react";

interface FormInputProps {
  className?: string;
  type?: string | "email" | "password" | "text" | "date" | "number";
  id: string;
  isRequired?: boolean;
  label: string;
  placeHolder?: string;
  value?: string | number;
  defaultValue?: string | number;
  helperText?: string;
  name?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  autoComplete?: string;
  min?: number;
  max?: number;
}

const FormInput = ({
  className,
  type = "text",
  id,
  isRequired,
  label,
  placeHolder,
  value,
  defaultValue,
  helperText,
  name,
  onChange,
  autoComplete,
  min,
  max
}: FormInputProps) => {
  return (
    <div className={`mb-3 ${className ?? ""}`}>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>
      <input
        type={type}
        id={id}
        className="block w-full rounded-lg border border-slate-700 bg-slate-900 p-2.5 text-sm text-slate-100 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/40"
        required={isRequired}
        placeholder={placeHolder}
        {...(value !== undefined ? { value } : { defaultValue })}
        name={name}
        onChange={onChange}
        autoComplete={autoComplete}
        {...(typeof min === 'number' ? { min } : {})}
        {...(typeof max === 'number' ? { max } : {})}
      />
      {helperText ? (
        <p className="mt-1 text-xs text-slate-400">{helperText}</p>
      ) : null}
    </div>
  );
};

export default FormInput;
