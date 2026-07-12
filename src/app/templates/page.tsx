"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, Field, Input, LoadingBlock, Notice, PageHeader } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import type { TimetableTemplate } from "@/lib/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TimetableTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [university, setUniversity] = useState("");
  const [faculty, setFaculty] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("timetable_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) {
        console.error("Failed to load templates", error);
        setMessage(`テンプレートを読み込めませんでした: ${error.message}`);
        setTemplates([]);
      } else {
        setTemplates(data ?? []);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return templates.filter((template) => {
      const uniOk = !university || (template.university ?? "").includes(university);
      const facultyOk = !faculty || (template.faculty ?? "").includes(faculty);
      const departmentOk = !department || (template.department ?? "").includes(department);
      return uniOk && facultyOk && departmentOk;
    });
  }, [department, faculty, templates, university]);

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader
          title="時間割テンプレ"
          description="共有ONの時間割テンプレを探して、自分の学期にコピーできます。"
          action={
            <Button className="hidden sm:inline-flex" type="button" onClick={() => location.assign("/templates/new")}>
              <Plus size={18} />
              テンプレ作成
            </Button>
          }
        />

        {message && <Notice tone="error">{message}</Notice>}

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="mb-4 flex items-center gap-2 text-[#2563EB]">
            <Search size={18} />
            <h2 className="font-bold text-[#0F172A]">簡単フィルター</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="大学名">
              <Input value={university} onChange={(event) => setUniversity(event.target.value)} placeholder="〇〇大学" />
            </Field>
            <Field label="学部">
              <Input value={faculty} onChange={(event) => setFaculty(event.target.value)} placeholder="経済学部" />
            </Field>
            <Field label="学科">
              <Input value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="経済学科" />
            </Field>
          </div>
        </section>

        {loading ? (
          <LoadingBlock label="テンプレートを読み込み中..." />
        ) : filtered.length === 0 ? (
          <EmptyState title="テンプレートがまだありません" description="自分の時間割からテンプレートを作成して共有できます。" />
        ) : (
          <div className="grid gap-3">
            {filtered.map((template) => (
              <Link key={template.id} href={`/templates/${template.id}`} className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:border-blue-200">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-[#0F172A]">{template.title}</h2>
                    <p className="mt-1 text-sm text-[#64748B]">{[template.university, template.faculty, template.department].filter(Boolean).join(" / ") || "学校情報未設定"}</p>
                    <p className="mt-2 text-sm text-[#64748B]">{template.description || "説明はありません。"}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#2563EB]">{template.term_name ?? "学期未設定"}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        <Button onClick={() => location.assign("/templates/new")} className="fixed bottom-24 right-4 z-30 size-14 rounded-2xl p-0 shadow-[0_18px_38px_rgba(37,99,235,0.28)] sm:hidden" type="button" aria-label="テンプレートを作成">
          <Plus size={24} />
        </Button>
      </div>
    </AppShell>
  );
}
