"use client";

import Link from "next/link";
import { useState } from "react";

import { signOut } from "@/lib/authApi";
import type { ApiError } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

import SignInPage from "./sign-in/page";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const clear = useAuthStore((s) => s.clear);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!user) return <SignInPage />;

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
      <section style={{ display: "grid", gap: 12 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 0 }}>
          Dashboard
        </h1>

        <div>
          Signed in as <strong>{user.email ?? user.username ?? user._id}</strong>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={onSignOut} disabled={pending}>
            {pending ? "Signing out..." : "Sign out"}
          </button>
          <Link href="/sign-up">Create another account</Link>
        </div>
      </section>

      {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
    </main>
  );
}
