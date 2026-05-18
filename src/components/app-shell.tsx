"use client";

import { BookOpen, CalendarDays, CheckSquare, Home, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const nav = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/timetable", label: "時間割", icon: CalendarDays },
  { href: "/assignments", label: "課題", icon: CheckSquare },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (!data.user) router.replace("/login");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.replace("/login");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">読み込み中...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 text-slate-950 md:pb-0">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-blue-700">
            <span className="grid size-10 place-items-center rounded-lg bg-blue-600 text-white">
              <BookOpen size={22} />
            </span>
            Campus Board
          </Link>
          <button onClick={signOut} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100" type="button">
            <LogOut size={18} />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-24 grid gap-2">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-white"}`}>
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white md:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`grid min-h-16 place-items-center gap-1 text-xs font-semibold ${active ? "text-blue-700" : "text-slate-500"}`}>
              <Icon size={22} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
