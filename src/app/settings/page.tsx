"use client";

import { Bell, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, Field, Input, LoadingBlock, Notice, PageHeader, SecondaryButton, Select } from "@/components/ui";
import { broadcastCampusSettingsChange, createDefaultTermsForSystem, ensureCampusContext } from "@/lib/campus";
import { notificationPermissionLabel, requestBrowserNotificationPermission } from "@/lib/notifications";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { SemesterSystem, Term, UserSettings } from "@/lib/types";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [newTermName, setNewTermName] = useState("");
  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [editingTermName, setEditingTermName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [permissionText, setPermissionText] = useState("通知状態を確認中");

  async function load() {
    setLoading(true);
    try {
      const context = await ensureCampusContext();
      setSettings(context.settings);
      setTerms(context.terms);
      setEmail("");

      const { data: userData } = await supabase.auth.getUser();
      setEmail(userData.user?.email ?? "");

      const { data } = await supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setUniversity(data?.university ?? "");
      setPermissionText(notificationPermissionLabel());
    } catch (error) {
      console.error("Failed to load settings", error);
      setMessage({ tone: "error", text: `設定の読み込みに失敗しました: ${getErrorMessage(error)}` });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("ログイン情報を取得できませんでした。");

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userData.user.id,
        display_name: displayName || null,
        university: university || null,
      });
      if (profileError) throw profileError;

      const { error: settingsError } = await supabase
        .from("user_settings")
        .update({
          semester_system: settings.semester_system,
          show_saturday: settings.show_saturday,
          notifications_enabled: settings.notifications_enabled,
          notification_time: "09:00",
        })
        .eq("user_id", userData.user.id);
      if (settingsError) throw settingsError;

      setMessage({ tone: "success", text: "設定を保存しました。" });
      broadcastCampusSettingsChange();
      await load();
    } catch (error) {
      console.error("Failed to save settings", error);
      setMessage({ tone: "error", text: `設定を保存できませんでした: ${getErrorMessage(error)}` });
    } finally {
      setSaving(false);
    }
  }

  async function changeSemesterSystem(system: SemesterSystem) {
    if (!settings) return;
    setSettings({ ...settings, semester_system: system });
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("ログイン情報を取得できませんでした。");
      const updatedTerms = await createDefaultTermsForSystem(userData.user.id, system, terms);
      setTerms(updatedTerms);
      setMessage({ tone: "info", text: "学期制度を変更しました。既存データは削除されません。保存すると反映されます。" });
    } catch (error) {
      console.error("Failed to create system terms", error);
      setMessage({ tone: "error", text: `標準学期を作成できませんでした: ${getErrorMessage(error)}` });
    }
  }

  async function addTerm() {
    if (!settings || !newTermName.trim()) return;
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const { error } = await supabase.from("terms").insert({
      user_id: userData.user.id,
      name: newTermName.trim(),
      term_type: "custom",
      sort_order: terms.length + 1,
    });
    if (error) {
      console.error("Failed to add term", error);
      setMessage({ tone: "error", text: `学期を追加できませんでした: ${error.message}` });
      return;
    }
    setNewTermName("");
    setMessage({ tone: "success", text: "学期を追加しました。" });
    broadcastCampusSettingsChange();
    await load();
  }

  async function updateTerm(termId: string) {
    if (!editingTermName.trim()) return;
    const { error } = await supabase.from("terms").update({ name: editingTermName.trim() }).eq("id", termId);
    if (error) {
      console.error("Failed to update term", error);
      setMessage({ tone: "error", text: `学期を更新できませんでした: ${error.message}` });
      return;
    }
    setEditingTermId(null);
    setEditingTermName("");
    setMessage({ tone: "success", text: "学期名を更新しました。" });
    broadcastCampusSettingsChange();
    await load();
  }

  async function deleteTerm(termId: string) {
    if (terms.length <= 1) {
      setMessage({ tone: "error", text: "学期は最低1つ必要です。" });
      return;
    }
    if (settings?.current_term_id === termId) {
      setMessage({ tone: "error", text: "現在選択中の学期は削除できません。先に別の学期へ切り替えてください。" });
      return;
    }
    const { error } = await supabase.from("terms").delete().eq("id", termId);
    if (error) {
      console.error("Failed to delete term", error);
      setMessage({ tone: "error", text: `学期を削除できませんでした: ${error.message}` });
      return;
    }
    setMessage({ tone: "success", text: "学期を削除しました。" });
    broadcastCampusSettingsChange();
    await load();
  }

  async function requestPermission() {
    const result = await requestBrowserNotificationPermission();
    setPermissionText(notificationPermissionLabel());
    if (result === "granted") setMessage({ tone: "success", text: "ブラウザ通知を許可しました。" });
    else if (result === "unsupported") setMessage({ tone: "error", text: "このブラウザでは通知を利用できません。アプリ内の通知予定表示は利用できます。" });
    else setMessage({ tone: "info", text: "通知が許可されていません。ブラウザ設定も確認してください。" });
  }

  if (loading) {
    return (
      <AppShell>
        <LoadingBlock label="設定を読み込み中..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="設定" description="学期制度、通知、土曜日表示を大学に合わせて変更できます。" />

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {!isSupabaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            Supabase環境変数が未設定です。.env.local を作成するとログインとデータ保存が使えます。
          </div>
        )}

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="表示名">
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="山田 太郎" />
            </Field>
            <Field label="大学名">
              <Input value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="〇〇大学" />
            </Field>
            <Field label="ログイン中のメール">
              <Input value={email} disabled />
            </Field>
            <Field label="学期制度">
              <Select value={settings?.semester_system ?? "semester"} onChange={(event) => void changeSemesterSystem(event.target.value as SemesterSystem)}>
                <option value="semester">二学期制（前期・後期）</option>
                <option value="quarter">クォーター制（第1〜第4）</option>
              </Select>
            </Field>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-[#0F172A]">
              <input
                type="checkbox"
                checked={settings?.show_saturday ?? false}
                onChange={(event) => settings && setSettings({ ...settings, show_saturday: event.target.checked })}
                className="size-5"
              />
              土曜日を時間割に表示する
            </label>
            <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-[#0F172A]">
              <input
                type="checkbox"
                checked={settings?.notifications_enabled ?? false}
                onChange={(event) => settings && setSettings({ ...settings, notifications_enabled: event.target.checked })}
                className="size-5"
              />
              課題のブラウザ通知をONにする
            </label>
            <div className="sm:col-span-2 flex flex-col gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-[#64748B]">
              <p className="font-bold text-[#0F172A]">補足</p>
              <p>学期制度を変更しても、既存の授業や課題は削除されません。必要な学期が追加され、選択中の学期だけ各ページに表示されます。</p>
              <p>通知時刻は朝9時固定です。iPhone Safariなど一部環境ではブラウザ通知に制限があります。</p>
            </div>
            <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
              <Button disabled={saving} type="submit">
                <Save size={18} />
                {saving ? "保存中..." : "設定を保存"}
              </Button>
              <SecondaryButton onClick={requestPermission} type="button">
                <Bell size={18} />
                通知を許可する
              </SecondaryButton>
              <span className="self-center text-sm font-bold text-[#64748B]">{permissionText}</span>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#0F172A]">学期管理</h2>
            <p className="mt-1 text-sm text-[#64748B]">前期・後期・春学期など、自分の大学に合わせて追加できます。</p>
          </div>
          <div className="grid gap-3">
            {terms.map((term) => (
              <div key={term.id} className="grid gap-2 rounded-2xl border border-[#E5E7EB] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                {editingTermId === term.id ? (
                  <Input value={editingTermName} onChange={(event) => setEditingTermName(event.target.value)} />
                ) : (
                  <div>
                    <p className="font-bold text-[#0F172A]">{term.name}</p>
                    <p className="text-sm text-[#64748B]">{settings?.current_term_id === term.id ? "現在選択中" : "未選択"}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  {editingTermId === term.id ? (
                    <SecondaryButton onClick={() => void updateTerm(term.id)} type="button">保存</SecondaryButton>
                  ) : (
                    <SecondaryButton onClick={() => { setEditingTermId(term.id); setEditingTermName(term.name); }} type="button">編集</SecondaryButton>
                  )}
                  <SecondaryButton onClick={() => void deleteTerm(term.id)} className="text-red-600" type="button"><Trash2 size={16} />削除</SecondaryButton>
                </div>
              </div>
            ))}
            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <Input value={newTermName} onChange={(event) => setNewTermName(event.target.value)} placeholder="例：2026後期、春学期" />
              <Button onClick={addTerm} type="button"><Plus size={18} />学期を追加</Button>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "詳細不明のエラーです。";
}
