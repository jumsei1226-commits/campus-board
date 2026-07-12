export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Priority = "low" | "medium" | "high";
export type SemesterSystem = "semester" | "quarter";
export type TermType = "semester" | "quarter" | "custom";

export type ClassItem = {
  id: string;
  user_id: string;
  term_id: string | null;
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
  term_id: string | null;
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

export type Term = {
  id: string;
  user_id: string;
  name: string;
  term_type: TermType;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type UserSettings = {
  user_id: string;
  current_term_id: string | null;
  semester_system: SemesterSystem;
  show_saturday: boolean;
  notifications_enabled: boolean;
  notification_time: string;
  created_at: string;
  updated_at: string;
};

export type TimetableTemplate = {
  id: string;
  user_id: string;
  title: string;
  university: string | null;
  faculty: string | null;
  department: string | null;
  grade: string | null;
  term_name: string | null;
  semester_system: SemesterSystem;
  includes_saturday: boolean;
  description: string | null;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
};

export type TimetableTemplateItem = {
  id: string;
  template_id: string;
  title: string;
  weekday: Weekday;
  period: number;
  room: string | null;
  teacher: string | null;
  memo: string | null;
  created_at: string;
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
      terms: {
        Row: Term;
        Insert: {
          user_id: string;
          name: string;
          term_type?: TermType;
          sort_order?: number;
        };
        Update: Partial<Omit<Term, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettings;
        Insert: {
          user_id: string;
          current_term_id?: string | null;
          semester_system?: SemesterSystem;
          show_saturday?: boolean;
          notifications_enabled?: boolean;
          notification_time?: string;
        };
        Update: Partial<Omit<UserSettings, "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      classes: {
        Row: ClassItem;
        Insert: {
          user_id: string;
          term_id?: string | null;
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
          term_id?: string | null;
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
      timetable_templates: {
        Row: TimetableTemplate;
        Insert: {
          user_id: string;
          title: string;
          university?: string | null;
          faculty?: string | null;
          department?: string | null;
          grade?: string | null;
          term_name?: string | null;
          semester_system?: SemesterSystem;
          includes_saturday?: boolean;
          description?: string | null;
          is_shared?: boolean;
        };
        Update: Partial<Omit<TimetableTemplate, "id" | "user_id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      timetable_template_items: {
        Row: TimetableTemplateItem;
        Insert: {
          template_id: string;
          title: string;
          weekday: Weekday;
          period: number;
          room?: string | null;
          teacher?: string | null;
          memo?: string | null;
        };
        Update: Partial<Omit<TimetableTemplateItem, "id" | "template_id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
