"use client";

import { BookOpen, CalendarDays, CheckSquare, Home, LogOut, Settings, Share2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { broadcastCampusSettingsChange, ensureCampusContext } from "@/lib/campus";
import { supabase } from "@/lib/supabase";
import type { Term } from "@/lib/types";

const nav = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/timetable", label: "時間割", icon: CalendarDays },
  { href: "/assignments", label: "課題", icon: CheckSquare },
  { href: "/templates", label: "共有", icon: Share2 },
  { href: "/settings", label: "設定", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentTermId, setCurrentTermId] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        try {
          const context = await ensureCampusContext();
          setTerms(context.terms);
          setCurrentTermId(context.currentTerm.id);
        } catch (error) {
          console.error("Failed to load campus context", error);
        }
      }
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

  async function changeTerm(termId: string) {
    if (!user) return;
    setCurrentTermId(termId);
    const { error } = await supabase.from("user_settings").update({ current_term_id: termId }).eq("user_id", user.id);
    if (error) {
      console.error("Failed to change term", error);
      return;
    }
    broadcastCampusSettingsChange();
  }

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-[#F8FAFC] text-sm font-bold text-[#64748B]">読み込み中...</div>;
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 text-[#0F172A] md:pb-0">
      <header className="sticky top-0 z-20 border-b border-[#E5E7EB]/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-[#0F172A]">
            <span className="grid size-10 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
              <BookOpen size={22} />
            </span>
            Campus Board
          </Link>
          <div className="flex items-center gap-2">
            {terms.length > 0 && (
              <select
                value={currentTermId}
                onChange={(event) => void changeTerm(event.target.value)}
                className="min-h-10 max-w-32 rounded-xl border border-[#E5E7EB] bg-white px-2 text-xs font-bold text-[#0F172A] outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-100 sm:max-w-44 sm:text-sm"
                aria-label="学期を切り替え"
              >
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>{term.name}</option>
                ))}
              </select>
            )}
            <button onClick={signOut} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-bold text-[#64748B] transition hover:bg-slate-100" type="button">
              <LogOut size={18} />
              <span className="hidden sm:inline">ログアウト</span>
            </button>
          </div>
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

      <nav className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 rounded-3xl border border-[#E5E7EB] bg-white/92 p-1.5 shadow-[0_18px_44px_rgba(15,23,42,0.14)] backdrop-blur-xl md:hidden">
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
