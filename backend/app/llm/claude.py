import json
import anthropic
from app.llm.base import LLMProvider
from app.models import Task

_BASE_INSTRUCTIONS = """\
You are a task parser for a work briefing app. Given free-form input from a user, \
extract one or more actionable tasks.

For each task return:
- text: fix spelling errors and unclear phrasing only. Do not change the grammatical \
structure or voice of the input — if the user writes a noun phrase, keep it a noun phrase; \
do not convert to imperative form. Always preserve URLs and links exactly as provided.
- category: a label name for the task (see below).

Always call the extract_tasks tool with your result.\
"""

_NO_LABELS_INSTRUCTIONS = """\
No labels are configured. Use empty string "" for category on all tasks.\
"""


def _build_system_prompt(labels: list[dict]) -> str:
    if not labels:
        return f"{_BASE_INSTRUCTIONS}\n\n{_NO_LABELS_INSTRUCTIONS}"

    lines = [
        f"{_BASE_INSTRUCTIONS}",
        "",
        "Available labels — only assign when clearly implied by the text. Most tasks should use \"\" (no label):",
    ]
    for label in labels:
        desc = label.get("description", "").strip()
        if desc:
            lines.append(f'- "{label["name"]}": {desc}')
        else:
            lines.append(f'- "{label["name"]}"')
    lines.append('- "": everything else — most tasks should use this')
    return "\n".join(lines)


def _build_tool(labels: list[dict]) -> dict:
    category_enum = [""] + [label["name"] for label in labels]
    return {
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
                                "enum": category_enum,
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

    async def process(self, text: str, labels: list[dict]) -> list[Task]:
        system_prompt = _build_system_prompt(labels)
        tool = _build_tool(labels)

        response = await self._client.messages.create(
            model=self._model,
            max_tokens=1024,
            system=system_prompt,
            tools=[tool],
            tool_choice={"type": "tool", "name": "extract_tasks"},
            messages=[{"role": "user", "content": text}],
        )

        for block in response.content:
            if block.type == "tool_use" and block.name == "extract_tasks":
                raw = block.input if isinstance(block.input, dict) else json.loads(block.input)
                return [Task(**t) for t in raw["tasks"]]

        return []
