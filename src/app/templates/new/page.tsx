"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader, Textarea } from "@/components/ui";
import { ensureCampusContext } from "@/lib/campus";
import { supabase } from "@/lib/supabase";
import type { ClassItem, SemesterSystem, Term, UserSettings } from "@/lib/types";

export default function NewTemplatePage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [title, setTitle] = useState("");
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [isShared, setIsShared] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const context = await ensureCampusContext();
        setCurrentTerm(context.currentTerm);
        setSettings(context.settings);
        setTitle(`${context.currentTerm.name}の時間割`);
        const { data, error } = await supabase.from("classes").select("*").eq("term_id", context.currentTerm.id).order("weekday").order("period");
        if (error) throw error;
        setClasses(data ?? []);
      } catch (error) {
        console.error("Failed to load template source", error);
        setMessage({ tone: "error", text: `時間割を読み込めませんでした: ${getErrorMessage(error)}` });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function createTemplate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentTerm || !settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const context = await ensureCampusContext();
      if (classes.length === 0) throw new Error("テンプレートにする授業がありません。先に時間割を登録してください。");
      const { data: template, error } = await supabase
        .from("timetable_templates")
        .insert({
          user_id: context.userId,
          title: title.trim(),
          university: university.trim() || null,
          faculty: faculty.trim() || null,
          department: department.trim() || null,
          grade: grade.trim() || null,
          term_name: currentTerm.name,
          semester_system: settings.semester_system as SemesterSystem,
          includes_saturday: classes.some((item) => item.weekday === 6),
          description: description.trim() || null,
          is_shared: isShared,
        })
        .select("*")
        .single();
      if (error) throw error;

      const { error: itemsError } = await supabase.from("timetable_template_items").insert(
        classes.map((item) => ({
          template_id: template.id,
          title: item.title,
          weekday: item.weekday,
          period: item.period,
          room: item.room,
          teacher: item.teacher,
          memo: item.memo,
        })),
      );
      if (itemsError) throw itemsError;
      setMessage({ tone: "success", text: "時間割テンプレートを作成しました。" });
      location.assign(`/templates/${template.id}`);
    } catch (error) {
      console.error("Failed to create template", error);
      setMessage({ tone: "error", text: `テンプレートを作成できませんでした: ${getErrorMessage(error)}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="テンプレ作成" description="現在選択中の学期の時間割からテンプレートを作成します。" />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        {loading ? (
          <LoadingBlock label="時間割を読み込み中..." />
        ) : classes.length === 0 ? (
          <EmptyState title="テンプレ化できる授業がありません" description="時間割ページで授業を登録してからテンプレートを作成してください。" />
        ) : (
          <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
            <form onSubmit={createTemplate} className="grid gap-4 sm:grid-cols-2">
              <Field label="テンプレ名">
                <Input required value={title} onChange={(event) => setTitle(event.target.value)} />
              </Field>
              <Field label="大学名">
                <Input value={university} onChange={(event) => setUniversity(event.target.value)} />
              </Field>
              <Field label="学部">
                <Input value={faculty} onChange={(event) => setFaculty(event.target.value)} />
              </Field>
              <Field label="学科">
                <Input value={department} onChange={(event) => setDepartment(event.target.value)} />
              </Field>
              <Field label="学年">
                <Input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="1年" />
              </Field>
              <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-[#0F172A]">
                <input type="checkbox" checked={isShared} onChange={(event) => setIsShared(event.target.checked)} className="size-5" />
                共有ONにする
              </label>
              <Field label="説明">
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
              </Field>
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-[#64748B]">
                <p className="font-bold text-[#0F172A]">保存される情報</p>
                <p className="mt-1">{currentTerm?.name} / {settings?.semester_system === "quarter" ? "クォーター制" : "二学期制"} / 授業 {classes.length}件</p>
              </div>
              <div className="sm:col-span-2">
                <Button disabled={saving} type="submit">
                  <Save size={18} />
                  {saving ? "作成中..." : "テンプレートを作成"}
                </Button>
              </div>
            </form>
          </section>
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
