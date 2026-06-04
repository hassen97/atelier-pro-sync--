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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_signup_events: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          seen_at: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          seen_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          seen_at?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "platform_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      community_posts: {
        Row: {
          body: string | null
          city: string | null
          created_at: string
          id: string
          is_reported: boolean
          shop_name: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_reported?: boolean
          shop_name?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_reported?: boolean
          shop_name?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          participant_a: string
          participant_b: string
          post_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          participant_a: string
          participant_b: string
          post_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          participant_a?: string
          participant_b?: string
          post_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          email: string | null
          id: string
          loyalty_points: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          loyalty_points?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      defective_parts: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          product_name: string
          quantity: number
          refund_amount: number
          resolution: string | null
          sent_date: string | null
          status: string
          supplier_id: string | null
          user_id: string
          warranty_ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name: string
          quantity?: number
          refund_amount?: number
          resolution?: string | null
          sent_date?: string | null
          status?: string
          supplier_id?: string | null
          user_id: string
          warranty_ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          refund_amount?: number
          resolution?: string | null
          sent_date?: string | null
          status?: string
          supplier_id?: string | null
          user_id?: string
          warranty_ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "defective_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_parts_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "defective_parts_warranty_ticket_id_fkey"
            columns: ["warranty_ticket_id"]
            isOneToOne: false
            referencedRelation: "warranty_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          employee_id: string
          expense_id: string | null
          id: string
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id: string
          expense_id?: string | null
          id?: string
          transaction_date?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          employee_id?: string
          expense_id?: string | null
          id?: string
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      expense_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string | null
          expense_date: string
          id: string
          supplier_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          supplier_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string | null
          expense_date?: string
          id?: string
          supplier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
        }
        Relationships: []
      }
      inventory_access_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_id: string | null
          due_date: string | null
          id: string
          invoice_number: string
          repair_id: string | null
          sale_id: string | null
          status: string
          total_amount: number
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          repair_id?: string | null
          sale_id?: string | null
          status?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          repair_id?: string | null
          sale_id?: string | null
          status?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_transactions: {
        Row: {
          amount_money: number | null
          amount_points: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          note: string | null
          repair_id: string | null
          sale_id: string | null
          source: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount_money?: number | null
          amount_points: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          note?: string | null
          repair_id?: string | null
          sale_id?: string | null
          source?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount_money?: number | null
          amount_points?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string | null
          repair_id?: string | null
          sale_id?: string | null
          source?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
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
      password_reset_requests: {
        Row: {
          created_at: string
          id: string
          phone: string | null
          status: string
          username: string
        }
        Insert: {
          created_at?: string
          id?: string
          phone?: string | null
          status?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          phone?: string | null
          status?: string
          username?: string
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json | null
          description: string | null
          gateway_key: string
          gateway_name: string
          id: string
          is_enabled: boolean
          updated_at: string
        }
        Insert: {
          config?: Json | null
          description?: string | null
          gateway_key: string
          gateway_name: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Update: {
          config?: Json | null
          description?: string | null
          gateway_key?: string
          gateway_name?: string
          id?: string
          is_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      plan_feature_flags: {
        Row: {
          feature_flag_id: string
          id: string
          plan_id: string
        }
        Insert: {
          feature_flag_id: string
          id?: string
          plan_id: string
        }
        Update: {
          feature_flag_id?: string
          id?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_feature_flags_feature_flag_id_fkey"
            columns: ["feature_flag_id"]
            isOneToOne: false
            referencedRelation: "feature_flags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_feature_flags_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          changes_fixes: string | null
          created_by: string
          id: string
          new_features: string | null
          published_at: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          changes_fixes?: string | null
          created_by: string
          id?: string
          new_features?: string | null
          published_at?: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          changes_fixes?: string | null
          created_by?: string
          id?: string
          new_features?: string | null
          published_at?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      platform_feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          shop_name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          shop_name?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          shop_name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string | null
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: string | null
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string | null
        }
        Relationships: []
      }
      product_returns: {
        Row: {
          approved_by: string | null
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          product_id: string | null
          product_name: string
          quantity: number
          reason: string
          refund_amount: number
          refund_method: string
          sale_id: string | null
          sale_item_id: string | null
          status: string
          stock_destination: string
          unit_price: number
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          reason?: string
          refund_amount?: number
          refund_method?: string
          sale_id?: string | null
          sale_item_id?: string | null
          status?: string
          stock_destination?: string
          unit_price?: number
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          reason?: string
          refund_amount?: number
          refund_method?: string
          sale_id?: string | null
          sale_item_id?: string | null
          status?: string
          stock_destination?: string
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_returns_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_returns_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcodes: string[]
          category_id: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          min_quantity: number
          name: string
          quantity: number
          sell_price: number
          sku: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          barcodes?: string[]
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number
          name: string
          quantity?: number
          sell_price?: number
          sku?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          barcodes?: string[]
          category_id?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          min_quantity?: number
          name?: string
          quantity?: number
          sell_price?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          device_hash: string | null
          device_user_agent: string | null
          email: string | null
          full_name: string | null
          id: string
          is_locked: boolean
          last_online_at: string | null
          last_verification_reminder_sent_at: string | null
          phone: string | null
          registration_ip: string | null
          updated_at: string
          user_id: string
          username: string | null
          verification_deadline: string | null
          verification_reminders_sent: number
          verification_requested_at: string | null
          verification_status: string
          verified_at: string | null
          verified_by_admin: string | null
          whatsapp_phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          device_hash?: string | null
          device_user_agent?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_locked?: boolean
          last_online_at?: string | null
          last_verification_reminder_sent_at?: string | null
          phone?: string | null
          registration_ip?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          verification_deadline?: string | null
          verification_reminders_sent?: number
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by_admin?: string | null
          whatsapp_phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          device_hash?: string | null
          device_user_agent?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_locked?: boolean
          last_online_at?: string | null
          last_verification_reminder_sent_at?: string | null
          phone?: string | null
          registration_ip?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verification_deadline?: string | null
          verification_reminders_sent?: number
          verification_requested_at?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by_admin?: string | null
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      repair_parts: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          repair_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          repair_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          repair_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "repair_parts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repair_parts_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repair_payments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          note: string | null
          payment_type: string
          recorded_by: string | null
          repair_id: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          payment_type?: string
          recorded_by?: string | null
          repair_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          note?: string | null
          payment_type?: string
          recorded_by?: string | null
          repair_id?: string
          user_id?: string
        }
        Relationships: []
      }
      repair_status_history: {
        Row: {
          created_at: string
          id: string
          note: string | null
          repair_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          repair_id: string
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          repair_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "repair_status_history_repair_id_fkey"
            columns: ["repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          amount_paid: number
          category_id: string | null
          created_at: string
          customer_id: string | null
          delivery_date: string | null
          deposit_date: string
          device_condition: string | null
          device_model: string
          device_unlock_code: string | null
          diagnosis: string | null
          estimated_ready_date: string | null
          id: string
          imei: string | null
          intake_photo_url: string | null
          is_warranty: boolean
          labor_cost: number
          notes: string | null
          parts_cost: number
          problem_description: string
          received_by: string | null
          repaired_by: string | null
          status: string
          technician_note: string | null
          ticket_number: number
          total_cost: number
          tracking_token: string
          updated_at: string
          user_id: string
          warranty_ticket_id: string | null
        }
        Insert: {
          amount_paid?: number
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          deposit_date?: string
          device_condition?: string | null
          device_model: string
          device_unlock_code?: string | null
          diagnosis?: string | null
          estimated_ready_date?: string | null
          id?: string
          imei?: string | null
          intake_photo_url?: string | null
          is_warranty?: boolean
          labor_cost?: number
          notes?: string | null
          parts_cost?: number
          problem_description: string
          received_by?: string | null
          repaired_by?: string | null
          status?: string
          technician_note?: string | null
          ticket_number?: number
          total_cost?: number
          tracking_token?: string
          updated_at?: string
          user_id: string
          warranty_ticket_id?: string | null
        }
        Update: {
          amount_paid?: number
          category_id?: string | null
          created_at?: string
          customer_id?: string | null
          delivery_date?: string | null
          deposit_date?: string
          device_condition?: string | null
          device_model?: string
          device_unlock_code?: string | null
          diagnosis?: string | null
          estimated_ready_date?: string | null
          id?: string
          imei?: string | null
          intake_photo_url?: string | null
          is_warranty?: boolean
          labor_cost?: number
          notes?: string | null
          parts_cost?: number
          problem_description?: string
          received_by?: string | null
          repaired_by?: string | null
          status?: string
          technician_note?: string | null
          ticket_number?: number
          total_cost?: number
          tracking_token?: string
          updated_at?: string
          user_id?: string
          warranty_ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repairs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_warranty_ticket_id_fkey"
            columns: ["warranty_ticket_id"]
            isOneToOne: false
            referencedRelation: "warranty_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          product_id: string | null
          quantity: number
          sale_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string | null
          quantity?: number
          sale_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          created_at: string
          customer_id: string | null
          id: string
          notes: string | null
          payment_method: string
          total_amount: number
          user_id: string
        }
        Insert: {
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          total_amount?: number
          user_id: string
        }
        Update: {
          amount_paid?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      service_requests: {
        Row: {
          admin_note: string | null
          completed_at: string | null
          created_at: string
          id: string
          input_data: Json
          requested_by: string | null
          result_data: Json
          service_id: string | null
          service_name_snapshot: string
          service_price_snapshot: number
          shop_id: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          requested_by?: string | null
          result_data?: Json
          service_id?: string | null
          service_name_snapshot: string
          service_price_snapshot?: number
          shop_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          input_data?: Json
          requested_by?: string | null
          result_data?: Json
          service_id?: string | null
          service_name_snapshot?: string
          service_price_snapshot?: number
          shop_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_requests_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          category: string
          created_at: string
          currency: string | null
          description: string | null
          extra_fields: Json
          id: string
          is_active: boolean
          name: string
          price: number
          requires_imei: boolean
          requires_model: boolean
          type: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          extra_fields?: Json
          id?: string
          is_active?: boolean
          name: string
          price?: number
          requires_imei?: boolean
          requires_model?: boolean
          type?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          currency?: string | null
          description?: string | null
          extra_fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          requires_imei?: boolean
          requires_model?: boolean
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      shop_settings: {
        Row: {
          address: string | null
          brand_color: string | null
          country: string
          created_at: string
          currency: string
          email: string | null
          google_maps_url: string | null
          id: string
          inventory_locked: boolean
          language: string | null
          last_onboarding_reminder_sent_at: string | null
          logo_size: string
          logo_url: string | null
          loyalty_earn_rate: number
          loyalty_enabled: boolean
          loyalty_min_redeem: number
          loyalty_redeem_points: number
          loyalty_redeem_value: number
          onboarding_completed: boolean
          onboarding_reminders_sent: number
          phone: string | null
          receipt_mode: string
          receipt_terms: string | null
          shop_name: string
          show_payment_on_tracking: boolean
          show_receipt_note: boolean
          stock_alert_threshold: number
          store_hours: string | null
          tax_enabled: boolean
          tax_rate: number
          updated_at: string
          user_id: string
          warranty_days: number
          whatsapp_phone: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          inventory_locked?: boolean
          language?: string | null
          last_onboarding_reminder_sent_at?: string | null
          logo_size?: string
          logo_url?: string | null
          loyalty_earn_rate?: number
          loyalty_enabled?: boolean
          loyalty_min_redeem?: number
          loyalty_redeem_points?: number
          loyalty_redeem_value?: number
          onboarding_completed?: boolean
          onboarding_reminders_sent?: number
          phone?: string | null
          receipt_mode?: string
          receipt_terms?: string | null
          shop_name?: string
          show_payment_on_tracking?: boolean
          show_receipt_note?: boolean
          stock_alert_threshold?: number
          store_hours?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          updated_at?: string
          user_id: string
          warranty_days?: number
          whatsapp_phone?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          country?: string
          created_at?: string
          currency?: string
          email?: string | null
          google_maps_url?: string | null
          id?: string
          inventory_locked?: boolean
          language?: string | null
          last_onboarding_reminder_sent_at?: string | null
          logo_size?: string
          logo_url?: string | null
          loyalty_earn_rate?: number
          loyalty_enabled?: boolean
          loyalty_min_redeem?: number
          loyalty_redeem_points?: number
          loyalty_redeem_value?: number
          onboarding_completed?: boolean
          onboarding_reminders_sent?: number
          phone?: string | null
          receipt_mode?: string
          receipt_terms?: string | null
          shop_name?: string
          show_payment_on_tracking?: boolean
          show_receipt_note?: boolean
          stock_alert_threshold?: number
          store_hours?: string | null
          tax_enabled?: boolean
          tax_rate?: number
          updated_at?: string
          user_id?: string
          warranty_days?: number
          whatsapp_phone?: string | null
        }
        Relationships: []
      }
      shop_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          set_by_admin: string | null
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          set_by_admin?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          set_by_admin?: string | null
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      signup_attempts: {
        Row: {
          created_at: string
          id: string
          ip_address: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          gateway_key: string
          id: string
          plan_id: string
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          gateway_key: string
          id?: string
          plan_id: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          gateway_key?: string
          id?: string
          plan_id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          highlight: boolean
          id: string
          is_active: boolean
          name: string
          period: string | null
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id?: string
          is_active?: boolean
          name: string
          period?: string | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          highlight?: boolean
          id?: string
          is_active?: boolean
          name?: string
          period?: string | null
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      supplier_purchases: {
        Row: {
          created_at: string
          id: string
          item_name: string
          product_id: string | null
          quantity: number
          supplier_id: string
          total_price: number
          transaction_id: string | null
          unit_price: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          product_id?: string | null
          quantity?: number
          supplier_id: string
          total_price?: number
          transaction_id?: string | null
          unit_price?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          product_id?: string | null
          quantity?: number
          supplier_id?: string
          total_price?: number
          transaction_id?: string | null
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_purchases_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "supplier_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          proof_url: string | null
          running_balance: number
          status: string
          supplier_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          proof_url?: string | null
          running_balance?: number
          status?: string
          supplier_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          proof_url?: string | null
          running_balance?: number
          status?: string
          supplier_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          balance: number
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          balance?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          allowed_pages: string[]
          base_salary: number
          created_at: string
          hire_date: string | null
          id: string
          member_user_id: string
          owner_id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }
        Insert: {
          allowed_pages?: string[]
          base_salary?: number
          created_at?: string
          hire_date?: string | null
          id?: string
          member_user_id: string
          owner_id: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Update: {
          allowed_pages?: string[]
          base_salary?: number
          created_at?: string
          hire_date?: string | null
          id?: string
          member_user_id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string
        }
        Relationships: []
      }
      team_tasks: {
        Row: {
          assigned_to: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          owner_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string
          status?: string
          title?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          signed_up_user_id: string | null
          source: string | null
          trial_granted_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          signed_up_user_id?: string | null
          source?: string | null
          trial_granted_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          signed_up_user_id?: string | null
          source?: string | null
          trial_granted_at?: string | null
        }
        Relationships: []
      }
      warranty_tickets: {
        Row: {
          action_taken: string | null
          amount_paid: number
          created_at: string
          id: string
          labor_cost: number
          notes: string | null
          original_repair_id: string
          original_repair_link_note: string | null
          parts_cost: number
          return_reason: string
          status: string
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          amount_paid?: number
          created_at?: string
          id?: string
          labor_cost?: number
          notes?: string | null
          original_repair_id: string
          original_repair_link_note?: string | null
          parts_cost?: number
          return_reason?: string
          status?: string
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          action_taken?: string | null
          amount_paid?: number
          created_at?: string
          id?: string
          labor_cost?: number
          notes?: string | null
          original_repair_id?: string
          original_repair_link_note?: string | null
          parts_cost?: number
          return_reason?: string
          status?: string
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warranty_tickets_original_repair_id_fkey"
            columns: ["original_repair_id"]
            isOneToOne: false
            referencedRelation: "repairs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_repair_by_token: { Args: { p_token: string }; Returns: Json }
      get_team_owner_id: { Args: { _member_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _member_id: string; _owner_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "employee"
        | "platform_admin"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "employee",
        "platform_admin",
      ],
    },
  },
} as const
