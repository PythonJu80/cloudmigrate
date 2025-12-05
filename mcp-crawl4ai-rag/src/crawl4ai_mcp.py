"""
Crawl4AI RAG API Server

FastAPI server for web crawling, document storage, and RAG queries.
Includes AWS services knowledge graph for understanding service relationships.
"""
from fastapi import FastAPI, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import CrossEncoder
from dataclasses import dataclass
from typing import List, Dict, Any, Optional
from urllib.parse import urlparse, urldefrag
from xml.etree import ElementTree
from dotenv import load_dotenv
from pathlib import Path
import requests
import asyncio
import json
import os
import re
import concurrent.futures
import uvicorn
import uuid
from datetime import datetime

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode, MemoryAdaptiveDispatcher

from utils import (
    add_documents_to_supabase as add_documents_to_db,
    search_documents,
    extract_code_blocks,
    generate_code_example_summary,
    add_code_examples_to_supabase as add_code_examples_to_db,
    update_source_info,
    extract_source_summary,
    search_code_examples
)

# Neo4j driver for AWS services knowledge graph
from neo4j import AsyncGraphDatabase

# Redis-based job queue with rate limiting
from redis_jobs import (
    create_crawl_job as redis_create_job,
    get_crawl_job as redis_get_job,
    update_crawl_job as redis_update_job,
    check_tenant_rate_limit,
    get_tenant_crawl_stats,
    list_tenant_jobs
)

# OpenAI for chat agent
from openai import OpenAI

# Agent prompt and persona
from agent_prompt import SYSTEM_PROMPT, TOOL_DESCRIPTIONS

# Load environment variables from the project root .env file
project_root = Path(__file__).resolve().parent.parent
dotenv_path = project_root / '.env'

# Force override of existing environment variables
load_dotenv(dotenv_path, override=True)

# Helper functions for Neo4j validation and error handling
def validate_neo4j_connection() -> bool:
    """Check if Neo4j environment variables are configured."""
    return all([
        os.getenv("NEO4J_URI"),
        os.getenv("NEO4J_USER"),
        os.getenv("NEO4J_PASSWORD")
    ])

def format_neo4j_error(error: Exception) -> str:
    """Format Neo4j connection errors for user-friendly messages."""
    error_str = str(error).lower()
    if "authentication" in error_str or "unauthorized" in error_str:
        return "Neo4j authentication failed. Check NEO4J_USER and NEO4J_PASSWORD."
    elif "connection" in error_str or "refused" in error_str or "timeout" in error_str:
        return "Cannot connect to Neo4j. Check NEO4J_URI and ensure Neo4j is running."
    elif "database" in error_str:
        return "Neo4j database error. Check if the database exists and is accessible."
    else:
        return f"Neo4j error: {str(error)}"

# AWS Services list for extraction
AWS_SERVICES = {
    # Compute
    "EC2": "Compute", "Lambda": "Compute", "ECS": "Compute", "EKS": "Compute", 
    "Fargate": "Compute", "Lightsail": "Compute", "Batch": "Compute", "Elastic Beanstalk": "Compute",
    "App Runner": "Compute", "Outposts": "Compute",
    # Storage
    "S3": "Storage", "EBS": "Storage", "EFS": "Storage", "FSx": "Storage", 
    "Storage Gateway": "Storage", "Backup": "Storage", "Snow Family": "Storage",
    # Database
    "RDS": "Database", "DynamoDB": "Database", "Aurora": "Database", "ElastiCache": "Database",
    "Neptune": "Database", "DocumentDB": "Database", "Keyspaces": "Database", "QLDB": "Database",
    "Timestream": "Database", "MemoryDB": "Database", "Redshift": "Database",
    # Networking
    "VPC": "Networking", "CloudFront": "Networking", "Route 53": "Networking", 
    "API Gateway": "Networking", "Direct Connect": "Networking", "Global Accelerator": "Networking",
    "Transit Gateway": "Networking", "PrivateLink": "Networking", "App Mesh": "Networking",
    "Cloud Map": "Networking", "ELB": "Networking", "ALB": "Networking", "NLB": "Networking",
    # Security
    "IAM": "Security", "Cognito": "Security", "Secrets Manager": "Security", 
    "KMS": "Security", "CloudHSM": "Security", "WAF": "Security", "Shield": "Security",
    "GuardDuty": "Security", "Inspector": "Security", "Macie": "Security",
    "Security Hub": "Security", "Detective": "Security", "Firewall Manager": "Security",
    # Management
    "CloudWatch": "Management", "CloudTrail": "Management", "Config": "Management",
    "Systems Manager": "Management", "CloudFormation": "Management", "Service Catalog": "Management",
    "Trusted Advisor": "Management", "Control Tower": "Management", "Organizations": "Management",
    "License Manager": "Management", "Cost Explorer": "Management",
    # Migration
    "Migration Hub": "Migration", "Application Migration Service": "Migration", 
    "Database Migration Service": "Migration", "DMS": "Migration", "DataSync": "Migration",
    "Transfer Family": "Migration", "Snow Family": "Migration", "Application Discovery Service": "Migration",
    # Analytics
    "Athena": "Analytics", "EMR": "Analytics", "Kinesis": "Analytics", "QuickSight": "Analytics",
    "Data Pipeline": "Analytics", "Glue": "Analytics", "Lake Formation": "Analytics",
    "MSK": "Analytics", "OpenSearch": "Analytics", "Elasticsearch": "Analytics",
    # AI/ML
    "SageMaker": "AI/ML", "Rekognition": "AI/ML", "Comprehend": "AI/ML", "Polly": "AI/ML",
    "Transcribe": "AI/ML", "Translate": "AI/ML", "Lex": "AI/ML", "Personalize": "AI/ML",
    "Forecast": "AI/ML", "Textract": "AI/ML", "Bedrock": "AI/ML", "CodeWhisperer": "AI/ML",
    # Integration
    "SQS": "Integration", "SNS": "Integration", "EventBridge": "Integration", 
    "Step Functions": "Integration", "MQ": "Integration", "AppFlow": "Integration",
    # Developer Tools
    "CodeCommit": "Developer Tools", "CodeBuild": "Developer Tools", "CodeDeploy": "Developer Tools",
    "CodePipeline": "Developer Tools", "CodeArtifact": "Developer Tools", "X-Ray": "Developer Tools",
    "Cloud9": "Developer Tools", "CloudShell": "Developer Tools",
}

