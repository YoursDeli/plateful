// Hand-written to match supabase/migrations/*. Once the Supabase CLI is set
// up, replace with `npx supabase gen types typescript --project-id <id>`.

export type Role = "customer" | "staff" | "admin";
export type Badge = "New" | "Bestseller";

type Table<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  default_address: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available: boolean;
  compare_at_price: number | null;
  badge: Badge | null;
  avg_rating: number | null;
  review_count: number;
  created_at: string;
  updated_at: string;
};

export type SiteSettings = {
  id: number;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  updated_at: string;
};

export type Review = {
  id: string;
  menu_item_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        Pick<Profile, "id"> & Partial<Omit<Profile, "id">>,
        Partial<Pick<Profile, "full_name" | "phone" | "default_address">>
      >;
      categories: Table<
        Category,
        Pick<Category, "name"> & Partial<Pick<Category, "sort_order">>
      >;
      menu_items: Table<
        MenuItem,
        Pick<MenuItem, "name" | "price"> &
          Partial<
            Pick<
              MenuItem,
              | "description"
              | "category_id"
              | "image_url"
              | "is_available"
              | "compare_at_price"
              | "badge"
            >
          >
      >;
      site_settings: Table<
        SiteSettings,
        never,
        Partial<
          Pick<SiteSettings, "brand_name" | "logo_url" | "primary_color" | "accent_color">
        >
      >;
      reviews: Table<
        Review,
        Pick<Review, "menu_item_id" | "user_id" | "rating"> &
          Partial<Pick<Review, "comment">>
      >;
    };
    Views: Record<string, never>;
    Functions: {
      is_staff: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
