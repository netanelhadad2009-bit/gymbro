// In-memory store for subscriptions (replace with Supabase in production)
export const subscriptions = new Map<string, {
  subscription: any;
  userId?: string;
  createdAt: Date;
}>();
