"use client";

import { del, get, set } from "idb-keyval";
import type { DayValues } from "@/lib/scoring";

/**
 * Draft persistence. Every edit on the daily-entry form is written here keyed by
 * date. Drafts survive reloads, app close and days passing — they are only
 * cleared once the server confirms the submission.
 */

export interface DayDraft extends DayValues {
  note?: string | null;
  updatedAt: number;
}

const draftKey = (date: string) => `draft:${date}`;
const queueKey = (date: string) => `queue:${date}`;

export async function loadDraft(date: string): Promise<DayDraft | undefined> {
  return get<DayDraft>(draftKey(date));
}

export async function saveDraft(date: string, values: DayValues & { note?: string | null }) {
  const draft: DayDraft = { ...values, updatedAt: Date.now() };
  await set(draftKey(date), draft);
}

export async function clearDraft(date: string) {
  await del(draftKey(date));
}

// ---- submit queue (offline at submit time) ----

export interface QueuedEntry extends DayDraft {
  date: string;
  queuedAt: number;
}

export async function enqueueSubmission(date: string, draft: DayDraft) {
  const q: QueuedEntry = { ...draft, date, queuedAt: Date.now() };
  await set(queueKey(date), q);
}

export async function dequeueSubmission(date: string) {
  await del(queueKey(date));
}