# Common relationship patterns between AWS services
AWS_RELATIONSHIP_PATTERNS = [
    # Compute relationships
    (["Lambda"], ["S3", "DynamoDB", "SQS", "SNS", "API Gateway", "EventBridge", "Kinesis"], "TRIGGERS"),
    (["EC2", "ECS", "EKS"], ["ELB", "ALB", "NLB"], "BEHIND"),
    (["EC2", "ECS", "EKS", "Lambda"], ["RDS", "Aurora", "DynamoDB", "ElastiCache"], "CONNECTS_TO"),
    (["EC2", "ECS", "EKS"], ["EBS", "EFS"], "USES_STORAGE"),
    # Storage relationships
    (["S3"], ["CloudFront"], "DISTRIBUTED_BY"),
    (["S3"], ["Lambda", "Glue", "Athena"], "TRIGGERS"),
    # Database relationships
    (["RDS", "Aurora"], ["Secrets Manager"], "STORES_CREDENTIALS_IN"),
    (["DynamoDB"], ["DAX"], "CACHED_BY"),
    # Security relationships
    (["EC2", "ECS", "EKS", "Lambda", "RDS"], ["IAM"], "AUTHENTICATED_BY"),
    (["Secrets Manager", "KMS"], ["RDS", "Aurora", "S3", "EBS"], "ENCRYPTS"),
    (["CloudFront", "ALB", "API Gateway"], ["WAF"], "PROTECTED_BY"),
    # Monitoring relationships
    (["EC2", "ECS", "EKS", "Lambda", "RDS", "DynamoDB"], ["CloudWatch"], "MONITORED_BY"),
    (["CloudWatch"], ["SNS"], "ALERTS_VIA"),
    # Migration relationships
    (["Migration Hub"], ["Application Migration Service", "Database Migration Service", "DMS"], "TRACKS"),
    (["DMS"], ["RDS", "Aurora", "DynamoDB", "Redshift"], "MIGRATES_TO"),
]

# Default tenant ID for Neo4j (Community Edition - single DB, use tenant_id property)
DEFAULT_TENANT_ID = "cmiq0pitp0001w5fml5rwn1xe"  # Anais Solutions

async def extract_aws_services_to_neo4j(content: str, source_url: str, neo4j_driver, tenant_id: str = None) -> Dict[str, Any]:
    """Extract AWS service mentions from content and store relationships in Neo4j.
    
    Multi-tenant isolation: All nodes have tenant_id property for filtering.
    Community Edition doesn't support multiple databases, so we use property-based isolation.
    """
    if not neo4j_driver:
        return {"extracted": 0, "relationships": 0}
    
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    
    # Find all mentioned services
    mentioned_services = set()
    content_lower = content.lower()
    
    for service, category in AWS_SERVICES.items():
        # Check for service name (case insensitive)
        if service.lower() in content_lower:
            mentioned_services.add(service)
        # Also check for "AWS <service>" pattern
        if f"aws {service.lower()}" in content_lower:
            mentioned_services.add(service)
        # Check for "Amazon <service>" pattern
        if f"amazon {service.lower()}" in content_lower:
            mentioned_services.add(service)
    
    if not mentioned_services:
        return {"extracted": 0, "relationships": 0}
    
    relationships_created = 0
    
    try:
        async with neo4j_driver.session() as session:
            # Create/update service nodes (scoped by tenant_id)
            for service in mentioned_services:
                category = AWS_SERVICES.get(service, "Other")
                await session.run("""
                    MERGE (s:AWSService {name: $name, tenant_id: $tenant_id})
                    SET s.category = $category,
                        s.last_seen = datetime(),
                        s.mention_count = COALESCE(s.mention_count, 0) + 1
                """, name=service, category=category, tenant_id=tenant_id)
            
            # Create relationships based on co-occurrence and known patterns
            service_list = list(mentioned_services)
            for i, service1 in enumerate(service_list):
                for service2 in service_list[i+1:]:
                    # Check if there's a known relationship pattern
                    for sources, targets, rel_type in AWS_RELATIONSHIP_PATTERNS:
                        if service1 in sources and service2 in targets:
                            await session.run(f"""
                                MATCH (s1:AWSService {{name: $s1, tenant_id: $tenant_id}}), 
                                      (s2:AWSService {{name: $s2, tenant_id: $tenant_id}})
                                MERGE (s1)-[r:{rel_type}]->(s2)
                                SET r.source_url = $url, r.updated = datetime()
                            """, s1=service1, s2=service2, url=source_url, tenant_id=tenant_id)
                            relationships_created += 1
                        elif service2 in sources and service1 in targets:
                            await session.run(f"""
                                MATCH (s1:AWSService {{name: $s1, tenant_id: $tenant_id}}), 
                                      (s2:AWSService {{name: $s2, tenant_id: $tenant_id}})
                                MERGE (s1)-[r:{rel_type}]->(s2)
                                SET r.source_url = $url, r.updated = datetime()
                            """, s1=service2, s2=service1, url=source_url, tenant_id=tenant_id)
                            relationships_created += 1
                    
                    # Also create a generic CO_MENTIONED relationship for co-occurring services
                    await session.run("""
                        MATCH (s1:AWSService {name: $s1, tenant_id: $tenant_id}), 
                              (s2:AWSService {name: $s2, tenant_id: $tenant_id})
                        MERGE (s1)-[r:CO_MENTIONED]-(s2)
                        SET r.count = COALESCE(r.count, 0) + 1,
                            r.last_url = $url
                    """, s1=service1, s2=service2, url=source_url, tenant_id=tenant_id)
            
            # Link services to source document (scoped by tenant_id)
            await session.run("""
                MERGE (d:Document {url: $url, tenant_id: $tenant_id})
                SET d.crawled_at = datetime()
            """, url=source_url, tenant_id=tenant_id)
            
            for service in mentioned_services:
                await session.run("""
                    MATCH (s:AWSService {name: $service, tenant_id: $tenant_id}), 
                          (d:Document {url: $url, tenant_id: $tenant_id})
                    MERGE (d)-[:MENTIONS]->(s)
                """, service=service, url=source_url, tenant_id=tenant_id)
        
        return {"extracted": len(mentioned_services), "relationships": relationships_created, "services": list(mentioned_services)}
    
    except Exception as e:
        print(f"Error extracting AWS services to Neo4j: {e}")
        return {"extracted": 0, "relationships": 0, "error": str(e)}

# Create a dataclass for our application context
@dataclass
class Crawl4AIContext:
    """Context for the Crawl4AI API server."""
    crawler: AsyncWebCrawler
    reranking_model: Optional[CrossEncoder] = None
    neo4j_driver: Optional[Any] = None  # Neo4j driver for AWS services graph

