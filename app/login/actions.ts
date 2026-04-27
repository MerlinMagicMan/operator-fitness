"use server";

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

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { status: "error", error: error.message };
  }

  return { status: "success", email };
}
