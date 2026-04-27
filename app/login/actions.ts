"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type SignInState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | { status: "error"; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signInWithEmail(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!EMAIL_RE.test(email)) {
    return { status: "error", error: "Enter a valid email address." };
  }

  const headerStore = await headers();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    headerStore.get("origin") ??
    `https://${headerStore.get("host") ?? "localhost:3000"}`;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", error: error.message };
  }

  return { status: "success", email };
}
