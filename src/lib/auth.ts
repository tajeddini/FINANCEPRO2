import type { AuthChangeEvent, Session, User as SupabaseUser } from "@supabase/supabase-js";
import { envCloud, getCloud, getSupabaseClient } from "./cloud";

export interface User {
  id: string;
  name: string;
  email: string;
  guest?: boolean;
  created: number;
}

const GUEST_SESSION_KEY = "fp_guest_session";

function notifyAuthConfigurationChanged() {
  window.dispatchEvent(new CustomEvent("fp-auth-configured"));
}

function fromSupabaseUser(user: SupabaseUser): User {
  return {
    id: user.id,
    name: user.user_metadata?.full_name || user.user_metadata?.name || user.email || "کاربر",
    email: user.email ?? "",
    created: Date.parse(user.created_at) || Date.now(),
  };
}

function getGuestSession(): User | null {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<User | null> {
  const guest = getGuestSession();
  if (guest) return guest;
  const cfg = getCloud() ?? envCloud();
  if (!cfg) return null;
  const { data, error } = await getSupabaseClient(cfg).auth.getSession();
  if (error) throw error;
  return data.session ? fromSupabaseUser(data.session.user) : null;
}

export function onAuthStateChange(callback: (user: User | null, event: AuthChangeEvent) => void): () => void {
  if (getGuestSession()) return () => undefined;
  const cfg = getCloud() ?? envCloud();
  if (!cfg) return () => undefined;
  const { data } = getSupabaseClient(cfg).auth.onAuthStateChange((event, session: Session | null) => {
    callback(session ? fromSupabaseUser(session.user) : getGuestSession(), event);
  });
  return () => data.subscription.unsubscribe();
}

export async function signup(name: string, email: string, password: string): Promise<{ user?: User; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!name.trim()) return { error: "نام را وارد کنید." };
  if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return { error: "ایمیل معتبر وارد کنید." };
  if (password.length < 6) return { error: "رمز عبور باید حداقل ۶ کاراکتر باشد." };

  try {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { full_name: name.trim() } },
    });
    if (error) return { error: error.message };
    if (!data.session || !data.user)
      return { error: "حساب ساخته شد؛ برای ادامه ایمیل تأیید را باز کنید، سپس وارد شوید." };
    localStorage.removeItem(GUEST_SESSION_KEY);
    notifyAuthConfigurationChanged();
    return { user: fromSupabaseUser(data.user) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ثبت‌نام در Supabase ناموفق بود." };
  }
}

export async function login(email: string, password: string): Promise<{ user?: User; error?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "ایمیل را وارد کنید." };
  if (!password) return { error: "رمز عبور را وارد کنید." };

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) return { error: error.message };
    if (!data.user) return { error: "حساب کاربری پیدا نشد." };
    localStorage.removeItem(GUEST_SESSION_KEY);
    notifyAuthConfigurationChanged();
    return { user: fromSupabaseUser(data.user) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "ورود به Supabase ناموفق بود." };
  }
}

export async function logout(guestOnly = false): Promise<void> {
  localStorage.removeItem(GUEST_SESSION_KEY);
  if (guestOnly) {
    notifyAuthConfigurationChanged();
    return;
  }
  const cfg = getCloud() ?? envCloud();
  if (!cfg) return;
  const { error } = await getSupabaseClient(cfg).auth.signOut();
  if (error) throw error;
}

export function guestLogin(): User {
  const guest: User = { id: "guest", name: "مهمان", email: "", guest: true, created: Date.now() };
  localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(guest));
  notifyAuthConfigurationChanged();
  return guest;
}

export async function deleteAccount(userId: string, guestOnly = false): Promise<void> {
  localStorage.removeItem(`fp_data_${userId}`);
  await logout(guestOnly);
}
