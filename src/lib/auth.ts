/* ---------- احراز هویت چندکاربره (ثبت‌نام، ورود، هش رمز، مهمان) ---------- */
import { uid } from "./utils";

export interface User {
  id: string;
  name: string;
  username: string;
  hash: string;
  guest?: boolean;
  created: number;
}

const USERS_KEY = "fp_users";
const SESSION_KEY = "fp_session";

function loadUsers(): User[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]") as User[];
  } catch {
    return [];
  }
}

function saveUsers(users: User[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** هش سبک djb2 — برای محصول دمو کافی است؛ در تولید از bcrypt سمت سرور استفاده شود */
export function hashPass(s: string): string {
  let h = 5381;
  const salted = `fp::${s}::salt`;
  for (let i = 0; i < salted.length; i++) h = ((h << 5) + h + salted.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function setSession(u: User | null) {
  if (u) localStorage.setItem(SESSION_KEY, JSON.stringify(u));
  else localStorage.removeItem(SESSION_KEY);
}

export function signup(name: string, username: string, pass: string): { user?: User; error?: string } {
  const un = username.trim().toLowerCase();
  if (!name.trim()) return { error: "نام را وارد کنید." };
  if (un.length < 3) return { error: "نام کاربری باید حداقل ۳ حرف باشد." };
  if (pass.length < 4) return { error: "رمز عبور باید حداقل ۴ کاراکتر باشد." };
  const users = loadUsers();
  if (users.some((u) => u.username === un)) return { error: "این نام کاربری قبلاً ثبت شده است." };
  const user: User = { id: uid(), name: name.trim(), username: un, hash: hashPass(pass), created: Date.now() };
  users.push(user);
  saveUsers(users);
  setSession(user);
  return { user };
}

export function login(username: string, pass: string): { user?: User; error?: string } {
  const un = username.trim().toLowerCase();
  const user = loadUsers().find((u) => u.username === un);
  if (!user) return { error: "کاربری با این نام کاربری پیدا نشد." };
  if (user.hash !== hashPass(pass)) return { error: "رمز عبور اشتباه است." };
  setSession(user);
  return { user };
}

export function logout() {
  setSession(null);
}

export function guestLogin(): User {
  const users = loadUsers();
  let guest = users.find((u) => u.guest);
  if (!guest) {
    guest = { id: "guest", name: "مهمان", username: "guest", hash: "-", guest: true, created: Date.now() };
    users.push(guest);
    saveUsers(users);
  }
  setSession(guest);
  return guest;
}

export function deleteAccount(userId: string) {
  saveUsers(loadUsers().filter((u) => u.id !== userId));
  localStorage.removeItem(`fp_data_${userId}`);
  setSession(null);
}

/** فهرست کاربران ثبت‌شدهٔ این دستگاه — برای نمایش چندکاربره */
export const listUsers = (): User[] => loadUsers();
