/**
 * Hand-written until the Supabase project exists. Then regenerate with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 *
 * NOTE: these are `type` aliases (not interfaces) on purpose — supabase-js needs
 * each Row to be assignable to Record<string, unknown>, which only object-literal
 * type aliases satisfy implicitly.
 */

export type UserRole = "student" | "servant_leader" | "super_admin";
export type UserStatus = "pending" | "active" | "disabled";
export type ReviewStatus = "open" | "answered" | "closed";

export type Profile = {
  id: string;
  role: UserRole;
  status: UserStatus;
  full_name: string;
  dob: string;
  whatsapp: string;
  address: string;
  year_joined: number;
  rounds: number;
  servant_leader_id: string | null;
  photo_url: string;
  created_at: string;
  updated_at: string;
};

export type SadhanaEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  submitted_at: string;
  woke_up_at: string | null;
  chanting_completed_at: string | null;
  slept_at: string | null;
  mangal_arati: boolean;
  nrsimha_arati: boolean;
  siksastakam: boolean;
  book_reading: boolean;
  lecture_hearing: boolean;
  seva: boolean;
  study_or_household: boolean;
  book_reading_detail: string | null;
  lecture_hearing_detail: string | null;
  seva_detail: string | null;
  study_or_household_detail: string | null;
  note: string | null;
  day_score: number;
};

export type WeekNote = {
  user_id: string;
  week_start: string;
  text: string | null;
  created_at: string;
  updated_at: string;
};

export type CardReview = {
  id: string;
  subject_user_id: string;
  period_type: "week" | "month";
  period_start: string;
  raised_by: string;
  status: ReviewStatus;
  leader_message: string;
  counsellor_feedback: string | null;
  created_at: string;
  answered_at: string | null;
};

export type PushSubscriptionRow = {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};

type TableModel<Model> = {
  Row: Model;
  Insert: Partial<Model> & Record<string, unknown>;
  Update: Partial<Model> & Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: TableModel<Profile>;
      sadhana_entries: TableModel<SadhanaEntry>;
      week_notes: TableModel<WeekNote>;
      card_reviews: TableModel<CardReview>;
      push_subscriptions: TableModel<PushSubscriptionRow>;
    };
    Views: Record<string, never>;
    Functions: {
      list_servant_leaders: {
        Args: Record<string, never>;
        Returns: { id: string; full_name: string }[];
      };
    };
    Enums: {
      user_role: UserRole;
      user_status: UserStatus;
      review_status: ReviewStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
