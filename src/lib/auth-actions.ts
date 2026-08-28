"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { derivePassword, isValidPin, normalizePhone, syntheticEmail } from "@/lib/pin";

export interface ActionState {
  error?: string;
}

const registerSchema = z.object({
  full_name: z.string().min(2),
  dob: z.string().min(4),
  whatsapp: z.string().min(6),
  address: z.string().min(4),
  year_joined: z.coerce.number().int().min(2000).max(new Date().getFullYear()),
  rounds: z.coerce.number().int().min(1).max(64),
  servant_leader_id: z.string().uuid(),
  pin: z.string().regex(/^\d{4}$/),
  confirm_pin: z.string().regex(/^\d{4}$/),
});

export async function registerStudent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please fill every field correctly." };
  const data = parsed.data;
  if (data.pin !== data.confirm_pin) return { error: "The two PINs don't match." };

  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return { error: "Add a photo or selfie." };
  if (photo.size > 6_000_000) return { error: "Photo is too large (max 6 MB)." };

  const phone = normalizePhone(data.whatsapp);
  if (!phone) return { error: "Enter a valid WhatsApp number." };

  const admin = createAdminClient();

  const ext = (photo.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${phone.replace(/\D/g, "")}-${Date.now()}.${ext}`;
  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, photo, { contentType: photo.type, upsert: true });
  if (upErr) return { error: "Could not upload the photo. Try again." };
  const photo_url = admin.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail(phone),
    password: derivePassword(data.pin),
    email_confirm: true,
    user_metadata: { full_name: data.full_name },
  });
  if (createErr || !created.user) {
    return { error: createErr?.message.includes("registered")
      ? "This number is already registered. Try logging in."
      : "Could not create your account. Try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "student",
    status: "pending",
    full_name: data.full_name,
    dob: data.dob,
    whatsapp: phone,
    address: data.address,
    year_joined: data.year_joined,
    rounds: data.rounds,
    servant_leader_id: data.servant_leader_id,
    photo_url,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Could not save your details. Try again." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: syntheticEmail(phone),
    password: derivePassword(data.pin),
  });
  redirect("/pending");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const phone = normalizePhone(String(formData.get("whatsapp") ?? ""));
  const pin = String(formData.get("pin") ?? "");
  if (!phone || !isValidPin(pin)) return { error: "Check your number and 4-digit PIN." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(phone),
    password: derivePassword(pin),
  });
  if (error) return { error: "Wrong number or PIN." };
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const changePinSchema = z.object({
  current: z.string().regex(/^\d{4}$/),
  next: z.string().regex(/^\d{4}$/),
});

export async function changePin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = changePinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "PINs must be 4 digits." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Not signed in." };

  const verify = await supabase.auth.signInWithPassword({
    email: user.email,
    password: derivePassword(parsed.data.current),
  });
  if (verify.error) return { error: "Current PIN is wrong." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: derivePassword(parsed.data.next),
  });
  if (error) return { error: "Could not update PIN." };
  revalidatePath("/settings");
  return {};
}
