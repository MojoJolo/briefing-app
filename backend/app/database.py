from pathlib import Path

import asyncpg

from app.config import settings

_pool: asyncpg.Pool | None = None

MIGRATIONS_DIR = Path(__file__).parent.parent / "migrations"


async def connect():
    global _pool
    _pool = await asyncpg.create_pool(settings.DATABASE_URL)
    await _run_migrations()


async def disconnect():
    if _pool:
        await _pool.close()


async def get_db() -> asyncpg.Connection:
    async with _pool.acquire() as conn:
        yield conn


async def _run_migrations():
    async with _pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS _migrations (
                filename TEXT PRIMARY KEY,
                applied_at TIMESTAMP NOT NULL DEFAULT NOW()
            )
        """)
        applied = {r["filename"] for r in await conn.fetch("SELECT filename FROM _migrations")}
        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            if path.name not in applied:
                await conn.execute(path.read_text())
                await conn.execute("INSERT INTO _migrations (filename) VALUES ($1)", path.name)

