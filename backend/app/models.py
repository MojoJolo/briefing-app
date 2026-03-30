from datetime import datetime
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
    updated_at: datetime


class TaskUpdate(BaseModel):
    status: int | None = None
    task: str | None = None


class ProcessResponse(BaseModel):
    tasks: list[TaskResponse]

