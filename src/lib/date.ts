import type { Assignment, ClassItem } from "@/lib/types";

export const weekdays = [
  { value: 1, label: "月" },
  { value: 2, label: "火" },
  { value: 3, label: "水" },
  { value: 4, label: "木" },
  { value: 5, label: "金" },
  { value: 6, label: "土" },
  { value: 7, label: "日" },
] as const;

export const periods = [1, 2, 3, 4, 5, 6];

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function currentWeekday(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day;
}

export function getDaysUntil(dateKey: string) {
  const today = new Date(todayKey());
  const target = new Date(dateKey);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function getDeadlineTone(dateKey: string, done = false) {
  if (done) return "完了";
  const days = getDaysUntil(dateKey);
  if (days < 0) return "期限切れ";
  if (days === 0) return "今日";
  if (days === 1) return "前日";
  if (days <= 3) return "3日前";
  return "通常";
}

export function isNotificationCandidate(assignment: Assignment) {
  if (assignment.is_completed) return false;
  return [0, 1, 3].includes(getDaysUntil(assignment.due_date));
}

export function classesForToday(classes: ClassItem[]) {
  return classes
    .filter((item) => item.weekday === currentWeekday())
    .sort((a, b) => a.period - b.period);
}
