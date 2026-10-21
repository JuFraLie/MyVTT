import type { InputHTMLAttributes } from 'react';

const BASE_CLASS =
  'min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none';

/** Input form mobile-first: target sentuh min. 44 px, teks `text-base` (mencegah zoom otomatis di iOS). */
export default function Input({ className = '', ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${BASE_CLASS} ${className}`} {...rest} />;
}
