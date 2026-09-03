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
      ai_providers: {
        Row: {
          base_url: string
          created_at: string
          enabled: boolean
          global_daily_limit: number
          id: string
          model: string
          name: string
          priority: number
          secret_name: string | null
          slug: string
          timeout_ms: number
          updated_at: string
          user_daily_limit: number
        }
        Insert: {
          base_url: string
          created_at?: string
          enabled?: boolean
          global_daily_limit?: number
          id?: string
          model: string
          name: string
          priority?: number
          secret_name?: string | null
          slug: string
          timeout_ms?: number
          updated_at?: string
          user_daily_limit?: number
        }
        Update: {
          base_url?: string
          created_at?: string
          enabled?: boolean
          global_daily_limit?: number
          id?: string
          model?: string
          name?: string
          priority?: number
          secret_name?: string | null
          slug?: string
          timeout_ms?: number
          updated_at?: string
          user_daily_limit?: number
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string
          error: string | null
          feature: string
          id: string
          model: string
          provider_slug: string
          success: boolean
          tokens: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          feature?: string
          id?: string
          model: string
          provider_slug: string
          success?: boolean
          tokens?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          feature?: string
          id?: string
          model?: string
          provider_slug?: string
          success?: boolean
          tokens?: number
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          metadata: Json
          resource_id: string | null
          resource_type: string
          result: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type: string
          result?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
          result?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          callee_id: string
          caller_id: string
          conversation_id: string | null
          created_at: string
          duration_seconds: number
          id: string
          mode: string
          session_id: string
          status: string
        }
        Insert: {
          callee_id: string
          caller_id: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: string
          session_id: string
          status?: string
        }
        Update: {
          callee_id?: string
          caller_id?: string
          conversation_id?: string | null
          created_at?: string
          duration_seconds?: number
          id?: string
          mode?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      conversation_keys: {
        Row: {
          conversation_id: string
          created_at: string
          sender_pub: string
          user_id: string
          wrap_iv: string
          wrapped_key: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          sender_pub: string
          user_id: string
          wrap_iv: string
          wrapped_key: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          sender_pub?: string
          user_id?: string
          wrap_iv?: string
          wrapped_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_keys_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          archived: boolean
          conversation_id: string
          is_admin: boolean
          joined_at: string
          muted_until: string | null
          nickname: string | null
          pinned: boolean
          user_id: string
        }
        Insert: {
          archived?: boolean
          conversation_id: string
          is_admin?: boolean
          joined_at?: string
          muted_until?: string | null
          nickname?: string | null
          pinned?: boolean
          user_id: string
        }
        Update: {
          archived?: boolean
          conversation_id?: string
          is_admin?: boolean
          joined_at?: string
          muted_until?: string | null
          nickname?: string | null
          pinned?: boolean
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
      device_keys: {
        Row: {
          created_at: string
          fingerprint: string
          public_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          public_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          public_key?: string
          updated_at?: string
          user_id?: string
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
      learning_progress: {
        Row: {
          created_at: string
          id: string
          last_day: string | null
          level: number
          streak: number
          track: string
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_day?: string | null
          level?: number
          streak?: number
          track: string
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_day?: string | null
          level?: number
          streak?: number
          track?: string
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          cipher: string | null
          content: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          enc_v: number
          id: string
          is_ai: boolean
          iv: string | null
          media_mime: string | null
          media_name: string | null
          media_size: number | null
          media_url: string | null
          message_type: string
          reply_to: string | null
          sender_id: string | null
          to_ai: boolean
        }
        Insert: {
          cipher?: string | null
          content: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          enc_v?: number
          id?: string
          is_ai?: boolean
          iv?: string | null
          media_mime?: string | null
          media_name?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
          sender_id?: string | null
          to_ai?: boolean
        }
        Update: {
          cipher?: string | null
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          enc_v?: number
          id?: string
          is_ai?: boolean
          iv?: string | null
          media_mime?: string | null
          media_name?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          reply_to?: string | null
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
          {
            foreignKeyName: "messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      mod_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          id: string
          mod_id: string
          source_code: string
          version: number
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mod_id: string
          source_code: string
          version: number
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mod_id?: string
          source_code?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "mod_versions_mod_id_fkey"
            columns: ["mod_id"]
            isOneToOne: false
            referencedRelation: "mods"
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
          ai_review: string | null
          created_at: string
          current_version: number
          description: string | null
          id: string
          installs: number
          is_exclusive: boolean
          is_published: boolean
          moderation_status: string
          quality: number | null
          source_code: string
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          ai_review?: string | null
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          installs?: number
          is_exclusive?: boolean
          is_published?: boolean
          moderation_status?: string
          quality?: number | null
          source_code?: string
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          ai_review?: string | null
          created_at?: string
          current_version?: number
          description?: string | null
          id?: string
          installs?: number
          is_exclusive?: boolean
          is_published?: boolean
          moderation_status?: string
          quality?: number | null
          source_code?: string
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      movie_favorites: {
        Row: {
          created_at: string
          id: string
          movie_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_favorites_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_progress: {
        Row: {
          duration_sec: number
          id: string
          movie_id: string
          position_sec: number
          updated_at: string
          user_id: string
        }
        Insert: {
          duration_sec?: number
          id?: string
          movie_id: string
          position_sec?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          duration_sec?: number
          id?: string
          movie_id?: string
          position_sec?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_progress_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          age_rating: string | null
          cast_names: string[]
          category: string
          created_at: string
          created_by: string
          description: string | null
          director: string | null
          duration_min: number | null
          genres: string[]
          id: string
          license_note: string | null
          original_title: string | null
          poster_url: string | null
          rating: number | null
          rights_holder: string | null
          source_url: string | null
          status: string
          title: string
          trailer_url: string | null
          updated_at: string
          video_url: string
          views: number
          year: number | null
        }
        Insert: {
          age_rating?: string | null
          cast_names?: string[]
          category?: string
          created_at?: string
          created_by: string
          description?: string | null
          director?: string | null
          duration_min?: number | null
          genres?: string[]
          id?: string
          license_note?: string | null
          original_title?: string | null
          poster_url?: string | null
          rating?: number | null
          rights_holder?: string | null
          source_url?: string | null
          status?: string
          title: string
          trailer_url?: string | null
          updated_at?: string
          video_url: string
          views?: number
          year?: number | null
        }
        Update: {
          age_rating?: string | null
          cast_names?: string[]
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          director?: string | null
          duration_min?: number | null
          genres?: string[]
          id?: string
          license_note?: string | null
          original_title?: string | null
          poster_url?: string | null
          rating?: number | null
          rights_holder?: string | null
          source_url?: string | null
          status?: string
          title?: string
          trailer_url?: string | null
          updated_at?: string
          video_url?: string
          views?: number
          year?: number | null
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
      permissions: {
        Row: {
          created_at: string
          description: string
          key: string
        }
        Insert: {
          created_at?: string
          description?: string
          key: string
        }
        Update: {
          created_at?: string
          description?: string
          key?: string
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
      premium_requests: {
        Row: {
          created_at: string
          id: string
          note: string | null
          pix_key_used: string | null
          plan: string
          receipt_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          pix_key_used?: string | null
          plan?: string
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          pix_key_used?: string | null
          plan?: string
          receipt_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      premium_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          is_gift: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_gift?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          is_gift?: boolean
          updated_at?: string
          user_id?: string
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
          engine: string
          id: string
          plays: number
          price: number
          published: boolean
          source_code: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          engine?: string
          id?: string
          plays?: number
          price?: number
          published?: boolean
          source_code?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          engine?: string
          id?: string
          plays?: number
          price?: number
          published?: boolean
          source_code?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_fkey"
            columns: ["permission"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
        ]
      }
      scheduled_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          send_at: string
          sent: boolean
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          send_at: string
          sent?: boolean
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          send_at?: string
          sent?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      skins: {
        Row: {
          accessories: Json
          config: Json
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accessories?: Json
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accessories?: Json
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      starred_messages: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "starred_messages_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
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
      sticker_packs: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stickers: {
        Row: {
          created_at: string
          emoji: string | null
          id: string
          image_url: string
          is_public: boolean
          owner_id: string
          pack_id: string | null
          uses: number
        }
        Insert: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url: string
          is_public?: boolean
          owner_id: string
          pack_id?: string | null
          uses?: number
        }
        Update: {
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string
          is_public?: boolean
          owner_id?: string
          pack_id?: string | null
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
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
      user_badges: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          type_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          type_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          type_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_type_key_fkey"
            columns: ["type_key"]
            isOneToOne: false
            referencedRelation: "verification_types"
            referencedColumns: ["key"]
          },
        ]
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
      verification_requests: {
        Row: {
          about: string
          created_at: string
          evidence_url: string | null
          full_name: string
          id: string
          links: string[]
          reject_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          type_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about?: string
          created_at?: string
          evidence_url?: string | null
          full_name: string
          id?: string
          links?: string[]
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about?: string
          created_at?: string
          evidence_url?: string | null
          full_name?: string
          id?: string
          links?: string[]
          reject_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          type_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_type_key_fkey"
            columns: ["type_key"]
            isOneToOne: false
            referencedRelation: "verification_types"
            referencedColumns: ["key"]
          },
        ]
      }
      verification_types: {
        Row: {
          active: boolean
          color: string
          created_at: string
          icon: string
          key: string
          label: string
          requirements: string
        }
        Insert: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          key: string
          label: string
          requirements?: string
        }
        Update: {
          active?: boolean
          color?: string
          created_at?: string
          icon?: string
          key?: string
          label?: string
          requirements?: string
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
      add_learning_xp: { Args: { _track: string; _xp: number }; Returns: Json }
      admin_give_hype: {
        Args: { _amount: number; _username: string }
        Returns: Json
      }
      assign_app_phone: { Args: never; Returns: string }
      bump_sticker: { Args: { _id: string }; Returns: undefined }
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
      find_by_app_phone: {
        Args: { _phone: string }
        Returns: {
          app_phone: string
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      generate_app_phone: { Args: never; Returns: string }
      get_game_source: { Args: { _game_id: string }; Returns: string }
      grant_admin: { Args: { _username: string }; Returns: Json }
      grant_premium: {
        Args: { _days?: number; _username: string }
        Returns: Json
      }
      has_permission: {
        Args: { _perm: string; _user_id?: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_game_plays: { Args: { _id: string }; Returns: undefined }
      increment_movie_views: { Args: { _id: string }; Returns: undefined }
      increment_video_views: { Args: { _id: string }; Returns: undefined }
      is_member: { Args: { _conv: string; _user: string }; Returns: boolean }
      is_owner: { Args: { _uid?: string }; Returns: boolean }
      is_premium: { Args: { _user_id?: string }; Returns: boolean }
      is_staff: { Args: { _uid?: string }; Returns: boolean }
      list_staff: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      log_audit: {
        Args: {
          _action: string
          _metadata?: Json
          _resource_id?: string
          _resource_type: string
          _result?: string
        }
        Returns: undefined
      }
      notify_follow: { Args: { _target: string }; Returns: undefined }
      notify_hype: {
        Args: { _amount: number; _target: string }
        Returns: undefined
      }
      notify_message: {
        Args: { _conversation_id: string; _preview: string }
        Returns: undefined
      }
      resolve_report: { Args: { _id: string; _status: string }; Returns: Json }
      review_movie: { Args: { _approve: boolean; _id: string }; Returns: Json }
      review_premium_request: {
        Args: { _approve: boolean; _days?: number; _id: string }
        Returns: Json
      }
      review_verification: {
        Args: { _approve: boolean; _id: string; _reason?: string }
        Returns: Json
      }
      revoke_admin: { Args: { _username: string }; Returns: Json }
      revoke_premium: { Args: { _username: string }; Returns: Json }
      rollback_mod: {
        Args: { _mod_id: string; _version: number }
        Returns: Json
      }
      send_hype: { Args: { _amount: number; _video_id: string }; Returns: Json }
      set_role_permission: {
        Args: {
          _enabled: boolean
          _permission: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: Json
      }
      spend_coins: {
        Args: { _amount: number; _kind: string; _reference?: string }
        Returns: Json
      }
      start_dm: { Args: { _other: string }; Returns: string }
      start_event: {
        Args: { _duration_seconds: number; _kind: string; _title: string }
        Returns: string
      }
      stop_event: { Args: { _id: string }; Returns: undefined }
      update_ai_provider: {
        Args: {
          _enabled?: boolean
          _global_daily_limit?: number
          _model?: string
          _priority?: number
          _slug: string
          _user_daily_limit?: number
        }
        Returns: Json
      }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
