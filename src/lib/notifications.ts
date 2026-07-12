"use client";

import { getDaysUntil, isNotificationCandidate } from "@/lib/date";
import type { Assignment } from "@/lib/types";

const notifiedKey = "campus-board-notified-assignments";

type NotifiedMap = Record<string, string>;

function readNotified(): NotifiedMap {
  try {
    return JSON.parse(localStorage.getItem(notifiedKey) ?? "{}") as NotifiedMap;
  } catch {
    return {};
  }
}

function writeNotified(value: NotifiedMap) {
  localStorage.setItem(notifiedKey, JSON.stringify(value));
}

export function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermissionLabel() {
  if (!canUseBrowserNotifications()) return "このブラウザでは通知を利用できません";
  if (Notification.permission === "granted") return "通知が許可されています";
  if (Notification.permission === "denied") return "通知がブロックされています";
  return "通知はまだ許可されていません";
}

export async function requestBrowserNotificationPermission() {
  if (!canUseBrowserNotifications()) return "unsupported" as const;
  return Notification.requestPermission();
}

export function notifyAssignmentsIfNeeded(assignments: Assignment[], enabled: boolean) {
  if (!enabled || !canUseBrowserNotifications() || Notification.permission !== "granted") return 0;

  const now = new Date();
  if (now.getHours() < 9) return 0;

  const notified = readNotified();
  let count = 0;

  for (const assignment of assignments.filter(isNotificationCandidate)) {
    const days = getDaysUntil(assignment.due_date);
    const key = `${assignment.id}:${assignment.due_date}:${days}`;
    if (notified[key]) continue;

    const label = days === 0 ? "今日が締切" : days === 1 ? "明日が締切" : "3日後が締切";
    new Notification("Campus Board", {
      body: `${label}: ${assignment.title}`,
      tag: key,
    });
    notified[key] = new Date().toISOString();
    count += 1;
  }

  if (count > 0) writeNotified(notified);
  return count;
}
