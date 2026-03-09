"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Navigate directly to admin without authentication
    router.replace("/admin");
  }, [router]);

  return null;
}
