from contextlib import asynccontextmanager
from uuid import UUID

import asyncpg
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user_id
from app.database import connect, disconnect, get_db
from app.models import (
    ProcessRequest, ProcessResponse, TaskUpdate, TaskResponse,
    CommentCreate, CommentUpdate, CommentResponse,
    LabelCreate, LabelUpdate, LabelResponse,
)
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


# ---------------------------------------------------------------------------
# Labels
# ---------------------------------------------------------------------------

@app.get("/labels", response_model=list[LabelResponse])
async def get_labels(
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    rows = await db.fetch(
        """
        SELECT id, name, color, description, created_at, updated_at
        FROM labels
        WHERE user_id = $1
        ORDER BY lower(name)
        """,
        user_id,
    )
    return [LabelResponse(**row) for row in rows]


@app.post("/labels", response_model=LabelResponse, status_code=201)
async def create_label(
    body: LabelCreate,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    try:
        row = await db.fetchrow(
            """
            INSERT INTO labels (user_id, name, color, description)
            VALUES ($1, $2, $3, $4)
            RETURNING id, name, color, description, created_at, updated_at
            """,
            user_id,
            body.name,
            body.color,
            body.description,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="A label with that name already exists")
    return LabelResponse(**row)


@app.patch("/labels/{label_id}", response_model=LabelResponse)
async def update_label(
    label_id: UUID,
    body: LabelUpdate,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    try:
        row = await db.fetchrow(
            """
            UPDATE labels SET
                name        = COALESCE($1, name),
                color       = COALESCE($2, color),
                description = COALESCE($3, description),
                updated_at  = NOW()
            WHERE id = $4 AND user_id = $5
            RETURNING id, name, color, description, created_at, updated_at
            """,
            body.name,
            body.color,
            body.description,
            label_id,
            user_id,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="A label with that name already exists")
    if row is None:
        raise HTTPException(status_code=404, detail="Label not found")
    return LabelResponse(**row)


@app.delete("/labels/{label_id}", status_code=204)
async def delete_label(
    label_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    await db.execute(
        "DELETE FROM labels WHERE id = $1 AND user_id = $2",
        label_id,
        user_id,
    )


# ---------------------------------------------------------------------------
# Tasks
# ---------------------------------------------------------------------------

@app.get("/tasks", response_model=list[TaskResponse])
async def get_tasks(
    db: asyncpg.Connection = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    rows = await db.fetch(
        """
        SELECT t.id, t.task, t.category, t.status, t.original_input, t.show_original,
               t.created_at, t.updated_at,
               t.label_id, l.name AS label_name, l.color AS label_color,
               COALESCE(c.cnt, 0) AS comment_count
        FROM tasks t
        LEFT JOIN labels l ON l.id = t.label_id
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
                status       = COALESCE($1, status),
                task         = COALESCE($2, task),
                category     = COALESCE($3, category),
                show_original = COALESCE($4, show_original),
                label_id     = CASE WHEN $5 THEN NULL ELSE COALESCE($6, label_id) END,
                updated_at   = NOW()
            WHERE id = $7
              AND user_id = $8
            RETURNING id, task, category, status, original_input, show_original,
                      label_id, created_at, updated_at
        )
        SELECT u.*, l.name AS label_name, l.color AS label_color,
               COALESCE(c.cnt, 0) AS comment_count
        FROM updated u
        LEFT JOIN labels l ON l.id = u.label_id
        LEFT JOIN (SELECT task_id, COUNT(*) AS cnt FROM comments GROUP BY task_id) c ON c.task_id = u.id
        """,
        body.status,
        body.task,
        body.category,
        body.show_original,
        body.clear_label,
        body.label_id,
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
    label_rows = await db.fetch(
        "SELECT id, name, color, description FROM labels WHERE user_id = $1 ORDER BY lower(name)",
        user_id,
    )
    labels = [{"id": str(r["id"]), "name": r["name"], "description": r["description"]} for r in label_rows]

    tasks = await provider.process(body.input, labels)

    label_map = {r["name"].lower(): r["id"] for r in label_rows}
    label_ids = [label_map.get(t.category.lower()) for t in tasks]

    rows = await db.fetch(
        """
        INSERT INTO tasks (task, label_id, original_input, user_id)
        SELECT t.task, t.label_id, t.original_input, $4
        FROM unnest($1::text[], $2::uuid[], $3::text[]) AS t(task, label_id, original_input)
        RETURNING id, task, category, status, original_input, show_original,
                  label_id, created_at, updated_at
        """,
        [t.text for t in tasks],
        label_ids,
        [body.input] * len(tasks),
        user_id,
    )

    # Fetch label name/color for newly inserted tasks
    label_id_to_info = {r["id"]: r for r in label_rows}
    task_responses = []
    for row in rows:
        d = dict(row)
        d["comment_count"] = 0
        if d["label_id"] and d["label_id"] in label_id_to_info:
            info = label_id_to_info[d["label_id"]]
            d["label_name"] = info["name"]
            d["label_color"] = info["color"]
        task_responses.append(TaskResponse(**d))

    return ProcessResponse(tasks=task_responses)


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------

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
            comment    = COALESCE($1, comment),
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
