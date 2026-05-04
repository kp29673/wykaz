-- Create grading_scales table for course-specific grading scales
CREATE TABLE public.grading_scales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  min_percentage NUMERIC(5,2) NOT NULL,
  max_percentage NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_percentage_range CHECK (min_percentage >= 0 AND max_percentage <= 100 AND min_percentage < max_percentage),
  CONSTRAINT unique_course_grade UNIQUE (course_id, grade)
);

-- Enable Row Level Security
ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;

-- Create policies for grading_scales
CREATE POLICY "Grading scales are viewable by everyone"
ON public.grading_scales
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert grading scales"
ON public.grading_scales
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update grading scales"
ON public.grading_scales
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete grading scales"
ON public.grading_scales
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grading_scales_updated_at
BEFORE UPDATE ON public.grading_scales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default grading scale for existing courses
INSERT INTO public.grading_scales (course_id, grade, min_percentage, max_percentage)
SELECT 
  id as course_id,
  unnest(ARRAY['2.0', '3.0', '3.5', '4.0', '4.5', '5.0']) as grade,
  unnest(ARRAY[0, 60, 70, 76, 86, 92]) as min_percentage,
  unnest(ARRAY[59.99, 69.99, 75.99, 85.99, 91.99, 100]) as max_percentage
FROM public.courses;