from app.config import settings
from app.llm.base import LLMProvider


def get_provider() -> LLMProvider:
    if settings.LLM_PROVIDER == "claude":
        from app.llm.claude import ClaudeProvider
        return ClaudeProvider(api_key=settings.ANTHROPIC_API_KEY)
    raise ValueError(f"Unknown LLM provider: {settings.LLM_PROVIDER!r}")
