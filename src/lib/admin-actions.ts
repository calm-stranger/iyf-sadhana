"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { derivePassword, normalizePhone, syntheticEmail } from "@/lib/pin";

async function myProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data } = await supabase.from("profiles").select("id, role").eq("id", user.id).single();
  return { supabase, user, role: data?.role };
}

/** Servant leader or super admin approves / disables a student. */
export async function setUserStatus(userId: string, status: "active" | "disabled" | "pending") {
  const { supabase } = await myProfile();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/leader");
  revalidatePath("/admin");
  return {};
}

/** Super admin only: change role / servant leader assignment. */
export async function assignUser(input: {
  userId: string;
  role?: "student" | "servant_leader" | "super_admin";
  servant_leader_id?: string | null;
}) {
  const { supabase, role } = await myProfile();
  if (role !== "super_admin") return { error: "Only the counsellor can do this." };
  const patch: Record<string, unknown> = {};
  if (input.role) patch.role = input.role;
  if (input.servant_leader_id !== undefined) patch.servant_leader_id = input.servant_leader_id;
  const { error } = await supabase.from("profiles").update(patch).eq("id", input.userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}

const newLeaderSchema = z.object({
  full_name: z.string().min(2).max(80),
  whatsapp: z.string().min(6),
  pin: z.string().regex(/^\d{4}$/),
  year_joined: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  rounds: z.coerce.number().int().min(1).max(64),
});

/**
 * Super admin creates a servant leader directly (no self-registration needed).
 * dob / address / photo default to placeholders — the leader fills them from
 * Settings after their first login with the temporary PIN.
 */
export async function createServantLeader(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  const { role } = await myProfile();
  if (role !== "super_admin") return { error: "Only the counsellor can add servant leaders." };

  const parsed = newLeaderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the name, number, year and PIN." };

  const phone = normalizePhone(parsed.data.whatsapp);
  if (!phone) return { error: "Enter a valid WhatsApp number." };

  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail(phone),
    password: derivePassword(parsed.data.pin),
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (createErr || !created.user) {
    return {
      error: createErr?.message.includes("registered")
        ? "That number already has an account — promote them from the list instead."
        : "Could not create the account.",
    };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "servant_leader",
    status: "active",
    full_name: parsed.data.full_name,
    dob: "1990-01-01",
    whatsapp: phone,
    address: "—",
    year_joined: parsed.data.year_joined,
    rounds: parsed.data.rounds,
    servant_leader_id: null,
    photo_url: "",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not save the servant leader." };
  }

  revalidatePath("/admin");
  return { ok: true };
}

const forwardSchema = z.object({
  subject_user_id: z.string().uuid(),
  period_type: z.enum(["week", "month"]),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  leader_message: z.string().min(3).max(1000),
});

/** Servant leader forwards a student's card to the counsellor. */
export async function forwardToCounsellor(_prev: { error?: string }, formData: FormData) {
  const parsed = forwardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Add a short note before forwarding." };
  const { supabase, user } = await myProfile();
  const { error } = await supabase.from("card_reviews").insert({ ...parsed.data, raised_by: user.id });
  if (error) return { error: error.message };
  revalidatePath("/leader");
  revalidatePath("/admin");
  return {};
}

const feedbackSchema = z.object({
  id: z.string().uuid(),
  counsellor_feedback: z.string().min(1).max(2000),
});

/** Super admin answers a forwarded review. */
export async function answerReview(_prev: { error?: string }, formData: FormData) {
  const parsed = feedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Write some feedback first." };
  const { supabase } = await myProfile();
  const { error } = await supabase
    .from("card_reviews")
    .update({
      counsellor_feedback: parsed.data.counsellor_feedback,
      status: "answered",
      answered_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}
