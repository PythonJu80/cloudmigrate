"""
Flashcard Generator Module
==========================
Generates spaced-repetition flashcards from scenarios.
"""

import json
from typing import List, Optional, Dict
from pydantic import BaseModel
from openai import AsyncOpenAI
import os

from prompts import FLASHCARD_GENERATOR_PROMPT, PERSONA_FLASHCARD_PROMPT
from utils import get_request_api_key, ApiKeyRequiredError


class Flashcard(BaseModel):
    """Single flashcard"""
    front: str
    back: str
    difficulty: str  # easy, medium, hard
    aws_services: List[str] = []
    tags: List[str] = []


class FlashcardDeck(BaseModel):
    """Generated flashcard deck"""
    title: str
    description: str
    cards: List[Flashcard]
    total_cards: int
    difficulty_distribution: dict  # {"easy": 5, "medium": 10, "hard": 5}


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


async def generate_flashcards(
    scenario_title: str,
    business_context: str,
    aws_services: List[str],
    user_level: str = "intermediate",
    card_count: int = 20,
    challenges: Optional[List[dict]] = None,
    persona_context: Optional[Dict] = None,
) -> FlashcardDeck:
    """Generate flashcards for a scenario - persona-aware."""
    
    # Use persona-specific prompt if persona provided
    if persona_context:
        base_prompt = PERSONA_FLASHCARD_PROMPT.format(
            scenario_title=scenario_title,
            business_context=business_context,
            cert_name=persona_context.get("cert_name", "AWS Certification"),
            focus_areas=persona_context.get("focus_areas", ""),
            level=persona_context.get("level", "associate"),
            card_count=card_count,
        )
    else:
        base_prompt = FLASHCARD_GENERATOR_PROMPT.format(
            scenario_title=scenario_title,
            business_context=business_context,
            aws_services=", ".join(aws_services),
            user_level=user_level,
            card_count=card_count,
        )
    
    system_prompt = f"""You create educational flashcards for cloud architecture.
Return JSON with: title, description, cards (array of: front, back, difficulty, aws_services, tags)

{base_prompt}"""
    
    user_prompt = f"Generate {card_count} flashcards for: {scenario_title}"
    if persona_context:
        user_prompt += f"\nFocus on {persona_context.get('cert_name', 'AWS')} certification topics."
    if challenges:
        user_prompt += "\n\nChallenges to cover:\n"
        for c in challenges:
            user_prompt += f"- {c.get('title', '')}\n"
    
    result = await _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ])
    
    cards = [Flashcard(**c) for c in result.get("cards", [])]
    
    return FlashcardDeck(
        title=result.get("title", f"Flashcards: {scenario_title}"),
        description=result.get("description", ""),
        cards=cards,
        total_cards=len(cards),
        difficulty_distribution={
            "easy": len([c for c in cards if c.difficulty == "easy"]),
            "medium": len([c for c in cards if c.difficulty == "medium"]),
            "hard": len([c for c in cards if c.difficulty == "hard"]),
        },
    )


async def generate_flashcards_for_service(
    service_name: str,
    user_level: str = "intermediate",
    card_count: int = 10,
    context: Optional[str] = None,
) -> FlashcardDeck:
    """Generate flashcards focused on a specific AWS service."""
    
    system_prompt = f"""Create {card_count} flashcards about AWS {service_name}.
User Level: {user_level}
{"Context: " + context if context else ""}

Return JSON with: title, description, cards (array of: front, back, difficulty, aws_services, tags)"""

    result = await _chat_json([
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Generate flashcards for AWS {service_name}"},
    ])
    
    cards = [Flashcard(**c) for c in result.get("cards", [])]
    
    return FlashcardDeck(
        title=result.get("title", f"AWS {service_name} Flashcards"),
        description=result.get("description", ""),
        cards=cards,
        total_cards=len(cards),
        difficulty_distribution={
            "easy": len([c for c in cards if c.difficulty == "easy"]),
            "medium": len([c for c in cards if c.difficulty == "medium"]),
            "hard": len([c for c in cards if c.difficulty == "hard"]),
        },
    )
