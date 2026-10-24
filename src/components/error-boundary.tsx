import React, { type ErrorInfo } from "react";
import type { AppState } from "../lib/data";
import { sanitizeStateForExport } from "../lib/backup-sanitize";
import { exportFile } from "../lib/native-files";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  componentStack: string;
}

function hasPrefs(value: unknown): value is AppState {
  return typeof value === "object" && value !== null &&
    "prefs" in value && typeof value.prefs === "object" && value.prefs !== null;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: "", componentStack: "" };

  static getDerivedStateFromError(error: unknown): Partial<ErrorBoundaryState> {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Application render failed", error, errorInfo.componentStack);
    this.setState({ componentStack: errorInfo.componentStack ?? "" });
  }

  private downloadRawData = async () => {
    try {
      const collected: Record<string, unknown> = {};
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key || (!key.startsWith("fp_data_") && !key.includes("__corrupt_"))) continue;
        const raw = localStorage.getItem(key);
        if (raw === null) continue;
        if (!key.startsWith("fp_data_")) {
          try {
            collected[key] = JSON.parse(raw);
          } catch {
            collected[key] = raw;
          }
          continue;
        }
        try {
          const parsed: unknown = JSON.parse(raw);
          collected[key] = hasPrefs(parsed) ? sanitizeStateForExport(parsed) : parsed;
        } catch {
          collected[key] = raw;
        }
      }
      const blob = new Blob([JSON.stringify(collected, null, 2)], { type: "application/json" });
      await exportFile(`financepro-recovery-${new Date().toISOString().slice(0, 10)}.json`, blob, "application/json");
    } catch (error) {
      console.error("[ErrorBoundary] Raw data export failed", error);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main dir="rtl" className="min-h-screen grid place-items-center p-5" style={{ background: "var(--fp-bg)", color: "var(--fp-text)" }}>
        <section className="card w-full max-w-xl p-6">
          <h1 className="text-xl font-black">مشکلی در نمایش برنامه رخ داد. داده‌های شما پاک نشده‌اند.</h1>
          <div className="flex flex-wrap gap-2 mt-5">
            <button className="btn btn-gold btn-sm" onClick={() => this.setState({ hasError: false, message: "", componentStack: "" })}>تلاش دوباره</button>
            <button className="btn btn-ghost btn-sm" onClick={() => window.location.reload()}>بارگذاری مجدد</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { void this.downloadRawData(); }}>دانلود نسخهٔ خام داده‌ها</button>
          </div>
          <details className="mt-5 text-sm">
            <summary className="cursor-pointer font-bold">جزئیات خطا برای عیب‌یابی</summary>
            <pre dir="ltr" className="select-text whitespace-pre-wrap break-words overflow-auto mt-3 rounded-xl p-3 text-xs" style={{ background: "var(--fp-bg)", color: "var(--fp-text3)" }}>
              {this.state.message}
              {this.state.componentStack ? `\n\n${this.state.componentStack}` : ""}
            </pre>
          </details>
        </section>
      </main>
    );
  }
}
