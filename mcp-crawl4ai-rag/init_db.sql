-- Crawl4AI RAG Database Schema (Local PostgreSQL - no Supabase auth)
-- Run this to create the required tables

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop tables if they exist (to allow rerunning)
DROP TABLE IF EXISTS crawled_pages CASCADE;
DROP TABLE IF EXISTS code_examples CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS reports CASCADE;

-- Create sources table (simplified - no auth.users reference)
CREATE TABLE sources (
    source_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'default',
    summary TEXT,
    total_word_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create crawled_pages table
CREATE TABLE crawled_pages (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR NOT NULL,
    chunk_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(url, chunk_number)
);

-- Create code_examples table
CREATE TABLE code_examples (
    id BIGSERIAL PRIMARY KEY,
    url VARCHAR NOT NULL,
    chunk_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    summary TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_id TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'default',
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(url, chunk_number)
);

-- Create reports table
CREATE TABLE reports (
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

-- Create indexes for vector similarity search
CREATE INDEX idx_crawled_pages_embedding ON crawled_pages USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_code_examples_embedding ON code_examples USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_reports_embedding ON reports USING hnsw (embedding vector_cosine_ops);

-- Create indexes for filtering
CREATE INDEX idx_crawled_pages_source_id ON crawled_pages(source_id);
CREATE INDEX idx_crawled_pages_user_id ON crawled_pages(user_id);
CREATE INDEX idx_code_examples_source_id ON code_examples(source_id);
CREATE INDEX idx_reports_source_id ON reports(source_id);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Create GIN indexes for JSONB
CREATE INDEX idx_crawled_pages_metadata ON crawled_pages USING gin(metadata);
CREATE INDEX idx_code_examples_metadata ON code_examples USING gin(metadata);
CREATE INDEX idx_reports_metadata ON reports USING gin(metadata);

-- Done
SELECT 'Crawl4AI RAG tables created successfully' as status;
