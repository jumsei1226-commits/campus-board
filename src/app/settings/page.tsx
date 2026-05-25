"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, Field, Input, PageHeader } from "@/components/ui";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [displayName, setDisplayName] = useState("");
  const [university, setUniversity] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setEmail(userData.user.email ?? "");

      const { data } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
      setDisplayName(data?.display_name ?? "");
      setUniversity(data?.university ?? "");
    }
    load();
  }, []);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    await supabase.from("profiles").upsert({
      id: userData.user.id,
      display_name: displayName || null,
      university: university || null,
    });
    setMessage("保存しました。");
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="設定" description="プロフィールと接続状態を確認できます。" />

        {!isSupabaseConfigured && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            Supabase環境変数が未設定です。.env.local を作成するとログインとデータ保存が使えます。
          </div>
        )}

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="表示名">
              <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="山田 太郎" />
            </Field>
            <Field label="大学名">
              <Input value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="〇〇大学" />
            </Field>
            <Field label="ログイン中のメール">
              <Input value={email} disabled />
            </Field>
            <div className="flex items-end">
              <Button type="submit" className="w-full sm:w-auto">
                <Save size={18} />
                保存する
              </Button>
            </div>
            {message && <p className="sm:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p>}
          </form>
        </section>
      </div>
    </AppShell>
  );
}
