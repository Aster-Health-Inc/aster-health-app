-- Migration: Create chatbot_audit_logs table for HIPAA compliance
-- Purpose: Audit trail for all chatbot interactions
-- Date: 2025-11-07

-- Create audit logs table
CREATE TABLE IF NOT EXISTS chatbot_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message_preview TEXT, -- First 100 chars of user message
    has_context BOOLEAN DEFAULT false,
    response_preview TEXT, -- First 100 chars of AI response (optional)
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Indexes for performance
    CONSTRAINT chatbot_audit_logs_user_id_idx
        FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_chatbot_audit_user_created
    ON chatbot_audit_logs(user_id, created_at DESC);

CREATE INDEX idx_chatbot_audit_created
    ON chatbot_audit_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chatbot_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own audit logs
CREATE POLICY "Users can view own chatbot audit logs"
ON chatbot_audit_logs FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert logs (for Edge Function)
CREATE POLICY "Service role can insert chatbot audit logs"
ON chatbot_audit_logs FOR INSERT
WITH CHECK (true);

-- RLS Policy: Users cannot delete audit logs (compliance requirement)
-- Only admins/service role can delete

-- Comments for documentation
COMMENT ON TABLE chatbot_audit_logs IS 'Audit trail for chatbot interactions - required for HIPAA compliance';
COMMENT ON COLUMN chatbot_audit_logs.message_preview IS 'First 100 characters of user message (for audit purposes)';
COMMENT ON COLUMN chatbot_audit_logs.has_context IS 'Whether user health context was sent to LLM';
COMMENT ON COLUMN chatbot_audit_logs.response_preview IS 'First 100 characters of AI response (optional)';
