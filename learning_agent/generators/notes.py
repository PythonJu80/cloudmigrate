"""
Study Notes Generator Module
============================
Generates comprehensive study notes from scenarios.
"""

import json
import os
from typing import List, Optional, Dict
from pydantic import BaseModel
from openai import AsyncOpenAI

from prompts import NOTES_GENERATOR_PROMPT, PERSONA_NOTES_PROMPT
from utils import get_request_api_key, ApiKeyRequiredError


class NotesSection(BaseModel):
    """Section within study notes"""
    id: str
    title: str
    level: int  # 1 = h1, 2 = h2, etc.
    content: str
    aws_services: List[str] = []


class StudyNotes(BaseModel):
    """Generated study notes"""
    title: str
    summary: str  # Executive summary
    content: str  # Full markdown content
    sections: List[NotesSection]
    aws_services: List[str]
    estimated_read_time_minutes: int
    key_takeaways: List[str]


async def _chat_json(messages: List[Dict], model: str = "gpt-4o", api_key: Optional[str] = None) -> Dict:
    """Simple JSON chat completion."""
    # Priority: explicit param > request context (no environment fallback)
    key = api_key or get_request_api_key()
    if not key:
        raise ApiKeyRequiredError(
            "OpenAI API key required. Please configure your API key in Settings."
        )
    client = AsyncOpenAI(api_key=key)
    response = await client.chat.completions.create(
        model=model,
        messages=messages,
        response_format={"type": "json_object"},
        temperature=0.7,
    )
    return json.loads(response.choices[0].message.content)


async def generate_notes(
    scenario_title: str,
    business_context: str,
    technical_requirements: List[str],
    compliance_requirements: List[str],
    aws_services: List[str],
    user_level: str = "intermediate",
    challenges: Optional[List[dict]] = None,
    persona_context: Optional[Dict] = None,
) -> StudyNotes:
    """Generate study notes for a scenario - persona-aware."""
    
    # Use persona-specific prompt if provided
    if persona_context:
        base_prompt = PERSONA_NOTES_PROMPT.format(
            scenario_title=scenario_title,
            business_context=business_context,
            aws_services=", ".join(aws_services),
            cert_name=persona_context.get("cert_name", "AWS Certification"),
            focus_areas=persona_context.get("focus_areas", ""),
            level=persona_context.get("level", "associate"),
        )
    else:
        base_prompt = NOTES_GENERATOR_PROMPT.format(
            scenario_title=scenario_title,
            business_context=business_context,
            technical_requirements="\n".join(f"- {r}" for r in technical_requirements),
            compliance_requirements="\n".join(f"- {r}" for r in compliance_requirements),
            aws_services=", ".join(aws_services),
            user_level=user_level,
        )
    
    system_prompt = f"""You are an expert technical writer creating study guides.
Return JSON with: title, summary, content (markdown), sections (array of: id, title, level, content, aws_services), aws_services, key_takeaways

{base_prompt}"""
    
    user_prompt = f"Generate study notes for: {scenario_title}"
    if persona_context:
        user_prompt += f"\nFocus on {persona_context.get('cert_name', 'AWS')} certification exam topics."
    if challenges:
        user_prompt += "\n\nChallenges:\n"
        for c in challenges:
            user_prompt += f"- {c.get('title', '')}\n"
    
    result = await _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ])
    
    content = result.get("content", "")
    word_count = len(content.split())
    
    return StudyNotes(
        title=result.get("title", scenario_title),
        summary=result.get("summary", ""),
        content=content,
        sections=[NotesSection(**s) for s in result.get("sections", [])],
        aws_services=result.get("aws_services", aws_services),
        estimated_read_time_minutes=max(1, word_count // 200),
        key_takeaways=result.get("key_takeaways", []),
    )


async def generate_service_deep_dive(
    service_name: str,
    user_level: str = "intermediate",
    use_case: Optional[str] = None,
) -> StudyNotes:
    """Generate a deep-dive study guide for a specific AWS service."""
    
    system_prompt = f"""Create a comprehensive study guide for AWS {service_name}.
User Level: {user_level}
{"Use Case: " + use_case if use_case else ""}

Return JSON with: title, summary, content (markdown), sections, aws_services, key_takeaways"""

    result = await _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate deep-dive for AWS {service_name}"},
    ])
    
    content = result.get("content", "")
    
    return StudyNotes(
        title=result.get("title", f"AWS {service_name} Deep Dive"),
        summary=result.get("summary", ""),
        content=content,
        sections=[NotesSection(**s) for s in result.get("sections", [])],
        aws_services=result.get("aws_services", [service_name]),
        estimated_read_time_minutes=max(1, len(content.split()) // 200),
        key_takeaways=result.get("key_takeaways", []),
    )


async def generate_migration_guide(
    source_system: str,
    target_service: str,
    user_level: str = "intermediate",
    constraints: Optional[List[str]] = None,
) -> StudyNotes:
    """Generate a migration-focused study guide."""
    
    system_prompt = f"""Create a migration study guide: {source_system} → AWS {target_service}
User Level: {user_level}
{"Constraints: " + ", ".join(constraints) if constraints else ""}

Return JSON with: title, summary, content (markdown), sections, aws_services, key_takeaways"""

    result = await _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate migration guide: {source_system} to AWS {target_service}"},
    ])
    
    content = result.get("content", "")
    
    return StudyNotes(
        title=result.get("title", f"Migration: {source_system} → {target_service}"),
        summary=result.get("summary", ""),
        content=content,
        sections=[NotesSection(**s) for s in result.get("sections", [])],
        aws_services=result.get("aws_services", [target_service]),
        estimated_read_time_minutes=max(1, len(content.split()) // 200),
        key_takeaways=result.get("key_takeaways", []),
    )
