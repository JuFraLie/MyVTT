import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

const VARIANTS: Record<'primary' | 'ghost', string> = {
  primary: 'bg-indigo-500 text-white active:bg-indigo-400',
  ghost: 'bg-slate-800 text-slate-100 active:bg-slate-700',
};

/** Tombol dengan target sentuh min. 44 px dan status aktif (bukan hover) — AGENTS.md §7. */
export default function Button({
  variant = 'primary',
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-xl px-4 text-sm font-medium transition-colors disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    />
  );
}
