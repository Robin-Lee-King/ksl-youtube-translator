"""Exercise real repository deletes and FK migration using isolated SQLite databases."""
import importlib.util
import io
from pathlib import Path
import sys
import unittest
import uuid

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import MetaData, create_engine, event, inspect, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from database import Base, get_db
from models import TranscriptSegment, TranslationJob, User, Video
from routers.auth import get_current_user
from routers.history import router

spec = importlib.util.spec_from_file_location(
    "cascade_migration",
    ROOT / "alembic/versions/7c8e9a0b1d2f_cascade_job_transcript_deletion.py",
)
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class HistoryDeletionTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://", poolclass=StaticPool,
            connect_args={"check_same_thread": False},
        )
        self.addCleanup(self.engine.dispose)

        @event.listens_for(self.engine, "connect")
        def enable_foreign_keys(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")

        # Reproduce the existing schema, before the new migration, with real data.
        metadata = MetaData()
        for table in Base.metadata.sorted_tables:
            table.to_metadata(metadata)
        for constraint in metadata.tables["transcript_segments"].foreign_key_constraints:
            constraint.ondelete = None
            for fk in constraint.elements:
                fk.ondelete = None
        metadata.create_all(self.engine)
        with Session(self.engine) as db:
            db.add_all([
                User(id=1, name="Owner", username="owner", email="owner@example.com", password_hash="unused"),
                User(id=2, name="Other", username="other", email="other@example.com", password_hash="unused"),
                Video(id=1, source_url="https://youtu.be/test", youtube_video_id="test"),
            ])
            db.flush()
            self.public_ids = [uuid.uuid4() for _ in range(4)]
            db.add_all([
                TranslationJob(id=i, public_id=public_id, video_id=1,
                               user_id=2 if i == 3 else 1 if i != 4 else None,
                               status="COMPLETED")
                for i, public_id in enumerate(self.public_ids, 1)
            ])
            db.flush()
            db.add_all([
                TranscriptSegment(id=i, translation_job_id=job_id, sequence_no=i,
                                  start_ms=0, end_ms=1000, source_text="Keep data")
                for i, job_id in enumerate([1, 1, 3, 4], 1)
            ])
            db.commit()
        self.app = FastAPI()
        self.app.include_router(router)

        def database_override():
            with Session(self.engine) as db:
                yield db

        self.app.dependency_overrides[get_db] = database_override
        self.app.dependency_overrides[get_current_user] = lambda: User(id=1)
        self.client = TestClient(self.app, raise_server_exceptions=False)
        self.addCleanup(self.client.close)

    def migrate(self, direction="upgrade"):
        with self.engine.begin() as connection:
            with Operations.context(MigrationContext.configure(connection)):
                getattr(migration, direction)()

    def delete(self, index):
        return self.client.delete(f"/history/{self.public_ids[index - 1]}")

    def segment_ids(self):
        with Session(self.engine) as db:
            return list(db.scalars(select(TranscriptSegment.id).order_by(TranscriptSegment.id)))

    def test_existing_segments_migrate_and_delete_without_500(self):
        self.assertEqual(self.delete(1).status_code, 500)
        self.migrate()
        self.assertEqual(self.segment_ids(), [1, 2, 3, 4])
        response = self.delete(1)
        self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(response.content, b"")
        self.assertEqual(self.segment_ids(), [3, 4])
        with Session(self.engine) as db:
            self.assertIsNone(db.get(TranslationJob, 1))
            self.assertIsNotNone(db.get(TranslationJob, 3))
            self.assertIsNotNone(db.get(Video, 1))

    def test_delete_without_segments(self):
        self.migrate()
        self.assertEqual(self.delete(2).status_code, 204)
        self.assertEqual(self.segment_ids(), [1, 2, 3, 4])

    def test_other_owner_and_unowned_jobs_cannot_be_deleted(self):
        self.migrate()
        for job_id in (3, 4):
            with self.subTest(job_id=job_id):
                self.assertEqual(self.delete(job_id).status_code, 404)
                with Session(self.engine) as db:
                    self.assertIsNotNone(db.get(TranslationJob, job_id))
        self.assertEqual(self.segment_ids(), [1, 2, 3, 4])

    def test_missing_job(self):
        self.migrate()
        self.assertEqual(self.client.delete(f"/history/{uuid.uuid4()}").status_code, 404)

    def test_downgrade_preserves_data_and_restores_fk(self):
        self.migrate()
        self.migrate("downgrade")
        self.assertEqual(self.segment_ids(), [1, 2, 3, 4])
        fk = inspect(self.engine).get_foreign_keys("transcript_segments")[0]
        self.assertIsNone(fk["options"].get("ondelete"))
        with Session(self.engine) as db:
            db.delete(db.get(TranslationJob, 1))
            with self.assertRaises(IntegrityError):
                db.commit()

    def test_postgresql_migration_ddl(self):
        output = io.StringIO()
        context = MigrationContext.configure(
            dialect_name="postgresql", opts={"as_sql": True, "output_buffer": output},
        )
        with Operations.context(context):
            migration.upgrade()
        sql = output.getvalue()
        self.assertIn("DROP CONSTRAINT transcript_segments_translation_job_id_fkey", sql)
        self.assertIn("REFERENCES translation_jobs (id) ON DELETE CASCADE", sql)
        self.assertNotIn("DROP TABLE", sql)


if __name__ == "__main__":
    unittest.main()
