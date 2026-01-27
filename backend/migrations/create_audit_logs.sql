-- Audit Logs Table for tracking all important system actions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    action TEXT NOT NULL,  -- CREATE, UPDATE, DELETE, RECHARGE, etc.
    entity_type TEXT NOT NULL,  -- ORDER, USER, DISTRIBUTOR, WALLET, etc.
    entity_id TEXT NOT NULL,  -- ID of the affected entity
    user_id TEXT,  -- ID of user who performed the action
    username TEXT,  -- Username/email for display
    old_value JSONB,  -- Previous state (for updates/deletes)
    new_value JSONB,  -- New state (for creates/updates)
    details TEXT  -- Human-readable description
);

-- Index for fast querying by entity
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Index for fast querying by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

-- Index for fast querying by timestamp
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Enable RLS (optional - adjust based on your security needs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT
    USING (true);  -- Adjust this based on your auth setup

-- Policy: Only backend can insert (using service role)
CREATE POLICY "Backend can insert audit logs" ON audit_logs
    FOR INSERT
    WITH CHECK (true);
