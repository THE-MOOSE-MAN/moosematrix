import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "link";
  size?: "sm" | "md" | "lg";
};

const base = "inline-flex items-center justify-center font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 rounded-2xl";
const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base"
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  const variants: Record<string, string> = {
    primary: "bg-brand-600 hover:bg-brand-700 text-white shadow",
    secondary: "bg-white/10 hover:bg-white/15 text-white border border-white/10",
    ghost: "bg-transparent hover:bg-white/10 text-white border border-white/10",
    link: "bg-transparent text-brand-600 hover:underline"
  };
  return <button className={[base, sizes[size], variants[variant], className].join(" ")} {...props} />;
}