# Global context - initialized on first use
_app_context = None

async def get_context() -> Crawl4AIContext:
    """Get or initialize the application context."""
    global _app_context
    if _app_context is None:
        # Create browser configuration
        browser_config = BrowserConfig(headless=True, verbose=False)
        
        # Initialize the crawler
        crawler = AsyncWebCrawler(config=browser_config)
        await crawler.__aenter__()
        
        # Initialize cross-encoder model for reranking if enabled
        reranking_model = None
        if os.getenv("USE_RERANKING", "false") == "true":
            try:
                reranking_model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
                print("✓ Reranking model loaded")
            except Exception as e:
                print(f"Failed to load reranking model: {e}")
        
        # Initialize Neo4j driver for AWS services graph if enabled
        neo4j_driver = None
        knowledge_graph_enabled = os.getenv("USE_KNOWLEDGE_GRAPH", "false") == "true"
        
        if knowledge_graph_enabled:
            neo4j_uri = os.getenv("NEO4J_URI")
            neo4j_user = os.getenv("NEO4J_USER")
            neo4j_password = os.getenv("NEO4J_PASSWORD")
            
            if neo4j_uri and neo4j_user and neo4j_password:
                try:
                    print("Initializing Neo4j driver for AWS services graph...")
                    neo4j_driver = AsyncGraphDatabase.driver(
                        neo4j_uri,
                        auth=(neo4j_user, neo4j_password)
                    )
                    # Test connection
                    async with neo4j_driver.session() as session:
                        await session.run("RETURN 1")
                    print("✓ Neo4j driver initialized")
                except Exception as e:
                    print(f"Failed to initialize Neo4j: {format_neo4j_error(e)}")
                    neo4j_driver = None
            else:
                print("Neo4j credentials not configured - AWS services graph unavailable")
        else:
            print("AWS services graph disabled - set USE_KNOWLEDGE_GRAPH=true to enable")
        
        _app_context = Crawl4AIContext(
            crawler=crawler,
            reranking_model=reranking_model,
            neo4j_driver=neo4j_driver
        )
    return _app_context

# ============================================
# CRAWL JOB TRACKING (Redis-based)
# ============================================

# Job functions are now async and use Redis for persistence and rate limiting
# See redis_jobs.py for implementation

async def create_crawl_job(url: str, tenant_id: str, params: Dict = None) -> Dict[str, Any]:
    """Create a new crawl job with rate limiting. Returns job data or error."""
    return await redis_create_job(url, tenant_id, params)

async def update_crawl_job(job_id: str, status: str, result: Dict = None, error: str = None):
    """Update a crawl job's status."""
    updates = {"status": status}
    if result:
        updates["result"] = result
    if error:
        updates["error"] = error
    await redis_update_job(job_id, **updates)

async def get_crawl_job(job_id: str) -> Optional[Dict[str, Any]]:
    """Get a crawl job by ID."""
    return await redis_get_job(job_id)

# Initialize FastAPI server
app = FastAPI(title="Crawl4AI RAG API", description="REST API for web crawling and RAG")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"status": "ok", "service": "crawl4ai-rag"}

# Request models
class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[Dict[str, str]]] = None

def rerank_results(model: CrossEncoder, query: str, results: List[Dict[str, Any]], content_key: str = "content") -> List[Dict[str, Any]]:
    """
    Rerank search results using a cross-encoder model.
    
    Args:
        model: The cross-encoder model to use for reranking
        query: The search query
        results: List of search results
        content_key: The key in each result dict that contains the text content
        
    Returns:
        Reranked list of results
    """
    if not model or not results:
        return results
    
    try:
        # Extract content from results
        texts = [result.get(content_key, "") for result in results]
        
        # Create pairs of [query, document] for the cross-encoder
        pairs = [[query, text] for text in texts]
        
        # Get relevance scores from the cross-encoder
        scores = model.predict(pairs)
        
        # Add scores to results and sort by score (descending)
        for i, result in enumerate(results):
            result["rerank_score"] = float(scores[i])
        
        # Sort by rerank score
        reranked = sorted(results, key=lambda x: x.get("rerank_score", 0), reverse=True)
        
        return reranked
    except Exception as e:
        print(f"Error during reranking: {e}")
        return results

def is_sitemap(url: str) -> bool:
    """
    Check if a URL is a sitemap.
    
    Args:
        url: URL to check
        
    Returns:
        True if the URL is a sitemap, False otherwise
    """
    return url.endswith('sitemap.xml') or 'sitemap' in urlparse(url).path

def is_txt(url: str) -> bool:
    """
    Check if a URL is a text file.
    
    Args:
        url: URL to check
        
    Returns:
        True if the URL is a text file, False otherwise
    """
    return url.endswith('.txt')

def parse_sitemap(sitemap_url: str) -> List[str]:
    """
    Parse a sitemap and extract URLs.
    
    Args:
        sitemap_url: URL of the sitemap
        
    Returns:
        List of URLs found in the sitemap
    """
    resp = requests.get(sitemap_url)
    urls = []

    if resp.status_code == 200:
        try:
            tree = ElementTree.fromstring(resp.content)
            urls = [loc.text for loc in tree.findall('.//{*}loc')]
        except Exception as e:
            print(f"Error parsing sitemap XML: {e}")

    return urls

def smart_chunk_markdown(text: str, chunk_size: int = 5000) -> List[str]:
    """Split text into chunks, respecting code blocks and paragraphs."""
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        # Calculate end position
        end = start + chunk_size

        # If we're at the end of the text, just take what's left
        if end >= text_length:
            chunks.append(text[start:].strip())
            break

        # Try to find a code block boundary first (```)
        chunk = text[start:end]
        code_block = chunk.rfind('```')
        if code_block != -1 and code_block > chunk_size * 0.3:
            end = start + code_block

        # If no code block, try to break at a paragraph
        elif '\n\n' in chunk:
            # Find the last paragraph break
            last_break = chunk.rfind('\n\n')
            if last_break > chunk_size * 0.3:  # Only break if we're past 30% of chunk_size
                end = start + last_break

        # If no paragraph break, try to break at a sentence
        elif '. ' in chunk:
            # Find the last sentence break
            last_period = chunk.rfind('. ')
            if last_period > chunk_size * 0.3:  # Only break if we're past 30% of chunk_size
                end = start + last_period + 1

        # Extract chunk and clean it up
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        # Move start position for next chunk
        start = end

    return chunks

