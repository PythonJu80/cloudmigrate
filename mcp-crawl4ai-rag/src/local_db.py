"""
Local PostgreSQL Database Module for Crawl4AI
Replaces Supabase with direct PostgreSQL using asyncpg.
"""

import os
import asyncpg
import logging
import json
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from openai import OpenAI

logger = logging.getLogger(__name__)

# Database configuration
DB_HOST = os.getenv("DB_HOST", "10.121.15.210")
DB_PORT = os.getenv("DB_PORT", "6070")
DB_USER = os.getenv("DB_USER", "cloudmigrate")
DB_PASSWORD = os.getenv("DB_PASSWORD", "cloudmigrate2025")
DB_NAME = os.getenv("DB_NAME", "cloudmigrate")
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Global connection pool
_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the database connection pool."""
    global _pool
    if _pool is None:
        # Larger pool for parallel batch processing
        pool_size = int(os.getenv("DB_POOL_SIZE", "20"))
        logger.info(f"Creating database pool: {DB_HOST}:{DB_PORT}/{DB_NAME} (size: {pool_size})")
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=4,
            max_size=pool_size,
            command_timeout=60
        )
    return _pool


@asynccontextmanager
async def get_connection():
    """Get a database connection from the pool."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        yield conn


def _format_embedding(embedding: Optional[List[float]]) -> Optional[str]:
    """Convert embedding list to pgvector string format."""
    if embedding is None:
        return None
    return "[" + ",".join(str(x) for x in embedding) + "]"


def get_embedding(text: str, api_key: str = None) -> List[float]:
    """Get embedding for text using OpenAI."""
    api_key = api_key or os.getenv("OPENAI_API_KEY")
    client = OpenAI(api_key=api_key)
    response = client.embeddings.create(
        input=text[:8000],  # Truncate to avoid token limits
        model="text-embedding-3-small"
    )
    return response.data[0].embedding


# ============================================
# Replacement functions for Supabase
# ============================================

class LocalDBClient:
    """Fake client class to match Supabase interface."""
    pass


def get_supabase_client():
    """Return a placeholder - we use async functions directly."""
    return LocalDBClient()


async def get_supabase_user_id(user_id: str) -> str:
    """Just return the user_id as-is for local DB."""
    return user_id or "default"


# Default tenant ID for backwards compatibility
DEFAULT_TENANT_ID = "cmiq0pitp0001w5fml5rwn1xe"  # Anais Solutions


async def ensure_source(source_id: str, summary: str = None, word_count: int = 0, tenant_id: str = None):
    """Ensure a source exists in the database."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        await conn.execute("""
            INSERT INTO sources (source_id, tenant_id, user_id, summary, total_word_count)
            VALUES ($1, $2, 'default', $3, $4)
            ON CONFLICT (source_id) DO UPDATE SET
                summary = COALESCE(EXCLUDED.summary, sources.summary),
                total_word_count = COALESCE(EXCLUDED.total_word_count, sources.total_word_count),
                updated_at = NOW()
        """, source_id, tenant_id, summary, word_count)


def update_source_info(client, source_id: str, summary: str, word_count: int, tenant_id: str = None):
    """Update source information - synchronous wrapper."""
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ensure_source(source_id, summary, word_count, tenant_id))
        else:
            loop.run_until_complete(ensure_source(source_id, summary, word_count, tenant_id))
    except RuntimeError:
        asyncio.run(ensure_source(source_id, summary, word_count, tenant_id))


async def _add_documents(urls: List[str], chunk_numbers: List[int], contents: List[str], 
                         metadatas: List[Dict], url_to_full_doc: Dict, tenant_id: str, api_key: str):
    """Add crawled documents to database."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        for i, (url, chunk_num, content, metadata) in enumerate(zip(urls, chunk_numbers, contents, metadatas)):
            try:
                # Get source_id from URL
                from urllib.parse import urlparse
                parsed = urlparse(url)
                source_id = parsed.netloc or parsed.path
                
                # Generate embedding
                embedding = get_embedding(content, api_key)
                embedding_str = _format_embedding(embedding)
                
                await conn.execute("""
                    INSERT INTO crawled_pages (url, chunk_number, content, metadata, source_id, tenant_id, user_id, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6, 'default', $7::vector)
                    ON CONFLICT (url, chunk_number) DO UPDATE SET
                        content = EXCLUDED.content,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding
                """, url, chunk_num, content, json.dumps(metadata), source_id, tenant_id, embedding_str)
            except Exception as e:
                logger.error(f"Error adding document {url} chunk {chunk_num}: {e}")


