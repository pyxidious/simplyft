CREATE TABLE IF NOT EXISTS ai_context_items (
    id BIGSERIAL PRIMARY KEY,
    scope TEXT NOT NULL DEFAULT 'default',
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
