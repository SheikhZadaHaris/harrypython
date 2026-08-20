import asyncio
from abc import ABC, abstractmethod
from typing import List, Dict
import openai
import logging
from app.core.config import settings
from app.core.exceptions import AIProviderError

logger = logging.getLogger(__name__)

class AIProvider(ABC):
    @abstractmethod
    async def generate_response(self, messages: List[Dict]) -> str:
        pass

class OpenCodeZenProvider(AIProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            base_url='https://opencode.ai/zen/v1',
            api_key=settings.OPENCODE_API_KEY
        )
        self.primary_model = settings.PRIMARY_MODEL
        # Alternative model fallback pool when primary is overloaded/rate-limited
        self.fallback_models = ["deepseek-v4-flash-free", "nemotron-3-ultra-free", "big-pickle"]

    async def generate_response(self, messages: List[Dict]) -> str:
        models_to_try = [self.primary_model] + self.fallback_models
        last_error = None

        for model in models_to_try:
            retries = 2
            backoff = [1, 2]
            
            for attempt in range(retries):
                try:
                    logger.info(f"Attempting to generate response with model: {model}")
                    response = await self.client.chat.completions.create(
                        model=model,
                        messages=messages,
                        timeout=30.0
                    )
                    return response.choices[0].message.content
                except Exception as e:
                    last_error = e
                    logger.error(f"OpenCode API error with model {model} on attempt {attempt + 1}: {e}")
                    if attempt < retries - 1:
                        await asyncio.sleep(backoff[attempt])
            
            logger.warning(f"Model {model} failed all retry attempts. Trying next fallback...")

        raise AIProviderError(f"Failed to generate AI response from all available models. Last error: {str(last_error)}")


class AIProviderManager:
    def __init__(self):
        self.provider = OpenCodeZenProvider()

    async def get_response(self, messages: List[Dict]) -> str:
        try:
            return await self.provider.generate_response(messages)
        except Exception as e:
            logger.error(f"ProviderManager Error: {e}")
            raise AIProviderError(str(e))