def extract_section_info(chunk: str) -> Dict[str, Any]:
    """
    Extracts headers and stats from a chunk.
    
    Args:
        chunk: Markdown chunk
        
    Returns:
        Dictionary with headers and stats
    """
    headers = re.findall(r'^(#+)\s+(.+)$', chunk, re.MULTILINE)
    header_str = '; '.join([f'{h[0]} {h[1]}' for h in headers]) if headers else ''

    return {
        "headers": header_str,
        "char_count": len(chunk),
        "word_count": len(chunk.split())
    }

def process_code_example(args):
    """
    Process a single code example to generate its summary.
    This function is designed to be used with concurrent.futures.
    
    Args:
        args: Tuple containing (code, context_before, context_after)
        
    Returns:
        The generated summary
    """
    code, context_before, context_after = args
    return generate_code_example_summary(code, context_before, context_after)

@app.post("/api/crawl/single")
async def crawl_single_page(url: str) -> str:
    """Crawl a single web page and store its content."""
    try:
        ctx = await get_context()
        crawler = ctx.crawler
        
        # Configure the crawl
        run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, stream=False)
        
        # Crawl the page
        result = await crawler.arun(url=url, config=run_config)
        
        if result.success and result.markdown:
            # Extract source_id
            parsed_url = urlparse(url)
            source_id = parsed_url.netloc or parsed_url.path
            
            # Chunk the content
            chunks = smart_chunk_markdown(result.markdown)
            
            # Prepare data for database
            urls = []
            chunk_numbers = []
            contents = []
            metadatas = []
            total_word_count = 0
            
            for i, chunk in enumerate(chunks):
                urls.append(url)
                chunk_numbers.append(i)
                contents.append(chunk)
                
                # Extract metadata
                meta = extract_section_info(chunk)
                meta["chunk_index"] = i
                meta["url"] = url
                meta["source"] = source_id
                meta["crawl_time"] = str(asyncio.current_task().get_coro().__name__)
                metadatas.append(meta)
                
                # Accumulate word count
                total_word_count += meta.get("word_count", 0)
            
            # Create url_to_full_document mapping
            url_to_full_document = {url: result.markdown}
            
            # Update source information FIRST (before inserting documents)
            source_summary = extract_source_summary(result.markdown[:5000])
            await update_source_info(source_id, source_summary, total_word_count)
            
            # Add documentation chunks to database (AFTER source exists)
            await add_documents_to_db(urls, chunk_numbers, contents, metadatas, url_to_full_document)
            
            # Extract and process code examples only if enabled
            extract_code_examples = os.getenv("USE_AGENTIC_RAG", "false") == "true"
            if extract_code_examples:
                code_blocks = extract_code_blocks(result.markdown)
                if code_blocks:
                    code_urls = []
                    code_chunk_numbers = []
                    code_examples = []
                    code_summaries = []
                    code_metadatas = []
                    
                    # Process code examples in parallel
                    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
                        # Prepare arguments for parallel processing
                        summary_args = [(block['code'], block['context_before'], block['context_after']) 
                                        for block in code_blocks]
                        
                        # Generate summaries in parallel
                        summaries = list(executor.map(process_code_example, summary_args))
                    
                    # Prepare code example data
                    for i, (block, summary) in enumerate(zip(code_blocks, summaries)):
                        code_urls.append(url)
                        code_chunk_numbers.append(i)
                        code_examples.append(block['code'])
                        code_summaries.append(summary)
                        
                        # Create metadata for code example
                        code_meta = {
                            "chunk_index": i,
                            "url": url,
                            "source": source_id,
                            "char_count": len(block['code']),
                            "word_count": len(block['code'].split())
                        }
                        code_metadatas.append(code_meta)
                    
                    # Add code examples to database
                    await add_code_examples_to_db(url, code_blocks, source_id)
            
            # Extract AWS services to Neo4j
            neo4j_result = {"extracted": 0, "relationships": 0}
            if ctx.neo4j_driver:
                neo4j_result = await extract_aws_services_to_neo4j(
                    result.markdown, url, ctx.neo4j_driver
                )
            
            return json.dumps({
                "success": True,
                "url": url,
                "chunks_stored": len(chunks),
                "code_examples_stored": len(code_blocks) if code_blocks else 0,
                "content_length": len(result.markdown),
                "total_word_count": total_word_count,
                "source_id": source_id,
                "aws_services_extracted": neo4j_result.get("extracted", 0),
                "aws_relationships_created": neo4j_result.get("relationships", 0),
                "links_count": {
                    "internal": len(result.links.get("internal", [])),
                    "external": len(result.links.get("external", []))
                }
            }, indent=2)
        else:
            return json.dumps({
                "success": False,
                "url": url,
                "error": result.error_message
            }, indent=2)
    except Exception as e:
        return json.dumps({
            "success": False,
            "url": url,
            "error": str(e)
        }, indent=2)

