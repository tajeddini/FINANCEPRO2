/* ---------- تم‌های رنگی ترکیبی ---------- */
export interface ThemeDef {
  id: string;
  name: string;
  accent: string;
  mint: string;
}

export const THEMES: ThemeDef[] = [
  { id: "emerald", name: "زمرد و طلا", accent: "#e8b04b", mint: "#2fb98a" },
  { id: "emerald-dark", name: "زمردی دارک", accent: "#34d399", mint: "#5eead4" },
  { id: "saffron", name: "زعفرانی و فیروزه", accent: "#ff8f45", mint: "#14c4a8" },
  { id: "ruby", name: "یاقوتی و صورتی", accent: "#ff5e7e", mint: "#ff9db4" },
  { id: "royal", name: "آبی سلطنتی و آسمان", accent: "#7aa2f7", mint: "#54d6e8" },
  { id: "copper", name: "مسی و زیتونی", accent: "#dd9460", mint: "#b3c968" },
];

export const readAccent = (): string => {
  try {
    return localStorage.getItem("fp_accent") || "emerald";
  } catch {
    return "emerald";
  }
};

export const applyAccent = (id: string) => {
  document.documentElement.dataset.accent = id;
  try {
    localStorage.setItem("fp_accent", id);
  } catch { /* ignore */ }
};

export const themeById = (id?: string): ThemeDef =>
  THEMES.find((t) => t.id === (id ?? "emerald")) ?? THEMES[0];
