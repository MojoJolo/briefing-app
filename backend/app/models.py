from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class Task(BaseModel):
    text: str
    category: str


class ProcessRequest(BaseModel):
    input: str


class LabelCreate(BaseModel):
    name: str
    color: str
    description: str = ""


class LabelUpdate(BaseModel):
    name: str | None = None
    color: str | None = None
    description: str | None = None


class LabelResponse(BaseModel):
    id: UUID
    name: str
    color: str
    description: str
    created_at: datetime
    updated_at: datetime


class TaskResponse(BaseModel):
    id: UUID
    task: str
    category: str
    status: int
    original_input: str
    show_original: bool
    created_at: datetime
    updated_at: datetime
    comment_count: int = 0
    label_id: UUID | None = None
    label_name: str | None = None
    label_color: str | None = None


class TaskUpdate(BaseModel):
    status: int | None = None
    task: str | None = None
    category: str | None = None
    show_original: bool | None = None
    label_id: UUID | None = None
    clear_label: bool = False


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
