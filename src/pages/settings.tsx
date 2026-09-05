/* ---------- صفحهٔ تنظیمات ---------- */
import { useRef, useState } from "react";
import { Bell, Bot, Cloud, Copy, Download, KeyRound, Lock, Moon, Palette, RefreshCw, Shield, Sparkles, Sun, Trash2, Upload } from "lucide-react";
import { migrateLoadedState, useStore, type AppState } from "../lib/data";
import { copyText, faNum, todayISO } from "../lib/utils";
import { listUsers, type User } from "../lib/auth";
import {
  decodeState, effectivePrefs, encodeState, mergePulledState, pullFromCloud,
  pushToCloud, sameLedgerContent, saveCloud, testConnection,
} from "../lib/cloud";
import { applyAccent, THEMES } from "../lib/themes";
import { Field, TInput, useToast } from "../ui";
import { base64ToUtf8, isNativePlat, pickFileNative } from "../lib/native-files";
import { dl } from "./shared";

export default function SettingsPage({ user, onLogout, onDelete, onLock }: {
  user: User; onLogout: () => void; onDelete: () => void; onLock: () => void;
}) {
  const { state, mutate } = useStore();
  const toast = useToast();
  const p = state.prefs;
  const [syncUrl, setSyncUrl] = useState(p.syncUrl ?? "");
  const [syncKey, setSyncKey] = useState(p.syncKey ?? "");
  const [pin, setPin] = useState(p.pin ?? "");
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [aiApiUrl, setAiApiUrl] = useState(p.aiApiUrl ?? "");
  const [aiApiKey, setAiApiKey] = useState(p.aiApiKey ?? "");
  const [aiModel, setAiModel] = useState(p.aiModel ?? "");
  const [botToken, setBotToken] = useState(p.botToken ?? "");
  const [transferCode, setTransferCode] = useState("");
  const [importCode, setImportCode] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const cloudSyncId = "fp-user-" + user.username;

  const saveAi = () => {
    mutate((d) => { d.prefs.aiApiUrl = aiApiUrl.trim(); d.prefs.aiApiKey = aiApiKey.trim(); d.prefs.aiModel = aiModel.trim(); }, "تنظیمات هوش مصنوعی ذخیره شد");
    toast("ok", "تنظیمات هوش مصنوعی ذخیره شد.");
  };

  const saveBot = () => {
    mutate((d) => { d.prefs.botToken = botToken.trim(); }, "توکن ربات تلگرام ذخیره شد");
    toast("ok", "توکن ربات تلگرام ذخیره شد.");
  };

  const makeTransferCode = () => {
    setTransferCode(encodeState(state));
    toast("ok", "کد انتقال ساخته شد — آن را در مرورگر دیگر وارد کنید.");
  };

  const doImportCode = () => {
    if (!importCode.trim()) return toast("warn", "کد انتقال را وارد کنید.");
    const data = decodeState(importCode.trim());
    if (!data) return toast("err", "کد انتقال معتبر نیست.");
    mutate((d) => { Object.assign(d, migrateLoadedState(data), { prefs: d.prefs }); }, "انتقال داده از مرورگر دیگر");
    setImportCode("");
    toast("ok", "داده‌ها از مرورگر دیگر منتقل شد — تنظیمات این دستگاه حفظ شد.");
  };

  const saveSync = () => {
    mutate((d) => { d.prefs.syncUrl = syncUrl.trim(); d.prefs.syncKey = syncKey.trim(); }, "تنظیمات سینک ذخیره شد");
    saveCloud({ url: syncUrl.trim(), key: syncKey.trim() });
    toast("ok", "تنظیمات سینک ذخیره شد.");
  };

  const doTest = async () => {
    setTesting(true);
    const r = await testConnection({ ...p, syncUrl: syncUrl.trim(), syncKey: syncKey.trim() }, cloudSyncId);
    setTesting(false);
    toast(r.ok ? "ok" : "err", r.message);
  };

  const doSync = async () => {
    const ep = effectivePrefs({ ...p, syncUrl: syncUrl.trim(), syncKey: syncKey.trim() });
    if (!ep.syncUrl || !ep.syncKey) return toast("warn", "ابتدا آدرس و کلید را پر و ذخیره کنید.");
    setSyncing(true);
    const pull = await pullFromCloud(ep, cloudSyncId);
    if (pull.ok && pull.state && (pull.state.rev ?? 0) > (state.rev ?? 0)) {
      if (!sameLedgerContent(state, pull.state)) {
        mutate((d) => { mergePulledState(d, pull.state!); }, "دریافت داده از ابر");
        toast("ok", "نسخهٔ جدیدتر از Supabase دریافت شد.");
      } else {
        toast("ok", "داده‌ها از قبل همگام بودند.");
      }
    } else if (pull.ok) {
      const push = await pushToCloud(state, ep, cloudSyncId);
      toast(push.ok ? "ok" : "err", push.ok ? "دفترکل با Supabase همگام شد." : push.message);
    } else {
      toast("err", pull.message);
    }
    setSyncing(false);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    dl(blob, `financepro-backup-${todayISO()}.json`);
    toast("ok", "پشتیبان JSON دانلود شد.");
  };

  /* منطق مشترک پارس پشتیبان — هم وب و هم بومی */
  const applyBackupText = (text: string) => {
    try {
      const data = JSON.parse(text) as AppState;
      if (!Array.isArray(data.transactions) || !Array.isArray(data.accounts)) throw new Error("bad");
      mutate((d) => { Object.assign(d, migrateLoadedState(data), { prefs: d.prefs }); }, "بازیابی از پشتیبان");
      toast("ok", "پشتیبان بازیابی شد — تنظیمات و اتصال ابری این دستگاه حفظ شد.");
    } catch {
      toast("err", "فایل پشتیبان معتبر نیست.");
    }
  };

  /* مسیر وب/PWA */
  const importBackup = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => applyBackupText(String(reader.result));
    reader.readAsText(file);
  };

  /* مسیر بومی (اندروید): انتخاب فایل پشتیبان با FilePicker */
  const restoreBackupNative = async () => {
    const picked = await pickFileNative(["application/json", "application/octet-stream", "text/plain"]);
    if (!picked) return toast("warn", "فایلی انتخاب نشد.");
    applyBackupText(base64ToUtf8(picked.base64));
  };

  const users = listUsers();

  return (
    <div className="grid gap-5 max-w-3xl">
      <h1 className="font-display text-3xl md:text-4xl rise-in">تنظیمات</h1>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "40ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Palette className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> ظاهر</h3>
        <div className="grid gap-4 mt-4">
          <Field label="تم روشن / تیره">
            <div className="flex gap-2">
              <button className={`chip ${p.theme !== "light" ? "chip-on" : ""}`} onClick={() => mutate((d) => { d.prefs.theme = "dark"; }, "تم تیره شد")}><Moon className="w-3.5 h-3.5" /> تیره</button>
              <button className={`chip ${p.theme === "light" ? "chip-on" : ""}`} onClick={() => mutate((d) => { d.prefs.theme = "light"; }, "تم روشن شد")}><Sun className="w-3.5 h-3.5" /> روشن</button>
            </div>
          </Field>
          <Field label="تم رنگی ترکیبی">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((th) => (
                <button key={th.id} title={th.name}
                  onClick={() => { applyAccent(th.id); mutate((d) => { d.prefs.accent = th.id; }, `تم «${th.name}» فعال شد`); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black cursor-pointer transition-all hover:scale-105"
                  style={{
                    background: (p.accent ?? "emerald") === th.id ? `color-mix(in srgb, ${th.accent} 22%, transparent)` : "var(--fp-bg)",
                    border: `1.5px solid ${(p.accent ?? "emerald") === th.id ? th.accent : "var(--fp-border)"}`,
                    color: (p.accent ?? "emerald") === th.id ? th.accent : "var(--fp-text2)",
                  }}>
                  <span className="w-4 h-4 rounded-full" style={{ background: `linear-gradient(135deg, ${th.accent} 0 52%, ${th.mint} 52%)` }} />
                  {th.name}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "80ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Lock className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> امنیت</h3>
        <div className="grid gap-4 mt-4">
          <Field label="پین ورود (۴ تا ۶ رقم)" hint="وقتی فعال باشد، هر بار ورود پین می‌خواهد.">
            <div className="flex gap-2">
              <TInput dir="ltr" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^\d۰-۹]/g, "").slice(0, 6))} placeholder="••••" />
              <button className="btn btn-ghost btn-sm" onClick={() => {
                const en = pin.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
                mutate((d) => { d.prefs.pin = en || undefined; d.prefs.pinEnabled = en.length >= 4; }, en ? "پین تنظیم شد" : "پین حذف شد");
                toast("ok", en.length >= 4 ? "پین فعال شد." : "پین حذف شد.");
              }}>ذخیرهٔ پین</button>
            </div>
          </Field>
          {p.pinEnabled && (
            <button className="btn btn-ghost btn-sm self-start" onClick={onLock}><Lock className="w-4 h-4" /> قفل کردن اکنون</button>
          )}
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "120ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Cloud className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> همگام‌سازی ابری (Supabase)</h3>
        <p className="text-[11px] font-bold mt-1 leading-5" style={{ color: "var(--fp-text3)" }}>
          آدرس پروژه و کلید anon را از داشبورد Supabase (Settings → API) بگیرید. کلید هرگز به ابر فرستاده نمی‌شود.
        </p>
        <div className="grid gap-3 mt-4">
          <Field label="آدرس پروژه (SUPABASE_URL)"><TInput dir="ltr" value={syncUrl} onChange={(e) => setSyncUrl(e.target.value)} placeholder="https://xxx.supabase.co" /></Field>
          <Field label="کلید anon (SUPABASE_KEY)"><TInput dir="ltr" type="password" value={syncKey} onChange={(e) => setSyncKey(e.target.value)} placeholder="eyJhbGciOi…" /></Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-gold btn-sm" onClick={saveSync}>ذخیره</button>
            <button className="btn btn-ghost btn-sm" onClick={doTest} disabled={testing}><RefreshCw className={`w-4 h-4 ${testing ? "spin-slow" : ""}`} /> آزمایش اتصال</button>
            <button className="btn btn-mint btn-sm" onClick={doSync} disabled={syncing}><Cloud className="w-4 h-4" /> {syncing ? "در حال سینک…" : "سینک اکنون"}</button>
          </div>
          <p className="text-[10.5px] font-bold" style={{ color: "var(--fp-text3)" }}>
            شناسهٔ سینک شما: <span dir="ltr" className="tabular">{cloudSyncId}</span> — با همین شناسه در هر دستگاهی داده‌هایتان را می‌بینید.
          </p>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "140ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Sparkles className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> هوش مصنوعی</h3>
        <p className="text-[11px] font-bold mt-1 leading-5" style={{ color: "var(--fp-text3)" }}>
          برای تحلیل مستقیم گزارش‌ها با هوش مصنوعی، آدرس API و کلید را وارد کنید (سازگار با OpenAI و OpenRouter). کلید فقط روی همین مرورگر ذخیره می‌شود.
        </p>
        <div className="grid gap-3 mt-4">
          <Field label="آدرس API"><TInput dir="ltr" value={aiApiUrl} onChange={(e) => setAiApiUrl(e.target.value)} placeholder="https://api.openai.com/v1/chat/completions" /></Field>
          <Field label="کلید API"><TInput dir="ltr" type="password" value={aiApiKey} onChange={(e) => setAiApiKey(e.target.value)} placeholder="sk-…" /></Field>
          <Field label="مدل"><TInput dir="ltr" value={aiModel} onChange={(e) => setAiModel(e.target.value)} placeholder="gpt-4o-mini" /></Field>
          <button className="btn btn-gold btn-sm self-start" onClick={saveAi}>ذخیرهٔ تنظیمات هوش مصنوعی</button>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "150ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Bot className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> ربات تلگرام</h3>
        <p className="text-[11px] font-bold mt-1 leading-5" style={{ color: "var(--fp-text3)" }}>
          توکن ربات را از BotFather بگیرید و اینجا ذخیره کنید تا بتوانید از تلگرام تراکنش ثبت کنید. راهنمای کامل در VPS-GUIDE.md است.
        </p>
        <div className="grid gap-3 mt-4">
          <Field label="توکن ربات (BOT_TOKEN)"><TInput dir="ltr" type="password" value={botToken} onChange={(e) => setBotToken(e.target.value)} placeholder="123456:ABC-DEF…" /></Field>
          <button className="btn btn-gold btn-sm self-start" onClick={saveBot}>ذخیرهٔ توکن ربات</button>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "160ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Download className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> پشتیبان‌گیری</h3>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="btn btn-ghost btn-sm" onClick={exportBackup}><Download className="w-4 h-4" /> دانلود پشتیبان JSON</button>
          <button className="btn btn-ghost btn-sm" onClick={() => { if (isNativePlat()) void restoreBackupNative(); else fileRef.current?.click(); }}><Upload className="w-4 h-4" /> بازیابی از پشتیبان</button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importBackup(f); e.target.value = ""; }} />
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "180ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><KeyRound className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> انتقال بین مرورگر</h3>
        <p className="text-[11px] font-bold mt-1 leading-5" style={{ color: "var(--fp-text3)" }}>
          اگر سینک ابری ندارید، می‌توانید داده‌ها را با یک کد از این مرورگر به مرورگر دیگر منتقل کنید.
        </p>
        <div className="grid gap-3 mt-4">
          <button className="btn btn-mint btn-sm self-start" onClick={makeTransferCode}><KeyRound className="w-4 h-4" /> ساخت کد انتقال از این مرورگر</button>
          {transferCode && (
            <div>
              <p className="text-[10.5px] font-black mb-1" style={{ color: "var(--fp-text3)" }}>این کد را کپی و در مرورگر دیگر وارد کنید:</p>
              <textarea readOnly value={transferCode} dir="ltr" rows={3} className="input !text-[10px] !leading-5 resize-y" style={{ background: "var(--fp-bg)" }} />
              <button className="btn btn-ghost btn-sm mt-2" onClick={async () => { const ok = await copyText(transferCode); toast(ok ? "ok" : "err", ok ? "کد کپی شد." : "کپی ناموفق بود."); }}><Copy className="w-4 h-4" /> کپی کد</button>
            </div>
          )}
          <Field label="وارد کردن کد انتقال (از مرورگر دیگر)">
            <textarea value={importCode} onChange={(e) => setImportCode(e.target.value)} dir="ltr" rows={3} className="input !text-[10px] !leading-5 resize-y" style={{ background: "var(--fp-bg)" }} placeholder="کد را اینجا بچسبانید…" />
          </Field>
          <button className="btn btn-gold btn-sm self-start" onClick={doImportCode}><Upload className="w-4 h-4" /> انتقال به این مرورگر</button>
        </div>
      </div>

      <div className="card p-5 rise-in" style={{ ["--d" as string]: "200ms" }}>
        <h3 className="text-[14px] font-black flex items-center gap-2"><Shield className="w-4.5 h-4.5" style={{ color: "var(--fp-accent)" }} /> حساب کاربری</h3>
        <div className="flex items-center gap-3 mt-4">
          <span className="w-12 h-12 rounded-xl grid place-items-center font-display text-xl" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>{user.name.slice(0, 1)}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-black">{user.name} {user.guest && <span className="chip !cursor-default" style={{ color: "var(--fp-accent)" }}>مهمان</span>}</p>
            <p className="text-[11px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{user.username}</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onLogout}>خروج</button>
        </div>
        <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--fp-border)" }}>
          <p className="text-[11px] font-black mb-2" style={{ color: "var(--fp-text3)" }}>کاربران این دستگاه — {faNum(users.length)} کاربر</p>
          <div className="grid gap-1.5">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 rounded-lg px-3 py-2"
                style={{ background: u.id === user.id ? "color-mix(in srgb, var(--fp-mint) 8%, transparent)" : "var(--fp-bg)", border: `1px solid ${u.id === user.id ? "var(--fp-mint)" : "var(--fp-border)"}` }}>
                <span className="w-7 h-7 rounded-lg grid place-items-center font-display text-[13px] shrink-0" style={{ background: "color-mix(in srgb, var(--fp-mint) 15%, transparent)", color: "var(--fp-mint)" }}>{u.name.slice(0, 1)}</span>
                <span className="text-[12px] font-black flex-1 truncate">{u.name}</span>
                <span className="text-[10px] font-bold" style={{ color: "var(--fp-text3)" }} dir="ltr">@{u.username}</span>
                {u.id === user.id && <span className="chip !cursor-default" style={{ color: "var(--fp-mint)", borderColor: "var(--fp-mint)" }}>فعال</span>}
              </div>
            ))}
          </div>
        </div>
        {!user.guest && (
          <button className="btn btn-danger btn-sm mt-4" onClick={() => { if (confirm("حساب و همهٔ داده‌های این دستگاه حذف شود؟")) onDelete(); }}>
            <Trash2 className="w-4 h-4" /> حذف حساب و داده‌ها
          </button>
        )}
      </div>
    </div>
  );
}
