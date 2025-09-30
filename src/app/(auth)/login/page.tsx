"use client";
import { supabase, ensureUserBootstrap } from "@/lib/db/supabase.client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getSession();
      if (data.session) router.replace("/");
    })();
    const sub = supabase?.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/");
    });
    return () => { sub?.data.subscription.unsubscribe(); };
  }, [router]);

  async function signInWithGoogle() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setPending(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } });
    setPending(false);
    if (error) setMessage(error.message);
    else setMessage("Check your email for a magic link");
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setPending(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) setMessage(error.message);
    else {
      await ensureUserBootstrap();
      router.replace("/");
    }
  }

  // Registration is now on /register page

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  return (
    <main className="w-full min-h-screen grid place-items-center bg-[radial-gradient(ellipse_at_top,theme(colors.gray.50),transparent)]">
      <div className="w-full max-w-md p-4">
        <Card className="p-6">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Sign in</h1>
              <p className="text-sm text-muted-foreground mt-1">Continue with Google or Email</p>
            </div>
            <form onSubmit={signInWithPassword} className="flex flex-col gap-3">
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required placeholder="you@gmail.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
              <label className="text-sm font-medium">Password</label>
              <Input type="password" required placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} />
              <Button type="submit" disabled={pending}>{pending ? "Signing in..." : "Sign in with Password"}</Button>
            </form>
            <Button variant="ghost" onClick={signInWithEmail} disabled={pending}>{pending ? "Sending..." : "Or, send magic link to email"}</Button>
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">OR</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" onClick={signInWithGoogle}>Continue with Google</Button>
            {message && <div className="text-xs text-muted-foreground text-center">{message}</div>}
            <div className="text-xs text-center text-muted-foreground">
              Don't have an account? <Link href="/register" className="underline">Create one</Link>
            </div>
            <Button variant="ghost" onClick={signOut}>Sign out</Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
