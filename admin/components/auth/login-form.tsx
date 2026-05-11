"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { finalizeLoginSession } from "@/lib/actions/auth-login";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function onPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    const finalized = await finalizeLoginSession();
    if (!finalized.ok) {
      setStatus("error");
      setMessage(finalized.message);
      return;
    }

    router.push(next);
    router.refresh();
  }

  async function onMagicLinkSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);
    const origin = window.location.origin;
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }
    setStatus("sent");
    setMessage("Check your email for the magic link.");
  }

  return (
    <div className="space-y-8">
      <form onSubmit={onPasswordSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="w-full"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="border-border w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card text-muted-foreground px-2">Or</span>
        </div>
      </div>

      <form onSubmit={onMagicLinkSubmit} className="space-y-4">
        <p className="text-muted-foreground text-sm">
          Send a one-time link to the email above (no password).
        </p>
        <Button
          type="submit"
          variant="outline"
          className="w-full"
          disabled={status === "loading" || !email.trim()}
        >
          Email magic link
        </Button>
      </form>

      {message ? (
        <p
          className={`text-center text-sm ${status === "error" ? "text-destructive" : "text-muted-foreground"}`}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
