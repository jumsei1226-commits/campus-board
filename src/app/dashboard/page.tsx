"use client";

import { AlertCircle, CalendarDays, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, PageHeader } from "@/components/ui";
import { classesForToday, getDeadlineTone, isNotificationCandidate } from "@/lib/date";
import { supabase } from "@/lib/supabase";
import type { Assignment, ClassItem } from "@/lib/types";

export default function DashboardPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    async function load() {
      const [{ data: classData }, { data: assignmentData }] = await Promise.all([
        supabase.from("classes").select("*").order("weekday").order("period"),
        supabase.from("assignments").select("*, classes(id,title)").order("due_date"),
      ]);
      setClasses(classData ?? []);
      setAssignments((assignmentData as Assignment[]) ?? []);
    }
    load();
  }, []);

  const todayClasses = useMemo(() => classesForToday(classes), [classes]);
  const upcoming = assignments.filter((item) => !item.is_completed).slice(0, 5);
  const incompleteCount = assignments.filter((item) => !item.is_completed).length;
  const notificationCount = assignments.filter(isNotificationCandidate).length;

  return (
    <AppShell>
      <div className="grid gap-6">
        <PageHeader title="ダッシュボード" description="今日の授業と直近の課題を確認できます。" />

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
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-blue-700">{item.period}限</p>
                  <h3 className="mt-1 text-lg font-bold">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{[item.room, item.teacher].filter(Boolean).join(" / ") || "教室・教員未設定"}</p>
                </div>
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
                <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
                  <div>
                    <h3 className="font-bold">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.classes?.title ?? "授業未設定"}</p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    <Clock3 size={14} />
                    {getDeadlineTone(item.due_date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
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
