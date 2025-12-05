-- Reports table for storing AI-generated reports
-- Includes vector embeddings for RAG retrieval

CREATE TABLE IF NOT EXISTS reports (
    id BIGSERIAL PRIMARY KEY,
    report_id TEXT UNIQUE NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    focus_query TEXT,
    report_content TEXT NOT NULL,
    report_summary TEXT,
    chunks_analyzed INTEGER,
    model_used TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on source_id for fast filtering
CREATE INDEX IF NOT EXISTS idx_reports_source_id ON reports(source_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Create index on report_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_reports_report_id ON reports(report_id);

-- Create vector similarity search index (HNSW for fast approximate search)
CREATE INDEX IF NOT EXISTS idx_reports_embedding ON reports 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Create GIN index on metadata for JSON queries
CREATE INDEX IF NOT EXISTS idx_reports_metadata ON reports USING gin(metadata);

-- Function to match reports by semantic similarity
CREATE OR REPLACE FUNCTION match_reports(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5,
    filter_source text DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    report_id text,
    source_id text,
    title text,
    focus_query text,
    report_content text,
    report_summary text,
    chunks_analyzed integer,
    model_used text,
    metadata jsonb,
    created_at timestamptz,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.report_id,
        r.source_id,
        r.title,
        r.focus_query,
        r.report_content,
        r.report_summary,
        r.chunks_analyzed,
        r.model_used,
        r.metadata,
        r.created_at,
        1 - (r.embedding <=> query_embedding) as similarity
    FROM reports r
    WHERE 
        (filter_source IS NULL OR r.source_id = filter_source)
        AND (1 - (r.embedding <=> query_embedding)) > match_threshold
    ORDER BY r.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
CREATE TRIGGER trigger_update_reports_updated_at
    BEFORE UPDATE ON reports
    FOR EACH ROW
    EXECUTE FUNCTION update_reports_updated_at();

-- Enable Row Level Security (optional, for multi-tenant)
-- ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON reports TO authenticated;
-- GRANT USAGE, SELECT ON SEQUENCE reports_id_seq TO authenticated;

COMMENT ON TABLE reports IS 'Stores AI-generated reports with vector embeddings for semantic search';
COMMENT ON COLUMN reports.report_id IS 'Unique identifier for the report (UUID format)';
COMMENT ON COLUMN reports.source_id IS 'Source domain the report was generated from';
COMMENT ON COLUMN reports.title IS 'Report title/headline';
COMMENT ON COLUMN reports.focus_query IS 'Optional focus query used to generate the report';
COMMENT ON COLUMN reports.report_content IS 'Full markdown content of the report';
COMMENT ON COLUMN reports.report_summary IS 'Short summary/excerpt of the report';
COMMENT ON COLUMN reports.chunks_analyzed IS 'Number of content chunks analyzed to create report';
COMMENT ON COLUMN reports.model_used IS 'AI model used to generate the report (e.g., gpt-4o-mini)';
COMMENT ON COLUMN reports.metadata IS 'Additional metadata (source stats, generation params, etc.)';
COMMENT ON COLUMN reports.embedding IS 'Vector embedding of report content for semantic search';
COMMENT ON COLUMN reports.created_at IS 'Timestamp when report was generated';
COMMENT ON COLUMN reports.updated_at IS 'Timestamp when report was last updated';