async def _execute_crawl_job(job_id: str, url: str, max_depth: int, max_concurrent: int, chunk_size: int, tenant_id: str = None):
    """Background task to execute the actual crawling work."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    
    # Mark job as running
    await update_crawl_job(job_id, "running")
    
    try:
        ctx = await get_context()
        crawler = ctx.crawler
        
        # Determine the crawl strategy
        crawl_results = []
        crawl_type = None
        
        if is_txt(url):
            crawl_results = await crawl_markdown_file(crawler, url)
            crawl_type = "text_file"
        elif is_sitemap(url):
            sitemap_urls = parse_sitemap(url)
            if not sitemap_urls:
                await update_crawl_job(job_id, "failed", error="No URLs found in sitemap")
                return
            crawl_results = await crawl_batch(crawler, sitemap_urls, max_concurrent=max_concurrent)
            crawl_type = "sitemap"
        else:
            crawl_results = await crawl_recursive_internal_links(crawler, [url], max_depth=max_depth, max_concurrent=max_concurrent)
            crawl_type = "webpage"
        
        if not crawl_results:
            await update_crawl_job(job_id, "failed", error="No content found")
            return
        
        # Process results and store in database
        urls = []
        chunk_numbers = []
        contents = []
        metadatas = []
        chunk_count = 0
        code_examples = []
        
        # Track sources and their content
        source_content_map = {}
        source_word_counts = {}
        
        # Process documentation chunks
        for doc in crawl_results:
            source_url = doc['url']
            md = doc['markdown']
            chunks = smart_chunk_markdown(md, chunk_size=chunk_size)
            
            parsed_url = urlparse(source_url)
            source_id = parsed_url.netloc or parsed_url.path
            
            if source_id not in source_content_map:
                source_content_map[source_id] = md[:5000]
                source_word_counts[source_id] = 0
            
            for i, chunk in enumerate(chunks):
                urls.append(source_url)
                chunk_numbers.append(i)
                contents.append(chunk)
                
                meta = extract_section_info(chunk)
                meta["chunk_index"] = i
                meta["url"] = source_url
                meta["source"] = source_id
                meta["crawl_type"] = crawl_type
                meta["crawl_time"] = datetime.utcnow().isoformat()
                meta["tenant_id"] = tenant_id
                metadatas.append(meta)
                
                source_word_counts[source_id] += meta.get("word_count", 0)
                chunk_count += 1
        
        # Create url_to_full_document mapping
        url_to_full_document = {doc['url']: doc['markdown'] for doc in crawl_results}
        
        # Update source information (with tenant_id)
        for source_id, content in source_content_map.items():
            summary = extract_source_summary(content)
            word_count = source_word_counts.get(source_id, 0)
            await update_source_info(source_id, summary, word_count, tenant_id)
        
        # Add documentation chunks to database (with tenant_id)
        await add_documents_to_db(urls, chunk_numbers, contents, metadatas, url_to_full_document, tenant_id)
        
        # Extract and process code examples if enabled
        extract_code_examples_enabled = os.getenv("USE_AGENTIC_RAG", "false") == "true"
        if extract_code_examples_enabled:
            for doc in crawl_results:
                doc_url = doc['url']
                parsed = urlparse(doc_url)
                doc_source_id = parsed.netloc or parsed.path
                doc_code_blocks = extract_code_blocks(doc['markdown'])
                if doc_code_blocks:
                    code_examples.extend(doc_code_blocks)
                    await add_code_examples_to_db(doc_url, doc_code_blocks, doc_source_id, tenant_id)
        
        # Extract AWS services to Neo4j (with tenant_id)
        neo4j_stats = {"total_services": 0, "total_relationships": 0}
        if ctx.neo4j_driver:
            for doc in crawl_results:
                extraction_result = await extract_aws_services_to_neo4j(
                    doc['markdown'], doc['url'], ctx.neo4j_driver, tenant_id
                )
                neo4j_stats["total_services"] += extraction_result.get("extracted", 0)
                neo4j_stats["total_relationships"] += extraction_result.get("relationships", 0)
        
        # Calculate total word count
        total_words = sum(source_word_counts.values())
        
        # Update job with success result
        await update_crawl_job(job_id, "completed", result={
            "url": url,
            "crawl_type": crawl_type,
            "pages_crawled": len(crawl_results),
            "chunks_stored": chunk_count,
            "code_examples_stored": len(code_examples),
            "sources_updated": len(source_content_map),
            "total_words": total_words,
            "aws_services_extracted": neo4j_stats["total_services"],
            "aws_relationships_created": neo4j_stats["total_relationships"],
            "urls_crawled": [doc['url'] for doc in crawl_results][:10],
            "tenant_id": tenant_id
        })
        
        print(f"✓ Crawl job {job_id} completed: {len(crawl_results)} pages, {chunk_count} chunks, {total_words} words (tenant: {tenant_id})")
        
    except Exception as e:
        await update_crawl_job(job_id, "failed", error=str(e))
        print(f"✗ Crawl job {job_id} failed: {str(e)}")


@app.post("/api/crawl/smart")
async def smart_crawl_url(
    background_tasks: BackgroundTasks,
    url: str, 
    max_depth: int = 3, 
    max_concurrent: int = 10, 
    chunk_size: int = 5000,
    tenant_id: str = None
) -> Dict[str, Any]:
    """
    Start an async crawl job. Returns immediately with job ID.
    Check status with GET /api/crawl/status/{job_id}
    
    Rate limited per tenant:
    - Max 5 concurrent crawls
    - Max 20 crawls per hour
    
    Args:
        tenant_id: Tenant ID for multi-tenant isolation
    """
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    
    # Create job with rate limiting check
    job_result = await create_crawl_job(
        url=url, 
        tenant_id=tenant_id,
        params={"max_depth": max_depth, "max_concurrent": max_concurrent, "chunk_size": chunk_size}
    )
    
    # Check if rate limited
    if not job_result.get("success"):
        return {
            "success": False,
            "error": job_result.get("error", "Failed to create job"),
            "rate_limit": job_result.get("rate_limit")
        }
    
    job = job_result["job"]
    job_id = job["id"]
    
    # Start background task
    background_tasks.add_task(_execute_crawl_job, job_id, url, max_depth, max_concurrent, chunk_size, tenant_id)
    
    return {
        "success": True,
        "message": "Crawl started! Check back soon for your new knowledge.",
        "job_id": job_id,
        "url": url,
        "tenant_id": tenant_id,
        "status": "queued",
        "check_status_url": f"/api/crawl/status/{job_id}"
    }


@app.get("/api/crawl/status/{job_id}")
async def get_crawl_status(job_id: str) -> Dict[str, Any]:
    """Check the status of a crawl job."""
    job = await get_crawl_job(job_id)
    
    if not job:
        return {
            "success": False,
            "error": f"Job '{job_id}' not found"
        }
    
    response = {
        "success": True,
        "job_id": job["id"],
        "url": job["url"],
        "status": job["status"],
        "started_at": job.get("started_at"),
        "tenant_id": job.get("tenant_id")
    }
    
    if job["status"] == "completed":
        response["completed_at"] = job.get("completed_at")
        response["result"] = job.get("result")
        result = job.get("result", {})
        response["message"] = f"✓ Crawl complete! {result.get('pages_crawled', 0)} pages indexed with {result.get('total_words', 0):,} words."
    elif job["status"] == "failed":
        response["completed_at"] = job.get("completed_at")
        response["error"] = job.get("error")
        response["message"] = f"✗ Crawl failed: {job.get('error')}"
    elif job["status"] == "running":
        response["message"] = "Crawling in progress..."
    else:
        response["message"] = "Job queued, starting soon..."
    
    return response


@app.get("/api/crawl/jobs")
async def list_crawl_jobs_endpoint(tenant_id: str = None) -> Dict[str, Any]:
    """List crawl jobs for a tenant (recent first)."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    jobs = await list_tenant_jobs(tenant_id, limit=20)
    
    return {
        "success": True,
        "jobs": [{
            "job_id": j["id"],
            "url": j["url"],
            "status": j["status"],
            "started_at": j.get("started_at"),
            "completed_at": j.get("completed_at"),
            "tenant_id": j.get("tenant_id")
        } for j in jobs],
        "count": len(jobs),
        "tenant_id": tenant_id
    }


