import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icons";

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "md" | "sm";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-n-950 text-white hover:opacity-90",
  outline:
    "border border-line-300 text-n-900 hover:border-[#c9cfdb] hover:bg-n-150/60",
  ghost: "text-n-550 hover:bg-n-150 hover:text-n-950",
};

const sizeStyles: Record<ButtonSize, string> = {
  md: "h-9 px-[18px] text-sm",
  sm: "h-8 px-3 text-xs",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center gap-1 rounded-full font-medium tracking-cn transition-[color,background-color,border-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className,
      )}
      aria-hidden="true"
    />
  );
}

type Tone = "neutral" | "success" | "danger";

const dotStyles: Record<Tone, string> = {
  neutral: "bg-n-450",
  success: "bg-success",
  danger: "bg-danger",
};

export function StatusChip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full bg-n-150 px-2 text-xs tracking-cn whitespace-nowrap text-n-700",
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dotStyles[tone])} aria-hidden="true" />
      {children}
    </span>
  );
}

export function SectionHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-title text-n-950">{title}</h1>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-card bg-n-150/60 px-6 py-10 text-center">
      {icon ? (
        <span className="flex size-10 items-center justify-center rounded-full bg-surface text-n-550">
          {icon}
        </span>
      ) : null}
      <p className="mt-3 text-lg font-semibold tracking-title text-n-950">{title}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    if (!navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 3000);
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={label}
        className="inline-flex size-7 items-center justify-center rounded-full text-n-450 transition-colors duration-150 hover:bg-n-150 hover:text-n-700"
      >
        <Icon
          name={copied ? "check" : "copy"}
          className={cn("h-3.5 w-3.5", copied && "text-success")}
        />
      </button>
      {copied ? (
        <span
          role="status"
          className="pointer-events-none absolute top-1/2 right-full z-10 mr-3 -translate-y-1/2 rounded-tip bg-tooltip px-1 py-0.5 text-xs whitespace-nowrap tracking-cn text-white"
        >
          已复制
          <span className="absolute top-1/2 left-full -translate-y-1/2 border-y-[6px] border-l-[6px] border-y-transparent border-l-tooltip" />
        </span>
      ) : null}
    </span>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (open) {
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (!node.open) node.showModal();
    } else if (node.open) {
      node.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        triggerRef.current?.focus();
      }}
      className="m-auto max-h-[calc(100dvh-32px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-panel border border-line-100 bg-surface p-7 text-n-950 shadow-light backdrop:bg-n-950/40"
    >
      <h2 id={titleId} className="text-xl font-semibold tracking-title">
        {title}
      </h2>
      <div className="mt-3 text-body tracking-cn text-n-550">{description}</div>
      {error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-tip bg-danger/5 px-3 py-2 text-xs leading-5 tracking-cn text-danger"
        >
          <Icon name="alert" className="mt-0.5 h-3.5 w-3.5" />
          {error}
        </p>
      ) : null}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={pending}>
          取消
        </Button>
        <Button onClick={onConfirm} disabled={pending}>
          {pending ? <Spinner className="size-3.5" /> : null}
          {pending ? "处理中…" : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
