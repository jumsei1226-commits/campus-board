"use client";

import { Check, Edit3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader, SecondaryButton, Select, Textarea } from "@/components/ui";
import { getDeadlineTone, isNotificationCandidate, todayKey } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { Assignment, ClassItem, Priority } from "@/lib/types";

type FormState = {
  title: string;
  class_id: string;
  due_date: string;
  priority: Priority;
  is_completed: boolean;
  memo: string;
};

const initialForm: FormState = {
  title: "",
  class_id: "",
  due_date: todayKey(),
  priority: "medium",
  is_completed: false,
  memo: "",
};

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const [{ data: assignmentData, error: assignmentError }, { data: classData, error: classError }] = await Promise.all([
      supabase.from("assignments").select("*, classes(id,title)").order("due_date"),
      supabase.from("classes").select("*").order("weekday").order("period"),
    ]);
    if (assignmentError || classError) {
      console.error("Failed to load assignments page data", { assignmentError, classError });
      setMessage({ tone: "error", text: `データの読み込みに失敗しました: ${assignmentError?.message ?? classError?.message}` });
      setAssignments([]);
      setClasses([]);
    } else {
      setAssignments((assignmentData as Assignment[]) ?? []);
      setClasses(classData ?? []);
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

  function startEdit(item: Assignment) {
    setForm({
      title: item.title,
      class_id: item.class_id ?? "",
      due_date: item.due_date,
      priority: item.priority,
      is_completed: item.is_completed,
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
        class_id: form.class_id || null,
        due_date: form.due_date,
        priority: form.priority,
        is_completed: form.is_completed,
        memo: form.memo.trim() || null,
      };

      if (!payload.title) throw new Error("課題名を入力してください。");

      if (editingId) {
        const { error } = await supabase.from("assignments").update(payload).eq("id", editingId).select("id").single();
        if (error) throw error;
        setMessage({ tone: "success", text: "課題を更新しました。" });
      } else {
        const { error } = await supabase.from("assignments").insert({ ...payload, user_id: userData.user.id }).select("id").single();
        if (error) throw error;
        setMessage({ tone: "success", text: "課題を追加しました。" });
      }

      setIsOpen(false);
      setForm(initialForm);
      await load();
    } catch (error) {
      console.error("Failed to save assignment", error);
      setMessage({ tone: "error", text: `課題を保存できませんでした: ${getErrorMessage(error)}` });
    } finally {
      setSaving(false);
    }
  }

  async function toggleDone(item: Assignment) {
    const { error } = await supabase.from("assignments").update({ is_completed: !item.is_completed }).eq("id", item.id);
    if (error) {
      console.error("Failed to update assignment status", error);
      setMessage({ tone: "error", text: `課題の状態を変更できませんでした: ${error.message}` });
      return;
    }
    await load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete assignment", error);
      setMessage({ tone: "error", text: `課題を削除できませんでした: ${error.message}` });
      return;
    }
    setMessage({ tone: "success", text: "課題を削除しました。" });
    await load();
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="課題管理"
          description="締切が近い順に課題を確認できます。"
          action={
            <Button onClick={startCreate} type="button">
              <Plus size={18} />
              課題を追加
            </Button>
          }
        />

        {message && <Notice tone={message.tone}>{message.text}</Notice>}

        {isOpen && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold">{editingId ? "課題を編集" : "課題を追加"}</h2>
              <button onClick={() => setIsOpen(false)} className="grid size-10 place-items-center rounded-lg hover:bg-slate-100" type="button">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
              <Field label="課題名">
                <Input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </Field>
              <Field label="関連授業">
                <Select value={form.class_id} onChange={(event) => setForm({ ...form, class_id: event.target.value })}>
                  <option value="">未設定</option>
                  {classes.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
                </Select>
              </Field>
              <Field label="締切日">
                <Input type="date" required value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} />
              </Field>
              <Field label="優先度">
                <Select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as Priority })}>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </Select>
              </Field>
              <Field label="メモ">
                <Textarea value={form.memo} onChange={(event) => setForm({ ...form, memo: event.target.value })} />
              </Field>
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={form.is_completed} onChange={(event) => setForm({ ...form, is_completed: event.target.checked })} className="size-5" />
                完了済みにする
              </label>
              <div className="sm:col-span-2">
                <Button disabled={saving} type="submit" className="w-full sm:w-auto">{saving ? "保存中..." : editingId ? "更新する" : "登録する"}</Button>
              </div>
            </form>
          </section>
        )}

        {loading ? (
          <LoadingBlock label="課題を読み込み中..." />
        ) : assignments.length === 0 ? (
          <EmptyState title="課題がまだ登録されていません" description="課題を追加すると、締切が近い順にここへ並びます。" />
        ) : (
          <div className="grid gap-3">
            {assignments.map((item) => {
              const tone = getDeadlineTone(item.due_date, item.is_completed);
              return (
                <article key={item.id} className={`rounded-lg border bg-white p-4 shadow-sm ${tone === "今日" || tone === "期限切れ" ? "border-red-200 ring-2 ring-red-50" : tone === "前日" || tone === "3日前" ? "border-amber-200 ring-2 ring-amber-50" : "border-slate-200"}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`text-lg font-bold ${item.is_completed ? "text-slate-400 line-through" : "text-slate-950"}`}>{item.title}</h3>
                        <Badge tone={tone} />
                        {isNotificationCandidate(item) && <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">通知予定</span>}
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{item.classes?.title ?? "授業未設定"} / 締切 {item.due_date} / 優先度 {priorityLabel(item.priority)}</p>
                      {item.memo && <p className="mt-3 text-sm text-slate-600">{item.memo}</p>}
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:flex">
                      <SecondaryButton onClick={() => toggleDone(item)} className="min-h-10 px-3" type="button"><Check size={16} /></SecondaryButton>
                      <SecondaryButton onClick={() => startEdit(item)} className="min-h-10 px-3" type="button"><Edit3 size={16} /></SecondaryButton>
                      <SecondaryButton onClick={() => remove(item.id)} className="min-h-10 px-3 text-red-600" type="button"><Trash2 size={16} /></SecondaryButton>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function priorityLabel(priority: Priority) {
  return priority === "high" ? "高" : priority === "medium" ? "中" : "低";
}

function Badge({ tone }: { tone: string }) {
  const className =
    tone === "今日" || tone === "期限切れ"
      ? "bg-red-50 text-red-700"
      : tone === "前日" || tone === "3日前"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return <span className={`rounded-md px-2 py-1 text-xs font-bold ${className}`}>{tone}</span>;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) return String(error.message);
  return "詳細不明のエラーです。";
}
