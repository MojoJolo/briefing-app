from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class Task(BaseModel):
    text: str
    category: Literal["BLOCKER", "ISSUE", "PENDING", "DELEGATED", ""]


class ProcessRequest(BaseModel):
    input: str


class TaskResponse(BaseModel):
    id: UUID
    task: str
    category: str
    status: int
    updated_at: datetime
    comment_count: int = 0


class TaskUpdate(BaseModel):
    status: int | None = None
    task: str | None = None
    category: str | None = None


class ProcessResponse(BaseModel):
    tasks: list[TaskResponse]


class CommentResponse(BaseModel):
    id: UUID
    task_id: UUID
    comment: str
    created_at: datetime
    updated_at: datetime


class CommentCreate(BaseModel):
    comment: str


class CommentUpdate(BaseModel):
    comment: str | None = None

