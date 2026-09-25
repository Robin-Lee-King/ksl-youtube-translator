import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Check the project root .env file.")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


# SQLite only treats a PK column as the autoincrementing rowid alias when its declared type is the
# exact name "INTEGER" — "BIGINT" (what BigInteger compiles to by default) does not qualify, so a
# BigInteger PK never gets a value on insert and every such table fails with a NOT NULL error the
# moment SQLite is the engine (local/dev only — Postgres in production isn't affected: BIGSERIAL/
# IDENTITY works regardless of the literal type name). Registered here so both the app and Alembic
# (alembic/env.py imports this module) see it before any table is created or queried.
@compiles(BigInteger, "sqlite")
def _bigint_as_integer_on_sqlite(type_, compiler, **kw):
    return "INTEGER"


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
