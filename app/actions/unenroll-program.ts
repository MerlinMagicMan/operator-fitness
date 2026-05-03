"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function unenrollProgram(formData: FormData): Promise<void> {
  const enrollmentId = formData.get("enrollment_id");
  if (typeof enrollmentId !== "string" || !enrollmentId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("program_enrollments")
    .update({ status: "abandoned" })
    .eq("id", enrollmentId)
    .eq("user_id", user.id);

  revalidatePath("/");
}
