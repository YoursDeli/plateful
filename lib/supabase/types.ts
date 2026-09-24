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
  featured_order: number | null;
  created_at: string;
  updated_at: string;
};

export type PublicReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string;
};

export type Favorite = {
  user_id: string;
  menu_item_id: string;
  created_at: string;
};

export type SiteSettings = {
  id: number;
  brand_name: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  delivery_fee: number;
  free_delivery_threshold: number | null;
  order_notification_email: string | null;
  updated_at: string;
};

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled"
  | "failed";

export type Fulfillment = "delivery" | "pickup";

export type Order = {
  id: string;
  order_number: number; // internal sequence — not shown to anyone
  order_code: string; // customer-facing, e.g. "K7Q2M"
  user_id: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  paystack_reference: string | null;
  paid_at: string | null;
  confirmation_emailed_at: string | null;
  vendor_emailed_at: string | null;
  cancelled_at: string | null;
  cancelled_by: "customer" | "restaurant" | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderStatusHistory = {
  id: number;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  changed_at: string;
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
              | "featured_order"
            >
          >
      >;
      site_settings: Table<
        SiteSettings,
        never,
        Partial<
          Pick<
            SiteSettings,
            | "brand_name"
            | "logo_url"
            | "primary_color"
            | "accent_color"
            | "delivery_fee"
            | "free_delivery_threshold"
            | "order_notification_email"
          >
        >
      >;
      // Clients have no write grants: orders are written by create_order /
      // mark_order_paid, and these email timestamps by the service role.
      orders: Table<Order, never, Partial<Pick<Order, "confirmation_emailed_at" | "vendor_emailed_at">>>;
      order_items: Table<OrderItem, never, never>;
      order_status_history: Table<OrderStatusHistory, never, never>;
      favorites: Table<
        Favorite,
        Pick<Favorite, "user_id" | "menu_item_id">,
        never
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
      menu_item_reviews: {
        Args: { p_menu_item_id: string; p_limit?: number };
        Returns: PublicReview[];
      };
      create_order: {
        Args: {
          p_items: { menu_item_id: string; quantity: number }[];
          p_fulfillment: Fulfillment;
          p_contact_name: string;
          p_contact_phone: string;
          p_delivery_address: string | null;
          p_notes: string | null;
        };
        Returns: {
          order_id: string;
          order_number: number;
          total: number;
          paystack_reference: string;
          contact_email: string;
        }[];
      };
      renew_payment_reference: {
        Args: { p_order_id: string };
        Returns: { paystack_reference: string; total: number; contact_email: string }[];
      };
      cancel_my_order: {
        Args: { p_order_id: string };
        Returns: { id: string; status: OrderStatus }[];
      };
      mark_order_refunded: {
        Args: { p_order_id: string };
        Returns: { id: string; refunded_at: string }[];
      };
      set_order_status: {
        Args: { p_order_id: string; p_status: OrderStatus };
        Returns: { id: string; status: OrderStatus }[];
      };
      mark_order_paid: {
        Args: { p_reference: string; p_amount_kobo: number };
        Returns: { order_id: string; newly_paid: boolean }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
