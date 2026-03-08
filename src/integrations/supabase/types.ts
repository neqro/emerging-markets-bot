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
      auto_trade_settings: {
        Row: {
          auto_buy_enabled: boolean
          auto_sell_enabled: boolean
          created_at: string
          daily_reset_at: string
          daily_sol_used: number
          id: string
          is_enabled: boolean
          max_daily_sol: number
          max_open_positions: number
          max_sol_per_trade: number
          min_confidence_buy: number
          min_confidence_sell: number
          stop_loss_percent: number
          take_profit_percent: number
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_buy_enabled?: boolean
          auto_sell_enabled?: boolean
          created_at?: string
          daily_reset_at?: string
          daily_sol_used?: number
          id?: string
          is_enabled?: boolean
          max_daily_sol?: number
          max_open_positions?: number
          max_sol_per_trade?: number
          min_confidence_buy?: number
          min_confidence_sell?: number
          stop_loss_percent?: number
          take_profit_percent?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_buy_enabled?: boolean
          auto_sell_enabled?: boolean
          created_at?: string
          daily_reset_at?: string
          daily_sol_used?: number
          id?: string
          is_enabled?: boolean
          max_daily_sol?: number
          max_open_positions?: number
          max_sol_per_trade?: number
          min_confidence_buy?: number
          min_confidence_sell?: number
          stop_loss_percent?: number
          take_profit_percent?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      login_history: {
        Row: {
          id: string
          ip_address: string | null
          logged_in_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          id?: string
          ip_address?: string | null
          logged_in_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          language: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          language?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          language?: string
          updated_at?: string
          user_id?: string
          username?: string | null
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
      trade_orders: {
        Row: {
          amount_sol: number
          amount_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          order_type: string
          price_at_trade: number | null
          status: string
          token_address: string
          token_symbol: string | null
          tx_signature: string | null
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount_sol: number
          amount_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_type: string
          price_at_trade?: number | null
          status?: string
          token_address: string
          token_symbol?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount_sol?: number
          amount_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          order_type?: string
          price_at_trade?: number | null
          status?: string
          token_address?: string
          token_symbol?: string | null
          tx_signature?: string | null
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_orders_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wallets: {
        Row: {
          created_at: string
          encrypted_private_key: string
          id: string
          public_key: string
          sol_balance: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          encrypted_private_key: string
          id?: string
          public_key: string
          sol_balance?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          encrypted_private_key?: string
          id?: string
          public_key?: string
          sol_balance?: number | null
          updated_at?: string
          user_id?: string
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
