// Auto-generated from data-model.md
// Run `supabase gen types typescript --local > src/types/supabase.ts` after `supabase start`

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripe_price_id: string | null
          plan: Database['public']['Enums']['plan_tier']
          plan_expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan?: Database['public']['Enums']['plan_tier']
          plan_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripe_price_id?: string | null
          plan?: Database['public']['Enums']['plan_tier']
          plan_expires_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          user_id: string
          status: Database['public']['Enums']['receipt_status']
          storage_path: string
          file_name: string
          file_size: number
          file_mime_type: string
          vendor_name: string | null
          transaction_date: string | null
          total_amount: number | null
          subtotal_amount: number | null
          gst_hst_amount: number | null
          pst_amount: number | null
          payment_method: string | null
          card_last4: string | null
          category: string | null
          expense_type: Database['public']['Enums']['expense_type'] | null
          location: string | null
          receipt_number: string | null
          notes: string | null
          extraction_error: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          status?: Database['public']['Enums']['receipt_status'] | null
          storage_path: string
          file_name: string
          file_size: number
          file_mime_type: string
          vendor_name?: string | null
          transaction_date?: string | null
          total_amount?: number | null
          subtotal_amount?: number | null
          gst_hst_amount?: number | null
          pst_amount?: number | null
          payment_method?: string | null
          card_last4?: string | null
          category?: string | null
          expense_type?: Database['public']['Enums']['expense_type'] | null
          location?: string | null
          receipt_number?: string | null
          notes?: string | null
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          status?: Database['public']['Enums']['receipt_status'] | null
          storage_path?: string
          file_name?: string
          file_size?: number
          file_mime_type?: string
          vendor_name?: string | null
          transaction_date?: string | null
          total_amount?: number | null
          subtotal_amount?: number | null
          gst_hst_amount?: number | null
          pst_amount?: number | null
          payment_method?: string | null
          card_last4?: string | null
          category?: string | null
          expense_type?: Database['public']['Enums']['expense_type'] | null
          location?: string | null
          receipt_number?: string | null
          notes?: string | null
          extraction_error?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'receipts_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      bank_statements: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_size: number
          file_mime_type: string
          storage_path: string
          card_last4: string | null
          status: Database['public']['Enums']['statement_status']
          transaction_count: number
          import_error: string | null
          csv_column_mapping: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_size: number
          file_mime_type: string
          storage_path: string
          card_last4?: string | null
          status?: Database['public']['Enums']['statement_status'] | null
          transaction_count?: number
          import_error?: string | null
          csv_column_mapping?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_size?: number
          file_mime_type?: string
          storage_path?: string
          card_last4?: string | null
          status?: Database['public']['Enums']['statement_status'] | null
          transaction_count?: number
          import_error?: string | null
          csv_column_mapping?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_statements_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      bank_transactions: {
        Row: {
          id: string
          user_id: string
          statement_id: string
          transaction_date: string
          description: string
          amount: number
          category: string | null
          notes: string | null
          card_last4: string | null
          is_duplicate: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          statement_id: string
          transaction_date: string
          description: string
          amount: number
          category?: string | null
          notes?: string | null
          card_last4?: string | null
          is_duplicate?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          statement_id?: string
          transaction_date?: string
          description?: string
          amount?: number
          category?: string | null
          notes?: string | null
          card_last4?: string | null
          is_duplicate?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bank_transactions_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'bank_transactions_statement_id_fkey'
            columns: ['statement_id']
            isOneToOne: false
            referencedRelation: 'bank_statements'
            referencedColumns: ['id']
          },
        ]
      }
      reconciliation_matches: {
        Row: {
          id: string
          user_id: string
          bank_transaction_id: string
          receipt_id: string
          match_type: Database['public']['Enums']['match_type']
          confidence_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          bank_transaction_id: string
          receipt_id: string
          match_type: Database['public']['Enums']['match_type']
          confidence_score: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          bank_transaction_id?: string
          receipt_id?: string
          match_type?: Database['public']['Enums']['match_type'] | null
          confidence_score?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'reconciliation_matches_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reconciliation_matches_bank_transaction_id_fkey'
            columns: ['bank_transaction_id']
            isOneToOne: true
            referencedRelation: 'bank_transactions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reconciliation_matches_receipt_id_fkey'
            columns: ['receipt_id']
            isOneToOne: true
            referencedRelation: 'receipts'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      receipt_status: 'pending' | 'processing' | 'complete' | 'failed'
      statement_status: 'pending' | 'awaiting_mapping' | 'processing' | 'complete' | 'failed'
      expense_type: 'business' | 'personal'
      match_type: 'auto' | 'manual'
      plan_tier: 'free' | 'solo' | 'pro'
    }
  }
}
