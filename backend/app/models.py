from typing import Literal
from pydantic import BaseModel


class Task(BaseModel):
    text: str
    category: Literal["BLOCKER", "ISSUE", "PENDING"]


class ProcessRequest(BaseModel):
    input: str


class ProcessResponse(BaseModel):
    tasks: list[Task]
