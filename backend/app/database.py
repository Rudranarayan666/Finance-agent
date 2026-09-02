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


def seed_default_users_and_samples():
    """
    Seeds default user accounts (Admin, Analyst, Viewer) instantly
    so sign in works on the first try.
    """
    from backend.app.models.models import User
    from backend.app.core.security import get_password_hash

    db = SessionLocal()
    try:
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
                    is_active=True
                )
                db.add(u)
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
    from backend.app.models.models import User, Document, DocumentAccess, AnalysisRecord, AuditLog
    Base.metadata.create_all(bind=engine)
    seed_default_users_and_samples()
    preindex_existing_documents()
