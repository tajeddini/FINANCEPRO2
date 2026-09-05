/* ---------- اجزای مشترک صفحه‌ها ---------- */

/** دانلود یک Blob با نام فایل */
export const dl = (blob: Blob, name: string) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export function Head({ icon, title, small }: { icon: React.ReactNode; title: string; small?: boolean }) {
  return (
    <h3 className={`font-black flex items-center gap-2 ${small ? "text-[12.5px]" : "text-[14.5px]"}`} style={{ color: "var(--fp-text)" }}>
      <span style={{ color: "var(--fp-accent)" }}>{icon}</span> {title}
    </h3>
  );
}

export function EyeOn() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>; }
export function EyeOff() { return <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.5 10.5 0 0 1 12 19c-6.5 0-10-7-10-7a19 19 0 0 1 5.06-5.94M9.9 4.24A10.5 10.5 0 0 1 12 4c6.5 0 10 7 10 7a19 19 0 0 1-3.22 4.31" /><path d="M1 1l22 22" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /></svg>; }
