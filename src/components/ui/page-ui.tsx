import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] sf-accent-text">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">{description}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-xl border bg-card border-border ${className}`}>
      {children}
    </section>
  );
}

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-card border-border border-b  px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && (
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Panel className="p-4 bg-card border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-400">{label}</span>
        <div className="rounded-lg border border-[#343044] sf-accent-soft p-2">
          <Icon size={17} className="text-white" />
        </div>
      </div>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </Panel>
  );
}

const statusStyles: Record<string, string> = {
  Ready: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Published: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  Processing: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  Queued: "border-blue-500/20 bg-blue-500/10 text-blue-400",
  Draft: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  Pending: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  Rejected: "border-red-500/20 bg-red-500/10 text-red-400",
  Failed: "border-red-500/20 bg-red-500/10 text-red-400",
  Submitted: "border-violet-500/20 bg-violet-500/10 text-violet-400",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${
        statusStyles[status] ??
        "border-slate-500/20 bg-slate-500/10 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

export const inputClass =
  "w-full rounded-lg border sf-accent-border bg-[#111318] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#8B7CFF] focus:ring-2 focus:ring-[#8B7CFF]/10";

export const buttonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg sf-accent-bg border border-[#303541] bg-[#222630] px-3.5 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-[#2B303B] disabled:cursor-not-allowed disabled:opacity-50";

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg sf-accent-bg px-3.5 py-2.5 text-sm font-medium text-white transition hover:bg-[#7969F5] disabled:cursor-not-allowed disabled:opacity-50";
