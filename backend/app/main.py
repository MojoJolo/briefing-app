from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import asyncpg
from fastapi import Depends

from app.database import connect, disconnect, get_db
from app.models import ProcessRequest, ProcessResponse, TaskUpdate, TaskResponse
from app.llm.factory import provider


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    yield
    await disconnect()


app = FastAPI(title="Briefing App API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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
async def get_tasks(db: asyncpg.Connection = Depends(get_db)):
    rows = await db.fetch(
        "SELECT id, task, category, status, updated_at FROM tasks WHERE status != -1 ORDER BY created_at DESC"
    )
    return [TaskResponse(**row) for row in rows]


@app.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: UUID, body: TaskUpdate, db: asyncpg.Connection = Depends(get_db)):
    row = await db.fetchrow(
        """
        UPDATE tasks SET
            status = COALESCE($1, status),
            task = COALESCE($2, task),
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, task, category, status, updated_at
        """,
        body.status,
        body.task,
        task_id,
    )
    return TaskResponse(**row)


@app.delete("/tasks/{task_id}", status_code=204)
async def delete_task(task_id: UUID, db: asyncpg.Connection = Depends(get_db)):
    await db.execute(
        "UPDATE tasks SET status = -1, updated_at = NOW() WHERE id = $1",
        task_id,
    )


@app.post("/process", response_model=ProcessResponse)
async def process_input(body: ProcessRequest, db: asyncpg.Connection = Depends(get_db)):
    tasks = await provider.process(body.input)

    rows = await db.fetch(
        """
        INSERT INTO tasks (task, category)
        SELECT t.task, t.category
        FROM unnest($1::text[], $2::text[]) AS t(task, category)
        RETURNING id, task, category, status, updated_at
        """,
        [t.text for t in tasks],
        [t.category.lower() for t in tasks],
    )

    return ProcessResponse(tasks=[TaskResponse(**row) for row in rows])
