"use client";

import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader, SecondaryButton, Select, Textarea } from "@/components/ui";
import { currentWeekday, periods, weekdays } from "@/lib/date";
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

const tableWeekdays = weekdays.filter((day) => day.value <= 5);
const tablePeriods = periods.filter((period) => period <= 5);

export default function TimetablePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const today = currentWeekday();

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
    setSelectedClass(null);
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
    setSelectedClass(null);
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
    setSelectedClass(null);
    await load();
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="時間割"
          description="授業を登録して、週表示で確認できます。"
          action={
            <Button onClick={startCreate} className="hidden sm:inline-flex" type="button">
              <Plus size={18} />
              授業を追加
            </Button>
          }
        />

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {isOpen && (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{editingId ? "授業を編集" : "授業を追加"}</h2>
              <button onClick={() => setIsOpen(false)} className="grid size-10 place-items-center rounded-xl text-[#64748B] hover:bg-slate-100" type="button">
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
        ) : (
          <>
            {classes.length === 0 && (
              <EmptyState title="授業がまだありません" description="表の空き時間を見ながら、右下の追加ボタンから授業を登録できます。" />
            )}

            <div className="overflow-x-auto rounded-3xl border border-[#E5E7EB] bg-white shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
              <div className="min-w-[620px] md:min-w-[760px]">
                <div className="grid grid-cols-[58px_repeat(5,1fr)] border-b border-[#E5E7EB] bg-white text-center text-sm font-bold text-[#64748B] md:grid-cols-[72px_repeat(5,1fr)]">
                  <div className="sticky left-0 z-10 grid place-items-center border-r border-[#E5E7EB] bg-white p-2 md:p-3">時限</div>
                  {tableWeekdays.map((day) => {
                    const isToday = today === day.value;
                    return (
                      <div key={day.value} className={`p-2 md:p-3 ${isToday ? "bg-blue-50 text-[#2563EB]" : ""}`}>
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1">
                          {day.label}
                          {isToday && <span className="text-[10px]">今日</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {tablePeriods.map((period) => (
                  <div key={period} className="grid grid-cols-[58px_repeat(5,1fr)] border-b border-slate-100 last:border-b-0 md:grid-cols-[72px_repeat(5,1fr)]">
                    <div className="sticky left-0 z-10 grid min-h-24 place-items-center border-r border-[#E5E7EB] bg-white p-2 text-sm font-bold text-[#64748B] md:min-h-32">
                      {period}限
                    </div>
                    {tableWeekdays.map((day) => {
                      const item = classes.find((entry) => entry.weekday === day.value && entry.period === period);
                      const isToday = today === day.value;
                      return (
                        <div key={day.value} className={`min-h-24 border-l border-slate-100 p-1.5 md:min-h-32 md:p-2 ${isToday ? "bg-blue-50/50" : "bg-white"}`}>
                          {item ? (
                            <button
                              onClick={() => setSelectedClass(item)}
                              className={`grid h-full w-full content-between rounded-2xl border p-2 text-left shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition active:scale-[0.98] md:p-3 ${isToday ? "border-blue-200 bg-white ring-2 ring-blue-100" : "border-blue-100 bg-blue-50"}`}
                              type="button"
                            >
                              <span>
                                <span className="line-clamp-2 text-sm font-bold leading-5 text-[#0F172A] md:text-base">{item.title}</span>
                                <span className="mt-1 block truncate text-xs font-semibold text-[#64748B]">{item.room || "教室未設定"}</span>
                              </span>
                              <span className="mt-2 text-[11px] font-bold text-[#2563EB]">タップして編集</span>
                            </button>
                          ) : (
                            <div className="grid h-full place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm font-bold text-slate-400">
                              空き
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {selectedClass && (
              <section className="fixed inset-x-3 bottom-24 z-40 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.18)] md:static md:rounded-2xl md:shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#2563EB]">{weekdays.find((day) => day.value === selectedClass.weekday)?.label}曜 {selectedClass.period}限</p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight text-[#0F172A]">{selectedClass.title}</h2>
                    <p className="mt-1 text-sm text-[#64748B]">{[selectedClass.room, selectedClass.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
                  </div>
                  <button onClick={() => setSelectedClass(null)} className="grid size-10 shrink-0 place-items-center rounded-xl text-[#64748B] hover:bg-slate-100" type="button">
                    <X size={20} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SecondaryButton onClick={() => startEdit(selectedClass)} className="min-h-12 px-3" type="button"><Edit3 size={16} />編集</SecondaryButton>
                  <SecondaryButton onClick={() => remove(selectedClass.id)} className="min-h-12 px-3 text-red-600" type="button"><Trash2 size={16} />削除</SecondaryButton>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Button onClick={startCreate} className="fixed bottom-24 right-4 z-30 size-14 rounded-2xl p-0 shadow-[0_18px_38px_rgba(37,99,235,0.28)] sm:hidden" type="button" aria-label="授業を追加">
        <Plus size={24} />
      </Button>
    </AppShell>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "詳細不明のエラーです。";
}
