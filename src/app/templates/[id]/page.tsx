"use client";

import { Copy, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button, EmptyState, LoadingBlock, Notice, PageHeader, SecondaryButton } from "@/components/ui";
import { broadcastCampusSettingsChange, ensureCampusContext } from "@/lib/campus";
import { weekdays } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { TimetableTemplate, TimetableTemplateItem } from "@/lib/types";

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const [template, setTemplate] = useState<TimetableTemplate | null>(null);
  const [items, setItems] = useState<TimetableTemplateItem[]>([]);
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [confirmSaturdayCopy, setConfirmSaturdayCopy] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const context = await ensureCampusContext();
      setUserId(context.userId);
      const [{ data: templateData, error: templateError }, { data: itemData, error: itemError }] = await Promise.all([
        supabase.from("timetable_templates").select("*").eq("id", params.id).single(),
        supabase.from("timetable_template_items").select("*").eq("template_id", params.id).order("weekday").order("period"),
      ]);
      if (templateError || itemError) throw templateError ?? itemError;
      setTemplate(templateData);
      setItems(itemData ?? []);
    } catch (error) {
      console.error("Failed to load template detail", error);
      setMessage({ tone: "error", text: `テンプレートを読み込めませんでした: ${getErrorMessage(error)}` });
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function copyToMyTimetable() {
    if (!template) return;
    setCopying(true);
    setMessage(null);
    try {
      const context = await ensureCampusContext();
      const hasSaturday = items.some((item) => item.weekday === 6);
      if (hasSaturday && !context.settings.show_saturday && !confirmSaturdayCopy) {
        setConfirmSaturdayCopy(true);
        setMessage({ tone: "info", text: "このテンプレートには土曜日授業が含まれています。もう一度コピーを押すと、土曜日表示をONにしてコピーします。" });
        return;
      }
      if (hasSaturday && !context.settings.show_saturday) {
        await supabase.from("user_settings").update({ show_saturday: true }).eq("user_id", context.userId);
      }
      const { error } = await supabase.from("classes").insert(
        items.map((item) => ({
          user_id: context.userId,
          term_id: context.currentTerm.id,
          title: item.title,
          weekday: item.weekday,
          period: item.period,
          room: item.room,
          teacher: item.teacher,
          memo: item.memo,
        })),
      );
      if (error) throw error;
      broadcastCampusSettingsChange();
      setConfirmSaturdayCopy(false);
      setMessage({ tone: "success", text: hasSaturday ? "コピーしました。土曜日授業が含まれるため、土曜日表示もONにしました。" : "現在選択中の学期へコピーしました。" });
    } catch (error) {
      console.error("Failed to copy template", error);
      setMessage({ tone: "error", text: `コピーできませんでした: ${getErrorMessage(error)}` });
    } finally {
      setCopying(false);
    }
  }

  async function deleteTemplate() {
    if (!template) return;
    const { error } = await supabase.from("timetable_templates").delete().eq("id", template.id);
    if (error) {
      console.error("Failed to delete template", error);
      setMessage({ tone: "error", text: `削除できませんでした: ${error.message}` });
      return;
    }
    location.assign("/templates");
  }

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="テンプレ詳細" description="内容を確認して、現在選択中の学期にコピーできます。" />
        {message && <Notice tone={message.tone}>{message.text}</Notice>}
        {loading ? (
          <LoadingBlock label="テンプレートを読み込み中..." />
        ) : !template ? (
          <EmptyState title="テンプレートが見つかりません" description="共有がOFFになったか、削除された可能性があります。" />
        ) : (
          <>
            <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">{template.title}</h1>
                  <p className="mt-2 text-sm text-[#64748B]">{[template.university, template.faculty, template.department, template.grade].filter(Boolean).join(" / ") || "学校情報未設定"}</p>
                  <p className="mt-2 text-sm text-[#64748B]">{template.description || "説明はありません。"}</p>
                  <p className="mt-3 text-xs font-bold text-[#2563EB]">{template.term_name} / {template.semester_system === "quarter" ? "クォーター制" : "二学期制"} / {template.includes_saturday ? "土曜あり" : "土曜なし"}</p>
                </div>
                <div className="grid gap-2 sm:min-w-36">
                  <Button disabled={copying || items.length === 0} onClick={copyToMyTimetable} type="button">
                    <Copy size={18} />
                    {copying ? "コピー中..." : "コピー"}
                  </Button>
                  {template.user_id === userId && (
                    <SecondaryButton onClick={deleteTemplate} className="text-red-600" type="button">
                      <Trash2 size={18} />
                      削除
                    </SecondaryButton>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-3">
              {items.length === 0 ? (
                <EmptyState title="授業がありません" description="このテンプレートには授業が登録されていません。" />
              ) : (
                items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                    <p className="text-sm font-bold text-[#2563EB]">{weekdays.find((day) => day.value === item.weekday)?.label}曜 {item.period}限</p>
                    <h2 className="mt-1 font-bold text-[#0F172A]">{item.title}</h2>
                    <p className="mt-1 text-sm text-[#64748B]">{[item.room, item.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
                  </article>
                ))
              )}
            </section>
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
