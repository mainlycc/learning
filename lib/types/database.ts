export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'super_admin' | 'admin' | 'user'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'super_admin' | 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: 'super_admin' | 'admin' | 'user'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          id: string
          title: string
          description: string | null
          duration_minutes: number
          file_path: string
          file_type: 'PDF' | 'PPTX'
          slides_count: number
          created_by: string
          created_at: string
          updated_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          duration_minutes: number
          file_path: string
          file_type: 'PDF' | 'PPTX'
          slides_count: number
          created_by: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          duration_minutes?: number
          file_path?: string
          file_type?: 'PDF' | 'PPTX'
          slides_count?: number
          created_by?: string
          created_at?: string
          updated_at?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      training_slides: {
        Row: {
          id: string
          training_id: string
          slide_number: number
          image_url: string
          min_time_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          training_id: string
          slide_number: number
          image_url: string
          min_time_seconds: number
          created_at?: string
        }
        Update: {
          id?: string
          training_id?: string
          slide_number?: number
          image_url?: string
          min_time_seconds?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_slides_training_id_fkey"
            columns: ["training_id"]
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          }
        ]
      }
      tests: {
        Row: {
          id: string
          training_id: string
          title: string
          pass_threshold: number
          time_limit_minutes: number | null
          max_attempts: number | null
          questions_count: number
          randomize_questions: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          training_id: string
          title: string
          pass_threshold: number
          time_limit_minutes?: number | null
          max_attempts?: number | null
          questions_count: number
          randomize_questions?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          training_id?: string
          title?: string
          pass_threshold?: number
          time_limit_minutes?: number | null
          max_attempts?: number | null
          questions_count?: number
          randomize_questions?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tests_training_id_fkey"
            columns: ["training_id"]
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          }
        ]
      }
      test_questions: {
        Row: {
          id: string
          test_id: string
          question_type: 'single' | 'multiple' | 'true_false' | 'open' | 'matching' | 'drag_drop' | 'fill_gaps' | 'sorting'
          question_text: string
          points: number
          order_number: number
        }
        Insert: {
          id?: string
          test_id: string
          question_type: 'single' | 'multiple' | 'true_false' | 'open' | 'matching' | 'drag_drop' | 'fill_gaps' | 'sorting'
          question_text: string
          points: number
          order_number: number
        }
        Update: {
          id?: string
          test_id?: string
          question_type?: 'single' | 'multiple' | 'true_false' | 'open' | 'matching' | 'drag_drop' | 'fill_gaps' | 'sorting'
          question_text?: string
          points: number
          order_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          }
        ]
      }
      test_question_options: {
        Row: {
          id: string
          question_id: string
          option_text: string
          is_correct: boolean
          order_number: number
        }
        Insert: {
          id?: string
          question_id: string
          option_text: string
          is_correct: boolean
          order_number: number
        }
        Update: {
          id?: string
          question_id?: string
          option_text?: string
          is_correct?: boolean
          order_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_question_options_question_id_fkey"
            columns: ["question_id"]
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          }
        ]
      }
      user_training_progress: {
        Row: {
          id: string
          user_id: string
          training_id: string
          current_slide: number
          total_time_seconds: number
          completed_at: string | null
          status: 'in_progress' | 'completed' | 'paused'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          training_id: string
          current_slide: number
          total_time_seconds?: number
          completed_at?: string | null
          status?: 'in_progress' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          training_id?: string
          current_slide?: number
          total_time_seconds?: number
          completed_at?: string | null
          status?: 'in_progress' | 'completed' | 'paused'
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_training_progress_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_training_progress_training_id_fkey"
            columns: ["training_id"]
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          }
        ]
      }
      user_slide_activity: {
        Row: {
          id: string
          progress_id: string
          slide_id: string
          time_spent_seconds: number
          interactions_count: number
          last_activity_at: string
        }
        Insert: {
          id?: string
          progress_id: string
          slide_id: string
          time_spent_seconds: number
          interactions_count: number
          last_activity_at: string
        }
        Update: {
          id?: string
          progress_id?: string
          slide_id?: string
          time_spent_seconds?: number
          interactions_count?: number
          last_activity_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_slide_activity_progress_id_fkey"
            columns: ["progress_id"]
            referencedRelation: "user_training_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_slide_activity_slide_id_fkey"
            columns: ["slide_id"]
            referencedRelation: "training_slides"
            referencedColumns: ["id"]
          }
        ]
      }
      user_test_attempts: {
        Row: {
          id: string
          user_id: string
          test_id: string
          started_at: string
          completed_at: string | null
          score: number
          passed: boolean
          answers_data: Json
        }
        Insert: {
          id?: string
          user_id: string
          test_id: string
          started_at: string
          completed_at?: string | null
          score?: number
          passed?: boolean
          answers_data: Json
        }
        Update: {
          id?: string
          user_id?: string
          test_id?: string
          started_at?: string
          completed_at?: string | null
          score?: number
          passed?: boolean
          answers_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "user_test_attempts_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_test_attempts_test_id_fkey"
            columns: ["test_id"]
            referencedRelation: "tests"
            referencedColumns: ["id"]
          }
        ]
      }
      access_policies: {
        Row: {
          id: string
          training_id: string
          policy_type: 'full' | 'preview' | 'time_limited'
          time_limit_days: number | null
        }
        Insert: {
          id?: string
          training_id: string
          policy_type: 'full' | 'preview' | 'time_limited'
          time_limit_days?: number | null
        }
        Update: {
          id?: string
          training_id?: string
          policy_type?: 'full' | 'preview' | 'time_limited'
          time_limit_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "access_policies_training_id_fkey"
            columns: ["training_id"]
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          }
        ]
      }
      training_users: {
        Row: {
          id: string
          training_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          training_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          training_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_users_training_id_fkey"
            columns: ["training_id"]
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_users_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string
          action_type: string
          resource_type: string
          resource_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action_type: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action_type?: string
          resource_type?: string
          resource_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          message: string
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          message: string
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          message?: string
          read?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      monthly_reports: {
        Row: {
          id: string
          year: number
          month: number
          generated_by: string
          generated_at: string
          data: Json
          file_path: string | null
        }
        Insert: {
          id?: string
          year: number
          month: number
          generated_by: string
          generated_at?: string
          data: Json
          file_path?: string | null
        }
        Update: {
          id?: string
          year?: number
          month?: number
          generated_by?: string
          generated_at?: string
          data?: Json
          file_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_reports_generated_by_fkey"
            columns: ["generated_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
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
