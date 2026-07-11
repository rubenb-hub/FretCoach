import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground active:opacity-90",
  secondary: "bg-surface-muted text-foreground border border-border active:opacity-90",
  ghost: "bg-transparent text-foreground active:bg-surface-muted",
  danger: "bg-danger text-white active:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  md: "h-11 px-4 text-[15px] rounded-xl",
  lg: "h-14 px-6 text-base rounded-2xl",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", className = "", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 font-medium transition-transform disabled:opacity-40 disabled:pointer-events-none select-none touch-manipulation ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
});
