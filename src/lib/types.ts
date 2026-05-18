export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Priority = "low" | "medium" | "high";

export type ClassItem = {
  id: string;
  user_id: string;
  title: string;
  weekday: Weekday;
  period: number;
  room: string | null;
  teacher: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type Assignment = {
  id: string;
  user_id: string;
  class_id: string | null;
  title: string;
  due_date: string;
  priority: Priority;
  is_completed: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
  classes?: Pick<ClassItem, "id" | "title"> | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  university: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string | null;
          university?: string | null;
        };
        Update: {
          display_name?: string | null;
          university?: string | null;
        };
        Relationships: [];
      };
      classes: {
        Row: ClassItem;
        Insert: {
          user_id: string;
          title: string;
          weekday: Weekday;
          period: number;
          room?: string | null;
          teacher?: string | null;
          memo?: string | null;
        };
        Update: Partial<Omit<ClassItem, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      assignments: {
        Row: Assignment;
        Insert: {
          user_id: string;
          class_id?: string | null;
          title: string;
          due_date: string;
          priority: Priority;
          is_completed?: boolean;
          memo?: string | null;
        };
        Update: Partial<Omit<Assignment, "id" | "user_id" | "created_at" | "updated_at" | "classes">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
