"use client";
import { supabase } from "@/lib/supabase.client";
import * as React from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function RegisterPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setPending(true);
    setMsg(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name } }
    });
    setPending(false);
    if (error) setMsg(error.message);
    else setMsg("Registered. Please verify your email (if required) and sign in.");
  }

  return (
    <main className="w-full min-h-screen grid place-items-center bg-[radial-gradient(ellipse_at_top,theme(colors.gray.50),transparent)]">
      <div className="w-full max-w-md p-4">
        <Card className="p-6">
          <div className="flex flex-col gap-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Create account</h1>
              <p className="text-sm text-muted-foreground mt-1">Use your email & password</p>
            </div>
            <form onSubmit={onRegister} className="flex flex-col gap-3">
              <label className="text-sm font-medium">Name</label>
              <Input type="text" required placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} />
              <label className="text-sm font-medium">Email</label>
              <Input type="email" required placeholder="you@gmail.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
              <label className="text-sm font-medium">Password</label>
              <Input type="password" required placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} />
              <Button type="submit" disabled={pending}>{pending ? "Creating..." : "Create account"}</Button>
            </form>
            {msg && <div className="text-xs text-muted-foreground text-center">{msg}</div>}
            <div className="text-xs text-center text-muted-foreground">
              Already have an account? <Link href="/login" className="underline">Sign in</Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
