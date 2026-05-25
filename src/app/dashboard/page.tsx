"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, LoadingBlock, Notice, PageHeader } from "@/components/ui";
import { classesForToday, getDaysUntil, getDeadlineTone, isNotificationCandidate } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { Assignment, ClassItem } from "@/lib/types";

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: classData, error: classError }, { data: assignmentData, error: assignmentError }] = await Promise.all([
        supabase.from("classes").select("*").order("weekday").order("period"),
        supabase.from("assignments").select("*, classes(id,title)").order("due_date"),
      ]);
      if (classError || assignmentError) {
        console.error("Failed to load dashboard", { classError, assignmentError });
        setMessage(`ダッシュボードの読み込みに失敗しました: ${classError?.message ?? assignmentError?.message}`);
        setClasses([]);
        setAssignments([]);
      } else {
        setClasses(classData ?? []);
        setAssignments((assignmentData as Assignment[]) ?? []);
      }
      setLoading(false);
    }
    load();
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
        <PageHeader title="ダッシュボード" description="今日の授業と直近の課題を確認できます。" />

        {message && <Notice tone="error">{message}</Notice>}

        {loading ? (
          <LoadingBlock label="ダッシュボードを読み込み中..." />
        ) : (
          <>
            <section className="rounded-lg border border-blue-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-blue-700">今日やること</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-950">授業 {todayClasses.length}件 / 今日締切 {todayDue.length}件</h2>
                </div>
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                  <Clock3 size={24} />
                </span>
              </div>
              {todayDue.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {todayDue.map((item) => (
                    <div key={item.id} className="rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="font-bold text-red-800">{item.title}</p>
                      <p className="mt-1 text-sm text-red-700">{item.classes?.title ?? "授業未設定"} / 今日が締切</p>
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
                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                      <p className="text-sm font-semibold text-blue-700">{item.period}限</p>
                      <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">{[item.room, item.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
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
    <div className={`flex items-start justify-between gap-3 rounded-lg border bg-white p-4 shadow-sm ${strong ? "border-amber-200 ring-2 ring-amber-50" : "border-slate-200"}`}>
      <div>
        <h3 className="font-bold">{item.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{item.classes?.title ?? "授業未設定"} / 締切 {item.due_date}</p>
      </div>
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
        <Clock3 size={14} />
        {tone}
      </span>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 text-blue-600">{icon}</div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
