"use client";

import { supabase } from "@/lib/supabase";
import type { SemesterSystem, Term, UserSettings, Weekday } from "@/lib/types";

export const defaultTermNames: Record<SemesterSystem, string[]> = {
  semester: ["前期", "後期"],
  quarter: ["第1クォーター", "第2クォーター", "第3クォーター", "第4クォーター"],
};

export type CampusContext = {
  userId: string;
  settings: UserSettings;
  terms: Term[];
  currentTerm: Term;
};

export function yearPrefix() {
  return String(new Date().getFullYear());
}

export function termNameFor(system: SemesterSystem, index = 0) {
  return `${yearPrefix()}${defaultTermNames[system][index]}`;
}

export async function ensureCampusContext(): Promise<CampusContext> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error("ログイン情報を取得できませんでした。");

  const userId = userData.user.id;
  const { data: loadedTerms, error: termsError } = await supabase
    .from("terms")
    .select("*")
    .order("sort_order")
    .order("created_at");

  if (termsError) throw termsError;

  let terms = loadedTerms;
  if (!terms || terms.length === 0) {
    const { data: inserted, error } = await supabase
      .from("terms")
      .insert({
        user_id: userId,
        name: termNameFor("semester", 0),
        term_type: "semester",
        sort_order: 1,
      })
      .select("*")
      .single();
    if (error) throw error;
    terms = [inserted];
  }

  const { data: loadedSettings, error: settingsError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (settingsError) throw settingsError;

  let settings = loadedSettings;
  if (!settings) {
    const { data: inserted, error } = await supabase
      .from("user_settings")
      .insert({
        user_id: userId,
        current_term_id: terms[0].id,
        semester_system: "semester",
        show_saturday: false,
        notifications_enabled: false,
        notification_time: "09:00",
      })
      .select("*")
      .single();
    if (error) throw error;
    settings = inserted;
  }

  if (!settings) throw new Error("ユーザー設定を作成できませんでした。");

  let activeSettings: UserSettings = settings;
  const currentTerm = terms.find((term) => term.id === activeSettings.current_term_id) ?? terms[0];
  if (activeSettings.current_term_id !== currentTerm.id) {
    const { data: updated, error } = await supabase
      .from("user_settings")
      .update({ current_term_id: currentTerm.id })
      .eq("user_id", userId)
      .select("*")
      .single();
    if (error) throw error;
    activeSettings = updated;
  }

  return { userId, settings: activeSettings, terms, currentTerm };
}

export async function createDefaultTermsForSystem(userId: string, system: SemesterSystem, existingTerms: Term[]) {
  const names = defaultTermNames[system].map((name) => `${yearPrefix()}${name}`);
  const missing = names.filter((name) => !existingTerms.some((term) => term.name === name));
  if (missing.length === 0) return existingTerms;

  const { data, error } = await supabase
    .from("terms")
    .insert(
      missing.map((name, index) => ({
        user_id: userId,
        name,
        term_type: system,
        sort_order: existingTerms.length + index + 1,
      })),
    )
    .select("*");

  if (error) throw error;
  return [...existingTerms, ...(data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
}

export function visibleWeekdays(showSaturday: boolean) {
  const days: Weekday[] = [1, 2, 3, 4, 5];
  if (showSaturday) days.push(6);
  return days;
}

export function broadcastCampusSettingsChange() {
  window.dispatchEvent(new Event("campus-settings-change"));
}
