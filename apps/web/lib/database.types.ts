export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          updated_at?: string
          // Add other fields as needed
        }
        Insert: {
          id: string
          updated_at?: string
        }
        Update: {
          id?: string
          updated_at?: string
        }
      }
    }
    Views: {
      // Define views if any
    }
    Functions: {
      // Define functions if any
    }
  }
}