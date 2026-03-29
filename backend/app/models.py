from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class Task(BaseModel):
    text: str
    category: Literal["BLOCKER", "ISSUE", "PENDING"]


class ProcessRequest(BaseModel):
    input: str


class TaskResponse(BaseModel):
    id: UUID
    task: str
    category: str
    status: int


class ProcessResponse(BaseModel):
    tasks: list[TaskResponse]

