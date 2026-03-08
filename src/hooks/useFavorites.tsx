import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Favorite {
  id: string;
  item_type: "token" | "wallet";
  item_id: string;
  label: string | null;
  created_at: string;
}

export const useFavorites = () => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setFavorites((data as Favorite[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const isFavorite = (itemType: "token" | "wallet", itemId: string) =>
    favorites.some((f) => f.item_type === itemType && f.item_id === itemId);

  const toggleFavorite = async (itemType: "token" | "wallet", itemId: string, label?: string) => {
    if (!user) return;
    const existing = favorites.find((f) => f.item_type === itemType && f.item_id === itemId);
    if (existing) {
      await supabase.from("favorites").delete().eq("id", existing.id);
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
    } else {
      const { data } = await supabase
        .from("favorites")
        .insert({ user_id: user.id, item_type: itemType, item_id: itemId, label: label || null })
        .select()
        .single();
      if (data) setFavorites((prev) => [data as Favorite, ...prev]);
    }
  };

  const tokenFavorites = favorites.filter((f) => f.item_type === "token");
  const walletFavorites = favorites.filter((f) => f.item_type === "wallet");

  return { favorites, tokenFavorites, walletFavorites, loading, isFavorite, toggleFavorite, refetch: fetchFavorites };
};
