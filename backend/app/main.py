from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import asyncpg

from app.auth import get_current_user_id
from app.database import connect, disconnect, get_db
from app.models import ProcessRequest, ProcessResponse, TaskUpdate, TaskResponse, CommentCreate, CommentUpdate, CommentResponse
from app.llm.factory import provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield
    await disconnect()


app = FastAPI(title="Briefing App API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5183"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Briefing App API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/tasks", response_model=list[TaskResponse])
async def get_tasks(
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    rows = await db.fetch(
        """
        SELECT t.id, t.task, t.category, t.status, t.original_input, t.show_original, t.created_at, t.updated_at,
               COALESCE(c.cnt, 0) AS comment_count
        FROM tasks t
        LEFT JOIN (SELECT task_id, COUNT(*) AS cnt FROM comments GROUP BY task_id) c ON c.task_id = t.id
        WHERE t.status != -1
          AND t.user_id = $1
        ORDER BY t.created_at DESC
        """,
        user_id,
    )
    return [TaskResponse(**row) for row in rows]


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    row = await db.fetchrow(
        """
        WITH updated AS (
            UPDATE tasks SET
                status = COALESCE($1, status),
                task = COALESCE($2, task),
                category = COALESCE($3, category),
                show_original = COALESCE($4, show_original),
                updated_at = NOW()
            WHERE id = $5
              AND user_id = $6
            RETURNING id, task, category, status, original_input, show_original, created_at, updated_at
        )
        SELECT u.*, COALESCE(c.cnt, 0) AS comment_count
        FROM updated u
        LEFT JOIN (SELECT task_id, COUNT(*) AS cnt FROM comments GROUP BY task_id) c ON c.task_id = u.id
        """,
        body.status,
        body.task,
        body.category,
        body.show_original,
        task_id,
        user_id,
    )
    if row is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse(**row)


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    await db.execute(
        "UPDATE tasks SET status = -1, updated_at = NOW() WHERE id = $1 AND user_id = $2",
        task_id,
        user_id,
    )


@app.post("/process", response_model=ProcessResponse)
async def process_input(
    body: ProcessRequest,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    tasks = await provider.process(body.input)

    rows = await db.fetch(
        """
        INSERT INTO tasks (task, category, original_input, user_id)
        SELECT t.task, t.category, t.original_input, $4
        FROM unnest($1::text[], $2::text[], $3::text[]) AS t(task, category, original_input)
        RETURNING id, task, category, status, original_input, show_original, created_at, updated_at
        """,
        [t.text for t in tasks],
        [t.category.lower() for t in tasks],
        [body.input] * len(tasks),
        user_id,
    )

    return ProcessResponse(tasks=[TaskResponse(**row) for row in rows])


async def _assert_task_owner(db: asyncpg.Connection, task_id: UUID, user_id: UUID):
    exists = await db.fetchval(
        "SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2 AND status != -1",
        task_id,
        user_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Task not found")


@app.get("/tasks/{task_id}/comments", response_model=list[CommentResponse])
async def get_comments(
    task_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    await _assert_task_owner(db, task_id, user_id)
    rows = await db.fetch(
        "SELECT id, task_id, comment, created_at, updated_at FROM comments WHERE task_id = $1 ORDER BY created_at ASC",
        task_id,
    )
    return [CommentResponse(**row) for row in rows]


@app.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    task_id: UUID,
    body: CommentCreate,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    await _assert_task_owner(db, task_id, user_id)
    row = await db.fetchrow(
        """
        INSERT INTO comments (task_id, comment)
        VALUES ($1, $2)
        RETURNING id, task_id, comment, created_at, updated_at
        """,
        task_id,
        body.comment,
    )
    return CommentResponse(**row)


@app.patch("/comments/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    body: CommentUpdate,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    existing = await db.fetchrow(
        "SELECT c.id FROM comments c JOIN tasks t ON t.id = c.task_id WHERE c.id = $1 AND t.user_id = $2",
        comment_id,
        user_id,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    row = await db.fetchrow(
        """
        UPDATE comments SET
            comment = COALESCE($1, comment),
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, task_id, comment, created_at, updated_at
        """,
        body.comment,
        comment_id,
    )
    return CommentResponse(**row)


@app.delete("/comments/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    existing = await db.fetchrow(
        "SELECT c.id FROM comments c JOIN tasks t ON t.id = c.task_id WHERE c.id = $1 AND t.user_id = $2",
        comment_id,
        user_id,
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Comment not found")
    await db.execute("DELETE FROM comments WHERE id = $1", comment_id)