@app.get("/api/crawl/stats")
async def get_crawl_stats(tenant_id: str = None) -> Dict[str, Any]:
    """Get crawl rate limit stats for a tenant."""
    tenant_id = tenant_id or DEFAULT_TENANT_ID
    stats = await get_tenant_crawl_stats(tenant_id)
    return {
        "success": True,
        **stats
    }

@app.get("/api/sources")
async def get_available_sources(tenant_id: str = None) -> str:
    """Get all available sources from the sources table for a tenant."""
    try:
        import local_db
        tenant_id = tenant_id or DEFAULT_TENANT_ID
        sources_data = await local_db.get_sources(tenant_id)
        
        # Format the sources with their details
        sources = []
        for source in sources_data:
            sources.append({
                "source_id": source.get("source_id"),
                "summary": source.get("summary"),
                "total_words": source.get("total_word_count"),
                "created_at": str(source.get("created_at")) if source.get("created_at") else None,
                "updated_at": str(source.get("updated_at")) if source.get("updated_at") else None
            })
        
        return json.dumps({
            "success": True,
            "sources": sources,
            "count": len(sources),
            "tenant_id": tenant_id
        }, indent=2)
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)

@app.post("/api/search")
async def perform_rag_query(query: str, source: str = None, match_count: int = 5) -> str:
    """Perform a RAG query on the stored content."""
    try:
        ctx = await get_context()
        
        # Vector search using local_db
        results = await search_documents(
            query=query,
            source_id=source if source and source.strip() else None,
            match_count=match_count
        )
        
        # Apply reranking if enabled
        use_reranking = os.getenv("USE_RERANKING", "false") == "true"
        if use_reranking and ctx.reranking_model:
            results = rerank_results(ctx.reranking_model, query, results, content_key="content")
        
        # Format the results
        formatted_results = []
        for result in results:
            formatted_result = {
                "url": result.get("url"),
                "content": result.get("content"),
                "metadata": result.get("metadata"),
                "similarity": result.get("similarity")
            }
            # Include rerank score if available
            if "rerank_score" in result:
                formatted_result["rerank_score"] = result["rerank_score"]
            formatted_results.append(formatted_result)
        
        return json.dumps({
            "success": True,
            "query": query,
            "source_filter": source,
            "search_mode": "vector",
            "reranking_applied": use_reranking and ctx.reranking_model is not None,
            "results": formatted_results,
            "count": len(formatted_results)
        }, indent=2)
    except Exception as e:
        return json.dumps({
            "success": False,
            "query": query,
            "error": str(e)
        }, indent=2)

# ============================================
# CHAT AGENT ENDPOINT
# ============================================

# Define tools for OpenAI function calling
CHAT_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "search_documentation",
            "description": TOOL_DESCRIPTIONS["search_documentation"],
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The search query to find relevant documentation"
                    },
                    "source": {
                        "type": "string",
                        "description": "Optional: filter by source domain (e.g., 'docs.aws.amazon.com')"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_sources",
            "description": TOOL_DESCRIPTIONS["get_sources"],
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_aws_services",
            "description": TOOL_DESCRIPTIONS["get_aws_services"],
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "description": "Optional: filter by category (e.g., 'Compute', 'Storage', 'Database')"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_aws_service_details",
            "description": TOOL_DESCRIPTIONS["get_aws_service_details"],
            "parameters": {
                "type": "object",
                "properties": {
                    "service_name": {
                        "type": "string",
                        "description": "The AWS service name (e.g., 'EC2', 'S3', 'Lambda')"
                    }
                },
                "required": ["service_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_aws_architecture",
            "description": TOOL_DESCRIPTIONS["get_aws_architecture"],
            "parameters": {
                "type": "object",
                "properties": {
                    "use_case": {
                        "type": "string",
                        "description": "Description of what you want to build (e.g., 'serverless API', 'data lake')"
                    }
                },
                "required": ["use_case"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "query_aws_graph",
            "description": TOOL_DESCRIPTIONS["query_aws_graph"],
            "parameters": {
                "type": "object",
                "properties": {
                    "cypher": {
                        "type": "string",
                        "description": "Cypher query to execute on the AWS services graph (e.g., 'MATCH (s:AWSService)-[r]->(t:AWSService) RETURN s.name, type(r), t.name LIMIT 10')"
                    }
                },
                "required": ["cypher"]
            }
        }
    }
]


async def execute_tool(tool_name: str, tool_args: dict) -> str:
    """Execute a tool and return the result as a string."""
    try:
        if tool_name == "search_documentation":
            results = await search_documents(
                query=tool_args.get("query", ""),
                source_id=tool_args.get("source"),
                match_count=5
            )
            if results:
                formatted = []
                for r in results:
                    formatted.append(f"**Source:** {r.get('url', 'Unknown')}\n{r.get('content', '')[:1000]}")
                return "\n\n---\n\n".join(formatted)
            return "No relevant documentation found."
        
        elif tool_name == "get_sources":
            import local_db
            sources = await local_db.get_sources()
            if sources:
                return "\n".join([f"- **{s['source_id']}**: {s.get('summary', 'No summary')[:100]}..." for s in sources])
            return "No sources available. Crawl some documentation first."
        
        elif tool_name == "get_aws_services":
            result = await list_aws_services(category=tool_args.get("category"))
            return result
        
        elif tool_name == "get_aws_service_details":
            result = await get_aws_service(service_name=tool_args.get("service_name", ""))
            return result
        
        elif tool_name == "get_aws_architecture":
            result = await get_aws_architecture(use_case=tool_args.get("use_case", ""))
            return result
        
        elif tool_name == "query_aws_graph":
            result = await query_aws_graph(cypher=tool_args.get("cypher", ""))
            return result
        
        else:
            return f"Unknown tool: {tool_name}"
    
    except Exception as e:
        return f"Error executing {tool_name}: {str(e)}"


@app.post("/api/chat")
async def chat(request: ChatRequest) -> Dict[str, Any]:
    """
    Chat with the CloudMigrate AI assistant.
    
    Args:
        request: ChatRequest with message and optional conversation_history
    
    Returns:
        JSON with the assistant's response and updated conversation history
    """
    try:
        message = request.message
        conversation_history = request.conversation_history
        
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return {
                "success": False,
                "error": "OPENAI_API_KEY not configured"
            }
        
        client = OpenAI(api_key=api_key)
        model = os.getenv("MODEL_CHOICE", "gpt-4o-mini")
        
        # Build messages array
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        
        # Add conversation history if provided
        if conversation_history:
            messages.extend(conversation_history)
        
        # Add current user message
        messages.append({"role": "user", "content": message})
        
        # Initial API call with tools
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            tools=CHAT_TOOLS,
            tool_choice="auto",
            temperature=0.7,
            max_tokens=2000
        )
        
        assistant_message = response.choices[0].message
        
        # Handle tool calls if any
        tool_calls_made = []
        while assistant_message.tool_calls:
            # Process each tool call
            tool_results = []
            for tool_call in assistant_message.tool_calls:
                tool_name = tool_call.function.name
                tool_args = json.loads(tool_call.function.arguments)
                
                # Execute the tool
                result = await execute_tool(tool_name, tool_args)
                
                tool_calls_made.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "result_preview": result[:200] + "..." if len(result) > 200 else result
                })
                
                tool_results.append({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "content": result
                })
            
            # Add assistant message with tool calls to messages
            messages.append({
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    }
                    for tc in assistant_message.tool_calls
                ]
            })
            
            # Add tool results
            messages.extend(tool_results)
            
            # Get next response
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                tools=CHAT_TOOLS,
                tool_choice="auto",
                temperature=0.7,
                max_tokens=2000
            )
            
            assistant_message = response.choices[0].message
        
        # Final response
        final_content = assistant_message.content or "I apologize, but I couldn't generate a response."
        
        # Build updated conversation history for the client
        updated_history = conversation_history or []
        updated_history.append({"role": "user", "content": message})
        updated_history.append({"role": "assistant", "content": final_content})
        
        return {
            "success": True,
            "response": final_content,
            "tools_used": tool_calls_made,
            "conversation_history": updated_history,
            "model": model
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# ============================================
# AWS SERVICES KNOWLEDGE GRAPH ENDPOINTS
# ============================================

@app.get("/api/aws/services")
async def list_aws_services(category: str = None, tenant_id: str = None) -> str:
    """
    List all AWS services in the knowledge graph for a tenant.
    
    Args:
        category: Optional category filter (e.g., 'Compute', 'Storage', 'Database')
        tenant_id: Tenant ID for multi-tenant isolation
    
    Returns:
        JSON with list of AWS services
    """
    try:
        ctx = await get_context()
        tenant_id = tenant_id or DEFAULT_TENANT_ID
        
        if not ctx.neo4j_driver:
            return json.dumps({
                "success": False,
                "error": "AWS Services graph not available. Set USE_KNOWLEDGE_GRAPH=true and configure Neo4j."
            }, indent=2)
        
        async with ctx.neo4j_driver.session() as session:
            if category:
                query = """
                MATCH (s:AWSService {category: $category, tenant_id: $tenant_id})
                RETURN s.name as name, s.category as category, s.description as description
                ORDER BY s.name
                """
                result = await session.run(query, category=category, tenant_id=tenant_id)
            else:
                query = """
                MATCH (s:AWSService {tenant_id: $tenant_id})
                RETURN s.name as name, s.category as category, s.description as description
                ORDER BY s.category, s.name
                """
                result = await session.run(query, tenant_id=tenant_id)
            
            services = []
            async for record in result:
                services.append({
                    "name": record["name"],
                    "category": record["category"],
                    "description": record["description"]
                })
            
            # Get unique categories for this tenant
            cat_result = await session.run(
                "MATCH (s:AWSService {tenant_id: $tenant_id}) RETURN DISTINCT s.category as category ORDER BY category",
                tenant_id=tenant_id
            )
            categories = [r["category"] async for r in cat_result]
            
            return json.dumps({
                "success": True,
                "services": services,
                "count": len(services),
                "categories": categories,
                "filter": category,
                "tenant_id": tenant_id
            }, indent=2)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)


