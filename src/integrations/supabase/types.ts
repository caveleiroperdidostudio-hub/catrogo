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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          reference?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversation_members: {
        Row: {
          conversation_id: string
          is_admin: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          is_admin?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          is_admin?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_group: boolean
          last_message_at: string
          name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_group?: boolean
          last_message_at?: string
          name?: string | null
        }
        Relationships: []
      }
      event_missions: {
        Row: {
          coins: number
          created_at: string
          grants_mod: boolean
          mission_key: string
        }
        Insert: {
          coins?: number
          created_at?: string
          grants_mod?: boolean
          mission_key: string
        }
        Update: {
          coins?: number
          created_at?: string
          grants_mod?: boolean
          mission_key?: string
        }
        Relationships: []
      }
      event_progress: {
        Row: {
          completed_at: string
          event_id: string
          id: string
          mission_key: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          event_id: string
          id?: string
          mission_key: string
          user_id: string
        }
        Update: {
          completed_at?: string
          event_id?: string
          id?: string
          mission_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_progress_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "global_events"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: []
      }
      game_purchases: {
        Row: {
          buyer_id: string
          created_at: string
          game_id: string
          id: string
          price: number
        }
        Insert: {
          buyer_id: string
          created_at?: string
          game_id: string
          id?: string
          price?: number
        }
        Update: {
          buyer_id?: string
          created_at?: string
          game_id?: string
          id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_purchases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "projects_games"
            referencedColumns: ["id"]
          },
        ]
      }
      global_events: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: string
          started_at: string
          title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind: string
          started_at?: string
          title: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: string
          started_at?: string
          title?: string
        }
        Relationships: []
      }
      interactions: {
        Row: {
          content: string | null
          created_at: string
          id: string
          kind: string
          target_id: string
          target_type: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          kind: string
          target_id: string
          target_type: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          kind?: string
          target_id?: string
          target_type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_ai: boolean
          message_type: string
          sender_id: string | null
          to_ai: boolean
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_ai?: boolean
          message_type?: string
          sender_id?: string | null
          to_ai?: boolean
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_ai?: boolean
          message_type?: string
          sender_id?: string | null
          to_ai?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      modpacks: {
        Row: {
          created_at: string
          id: string
          mod_ids: string[]
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mod_ids?: string[]
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mod_ids?: string[]
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      mods: {
        Row: {
          created_at: string
          description: string | null
          id: string
          installs: number
          is_exclusive: boolean
          is_published: boolean
          source_code: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          installs?: number
          is_exclusive?: boolean
          is_published?: boolean
          source_code?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          installs?: number
          is_exclusive?: boolean
          is_published?: boolean
          source_code?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          icon: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      posts_video: {
        Row: {
          created_at: string
          description: string | null
          duration: number | null
          format: string
          id: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          user_id: string
          video_url: string
          views: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration?: number | null
          format?: string
          id?: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          user_id: string
          video_url: string
          views?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: number | null
          format?: string
          id?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          video_url?: string
          views?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          app_phone: string | null
          app_phone_confirmed: boolean
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          phone: string | null
          updated_at: string
          username: string
        }
        Insert: {
          about?: string | null
          app_phone?: string | null
          app_phone_confirmed?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          phone?: string | null
          updated_at?: string
          username: string
        }
        Update: {
          about?: string | null
          app_phone?: string | null
          app_phone_confirmed?: boolean
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      projects_games: {
        Row: {
          created_at: string
          description: string | null
          id: string
          plays: number
          price: number
          source_code: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          plays?: number
          price?: number
          source_code?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          plays?: number
          price?: number
          source_code?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      statuses: {
        Row: {
          background: string | null
          content: string
          created_at: string
          expires_at: string
          id: string
          media_type: string | null
          media_url: string | null
          user_id: string
        }
        Insert: {
          background?: string | null
          content: string
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id: string
        }
        Update: {
          background?: string | null
          content?: string
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string | null
          media_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_items: {
        Row: {
          active: boolean
          attributes: Json
          created_at: string
          description: string | null
          id: string
          kind: string
          min_subscribers: number
          name: string
          price: number
          rarity: string
        }
        Insert: {
          active?: boolean
          attributes?: Json
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          min_subscribers?: number
          name: string
          price?: number
          rarity?: string
        }
        Update: {
          active?: boolean
          attributes?: Json
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          min_subscribers?: number
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          acquired_at: string
          equipped: boolean
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          equipped?: boolean
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "store_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_mods: {
        Row: {
          acquired_at: string
          active: boolean
          id: string
          mod_id: string
          user_id: string
        }
        Insert: {
          acquired_at?: string
          active?: boolean
          id?: string
          mod_id: string
          user_id: string
        }
        Update: {
          acquired_at?: string
          active?: boolean
          id?: string
          mod_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_mods_mod_id_fkey"
            columns: ["mod_id"]
            isOneToOne: false
            referencedRelation: "mods"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_give_hype: {
        Args: { _amount: number; _username: string }
        Returns: Json
      }
      assign_app_phone: { Args: never; Returns: string }
      buy_game: { Args: { _game_id: string }; Returns: Json }
      buy_store_item: { Args: { _item_id: string }; Returns: Json }
      claim_event_reward: {
        Args: { _event_id: string; _mission_key: string }
        Returns: Json
      }
      create_group: {
        Args: { _members: string[]; _name: string }
        Returns: string
      }
      generate_app_phone: { Args: never; Returns: string }
      get_game_source: { Args: { _game_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_game_plays: { Args: { _id: string }; Returns: undefined }
      increment_video_views: { Args: { _id: string }; Returns: undefined }
      is_member: { Args: { _conv: string; _user: string }; Returns: boolean }
      is_owner: { Args: { _uid?: string }; Returns: boolean }
      notify_follow: { Args: { _target: string }; Returns: undefined }
      notify_hype: {
        Args: { _amount: number; _target: string }
        Returns: undefined
      }
      notify_message: {
        Args: { _conversation_id: string; _preview: string }
        Returns: undefined
      }
      send_hype: { Args: { _amount: number; _video_id: string }; Returns: Json }
      start_dm: { Args: { _other: string }; Returns: string }
      start_event: {
        Args: { _duration_seconds: number; _kind: string; _title: string }
        Returns: string
      }
      stop_event: { Args: { _id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
