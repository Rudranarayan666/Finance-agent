import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

connect_args = {"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_schema():
    """
    Safely adds missing columns/tables in SQLite without needing external migration tools.
    """
    import sqlite3
    db_path = settings.DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        return

    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        
        # Check users table columns
        cur.execute("PRAGMA table_info(users);")
        user_cols = [c[1] for c in cur.fetchall()]
        if "provider" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN provider VARCHAR DEFAULT 'local';")
        if "organization_id" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN organization_id VARCHAR;")
        if "last_active" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN last_active DATETIME;")

        # Check documents table columns
        cur.execute("PRAGMA table_info(documents);")
        doc_cols = [c[1] for c in cur.fetchall()]
        if "organization_id" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN organization_id VARCHAR;")
        if "is_org_shared" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN is_org_shared BOOLEAN DEFAULT 0;")

        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Schema migration note: {e}")


def seed_default_users_and_samples():
    """
    Seeds default user accounts (Admin, Analyst, Viewer) and default Organization
    so sign in works on the first try.
    """
    from datetime import datetime
    from backend.app.models.models import User, Organization, Document
    from backend.app.core.security import get_password_hash

    db = SessionLocal()
    try:
        # 1. Seed or retrieve default Organization
        org = db.query(Organization).first()
        if not org:
            org = Organization(
                name="FinanceCorp Global",
                domain="finance.corp"
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        default_users = [
            ("analyst@finance.corp", "AnalystPass123!", "Senior Equity Analyst", "analyst"),
            ("admin@finance.corp", "AdminPass123!", "Chief Risk Officer", "admin"),
            ("viewer@finance.corp", "ViewerPass123!", "Portfolio Investor", "viewer"),
        ]

        for email, pwd, name, role in default_users:
            u = db.query(User).filter(User.email == email).first()
            if not u:
                u = User(
                    email=email,
                    hashed_password=get_password_hash(pwd),
                    full_name=name,
                    role=role,
                    provider="local",
                    organization_id=org.id,
                    last_active=datetime.utcnow(),
                    is_active=True
                )
                db.add(u)
            else:
                if not u.organization_id:
                    u.organization_id = org.id
                if not u.provider:
                    u.provider = "local"
                if not u.last_active:
                    u.last_active = datetime.utcnow()

        # Update existing documents with organization_id if missing
        docs = db.query(Document).filter(Document.organization_id.is_(None)).all()
        for d in docs:
            d.organization_id = org.id

        db.commit()
    except Exception as e:
        print(f"User seed note: {e}")
    finally:
        db.close()


def preindex_existing_documents():
    """
    Pre-indexes all existing completed documents into rag_service on server boot.
    """
    from backend.app.models.models import Document
    from backend.app.parser.pdf_parser import PDFDocumentParser
    from backend.app.rag.rag_service import rag_service

    db = SessionLocal()
    try:
        docs = db.query(Document).all()
        for d in docs:
            if d.file_path and os.path.exists(d.file_path):
                try:
                    parser = PDFDocumentParser(d.file_path)
                    extracted = parser.extract_pages()
                    rag_service.index_document_chunks(d.id, extracted["pages"])
                except Exception as ex:
                    print(f"Index doc {d.id} warning: {ex}")
    except Exception as e:
        print(f"Pre-index error: {e}")
    finally:
        db.close()


def init_db():
    from backend.app.models.models import Organization, User, Document, DocumentAccess, AnalysisRecord, AuditLog
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    seed_default_users_and_samples()
    preindex_existing_documents()
