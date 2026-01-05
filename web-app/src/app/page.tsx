"use client";

import Link from "next/link";
import { useState } from "react";

import { signOut } from "@/lib/authApi";
import type { ApiError } from "@/lib/api";
import { env } from "@/lib/env";
import { useAuthStore } from "@/stores/authStore";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setError(null);
    setPending(true);
    try {
      await signOut();
      clear();
    } catch (e) {
      const err = e as ApiError;
      setError(err.message ?? "Failed to sign out");
    } finally {
      setPending(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        Web App
      </h1>
      <p style={{ marginTop: 0 }}>
        Backend base: <code>{env.apiBaseUrl}</code>
      </p>

      {user ? (
        <section style={{ display: "grid", gap: 8 }}>
          <div>
            Signed in as <strong>{user.email ?? user.username ?? user._id}</strong>
          </div>
          <button onClick={onSignOut} disabled={pending}>
            {pending ? "Signing out..." : "Sign out"}
          </button>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 8 }}>
          <div>Not signed in.</div>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Sign up</Link>
          </div>
        </section>
      )}

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </main>
  );
}
