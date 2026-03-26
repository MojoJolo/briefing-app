from abc import ABC, abstractmethod
from app.models import Task


class LLMProvider(ABC):
    @abstractmethod
    async def process(self, text: str) -> list[Task]:
        ...