def add_documents_to_supabase(client, urls: List[str], chunk_numbers: List[int], contents: List[str],
                              metadatas: List[Dict], url_to_full_doc: Dict, tenant_id: str, api_key: str,
                              batch_size: int = 20):
    """Add documents - synchronous wrapper matching Supabase interface."""
    import asyncio
    
    async def run():
        await _add_documents(urls, chunk_numbers, contents, metadatas, url_to_full_doc, tenant_id, api_key)
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(run())
        else:
            loop.run_until_complete(run())
    except RuntimeError:
        asyncio.run(run())


async def _add_code_examples(urls: List[str], chunk_numbers: List[int], codes: List[str],
                             summaries: List[str], metadatas: List[Dict], tenant_id: str, api_key: str):
    """Add code examples to database."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        for url, chunk_num, code, summary, metadata in zip(urls, chunk_numbers, codes, summaries, metadatas):
            try:
                from urllib.parse import urlparse
                parsed = urlparse(url)
                source_id = parsed.netloc or parsed.path
                
                # Generate embedding from summary
                embedding = get_embedding(summary, api_key)
                embedding_str = _format_embedding(embedding)
                
                await conn.execute("""
                    INSERT INTO code_examples (url, chunk_number, content, summary, metadata, source_id, tenant_id, user_id, embedding)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'default', $8::vector)
                    ON CONFLICT (url, chunk_number) DO UPDATE SET
                        content = EXCLUDED.content,
                        summary = EXCLUDED.summary,
                        metadata = EXCLUDED.metadata,
                        embedding = EXCLUDED.embedding
                """, url, chunk_num, code, summary, json.dumps(metadata), source_id, tenant_id, embedding_str)
            except Exception as e:
                logger.error(f"Error adding code example {url} chunk {chunk_num}: {e}")


def add_code_examples_to_supabase(client, urls: List[str], chunk_numbers: List[int], codes: List[str],
                                  summaries: List[str], metadatas: List[Dict], tenant_id: str, api_key: str):
    """Add code examples - synchronous wrapper."""
    import asyncio
    
    async def run():
        await _add_code_examples(urls, chunk_numbers, codes, summaries, metadatas, tenant_id, api_key)
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(run())
        else:
            loop.run_until_complete(run())
    except RuntimeError:
        asyncio.run(run())


async def _search_documents(query: str, tenant_id: str, api_key: str, match_count: int = 10,
                           source_id: str = None) -> List[Dict]:
    """Search documents by embedding similarity."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    embedding = get_embedding(query, api_key)
    embedding_str = _format_embedding(embedding)
    
    async with get_connection() as conn:
        if source_id:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM crawled_pages
                WHERE tenant_id = $2 AND source_id = $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            """, embedding_str, tenant_id, source_id, match_count)
        else:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM crawled_pages
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, tenant_id, match_count)
        
        return [dict(row) for row in rows]


def search_documents(client, query: str, tenant_id: str, api_key: str, match_count: int = 10,
                    source_id: str = None) -> List[Dict]:
    """Search documents - synchronous wrapper."""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run, 
                    _search_documents(query, tenant_id, api_key, match_count, source_id))
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(
                _search_documents(query, tenant_id, api_key, match_count, source_id))
    except RuntimeError:
        return asyncio.run(_search_documents(query, tenant_id, api_key, match_count, source_id))


async def _search_code_examples(query: str, tenant_id: str, api_key: str, match_count: int = 10,
                                source_id: str = None) -> List[Dict]:
    """Search code examples by embedding similarity."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    embedding = get_embedding(query, api_key)
    embedding_str = _format_embedding(embedding)
    
    async with get_connection() as conn:
        if source_id:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, summary, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM code_examples
                WHERE tenant_id = $2 AND source_id = $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            """, embedding_str, tenant_id, source_id, match_count)
        else:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, summary, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM code_examples
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, tenant_id, match_count)
        
        return [dict(row) for row in rows]


def search_code_examples(client, query: str, tenant_id: str, api_key: str, match_count: int = 10,
                        source_id: str = None) -> List[Dict]:
    """Search code examples - synchronous wrapper."""
    import asyncio
    
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor() as pool:
                future = pool.submit(asyncio.run,
                    _search_code_examples(query, tenant_id, api_key, match_count, source_id))
                return future.result(timeout=30)
        else:
            return loop.run_until_complete(
                _search_code_examples(query, tenant_id, api_key, match_count, source_id))
    except RuntimeError:
        return asyncio.run(_search_code_examples(query, tenant_id, api_key, match_count, source_id))


async def get_sources(tenant_id: str = None) -> List[Dict]:
    """Get all sources for a tenant."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        rows = await conn.fetch("""
            SELECT source_id, summary, total_word_count, created_at, updated_at
            FROM sources
            WHERE tenant_id = $1
            ORDER BY source_id
        """, tenant_id)
        return [dict(row) for row in rows]


async def save_crawled_page(
    url: str,
    chunk_number: int,
    content: str,
    source_id: str,
    metadata: Dict = None,
    embedding: List[float] = None,
    tenant_id: str = None
) -> None:
    """Save a single crawled page to the database."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        embedding_str = _format_embedding(embedding)
        await conn.execute("""
            INSERT INTO crawled_pages (url, chunk_number, content, metadata, source_id, tenant_id, user_id, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, 'default', $7::vector)
            ON CONFLICT (url, chunk_number) DO UPDATE SET
                content = EXCLUDED.content,
                metadata = EXCLUDED.metadata,
                embedding = EXCLUDED.embedding
        """, url, chunk_number, content, json.dumps(metadata or {}), source_id, tenant_id, embedding_str)


