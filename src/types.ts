export type Creature = {
  id?: string;
  name: string;
  location: string;
  coords: [number, number];
  description: string;
  category: string;
  source?: "database" | "user";
  createdAt?: string;
  visibility?: "private" | "public";
  ownerId?: string;
  reviewStatus?: "draft" | "pending_review" | "approved" | "rejected";
  reviewNotes?: string;
  reviewedAt?: string;
};

export type UserCryptidRow = {
  id: string;
  user_id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  description: string;
  category: string;
  created_at: string;
  visibility: "private" | "public";
  review_status: "draft" | "pending_review" | "approved" | "rejected";
  review_notes: string | null;
  reviewed_at?: string | null;
};

export type ProfileRole = "user" | "moderator" | "admin";
