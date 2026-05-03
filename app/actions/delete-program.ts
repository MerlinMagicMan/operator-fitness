"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteProgram(formData: FormData): Promise<void> {
  const programId = formData.get("program_id");
  if (typeof programId !== "string" || !programId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("programs")
    .delete()
    .eq("id", programId)
    .eq("owner_user_id", user.id);

  revalidatePath("/");
}
