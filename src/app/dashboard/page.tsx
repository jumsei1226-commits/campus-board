"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock, Notice, PageHeader } from "@/components/ui";
import { ensureCampusContext } from "@/lib/campus";
import { classesForToday, getDaysUntil, getDeadlineTone, isNotificationCandidate } from "@/lib/date";
import { notifyAssignmentsIfNeeded } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import type { Assignment, ClassItem, Term, UserSettings } from "@/lib/types";

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const context = await ensureCampusContext();
        setCurrentTerm(context.currentTerm);
        setSettings(context.settings);
        const [{ data: classData, error: classError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
          supabase.from("classes").select("*").eq("term_id", context.currentTerm.id).order("weekday").order("period"),
          supabase.from("assignments").select("*, classes(id,title)").eq("term_id", context.currentTerm.id).order("due_date"),
        ]);
        if (classError || assignmentError) throw classError ?? assignmentError;
        const loadedAssignments = (assignmentData as Assignment[]) ?? [];
        setClasses(classData ?? []);
        setAssignments(loadedAssignments);
        notifyAssignmentsIfNeeded(loadedAssignments, context.settings.notifications_enabled);
      } catch (error) {
        console.error("Failed to load dashboard", error);
        setMessage(`ダッシュボードの読み込みに失敗しました: ${error instanceof Error ? error.message : "詳細不明のエラーです"}`);
        setClasses([]);
        setAssignments([]);
      }
      setLoading(false);
    }
    load();
    window.addEventListener("campus-settings-change", load);
    return () => window.removeEventListener("campus-settings-change", load);
  }, []);

  const todayClasses = useMemo(() => classesForToday(classes), [classes]);
  const upcoming = assignments.filter((item) => !item.is_completed).slice(0, 5);
  const todayDue = assignments.filter((item) => !item.is_completed && getDaysUntil(item.due_date) === 0);
  const notificationAssignments = assignments.filter(isNotificationCandidate);
  const incompleteCount = assignments.filter((item) => !item.is_completed).length;
  const notificationCount = notificationAssignments.length;

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="ダッシュボード" description={`${currentTerm?.name ?? "選択中の学期"}の今日やることを確認できます。`} />

        {message && <Notice tone="error">{message}</Notice>}
        {settings?.notifications_enabled && typeof Notification !== "undefined" && Notification.permission !== "granted" && (
          <Notice tone="info">通知はONですが、ブラウザ通知がまだ許可されていません。設定ページから許可できます。</Notice>
        )}

        {loading ? (
          <LoadingBlock label="ダッシュボードを読み込み中..." />
        ) : (
          <>
            <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#2563EB]">今日やること</p>
                  <h2 className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">授業 {todayClasses.length}件 / 今日締切 {todayDue.length}件</h2>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-[#2563EB]">
                  <Clock3 size={24} />
                </span>
              </div>
              {todayDue.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {todayDue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-red-200 bg-red-50 p-3.5">
                      <p className="font-bold text-[#0F172A]">{item.title}</p>
                      <p className="mt-1 text-sm font-semibold text-[#EF4444]">{item.classes?.title ?? "授業未設定"} / 今日が締切</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stat icon={<CalendarDays size={22} />} label="今日の授業" value={`${todayClasses.length}件`} />
              <Stat icon={<CheckCircle2 size={22} />} label="未完了課題" value={`${incompleteCount}件`} />
              <Stat icon={<AlertCircle size={22} />} label="通知予定" value={`${notificationCount}件`} />
            </div>

            <section className="grid gap-3">
              <h2 className="font-bold text-slate-900">今日の授業</h2>
              {todayClasses.length === 0 ? (
                <EmptyState title="今日の授業はありません" description="時間割ページから授業を登録できます。" />
              ) : (
                <div className="grid gap-3">
                  {todayClasses.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                      <p className="text-sm font-bold text-[#2563EB]">{item.period}限</p>
                      <h3 className="mt-1 text-lg font-bold text-[#0F172A]">{item.title}</h3>
                      <p className="mt-1 text-sm text-[#64748B]">{[item.room, item.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3">
              <h2 className="font-bold text-slate-900">通知予定の課題</h2>
              {notificationAssignments.length === 0 ? (
                <EmptyState title="通知予定の課題はありません" description="締切3日前、前日、当日の未完了課題がここに表示されます。" />
              ) : (
                <div className="grid gap-3">
                  {notificationAssignments.map((item) => (
                    <AssignmentRow key={item.id} item={item} strong />
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3">
              <h2 className="font-bold text-slate-900">直近の課題</h2>
              {upcoming.length === 0 ? (
                <EmptyState title="未完了の課題はありません" description="課題管理ページから締切を登録できます。" />
              ) : (
                <div className="grid gap-3">
                  {upcoming.map((item) => (
                    <AssignmentRow key={item.id} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function AssignmentRow({ item, strong = false }: { item: Assignment; strong?: boolean }) {
  const tone = getDeadlineTone(item.due_date);
  return (
    <div className={`flex items-start justify-between gap-3 rounded-2xl border bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] ${strong ? "border-amber-200 ring-2 ring-amber-50" : "border-[#E5E7EB]"}`}>
      <div>
        <h3 className="font-bold text-[#0F172A]">{item.title}</h3>
        <p className="mt-1 text-sm text-[#64748B]">{item.classes?.title ?? "授業未設定"} / 締切 {item.due_date}</p>
      </div>
      <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${strong ? "bg-amber-50 text-[#F59E0B]" : "bg-blue-50 text-[#2563EB]"}`}>
        <Clock3 size={14} />
        {tone}
      </span>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="mb-3 text-[#2563EB]">{icon}</div>
      <p className="text-sm font-semibold text-[#64748B]">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[#0F172A]">{value}</p>
    </div>
  );
}
