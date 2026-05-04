-- Create universities table
CREATE TABLE public.universities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create enum types for courses
CREATE TYPE public.degree_level AS ENUM ('I', 'II', 'JEDNOLITE', 'PG');
CREATE TYPE public.study_mode AS ENUM ('STACJONARNE', 'NIESTACJONARNE');
CREATE TYPE public.literature_type AS ENUM ('BASIC', 'SUPPLEMENTARY');
CREATE TYPE public.module_type AS ENUM ('LECTURE', 'EXERCISE', 'SEMINAR');
CREATE TYPE public.attendance_type AS ENUM ('LECTURE', 'EXERCISE');

-- Alter courses table to add new fields
ALTER TABLE public.courses
ADD COLUMN university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
ADD COLUMN degree_level degree_level,
ADD COLUMN study_mode study_mode,
ADD COLUMN academic_year TEXT,
ADD COLUMN semester TEXT,
ADD COLUMN ects INTEGER,
ADD COLUMN language TEXT DEFAULT 'PL',
ADD COLUMN owner_email TEXT DEFAULT 'incertus001@gmail.com',
ADD COLUMN is_published BOOLEAN DEFAULT false;

-- Create syllabus table
CREATE TABLE public.syllabus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  content_rich_text TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_edited_by TEXT
);

-- Create literature_items table
CREATE TABLE public.literature_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  type literature_type NOT NULL,
  title TEXT NOT NULL,
  authors TEXT,
  year INTEGER,
  publisher TEXT,
  isbn TEXT,
  doi TEXT,
  url TEXT,
  source_meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Update course_materials to support modules with chapters
ALTER TABLE public.course_materials
ADD COLUMN type module_type,
ADD COLUMN chapters JSONB;

-- Create presentations table
CREATE TABLE public.presentations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_key TEXT NOT NULL,
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  index_number TEXT NOT NULL,
  university_id UUID REFERENCES public.universities(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(course_id, index_number)
);

-- Create attendance_sessions table
CREATE TABLE public.attendance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type attendance_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance_records table
CREATE TABLE public.attendance_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attendance_session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  present BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attendance_session_id, student_id)
);

-- Create grade_items table
CREATE TABLE public.grade_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  max_points INTEGER NOT NULL,
  weight DECIMAL(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grade_records table
CREATE TABLE public.grade_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grade_item_id UUID NOT NULL REFERENCES public.grade_items(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  points DECIMAL(5,2),
  grade TEXT,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(grade_item_id, student_id)
);

-- Create anonymous_feedback table
CREATE TABLE public.anonymous_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_query_log table
CREATE TABLE public.student_query_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  index_number TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  ts TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.literature_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grade_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_query_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for universities
CREATE POLICY "Universities are viewable by everyone"
ON public.universities FOR SELECT USING (true);

CREATE POLICY "Admins can insert universities"
ON public.universities FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update universities"
ON public.universities FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete universities"
ON public.universities FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for syllabus
CREATE POLICY "Syllabus is viewable by everyone"
ON public.syllabus FOR SELECT USING (true);

CREATE POLICY "Admins can insert syllabus"
ON public.syllabus FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update syllabus"
ON public.syllabus FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete syllabus"
ON public.syllabus FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for literature_items
CREATE POLICY "Literature is viewable by everyone"
ON public.literature_items FOR SELECT USING (true);

CREATE POLICY "Admins can insert literature"
ON public.literature_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update literature"
ON public.literature_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete literature"
ON public.literature_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for presentations
CREATE POLICY "Presentations are viewable by everyone"
ON public.presentations FOR SELECT USING (true);

CREATE POLICY "Admins can insert presentations"
ON public.presentations FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update presentations"
ON public.presentations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete presentations"
ON public.presentations FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for students
CREATE POLICY "Students are viewable by everyone"
ON public.students FOR SELECT USING (true);

CREATE POLICY "Admins can insert students"
ON public.students FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update students"
ON public.students FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete students"
ON public.students FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for attendance_sessions
CREATE POLICY "Attendance sessions are viewable by everyone"
ON public.attendance_sessions FOR SELECT USING (true);

CREATE POLICY "Admins can insert attendance sessions"
ON public.attendance_sessions FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update attendance sessions"
ON public.attendance_sessions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete attendance sessions"
ON public.attendance_sessions FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for attendance_records
CREATE POLICY "Attendance records are viewable by everyone"
ON public.attendance_records FOR SELECT USING (true);

CREATE POLICY "Admins can insert attendance records"
ON public.attendance_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update attendance records"
ON public.attendance_records FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete attendance records"
ON public.attendance_records FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for grade_items
CREATE POLICY "Grade items are viewable by everyone"
ON public.grade_items FOR SELECT USING (true);

CREATE POLICY "Admins can insert grade items"
ON public.grade_items FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update grade items"
ON public.grade_items FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete grade items"
ON public.grade_items FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for grade_records
CREATE POLICY "Grade records are viewable by everyone"
ON public.grade_records FOR SELECT USING (true);

CREATE POLICY "Admins can insert grade records"
ON public.grade_records FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update grade records"
ON public.grade_records FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete grade records"
ON public.grade_records FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for anonymous_feedback
CREATE POLICY "Feedback is viewable by admins"
ON public.anonymous_feedback FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert feedback"
ON public.anonymous_feedback FOR INSERT WITH CHECK (true);

-- RLS Policies for student_query_log
CREATE POLICY "Query logs are viewable by admins"
ON public.student_query_log FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can insert query logs"
ON public.student_query_log FOR INSERT WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_universities_updated_at
BEFORE UPDATE ON public.universities
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_literature_items_updated_at
BEFORE UPDATE ON public.literature_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_courses_university_id ON public.courses(university_id);
CREATE INDEX idx_courses_published ON public.courses(is_published);
CREATE INDEX idx_literature_course_id ON public.literature_items(course_id);
CREATE INDEX idx_students_course_id ON public.students(course_id);
CREATE INDEX idx_students_index_number ON public.students(course_id, index_number);
CREATE INDEX idx_attendance_course_id ON public.attendance_sessions(course_id);
CREATE INDEX idx_grade_items_course_id ON public.grade_items(course_id);
CREATE INDEX idx_feedback_course_id ON public.anonymous_feedback(course_id);