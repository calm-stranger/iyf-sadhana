"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { todayKey } from "@/lib/dates";

const entrySchema = z.object({
  entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  woke_up_at: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  chanting_completed_at: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  slept_at: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  mangal_arati: z.boolean(),
  nrsimha_arati: z.boolean(),
  siksastakam: z.boolean(),
  book_reading: z.boolean(),
  lecture_hearing: z.boolean(),
  seva: z.boolean(),
  study_or_household: z.boolean(),
  book_reading_detail: z.string().max(200).nullable().optional(),
  lecture_hearing_detail: z.string().max(200).nullable().optional(),
  seva_detail: z.string().max(200).nullable().optional(),
  study_or_household_detail: z.string().max(200).nullable().optional(),
  note: z.string().max(500).nullable().optional(),
});

export type EntryInput = z.infer<typeof entrySchema>;

export async function submitEntry(input: EntryInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = entrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid entry." };

  // no future days
  if (parsed.data.entry_date > todayKey()) {
    return { ok: false, error: "You cannot fill a future day." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // submitted_at and day_score are set by the DB trigger.
  const { error } = await supabase
    .from("sadhana_entries")
    .upsert(
      { ...parsed.data, user_id: user.id },
      { onConflict: "user_id,entry_date" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/week");
  revalidatePath(`/day/${parsed.data.entry_date}`);
  return { ok: true };
}