@app.get("/api/aws/service/{service_name}")
async def get_aws_service(service_name: str, tenant_id: str = None) -> str:
    """
    Get details and relationships for a specific AWS service.
    
    Args:
        service_name: AWS service name (e.g., 'EC2', 'S3', 'Lambda')
        tenant_id: Tenant ID for multi-tenant isolation
    
    Returns:
        JSON with service details and all its relationships
    """
    try:
        ctx = await get_context()
        tenant_id = tenant_id or DEFAULT_TENANT_ID
        
        if not ctx.neo4j_driver:
            return json.dumps({
                "success": False,
                "error": "AWS Services graph not available. Set USE_KNOWLEDGE_GRAPH=true and configure Neo4j."
            }, indent=2)
        
        async with ctx.neo4j_driver.session() as session:
            # Get service details (scoped by tenant)
            service_query = """
            MATCH (s:AWSService {tenant_id: $tenant_id})
            WHERE toLower(s.name) = toLower($name)
            RETURN s.name as name, s.category as category, s.description as description,
                   s.pricing_model as pricing_model, s.use_cases as use_cases
            """
            result = await session.run(service_query, name=service_name, tenant_id=tenant_id)
            service_record = await result.single()
            
            if not service_record:
                return json.dumps({
                    "success": False,
                    "error": f"Service '{service_name}' not found"
                }, indent=2)
            
            service = {
                "name": service_record["name"],
                "category": service_record["category"],
                "description": service_record["description"],
                "pricing_model": service_record["pricing_model"],
                "use_cases": service_record["use_cases"]
            }
            
            # Get all relationships (scoped by tenant)
            rel_query = """
            MATCH (s:AWSService {tenant_id: $tenant_id})-[r]-(other:AWSService {tenant_id: $tenant_id})
            WHERE toLower(s.name) = toLower($name)
            RETURN type(r) as relationship, other.name as service, other.category as category,
                   CASE WHEN startNode(r) = s THEN 'outgoing' ELSE 'incoming' END as direction
            ORDER BY type(r), other.name
            """
            rel_result = await session.run(rel_query, name=service_name, tenant_id=tenant_id)
            
            relationships = {
                "connects_to": [],
                "requires": [],
                "triggers": [],
                "stores_in": [],
                "authenticates_with": [],
                "other": []
            }
            
            async for record in rel_result:
                rel_type = record["relationship"].lower()
                rel_data = {
                    "service": record["service"],
                    "category": record["category"],
                    "direction": record["direction"]
                }
                
                if rel_type in relationships:
                    relationships[rel_type].append(rel_data)
                else:
                    relationships["other"].append({**rel_data, "type": record["relationship"]})
            
            return json.dumps({
                "success": True,
                "service": service,
                "relationships": relationships
            }, indent=2)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)


