import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[1.7rem] font-bold tracking-tight text-[#0F172A] sm:text-3xl">{title}</h1>
        <p className="mt-1.5 text-sm leading-6 text-[#64748B]">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function Button({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none ${className}`}
      {...props}
    />
  );
}

export function SecondaryButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-5 text-sm font-bold text-[#0F172A] shadow-[0_8px_20px_rgba(15,23,42,0.04)] transition hover:bg-slate-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:text-slate-300 ${className}`}
      {...props}
    />
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="min-h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-base text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="min-h-12 w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 text-base text-[#0F172A] outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="min-h-24 w-full rounded-xl border border-[#E5E7EB] bg-white px-3.5 py-3 text-base text-[#0F172A] outline-none transition placeholder:text-slate-400 focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100" {...props} />;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#0F172A]">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-white/90 p-8 text-center shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
        <span className="size-2 rounded-full bg-[#2563EB]" />
      </div>
      <p className="font-bold text-[#0F172A]">{title}</p>
      <p className="mx-auto mt-1.5 max-w-xs text-sm leading-6 text-[#64748B]">{description}</p>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "success" | "error"; children: ReactNode }) {
  const className =
    tone === "success"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return <div className={`rounded-xl border p-3.5 text-sm font-bold shadow-[0_10px_24px_rgba(15,23,42,0.04)] ${className}`}>{children}</div>;
}

export function LoadingBlock({ label = "読み込み中..." }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 text-center text-sm font-bold text-[#64748B] shadow-[0_14px_34px_rgba(15,23,42,0.05)]">
      {label}
    </div>
  );
}
