"use client";

import { Edit3, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, PageHeader, SecondaryButton, Select, Textarea } from "@/components/ui";
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

  async function load() {
    const { data } = await supabase.from("classes").select("*").order("weekday").order("period");
    setClasses(data ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  function startCreate() {
    setForm(initialForm);
    setEditingId(null);
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
    setIsOpen(true);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      title: form.title,
      weekday: form.weekday,
      period: form.period,
      room: form.room || null,
      teacher: form.teacher || null,
      memo: form.memo || null,
    };

    if (editingId) {
      await supabase.from("classes").update(payload).eq("id", editingId);
    } else if (userData.user) {
      await supabase.from("classes").insert({ ...payload, user_id: userData.user.id });
    }

    setSaving(false);
    setIsOpen(false);
    await load();
  }

  async function remove(id: string) {
    await supabase.from("classes").delete().eq("id", id);
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
                <Button disabled={saving} type="submit" className="w-full sm:w-auto">{editingId ? "更新する" : "登録する"}</Button>
              </div>
            </form>
          </section>
        )}

        {classes.length === 0 ? (
          <EmptyState title="授業がまだありません" description="まずは今学期の授業を1つ追加しましょう。" />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
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
        )}
      </div>
    </AppShell>
  );
}
