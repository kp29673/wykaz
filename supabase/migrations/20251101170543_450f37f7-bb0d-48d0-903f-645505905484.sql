-- Create storage bucket for assignment submissions
INSERT INTO storage.buckets (id, name, public)
VALUES ('assignment-submissions', 'assignment-submissions', false);

-- Create assignments table
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  max_points INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignment submissions table
CREATE TABLE public.assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  comment TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  verification_token TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  grade NUMERIC,
  points NUMERIC,
  graded_at TIMESTAMP WITH TIME ZONE,
  graded_by TEXT,
  is_late BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for assignments
CREATE POLICY "Assignments are viewable by everyone"
ON public.assignments FOR SELECT
USING (true);

CREATE POLICY "Admins can insert assignments"
ON public.assignments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assignments"
ON public.assignments FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments"
ON public.assignments FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for submissions
CREATE POLICY "Submissions are viewable by everyone"
ON public.assignment_submissions FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert submissions"
ON public.assignment_submissions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update submissions"
ON public.assignment_submissions FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete submissions"
ON public.assignment_submissions FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Storage policies for assignment submissions
CREATE POLICY "Anyone can upload assignment files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assignment-submissions');

CREATE POLICY "Admins can view all assignment files"
ON storage.objects FOR SELECT
USING (bucket_id = 'assignment-submissions' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignment files"
ON storage.objects FOR DELETE
USING (bucket_id = 'assignment-submissions' AND has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();