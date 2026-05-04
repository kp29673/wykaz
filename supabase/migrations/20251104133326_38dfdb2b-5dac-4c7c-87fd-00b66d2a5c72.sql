-- Add token expiration and student email columns to assignment_submissions
ALTER TABLE assignment_submissions 
ADD COLUMN token_expires_at timestamp with time zone,
ADD COLUMN student_email text;

-- Add index on verification_token for faster queries
CREATE INDEX idx_assignment_submissions_verification_token 
ON assignment_submissions(verification_token);