async def search_crawled_pages(
    embedding: List[float],
    limit: int = 10,
    source_id: str = None,
    tenant_id: str = None,
    metadata_filter: Dict = None
) -> List[Dict]:
    """Search crawled pages by embedding similarity."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    embedding_str = _format_embedding(embedding)
    
    async with get_connection() as conn:
        if source_id:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM crawled_pages
                WHERE tenant_id = $2 AND source_id = $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            """, embedding_str, tenant_id, source_id, limit)
        else:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM crawled_pages
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, tenant_id, limit)
        
        return [dict(row) for row in rows]


async def search_code_examples_by_embedding(
    embedding: List[float],
    limit: int = 10,
    source_id: str = None,
    tenant_id: str = None
) -> List[Dict]:
    """Search code examples by embedding similarity."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    embedding_str = _format_embedding(embedding)
    
    async with get_connection() as conn:
        if source_id:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, summary, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM code_examples
                WHERE tenant_id = $2 AND source_id = $3
                ORDER BY embedding <=> $1::vector
                LIMIT $4
            """, embedding_str, tenant_id, source_id, limit)
        else:
            rows = await conn.fetch("""
                SELECT url, chunk_number, content, summary, metadata, source_id,
                       1 - (embedding <=> $1::vector) as similarity
                FROM code_examples
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector
                LIMIT $3
            """, embedding_str, tenant_id, limit)
        
        return [dict(row) for row in rows]


async def save_code_example(
    url: str,
    chunk_number: int,
    content: str,
    summary: str,
    source_id: str,
    metadata: Dict = None,
    embedding: List[float] = None,
    tenant_id: str = None
) -> None:
    """Save a single code example to the database."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        embedding_str = _format_embedding(embedding)
        await conn.execute("""
            INSERT INTO code_examples (url, chunk_number, content, summary, metadata, source_id, tenant_id, user_id, embedding)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'default', $8::vector)
            ON CONFLICT (url, chunk_number) DO UPDATE SET
                content = EXCLUDED.content,
                summary = EXCLUDED.summary,
                metadata = EXCLUDED.metadata,
                embedding = EXCLUDED.embedding
        """, url, chunk_number, content, summary, json.dumps(metadata or {}), source_id, tenant_id, embedding_str)


async def delete_source(source_id: str, tenant_id: str = None) -> Dict:
    """Delete a source and all its content for a tenant."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    async with get_connection() as conn:
        # Delete crawled pages
        await conn.execute(
            "DELETE FROM crawled_pages WHERE source_id = $1 AND tenant_id = $2",
            source_id, tenant_id
        )
        # Delete code examples
        await conn.execute(
            "DELETE FROM code_examples WHERE source_id = $1 AND tenant_id = $2",
            source_id, tenant_id
        )
        # Delete source
        await conn.execute(
            "DELETE FROM sources WHERE source_id = $1 AND tenant_id = $2",
            source_id, tenant_id
        )
        
        return {"deleted": True, "source_id": source_id, "tenant_id": tenant_id}


# Dummy functions for BYOK compatibility
async def check_usage_limits_and_get_key(user_id: str) -> Dict:
    """Return environment API key and user_id for local usage."""
    return {
        "api_key": os.getenv("OPENAI_API_KEY"),
        "supabase_user_id": user_id  # Just pass through the user_id locally
    }


async def log_tool_usage(user_id: str, tool_name: str, **kwargs):
    """No-op for local usage."""
    pass
