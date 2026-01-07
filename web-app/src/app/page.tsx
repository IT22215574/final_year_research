"use client";

import { useAuthStore } from "@/stores/authStore";

import SignInPage from "./sign-in/page";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/admin");
  }, [router, user]);

  return <SignInPage />;
}
