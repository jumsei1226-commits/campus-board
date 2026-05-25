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
    return <div className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm font-bold text-[#64748B]">読み込み中...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A] md:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB]/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-[#0F172A]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
              <BookOpen size={22} />
            </span>
            Campus Board
          </Link>
          <button onClick={signOut} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#64748B] transition hover:bg-slate-100" type="button">
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
                <Link key={item.href} href={item.href} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-bold transition ${active ? "bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.2)]" : "text-[#64748B] hover:bg-white hover:text-[#0F172A]"}`}>
                  <Icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-4 rounded-3xl border border-[#E5E7EB] bg-white/92 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur-xl md:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`grid min-h-14 place-items-center gap-1 rounded-2xl text-[11px] font-bold transition ${active ? "bg-blue-50 text-[#2563EB]" : "text-[#64748B]"}`}>
              <Icon size={21} strokeWidth={active ? 2.6 : 2.1} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
