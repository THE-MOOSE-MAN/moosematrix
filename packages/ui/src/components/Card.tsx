import React from "react";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "glass";
};

export function Card({ children, className = "", variant = "default" }: CardProps) {
  const base =
    "rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-shadow duration-150 hover:shadow-[var(--shadow)]";

  const glass =
    "bg-[color-mix(in_srgb,var(--surface)_78%,transparent)] backdrop-blur";

  const styles = variant === "glass" ? `${base} ${glass}` : base;

  return <div className={[styles, className].join(" ")}>{children}</div>;
}
