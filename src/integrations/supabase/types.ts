export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bot_signals: {
        Row: {
          bot_activity_score: number | null
          confidence_score: number | null
          created_at: string
          id: string
          is_active: boolean | null
          liquidity_usd: number | null
          reason: string | null
          signal_type: string
          token_address: string
          token_symbol: string | null
          updated_at: string
          volume_24h: number | null
          whale_wallets_buying: number | null
        }
        Insert: {
          bot_activity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          liquidity_usd?: number | null
          reason?: string | null
          signal_type: string
          token_address: string
          token_symbol?: string | null
          updated_at?: string
          volume_24h?: number | null
          whale_wallets_buying?: number | null
        }
        Update: {
          bot_activity_score?: number | null
          confidence_score?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          liquidity_usd?: number | null
          reason?: string | null
          signal_type?: string
          token_address?: string
          token_symbol?: string | null
          updated_at?: string
          volume_24h?: number | null
          whale_wallets_buying?: number | null
        }
        Relationships: []
      }
      token_analysis: {
        Row: {
          analyzed_at: string
          bot_transaction_percentage: number | null
          holder_count: number | null
          id: string
          is_honeypot: boolean | null
          risk_score: number | null
          token_address: string
          token_symbol: string | null
          top_10_holder_percentage: number | null
        }
        Insert: {
          analyzed_at?: string
          bot_transaction_percentage?: number | null
          holder_count?: number | null
          id?: string
          is_honeypot?: boolean | null
          risk_score?: number | null
          token_address: string
          token_symbol?: string | null
          top_10_holder_percentage?: number | null
        }
        Update: {
          analyzed_at?: string
          bot_transaction_percentage?: number | null
          holder_count?: number | null
          id?: string
          is_honeypot?: boolean | null
          risk_score?: number | null
          token_address?: string
          token_symbol?: string | null
          top_10_holder_percentage?: number | null
        }
        Relationships: []
      }
      tracked_wallets: {
        Row: {
          address: string
          created_at: string
          id: string
          is_whale: boolean | null
          label: string | null
          total_profit_usd: number | null
          total_trades: number | null
          updated_at: string
          win_rate: number | null
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          is_whale?: boolean | null
          label?: string | null
          total_profit_usd?: number | null
          total_trades?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          is_whale?: boolean | null
          label?: string | null
          total_profit_usd?: number | null
          total_trades?: number | null
          updated_at?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_sol: number | null
          amount_usd: number | null
          block_time: string | null
          created_at: string
          id: string
          price_at_trade: number | null
          signature: string | null
          token_address: string
          token_symbol: string | null
          transaction_type: string
          wallet_id: string | null
        }
        Insert: {
          amount_sol?: number | null
          amount_usd?: number | null
          block_time?: string | null
          created_at?: string
          id?: string
          price_at_trade?: number | null
          signature?: string | null
          token_address: string
          token_symbol?: string | null
          transaction_type: string
          wallet_id?: string | null
        }
        Update: {
          amount_sol?: number | null
          amount_usd?: number | null
          block_time?: string | null
          created_at?: string
          id?: string
          price_at_trade?: number | null
          signature?: string | null
          token_address?: string
          token_symbol?: string | null
          transaction_type?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "tracked_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
