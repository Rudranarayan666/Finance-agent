import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings


def _create_db_engine():
    db_url = settings.DATABASE_URL
    try:
        connect_args = {"check_same_thread": False} if "sqlite" in db_url else {}
        eng = create_engine(db_url, connect_args=connect_args, pool_pre_ping=True)
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception as err:
        print(f"Database connection note: falling back to local SQLite due to remote connection status ({err})")
        fallback_url = "sqlite:///./finance_agent.db"
        return create_engine(fallback_url, connect_args={"check_same_thread": False}, pool_pre_ping=True)


engine = _create_db_engine()
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
    db_url_str = str(engine.url)
    if "sqlite" not in db_url_str:
        return

    import sqlite3
    db_path = db_url_str.replace("sqlite:///", "")
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
        if "is_admin" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;")

        # Check documents table columns
        cur.execute("PRAGMA table_info(documents);")
        doc_cols = [c[1] for c in cur.fetchall()]
        if "organization_id" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN organization_id VARCHAR;")
        if "is_org_shared" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN is_org_shared BOOLEAN DEFAULT 0;")
        if "prev_hash" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN prev_hash VARCHAR;")
        if "chain_hash" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN chain_hash VARCHAR;")
        if "version" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN version INTEGER DEFAULT 1;")
        if "document_version" not in doc_cols:
            cur.execute("ALTER TABLE documents ADD COLUMN document_version VARCHAR DEFAULT 'v1';")

        # Check audit_logs table columns
        cur.execute("PRAGMA table_info(audit_logs);")
        audit_cols = [c[1] for c in cur.fetchall()]
        if "organization_id" not in audit_cols:
            cur.execute("ALTER TABLE audit_logs ADD COLUMN organization_id VARCHAR;")

        conn.commit()
        conn.close()

        # Ensure all tables (including evidence_records) exist
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Schema migration note: {e}")


