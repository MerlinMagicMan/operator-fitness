"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function enrollProgram(formData: FormData): Promise<void> {
  const programId = formData.get("program_id");
  if (typeof programId !== "string" || !programId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("program_enrollments").insert({
    user_id: user.id,
    program_id: programId,
    status: "active",
    is_overlay: true,
  });

  revalidatePath("/");
}
