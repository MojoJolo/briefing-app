import json
import anthropic
from app.llm.base import LLMProvider
from app.models import Task

SYSTEM_PROMPT = """\
You are a task parser for a work briefing app. Given free-form input from a user, \
extract one or more actionable tasks and optionally assign a label to each.

For each task return:
- text: a concise description of the task (keep the user's wording when possible, and always preserve any URLs or links exactly as provided)
- category: one of "", "BLOCKER", "ISSUE", "PENDING", "DELEGATED"
  - Leave blank ("") for most tasks — this is the default
  - BLOCKER: only when text clearly implies progress is blocked (e.g. "blocked", "cannot proceed", "failing", "stuck because")
  - ISSUE: only when text clearly implies a bug or investigation (e.g. "issue", "bug", "investigate", "check why")
  - PENDING: only when text clearly implies waiting or follow-up (e.g. "follow up", "waiting for", "pending reply", "check back later")
  - DELEGATED: only when text clearly implies another person will do the work (e.g. "X to check", "ask X to", "Gene to investigate")
  - Do not force classification — most tasks should remain blank

Always call the extract_tasks tool with your result.\
"""

TOOL = {
    "name": "extract_tasks",
    "description": "Extract and classify tasks from the user's input.",
    "input_schema": {
        "type": "object",
        "properties": {
            "tasks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "text": {"type": "string"},
                        "category": {
                            "type": "string",
                            "enum": ["", "BLOCKER", "ISSUE", "PENDING", "DELEGATED"],
                        },
                    },
                    "required": ["text", "category"],
                },
            }
        },
        "required": ["tasks"],
    },
}


class ClaudeProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "claude-haiku-4-5"):
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def process(self, text: str) -> list[Task]:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=[TOOL],
            tool_choice={"type": "tool", "name": "extract_tasks"},
            messages=[{"role": "user", "content": text}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "extract_tasks":
                raw = block.input if isinstance(block.input, dict) else json.loads(block.input)
                return [Task(**t) for t in raw["tasks"]]

        return []