def seed_default_users_and_samples():
    """
    Seeds default demo user accounts (Admin, Analyst, Viewer) and default Organization.
    Demo only: disabled when ENV=production.
    """
    if getattr(settings, "ENV", "development").lower() == "production":
        print("Production environment detected: automated user seeding disabled.")
        return

    from datetime import datetime
    from backend.app.models.models import User, Organization, Document
    from backend.app.core.security import get_password_hash

    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        if not org:
            org = Organization(
                name="FinanceCorp Global",
                domain="finance.corp"
            )
            db.add(org)
            db.commit()
            db.refresh(org)

        # Demo-only credentials (disabled in production)
        default_users = [
            ("analyst@finance.corp", "AnalystPass123!", "Senior Equity Analyst (Demo)", "analyst"),
            ("admin@finance.corp", "AdminPass123!", "Chief Risk Officer (Demo)", "admin"),
            ("viewer@finance.corp", "ViewerPass123!", "Portfolio Investor (Demo)", "viewer"),
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

        docs = db.query(Document).filter(Document.organization_id.is_(None)).all()
        for d in docs:
            d.organization_id = org.id

        db.commit()
    except Exception as e:
        print(f"User seed note: {e}")
    finally:
        db.close()


def preindex_existing_documents():
    if "PYTEST_CURRENT_TEST" in os.environ or os.environ.get("ENV") == "test":
        return

    import threading

    def _worker():
        from backend.app.models.models import Document
        from backend.app.parser.pdf_parser import PDFDocumentParser
        from backend.app.rag.rag_service import rag_service

        db = SessionLocal()
        try:
            docs = db.query(Document).order_by(Document.uploaded_at.desc()).limit(3).all()
            for d in docs:
                if d.id in rag_service.doc_passages:
                    continue
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

    bg_thread = threading.Thread(target=_worker, daemon=True)
    bg_thread.start()


def seed_plans():
    """
    Seeds initial configurable subscription plans (Basic, Pro, Premium) idempotently.
    """
    from backend.app.models.models import Plan

    plans_data = [
        {
            "key": "basic",
            "name": "BASIC",
            "price": 0,
            "currency": "INR",
            "billing_interval": "month",
            "max_documents": 2,
            "monthly_credits": 100,
            "questions_per_doc_limit": 5,
            "upload_credit_cost": getattr(settings, "UPLOAD_CREDIT_COST", 10),
            "question_credit_cost": getattr(settings, "QUESTION_CREDIT_COST", 15),
            "visual_credit_cost": getattr(settings, "VISUAL_ANALYSIS_CREDIT_COST", 10),
            "can_download_reports": False,
            "can_compare_years": False,
            "priority_processing": False,
            "is_active": True
        },
        {
            "key": "pro",
            "name": "PRO",
            "price": 299,
            "currency": "INR",
            "billing_interval": "month",
            "max_documents": 10,
            "monthly_credits": 500,
            "questions_per_doc_limit": 10,
            "upload_credit_cost": getattr(settings, "UPLOAD_CREDIT_COST", 10),
            "question_credit_cost": getattr(settings, "QUESTION_CREDIT_COST", 15),
            "visual_credit_cost": getattr(settings, "VISUAL_ANALYSIS_CREDIT_COST", 10),
            "can_download_reports": True,
            "can_compare_years": True,
            "priority_processing": False,
            "is_active": True
        },
        {
            "key": "premium",
            "name": "PREMIUM",
            "price": 799,
            "currency": "INR",
            "billing_interval": "month",
            "max_documents": 50,
            "monthly_credits": 2000,
            "questions_per_doc_limit": 20,
            "upload_credit_cost": getattr(settings, "UPLOAD_CREDIT_COST", 10),
            "question_credit_cost": getattr(settings, "QUESTION_CREDIT_COST", 15),
            "visual_credit_cost": getattr(settings, "VISUAL_ANALYSIS_CREDIT_COST", 10),
            "can_download_reports": True,
            "can_compare_years": True,
            "priority_processing": True,
            "is_active": True
        }
    ]

    db = SessionLocal()
    try:
        for p_def in plans_data:
            existing = db.query(Plan).filter(Plan.key == p_def["key"]).first()
            if not existing:
                plan = Plan(**p_def)
                db.add(plan)
            else:
                # Update attributes while keeping existing ID
                for k, v in p_def.items():
                    setattr(existing, k, v)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Seed plans note: {e}")
    finally:
        db.close()


def bootstrap_admin():
    """
    Idempotently provisions designated administrator account from environment variables.
    Never duplicates; enforces hashed password and admin privileges.
    """
    from datetime import datetime, timedelta
    from backend.app.models.models import User, Organization, CreditAccount
    from backend.app.core.security import get_password_hash

    admin_email = getattr(settings, "ADMIN_EMAIL", "admin@gmail.com").strip().lower()
    admin_password = getattr(settings, "ADMIN_PASSWORD", "admin123456")

    db = SessionLocal()
    try:
        org = db.query(Organization).first()
        org_id = org.id if org else None

        admin_user = db.query(User).filter(User.email == admin_email).first()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash(admin_password),
                full_name="Platform Administrator",
                role="admin",
                is_admin=True,
                provider="local",
                organization_id=org_id,
                last_active=datetime.utcnow(),
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        else:
            admin_user.role = "admin"
            admin_user.is_admin = True
            admin_user.is_active = True
            db.commit()

        # Ensure admin has credit account with generous operational credits
        cred = db.query(CreditAccount).filter(CreditAccount.user_id == admin_user.id).first()
        if not cred:
            now = datetime.utcnow()
            cred = CreditAccount(
                user_id=admin_user.id,
                balance=10000,
                period_allowance=10000,
                period_used=0,
                period_start=now,
                period_end=now + timedelta(days=365)
            )
            db.add(cred)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Admin bootstrap note: {e}")
    finally:
        db.close()


def init_db():
    from backend.app.models.models import (
        Organization, User, Invitation, Document, DocumentAccess,
        DocumentChunk, EvidenceRecord, Metric, AnalysisRecord, ChatSession, ChatMessage, AuditLog,
        Plan, Subscription, CreditAccount, CreditTransaction, UsageRecord, Payment
    )
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    seed_plans()
    bootstrap_admin()
    seed_default_users_and_samples()
    preindex_existing_documents()

