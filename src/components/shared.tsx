import { useState, type CSSProperties, type ReactNode } from "react";
import { useInView } from "../lib/utils";
import { Icon } from "./icons";

/* ---------- ظهور با اسکرول ---------- */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? "reveal-in" : ""} ${className}`}
      style={{ "--rd": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  );
}

/* ---------- سرصفحهٔ بخش‌ها ---------- */
export function SectionHead({
  index,
  kicker,
  title,
  desc,
  light = false,
}: {
  index: string;
  kicker: string;
  title: string;
  desc?: string;
  light?: boolean;
}) {
  return (
    <Reveal className="mb-12 md:mb-16">
      <div className="flex items-center gap-4 mb-4">
        <span
          className={`font-display text-2xl leading-none ${
            light ? "text-gold-500" : "text-gold-500"
          }`}
        >
          {index}
        </span>
        <span className="rule-dash w-14 text-gold-500/70" />
        <span
          className={`text-sm font-semibold tracking-wide ${
            light ? "text-pine-600" : "text-mint-400"
          }`}
        >
          {kicker}
        </span>
      </div>
      <h2
        className={`font-display leading-[1.15] text-4xl md:text-5xl lg:text-6xl ${
          light ? "text-pine-850" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {desc && (
        <p
          className={`mt-4 max-w-2xl text-base md:text-lg leading-8 ${
            light ? "text-pine-700/80" : "text-ink-2"
          }`}
        >
          {desc}
        </p>
      )}
    </Reveal>
  );
}

/* ---------- دکمهٔ کپی ---------- */
export function CopyButton({ text, light = false }: { text: string; light?: boolean }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* بدون دسترسی به کلیپ‌بورد، بی‌صدا رد شو */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1700);
  };
  return (
    <button
      onClick={onCopy}
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-md border transition-all duration-200 cursor-pointer ${
        copied
          ? "border-mint-400 text-mint-300 bg-mint-400/10"
          : light
          ? "border-pine-700/30 text-pine-700 hover:border-pine-700 hover:bg-pine-700/5"
          : "border-mint-400/25 text-ink-2 hover:border-mint-400/60 hover:text-mint-300 hover:bg-mint-400/5"
      }`}
    >
      <Icon name={copied ? "check" : "copy"} className="w-3.5 h-3.5" />
      {copied ? "کپی شد" : "کپی"}
    </button>
  );
}

/* ---------- بلوک کد ---------- */
export interface CodeLine {
  text: string;
  kind?: "cmd" | "comment" | "plain";
}

export function CodeBlock({
  lines,
  copy,
  label,
}: {
  lines: CodeLine[];
  copy: string;
  label?: string;
}) {
  return (
    <div className="relative group">
      <div className="flex items-center justify-between px-4 py-2 bg-pine-800/60 border border-b-0 border-mint-400/16 rounded-t-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-coral-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-gold-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-mint-400/70" />
          {label && <span className="ms-2 text-[11px] text-ink-3 font-semibold">{label}</span>}
        </div>
        <CopyButton text={copy} />
      </div>
      <pre className="code-block rounded-b-lg px-5 py-4 overflow-x-auto">
        {lines.map((l, i) => (
          <div key={i} className={l.kind === "comment" ? "c-comment" : l.kind === "cmd" ? "c-cmd" : ""}>
            {l.kind === "cmd" && <span className="c-flag select-none">$ </span>}
            {l.text}
          </div>
        ))}
      </pre>
    </div>
  );
}

/* ---------- برچسب وضعیت ---------- */
export function StatusBadge({ ok = true, text }: { ok?: boolean; text: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
        ok
          ? "border-mint-400/40 text-mint-300 bg-mint-400/10"
          : "border-gold-500/40 text-gold-400 bg-gold-500/10"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-mint-400 pulse-dot" : "bg-gold-500"}`} />
      {text}
    </span>
  );
}
