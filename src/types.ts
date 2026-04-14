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
  is_public: boolean;
};
