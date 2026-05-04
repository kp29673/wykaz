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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anonymous_feedback: {
        Row: {
          course_id: string
          created_at: string
          id: string
          ip_hash: string | null
          message: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          message: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          ip_hash?: string | null
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "anonymous_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          comment: string | null
          email_verified: boolean
          file_name: string
          file_size: number | null
          file_url: string
          grade: number | null
          graded_at: string | null
          graded_by: string | null
          id: string
          is_late: boolean
          points: number | null
          student_email: string | null
          student_id: string
          submitted_at: string
          token_expires_at: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          assignment_id: string
          comment?: string | null
          email_verified?: boolean
          file_name: string
          file_size?: number | null
          file_url: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean
          points?: number | null
          student_email?: string | null
          student_id: string
          submitted_at?: string
          token_expires_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          assignment_id?: string
          comment?: string | null
          email_verified?: boolean
          file_name?: string
          file_size?: number | null
          file_url?: string
          grade?: number | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          is_late?: boolean
          points?: number | null
          student_email?: string | null
          student_id?: string
          submitted_at?: string
          token_expires_at?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          deadline: string
          description: string | null
          id: string
          max_points: number
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          deadline: string
          description?: string | null
          id?: string
          max_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          deadline?: string
          description?: string | null
          id?: string
          max_points?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_session_id: string
          id: string
          present: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          attendance_session_id: string
          id?: string
          present?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          attendance_session_id?: string
          id?: string
          present?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_attendance_session_id_fkey"
            columns: ["attendance_session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          course_id: string
          created_at: string
          date: string
          id: string
          title: string
          type: Database["public"]["Enums"]["attendance_type"]
        }
        Insert: {
          course_id: string
          created_at?: string
          date: string
          id?: string
          title: string
          type: Database["public"]["Enums"]["attendance_type"]
        }
        Update: {
          course_id?: string
          created_at?: string
          date?: string
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["attendance_type"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_materials: {
        Row: {
          chapters: Json | null
          course_id: string
          created_at: string
          description: string | null
          file_type: string | null
          file_url: string | null
          id: string
          order_index: number | null
          title: string
          type: Database["public"]["Enums"]["module_type"] | null
          updated_at: string
        }
        Insert: {
          chapters?: Json | null
          course_id: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          title: string
          type?: Database["public"]["Enums"]["module_type"] | null
          updated_at?: string
        }
        Update: {
          chapters?: Json | null
          course_id?: string
          created_at?: string
          description?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          order_index?: number | null
          title?: string
          type?: Database["public"]["Enums"]["module_type"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          academic_year: string | null
          code: string
          created_at: string
          degree_level: Database["public"]["Enums"]["degree_level"] | null
          description: string | null
          ects: number | null
          field_of_study: string
          id: string
          is_published: boolean | null
          language: string | null
          name: string
          owner_email: string | null
          semester: string | null
          study_mode: Database["public"]["Enums"]["study_mode"] | null
          university_id: string | null
          updated_at: string
        }
        Insert: {
          academic_year?: string | null
          code: string
          created_at?: string
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          description?: string | null
          ects?: number | null
          field_of_study: string
          id?: string
          is_published?: boolean | null
          language?: string | null
          name: string
          owner_email?: string | null
          semester?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          university_id?: string | null
          updated_at?: string
        }
        Update: {
          academic_year?: string | null
          code?: string
          created_at?: string
          degree_level?: Database["public"]["Enums"]["degree_level"] | null
          description?: string | null
          ects?: number | null
          field_of_study?: string
          id?: string
          is_published?: boolean | null
          language?: string | null
          name?: string
          owner_email?: string | null
          semester?: string | null
          study_mode?: Database["public"]["Enums"]["study_mode"] | null
          university_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      cron_job_runs: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          id: string
          job_name: string
          journals_processed: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name: string
          journals_processed?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          id?: string
          job_name?: string
          journals_processed?: number | null
          status?: string
        }
        Relationships: []
      }
      grade_items: {
        Row: {
          course_id: string
          created_at: string
          id: string
          max_points: number
          name: string
          weight: number
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          max_points: number
          name: string
          weight: number
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          max_points?: number
          name?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_records: {
        Row: {
          grade: string | null
          grade_item_id: string
          id: string
          notes: string | null
          points: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          grade?: string | null
          grade_item_id: string
          id?: string
          notes?: string | null
          points?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          grade?: string | null
          grade_item_id?: string
          id?: string
          notes?: string | null
          points?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_records_grade_item_id_fkey"
            columns: ["grade_item_id"]
            isOneToOne: false
            referencedRelation: "grade_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          course_id: string
          created_at: string
          grade: string
          id: string
          max_percentage: number
          min_percentage: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          grade: string
          id?: string
          max_percentage: number
          min_percentage: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          grade?: string
          id?: string
          max_percentage?: number
          min_percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_rankings: {
        Row: {
          created_at: string | null
          data_source: string | null
          discipline_codes: string[] | null
          disciplines: string[] | null
          id: string
          journal_id: string
          points: number
          published_date: string
          source_file: string | null
          updated_at: string | null
          wykaz_id: string | null
          wykaz_identifier: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          data_source?: string | null
          discipline_codes?: string[] | null
          disciplines?: string[] | null
          id?: string
          journal_id: string
          points?: number
          published_date: string
          source_file?: string | null
          updated_at?: string | null
          wykaz_id?: string | null
          wykaz_identifier?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          data_source?: string | null
          discipline_codes?: string[] | null
          disciplines?: string[] | null
          id?: string
          journal_id?: string
          points?: number
          published_date?: string
          source_file?: string | null
          updated_at?: string | null
          wykaz_id?: string | null
          wykaz_identifier?: string | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_journal"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "current_wykaz_view"
            referencedColumns: ["journal_id"]
          },
          {
            foreignKeyName: "fk_journal"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals_master"
            referencedColumns: ["journal_id"]
          },
          {
            foreignKeyName: "journal_rankings_wykaz_id_fkey"
            columns: ["wykaz_id"]
            isOneToOne: false
            referencedRelation: "wykazy_metadata"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          apc_amount: number | null
          apc_currency: string | null
          avg_citations_per_paper: number | null
          avg_time_to_publish_days: number | null
          cited_by_count: number | null
          composite_score: number | null
          country: string | null
          country_code: string | null
          created_at: string | null
          data_provenance: Json | null
          data_source: string | null
          discipline_codes: string[] | null
          disciplines: string[] | null
          embargo_months: number | null
          enrichment_method: string | null
          h_index: number | null
          host_organization: string | null
          id: string
          if_proxy: number | null
          in_erih_plus: boolean | null
          in_road: boolean | null
          is_oa: boolean | null
          issn_electronic: string | null
          issn_electronic_2: string | null
          issn_l: string | null
          issn_print: string | null
          issn_print_2: string | null
          journal_id: string | null
          journal_url: string | null
          last_enriched_at: string | null
          license: string | null
          medium: string | null
          oa_rate: number | null
          oa_status: string | null
          openalex_id: string | null
          openalex_updated_at: string | null
          papers_5y: number | null
          points: number
          postprint_allowed: boolean | null
          preprint_allowed: boolean | null
          preservation_status: boolean | null
          published_date: string
          publisher: string | null
          publisher_pdf_allowed: boolean | null
          source_file: string | null
          sources_metadata: Json | null
          title: string
          title_2: string | null
          updated_at: string | null
          works_count: number | null
          year: number
        }
        Insert: {
          apc_amount?: number | null
          apc_currency?: string | null
          avg_citations_per_paper?: number | null
          avg_time_to_publish_days?: number | null
          cited_by_count?: number | null
          composite_score?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          data_provenance?: Json | null
          data_source?: string | null
          discipline_codes?: string[] | null
          disciplines?: string[] | null
          embargo_months?: number | null
          enrichment_method?: string | null
          h_index?: number | null
          host_organization?: string | null
          id?: string
          if_proxy?: number | null
          in_erih_plus?: boolean | null
          in_road?: boolean | null
          is_oa?: boolean | null
          issn_electronic?: string | null
          issn_electronic_2?: string | null
          issn_l?: string | null
          issn_print?: string | null
          issn_print_2?: string | null
          journal_id?: string | null
          journal_url?: string | null
          last_enriched_at?: string | null
          license?: string | null
          medium?: string | null
          oa_rate?: number | null
          oa_status?: string | null
          openalex_id?: string | null
          openalex_updated_at?: string | null
          papers_5y?: number | null
          points: number
          postprint_allowed?: boolean | null
          preprint_allowed?: boolean | null
          preservation_status?: boolean | null
          published_date: string
          publisher?: string | null
          publisher_pdf_allowed?: boolean | null
          source_file?: string | null
          sources_metadata?: Json | null
          title: string
          title_2?: string | null
          updated_at?: string | null
          works_count?: number | null
          year: number
        }
        Update: {
          apc_amount?: number | null
          apc_currency?: string | null
          avg_citations_per_paper?: number | null
          avg_time_to_publish_days?: number | null
          cited_by_count?: number | null
          composite_score?: number | null
          country?: string | null
          country_code?: string | null
          created_at?: string | null
          data_provenance?: Json | null
          data_source?: string | null
          discipline_codes?: string[] | null
          disciplines?: string[] | null
          embargo_months?: number | null
          enrichment_method?: string | null
          h_index?: number | null
          host_organization?: string | null
          id?: string
          if_proxy?: number | null
          in_erih_plus?: boolean | null
          in_road?: boolean | null
          is_oa?: boolean | null
          issn_electronic?: string | null
          issn_electronic_2?: string | null
          issn_l?: string | null
          issn_print?: string | null
          issn_print_2?: string | null
          journal_id?: string | null
          journal_url?: string | null
          last_enriched_at?: string | null
          license?: string | null
          medium?: string | null
          oa_rate?: number | null
          oa_status?: string | null
          openalex_id?: string | null
          openalex_updated_at?: string | null
          papers_5y?: number | null
          points?: number
          postprint_allowed?: boolean | null
          preprint_allowed?: boolean | null
          preservation_status?: boolean | null
          published_date?: string
          publisher?: string | null
          publisher_pdf_allowed?: boolean | null
          source_file?: string | null
          sources_metadata?: Json | null
          title?: string
          title_2?: string | null
          updated_at?: string | null
          works_count?: number | null
          year?: number
        }
        Relationships: []
      }
      journals_master: {
        Row: {
          abbreviated_title: string | null
          alternate_titles: string[] | null
          apc_amount: number | null
          apc_currency: string | null
          apc_prices: Json | null
          apc_usd: number | null
          avg_citations_per_paper: number | null
          avg_time_to_publish_days: number | null
          cited_by_count: number | null
          composite_score: number | null
          country: string | null
          country_code: string | null
          counts_by_year: Json | null
          created_at: string | null
          crossref_affiliations: Json | null
          crossref_backfile_dois: number | null
          crossref_breakdowns: Json | null
          crossref_coverage_depth: string | null
          crossref_coverage_type: string | null
          crossref_current_dois: number | null
          crossref_issn_type: string | null
          crossref_languages: string[] | null
          crossref_member_id: string | null
          crossref_publisher: string | null
          crossref_publisher_location: string | null
          crossref_subjects: Json | null
          crossref_total_dois: number | null
          crossref_updated_at: string | null
          data_provenance: Json | null
          doaj_aims_scope: string | null
          doaj_author_instructions_url: string | null
          doaj_editorial_board_url: string | null
          doaj_keywords: string[] | null
          doaj_languages: string[] | null
          doaj_plagiarism_check: boolean | null
          doaj_publication_time_weeks: number | null
          doaj_review_process: string | null
          doaj_seal: boolean | null
          doaj_updated_at: string | null
          embargo_months: number | null
          enrichment_method: string | null
          h_index: number | null
          homepage_url: string | null
          host_organization: string | null
          host_organization_lineage: string[] | null
          i10_index: number | null
          id: string
          if_proxy: number | null
          in_erih_plus: boolean | null
          in_road: boolean | null
          is_core: boolean | null
          is_in_doaj: boolean | null
          is_oa: boolean | null
          issn_electronic: string | null
          issn_electronic_2: string | null
          issn_l: string | null
          issn_print: string | null
          issn_print_2: string | null
          journal_id: string
          journal_url: string | null
          last_enriched_at: string | null
          license: string | null
          medium: string | null
          oa_rate: number | null
          oa_status: string | null
          openalex_created_date: string | null
          openalex_id: string | null
          openalex_updated_at: string | null
          openalex_updated_date: string | null
          papers_5y: number | null
          postprint_allowed: boolean | null
          preprint_allowed: boolean | null
          preservation_status: boolean | null
          publisher: string | null
          publisher_pdf_allowed: boolean | null
          societies: Json | null
          source_type: string | null
          sources_metadata: Json | null
          title: string
          title_2: string | null
          updated_at: string | null
          wikidata_id: string | null
          wikipedia_checked_at: string | null
          wikipedia_lang: string | null
          wikipedia_title: string | null
          wikipedia_url: string | null
          works_api_url: string | null
          works_count: number | null
        }
        Insert: {
          abbreviated_title?: string | null
          alternate_titles?: string[] | null
          apc_amount?: number | null
          apc_currency?: string | null
          apc_prices?: Json | null
          apc_usd?: number | null
          avg_citations_per_paper?: number | null
          avg_time_to_publish_days?: number | null
          cited_by_count?: number | null
          composite_score?: number | null
          country?: string | null
          country_code?: string | null
          counts_by_year?: Json | null
          created_at?: string | null
          crossref_affiliations?: Json | null
          crossref_backfile_dois?: number | null
          crossref_breakdowns?: Json | null
          crossref_coverage_depth?: string | null
          crossref_coverage_type?: string | null
          crossref_current_dois?: number | null
          crossref_issn_type?: string | null
          crossref_languages?: string[] | null
          crossref_member_id?: string | null
          crossref_publisher?: string | null
          crossref_publisher_location?: string | null
          crossref_subjects?: Json | null
          crossref_total_dois?: number | null
          crossref_updated_at?: string | null
          data_provenance?: Json | null
          doaj_aims_scope?: string | null
          doaj_author_instructions_url?: string | null
          doaj_editorial_board_url?: string | null
          doaj_keywords?: string[] | null
          doaj_languages?: string[] | null
          doaj_plagiarism_check?: boolean | null
          doaj_publication_time_weeks?: number | null
          doaj_review_process?: string | null
          doaj_seal?: boolean | null
          doaj_updated_at?: string | null
          embargo_months?: number | null
          enrichment_method?: string | null
          h_index?: number | null
          homepage_url?: string | null
          host_organization?: string | null
          host_organization_lineage?: string[] | null
          i10_index?: number | null
          id?: string
          if_proxy?: number | null
          in_erih_plus?: boolean | null
          in_road?: boolean | null
          is_core?: boolean | null
          is_in_doaj?: boolean | null
          is_oa?: boolean | null
          issn_electronic?: string | null
          issn_electronic_2?: string | null
          issn_l?: string | null
          issn_print?: string | null
          issn_print_2?: string | null
          journal_id: string
          journal_url?: string | null
          last_enriched_at?: string | null
          license?: string | null
          medium?: string | null
          oa_rate?: number | null
          oa_status?: string | null
          openalex_created_date?: string | null
          openalex_id?: string | null
          openalex_updated_at?: string | null
          openalex_updated_date?: string | null
          papers_5y?: number | null
          postprint_allowed?: boolean | null
          preprint_allowed?: boolean | null
          preservation_status?: boolean | null
          publisher?: string | null
          publisher_pdf_allowed?: boolean | null
          societies?: Json | null
          source_type?: string | null
          sources_metadata?: Json | null
          title: string
          title_2?: string | null
          updated_at?: string | null
          wikidata_id?: string | null
          wikipedia_checked_at?: string | null
          wikipedia_lang?: string | null
          wikipedia_title?: string | null
          wikipedia_url?: string | null
          works_api_url?: string | null
          works_count?: number | null
        }
        Update: {
          abbreviated_title?: string | null
          alternate_titles?: string[] | null
          apc_amount?: number | null
          apc_currency?: string | null
          apc_prices?: Json | null
          apc_usd?: number | null
          avg_citations_per_paper?: number | null
          avg_time_to_publish_days?: number | null
          cited_by_count?: number | null
          composite_score?: number | null
          country?: string | null
          country_code?: string | null
          counts_by_year?: Json | null
          created_at?: string | null
          crossref_affiliations?: Json | null
          crossref_backfile_dois?: number | null
          crossref_breakdowns?: Json | null
          crossref_coverage_depth?: string | null
          crossref_coverage_type?: string | null
          crossref_current_dois?: number | null
          crossref_issn_type?: string | null
          crossref_languages?: string[] | null
          crossref_member_id?: string | null
          crossref_publisher?: string | null
          crossref_publisher_location?: string | null
          crossref_subjects?: Json | null
          crossref_total_dois?: number | null
          crossref_updated_at?: string | null
          data_provenance?: Json | null
          doaj_aims_scope?: string | null
          doaj_author_instructions_url?: string | null
          doaj_editorial_board_url?: string | null
          doaj_keywords?: string[] | null
          doaj_languages?: string[] | null
          doaj_plagiarism_check?: boolean | null
          doaj_publication_time_weeks?: number | null
          doaj_review_process?: string | null
          doaj_seal?: boolean | null
          doaj_updated_at?: string | null
          embargo_months?: number | null
          enrichment_method?: string | null
          h_index?: number | null
          homepage_url?: string | null
          host_organization?: string | null
          host_organization_lineage?: string[] | null
          i10_index?: number | null
          id?: string
          if_proxy?: number | null
          in_erih_plus?: boolean | null
          in_road?: boolean | null
          is_core?: boolean | null
          is_in_doaj?: boolean | null
          is_oa?: boolean | null
          issn_electronic?: string | null
          issn_electronic_2?: string | null
          issn_l?: string | null
          issn_print?: string | null
          issn_print_2?: string | null
          journal_id?: string
          journal_url?: string | null
          last_enriched_at?: string | null
          license?: string | null
          medium?: string | null
          oa_rate?: number | null
          oa_status?: string | null
          openalex_created_date?: string | null
          openalex_id?: string | null
          openalex_updated_at?: string | null
          openalex_updated_date?: string | null
          papers_5y?: number | null
          postprint_allowed?: boolean | null
          preprint_allowed?: boolean | null
          preservation_status?: boolean | null
          publisher?: string | null
          publisher_pdf_allowed?: boolean | null
          societies?: Json | null
          source_type?: string | null
          sources_metadata?: Json | null
          title?: string
          title_2?: string | null
          updated_at?: string | null
          wikidata_id?: string | null
          wikipedia_checked_at?: string | null
          wikipedia_lang?: string | null
          wikipedia_title?: string | null
          wikipedia_url?: string | null
          works_api_url?: string | null
          works_count?: number | null
        }
        Relationships: []
      }
      literature_items: {
        Row: {
          authors: string | null
          course_id: string
          cover_url: string | null
          created_at: string
          doi: string | null
          id: string
          isbn: string | null
          item_category: string | null
          legal_act_data: Json | null
          publisher: string | null
          source_meta: Json | null
          title: string
          type: Database["public"]["Enums"]["literature_type"]
          updated_at: string
          url: string | null
          year: number | null
        }
        Insert: {
          authors?: string | null
          course_id: string
          cover_url?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          isbn?: string | null
          item_category?: string | null
          legal_act_data?: Json | null
          publisher?: string | null
          source_meta?: Json | null
          title: string
          type: Database["public"]["Enums"]["literature_type"]
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Update: {
          authors?: string | null
          course_id?: string
          cover_url?: string | null
          created_at?: string
          doi?: string | null
          id?: string
          isbn?: string | null
          item_category?: string | null
          legal_act_data?: Json | null
          publisher?: string | null
          source_meta?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["literature_type"]
          updated_at?: string
          url?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "literature_items_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      openalex_enrichment_log: {
        Row: {
          created_at: string | null
          error_message: string | null
          execution_time_ms: number | null
          fields_updated: string[] | null
          id: string
          journal_id: string | null
          method: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          fields_updated?: string[] | null
          id?: string
          journal_id?: string | null
          method?: string | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          execution_time_ms?: number | null
          fields_updated?: string[] | null
          id?: string
          journal_id?: string | null
          method?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "openalex_enrichment_log_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals_master"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          course_id: string
          created_at: string
          file_key: string
          id: string
          size: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          file_key: string
          id?: string
          size?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          file_key?: string
          id?: string
          size?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_codes: {
        Row: {
          code: string
          course_id: string
          created_at: string
          id: string
        }
        Insert: {
          code: string
          course_id: string
          created_at?: string
          id?: string
        }
        Update: {
          code?: string
          course_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      student_query_log: {
        Row: {
          course_id: string | null
          id: string
          index_number: string | null
          ip_hash: string | null
          ts: string
          user_agent: string | null
        }
        Insert: {
          course_id?: string | null
          id?: string
          index_number?: string | null
          ip_hash?: string | null
          ts?: string
          user_agent?: string | null
        }
        Update: {
          course_id?: string | null
          id?: string
          index_number?: string | null
          ip_hash?: string | null
          ts?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_query_log_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          course_id: string
          created_at: string
          first_name: string
          id: string
          index_number: string
          last_name: string
          university_id: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          first_name: string
          id?: string
          index_number: string
          last_name: string
          university_id?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          first_name?: string
          id?: string
          index_number?: string
          last_name?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      syllabus: {
        Row: {
          content_rich_text: string | null
          course_id: string
          id: string
          last_edited_by: string | null
          updated_at: string
        }
        Insert: {
          content_rich_text?: string | null
          course_id: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Update: {
          content_rich_text?: string | null
          course_id?: string
          id?: string
          last_edited_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "syllabus_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          id: string
          name: string
          short_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          short_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          short_name?: string | null
          updated_at?: string
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
      wykazy_metadata: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          published_date: string
          source_url: string | null
          valid_from: string
          valid_to: string | null
          wykaz_version: string | null
          year_identifier: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          published_date: string
          source_url?: string | null
          valid_from: string
          valid_to?: string | null
          wykaz_version?: string | null
          year_identifier: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          published_date?: string
          source_url?: string | null
          valid_from?: string
          valid_to?: string | null
          wykaz_version?: string | null
          year_identifier?: string
        }
        Relationships: []
      }
    }
    Views: {
      current_wykaz_view: {
        Row: {
          apc_amount: number | null
          apc_currency: string | null
          avg_citations_per_paper: number | null
          avg_time_to_publish_days: number | null
          cited_by_count: number | null
          composite_score: number | null
          country: string | null
          country_code: string | null
          created_at: string | null
          discipline_codes: string[] | null
          disciplines: string[] | null
          embargo_months: number | null
          enrichment_method: string | null
          h_index: number | null
          host_organization: string | null
          if_proxy: number | null
          in_current_wykaz: boolean | null
          in_erih_plus: boolean | null
          in_road: boolean | null
          is_oa: boolean | null
          issn_electronic: string | null
          issn_electronic_2: string | null
          issn_l: string | null
          issn_print: string | null
          issn_print_2: string | null
          journal_id: string | null
          journal_url: string | null
          last_enriched_at: string | null
          medium: string | null
          oa_rate: number | null
          oa_status: string | null
          openalex_id: string | null
          openalex_updated_at: string | null
          papers_5y: number | null
          points: number | null
          postprint_allowed: boolean | null
          preprint_allowed: boolean | null
          preservation_status: boolean | null
          published_date: string | null
          publisher: string | null
          publisher_pdf_allowed: boolean | null
          ranking_id: string | null
          sources_metadata: Json | null
          title: string | null
          title_2: string | null
          updated_at: string | null
          works_count: number | null
          wykaz_identifier: string | null
          wykaz_valid_from: string | null
          wykaz_valid_to: string | null
          year: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      attendance_type: "LECTURE" | "EXERCISE"
      degree_level: "I" | "II" | "JEDNOLITE" | "PG"
      literature_type: "BASIC" | "SUPPLEMENTARY"
      module_type: "LECTURE" | "EXERCISE" | "SEMINAR"
      study_mode: "STACJONARNE" | "NIESTACJONARNE"
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
      app_role: ["admin", "user"],
      attendance_type: ["LECTURE", "EXERCISE"],
      degree_level: ["I", "II", "JEDNOLITE", "PG"],
      literature_type: ["BASIC", "SUPPLEMENTARY"],
      module_type: ["LECTURE", "EXERCISE", "SEMINAR"],
      study_mode: ["STACJONARNE", "NIESTACJONARNE"],
    },
  },
} as const
