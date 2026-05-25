"use client";

import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader, SecondaryButton, Select, Textarea } from "@/components/ui";
import { periods, weekdays } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { ClassItem, Weekday } from "@/lib/types";

type FormState = {
  title: string;
  weekday: Weekday;
  period: number;
  room: string;
  teacher: string;
  memo: string;
};

const initialForm: FormState = {
  title: "",
  weekday: 1,
  period: 1,
  room: "",
  teacher: "",
  memo: "",
};

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from("classes").select("*").order("weekday").order("period");
    if (error) {
      console.error("Failed to load classes", error);
      setMessage({ tone: "error", text: `時間割の読み込みに失敗しました: ${error.message}` });
      setClasses([]);
    } else {
      setClasses(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function startCreate() {
    setForm(initialForm);
    setEditingId(null);
    setMessage(null);
    setIsOpen(true);
  }

  function startEdit(item: ClassItem) {
    setForm({
      title: item.title,
      weekday: item.weekday,
      period: item.period,
      room: item.room ?? "",
      teacher: item.teacher ?? "",
      memo: item.memo ?? "",
    });
    setEditingId(item.id);
    setMessage(null);
    setIsOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("ログイン中のユーザーIDを取得できませんでした。もう一度ログインしてください。");

      const payload = {
        title: form.title.trim(),
        weekday: form.weekday,
        period: form.period,
        room: form.room.trim() || null,
        teacher: form.teacher.trim() || null,
        memo: form.memo.trim() || null,
      };

      if (!payload.title) throw new Error("授業名を入力してください。");

      if (editingId) {
        const { error } = await supabase.from("classes").update(payload).eq("id", editingId).select("id").single();
        if (error) throw error;
        setMessage({ tone: "success", text: "授業を更新しました。" });
      } else {
        const { error } = await supabase.from("classes").insert({ ...payload, user_id: userData.user.id }).select("id").single();
        if (error) throw error;
        setMessage({ tone: "success", text: "授業を追加しました。" });
      }

      setIsOpen(false);
      setForm(initialForm);
      await load();
    } catch (error) {
      console.error("Failed to save class", error);
      setMessage({ tone: "error", text: `授業を保存できませんでした: ${getErrorMessage(error)}` });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setMessage(null);
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete class", error);
      setMessage({ tone: "error", text: `授業を削除できませんでした: ${error.message}` });
      return;
    }
    setMessage({ tone: "success", text: "授業を削除しました。" });
    await load();
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="時間割"
          description="授業を登録して、週表示で確認できます。"
          action={
            <Button onClick={startCreate} type="button">
              <Plus size={18} />
              授業を追加
            </Button>
          }
        />

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {isOpen && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{editingId ? "授業を編集" : "授業を追加"}</h2>
              <button onClick={() => setIsOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100" type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <Field label="授業名">
                <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field label="曜日">
                <Select value={form.weekday} onChange={(event) => setForm({ ...form, weekday: Number(event.target.value) as Weekday })}>
                  {weekdays.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}曜日</option>
                  ))}
                </Select>
              </Field>
              <Field label="時限">
                <Select value={form.period} onChange={(event) => setForm({ ...form, period: Number(event.target.value) })}>
                  {periods.map((period) => (
                    <option key={period} value={period}>{period}限</option>
                  ))}
                </Select>
              </Field>
              <Field label="教室">
                <Input value={form.room} onChange={(event) => setForm({ ...form, room: event.target.value })} />
              </Field>
              <Field label="教員名">
                <Input value={form.teacher} onChange={(event) => setForm({ ...form, teacher: event.target.value })} />
              </Field>
              <Field label="メモ">
                <Textarea value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
              </Field>
              <div className="sm:col-span-2">
                <Button disabled={saving} type="submit" className="w-full sm:w-auto">{saving ? "保存中..." : editingId ? "更新する" : "登録する"}</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <LoadingBlock label="時間割を読み込み中..." />
        ) : classes.length === 0 ? (
          <EmptyState title="授業がまだありません" description="まずは今学期の授業を1つ追加しましょう。" />
        ) : (
          <>
            <div className="grid gap-3 md:hidden">
              {classes.map((item) => (
                <article key={item.id} className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-blue-700">{weekdays.find((day) => day.value === item.weekday)?.label}曜 {item.period}限</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{[item.room, item.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
                      {item.memo && <p className="mt-2 text-sm text-slate-600">{item.memo}</p>}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <SecondaryButton onClick={() => startEdit(item)} className="min-h-11 px-3" type="button"><Edit3 size={16} />編集</SecondaryButton>
                    <SecondaryButton onClick={() => remove(item.id)} className="min-h-11 px-3 text-red-600" type="button"><Trash2 size={16} />削除</SecondaryButton>
                  </div>
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white md:block">
              <div className="min-w-[760px]">
              <div className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-600">
                <div className="p-3">時限</div>
                {weekdays.map((day) => <div key={day.value} className="p-3">{day.label}</div>)}
              </div>
              {periods.map((period) => (
                <div key={period} className="grid grid-cols-[72px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
                  <div className="grid place-items-center bg-slate-50 p-2 text-sm font-bold text-slate-500">{period}限</div>
                  {weekdays.map((day) => {
                    const item = classes.find((entry) => entry.weekday === day.value && entry.period === period);
                    return (
                      <div key={day.value} className="min-h-32 border-l border-slate-100 p-2">
                        {item && (
                          <article className="grid h-full gap-2 rounded-lg bg-blue-50 p-3">
                            <div>
                              <h3 className="font-bold text-blue-950">{item.title}</h3>
                              <p className="mt-1 text-xs text-slate-600">{item.room || "教室未設定"}</p>
                              <p className="text-xs text-slate-600">{item.teacher || "教員未設定"}</p>
                            </div>
                            <div className="flex gap-2 self-end">
                              <SecondaryButton onClick={() => startEdit(item)} className="min-h-10 flex-1 px-2" type="button"><Edit3 size={16} /></SecondaryButton>
                              <SecondaryButton onClick={() => remove(item.id)} className="min-h-10 flex-1 px-2 text-red-600" type="button"><Trash2 size={16} /></SecondaryButton>
                            </div>
                          </article>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "詳細不明のエラーです。";
}
