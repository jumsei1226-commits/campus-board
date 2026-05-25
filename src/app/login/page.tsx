"use client";

import { BookOpen, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Input, SecondaryButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace("/dashboard");
    });
  }, [router]);

  async function handleEmailAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    setLoading(false);
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    if (mode === "signup" && !response.data.session) {
      setMessage("確認メールを送信しました。メール内のリンクから登録を完了してください。");
      return;
    }
    router.replace("/dashboard");
  }

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
  }

  return (
    <main className="grid min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto grid w-full max-w-md content-center">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#2563EB] text-white shadow-[0_14px_30px_rgba(37,99,235,0.25)]">
            <BookOpen size={26} />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">Campus Board</h1>
            <p className="text-sm font-medium text-[#64748B]">時間割と課題を毎日チェック</p>
          </div>
        </div>

        <section className="rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-[0_18px_42px_rgba(15,23,42,0.07)]">
          <div className="mb-5 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
            <button type="button" onClick={() => setMode("login")} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === "login" ? "bg-white text-[#2563EB] shadow-[0_8px_18px_rgba(15,23,42,0.06)]" : "text-[#64748B]"}`}>
              ログイン
            </button>
            <button type="button" onClick={() => setMode("signup")} className={`min-h-11 rounded-xl text-sm font-bold transition ${mode === "signup" ? "bg-white text-[#2563EB] shadow-[0_8px_18px_rgba(15,23,42,0.06)]" : "text-[#64748B]"}`}>
              新規登録
            </button>
          </div>

          <form onSubmit={handleEmailAuth} className="grid gap-4">
            <Field label="メールアドレス">
              <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" />
            </Field>
            <Field label="パスワード">
              <Input type="password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="6文字以上" />
            </Field>
            {message && <p className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-800">{message}</p>}
            <Button disabled={loading} type="submit">
              <Mail size={18} />
              {mode === "login" ? "ログインする" : "登録する"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="h-px flex-1 bg-[#E5E7EB]" />
            または
            <span className="h-px flex-1 bg-[#E5E7EB]" />
          </div>
          <SecondaryButton onClick={handleGoogleLogin} className="w-full" type="button">
            Googleで続ける
          </SecondaryButton>
        </section>
      </div>
    </main>
  );
}