@app.post("/api/aws/architecture")
async def get_aws_architecture(use_case: str, tenant_id: str = None) -> str:
    """
    Get recommended AWS architecture for a use case.
    
    Args:
        use_case: Description of what you're building (e.g., 'serverless API', 'data lake', 'web application')
        tenant_id: Tenant ID for multi-tenant isolation
    
    Returns:
        JSON with recommended services and architecture pattern
    """
    try:
        ctx = await get_context()
        tenant_id = tenant_id or DEFAULT_TENANT_ID
        
        if not ctx.neo4j_driver:
            return json.dumps({
                "success": False,
                "error": "AWS Services graph not available. Set USE_KNOWLEDGE_GRAPH=true and configure Neo4j."
            }, indent=2)
        
        async with ctx.neo4j_driver.session() as session:
            # Search for services related to the use case (scoped by tenant)
            query = """
            MATCH (s:AWSService {tenant_id: $tenant_id})
            WHERE toLower(s.description) CONTAINS toLower($use_case)
               OR toLower(s.name) CONTAINS toLower($use_case)
               OR ANY(uc IN s.use_cases WHERE toLower(uc) CONTAINS toLower($use_case))
            WITH s
            OPTIONAL MATCH (s)-[r]-(related:AWSService {tenant_id: $tenant_id})
            RETURN s.name as name, s.category as category, s.description as description,
                   collect(DISTINCT {name: related.name, relationship: type(r)}) as related_services
            ORDER BY s.category
            """
            result = await session.run(query, use_case=use_case, tenant_id=tenant_id)
            
            recommended = []
            async for record in result:
                recommended.append({
                    "name": record["name"],
                    "category": record["category"],
                    "description": record["description"],
                    "related_services": [r for r in record["related_services"] if r["name"]]
                })
            
            if not recommended:
                return json.dumps({
                    "success": True,
                    "use_case": use_case,
                    "message": "No specific services found for this use case. Try broader terms like 'compute', 'storage', 'database', 'serverless', 'containers'.",
                    "recommended_services": []
                }, indent=2)
            
            return json.dumps({
                "success": True,
                "use_case": use_case,
                "recommended_services": recommended,
                "count": len(recommended)
            }, indent=2)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "error": str(e)
        }, indent=2)


@app.post("/api/aws/query")
async def query_aws_graph(cypher: str, tenant_id: str = None) -> str:
    """
    Execute a custom Cypher query on the AWS services graph.
    
    Note: For security, queries are automatically scoped to tenant_id.
    Use $tenant_id parameter in your Cypher query for tenant filtering.
    
    Args:
        cypher: Cypher query to execute
        tenant_id: Tenant ID for multi-tenant isolation
    
    Returns:
        JSON with query results
    """
    try:
        ctx = await get_context()
        tenant_id = tenant_id or DEFAULT_TENANT_ID
        
        if not ctx.neo4j_driver:
            return json.dumps({
                "success": False,
                "error": "AWS Services graph not available. Set USE_KNOWLEDGE_GRAPH=true and configure Neo4j."
            }, indent=2)
        
        async with ctx.neo4j_driver.session() as session:
            # Pass tenant_id as parameter so queries can use it
            result = await session.run(cypher, tenant_id=tenant_id)
            
            records = []
            count = 0
            async for record in result:
                records.append(dict(record))
                count += 1
                if count >= 50:  # Limit results
                    break
            
            return json.dumps({
                "success": True,
                "query": cypher,
                "results": records,
                "count": len(records),
                "limited": count >= 50,
                "tenant_id": tenant_id
            }, indent=2)
            
    except Exception as e:
        return json.dumps({
            "success": False,
            "query": cypher,
            "error": str(e)
        }, indent=2)

async def crawl_markdown_file(crawler: AsyncWebCrawler, url: str) -> List[Dict[str, Any]]:
    """
    Crawl a .txt or markdown file.
    
    Args:
        crawler: AsyncWebCrawler instance
        url: URL of the file
        
    Returns:
        List of dictionaries with URL and markdown content
    """
    crawl_config = CrawlerRunConfig()

    result = await crawler.arun(url=url, config=crawl_config)
    if result.success and result.markdown:
        return [{'url': url, 'markdown': result.markdown}]
    else:
        print(f"Failed to crawl {url}: {result.error_message}")
        return []

async def crawl_batch(crawler: AsyncWebCrawler, urls: List[str], max_concurrent: int = 10) -> List[Dict[str, Any]]:
    """
    Batch crawl multiple URLs in parallel.
    
    Args:
        crawler: AsyncWebCrawler instance
        urls: List of URLs to crawl
        max_concurrent: Maximum number of concurrent browser sessions
        
    Returns:
        List of dictionaries with URL and markdown content
    """
    crawl_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, stream=False)
    dispatcher = MemoryAdaptiveDispatcher(
        memory_threshold_percent=70.0,
        check_interval=1.0,
        max_session_permit=max_concurrent
    )

    results = await crawler.arun_many(urls=urls, config=crawl_config, dispatcher=dispatcher)
    return [{'url': r.url, 'markdown': r.markdown} for r in results if r.success and r.markdown]

async def crawl_recursive_internal_links(crawler: AsyncWebCrawler, start_urls: List[str], max_depth: int = 3, max_concurrent: int = 10) -> List[Dict[str, Any]]:
    """
    Recursively crawl internal links from start URLs up to a maximum depth.
    
    Args:
        crawler: AsyncWebCrawler instance
        start_urls: List of starting URLs
        max_depth: Maximum recursion depth
        max_concurrent: Maximum number of concurrent browser sessions
        
    Returns:
        List of dictionaries with URL and markdown content
    """
    run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, stream=False)
    dispatcher = MemoryAdaptiveDispatcher(
        memory_threshold_percent=70.0,
        check_interval=1.0,
        max_session_permit=max_concurrent
    )

    visited = set()

    def normalize_url(url):
        return urldefrag(url)[0]

    current_urls = set([normalize_url(u) for u in start_urls])
    results_all = []

    for depth in range(max_depth):
        urls_to_crawl = [normalize_url(url) for url in current_urls if normalize_url(url) not in visited]
        if not urls_to_crawl:
            break

        results = await crawler.arun_many(urls=urls_to_crawl, config=run_config, dispatcher=dispatcher)
        next_level_urls = set()

        for result in results:
            norm_url = normalize_url(result.url)
            visited.add(norm_url)

            if result.success and result.markdown:
                results_all.append({'url': result.url, 'markdown': result.markdown})
                for link in result.links.get("internal", []):
                    next_url = normalize_url(link["href"])
                    if next_url not in visited:
                        next_level_urls.add(next_url)

        current_urls = next_level_urls

    return results_all

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "1021"))
    print(f"Starting Crawl4AI API server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)