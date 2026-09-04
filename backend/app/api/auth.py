import os
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.models import User, Organization
from backend.app.schemas.schemas import UserCreate, UserResponse, TokenResponse
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.auth.auth import get_current_user
from backend.app.core.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])


class GoogleAuthRequest(BaseModel):
    token: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = "analyst"


def _format_user_response(user: User, db: Session) -> UserResponse:
    org_name = None
    if user.organization_id:
        org = db.query(Organization).filter(Organization.id == user.organization_id).first()
        if org:
            org_name = org.name
    if not org_name:
        org_name = "FinanceCorp Global"

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        provider=user.provider or "local",
        organization_id=user.organization_id,
        organization_name=org_name,
        last_active=user.last_active or user.created_at,
        created_at=user.created_at
    )


@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # First user can be automatically made admin
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else user_in.role.value

    # Assign default organization
    default_org = db.query(Organization).first()
    org_id = default_org.id if default_org else None

    new_user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=role,
        provider="local",
        organization_id=org_id,
        last_active=datetime.utcnow(),
        is_active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    log_audit_event(db, action="register", user=new_user, request=request, details={"role": role})
    return _format_user_response(new_user, db)


@router.post("/login", response_model=TokenResponse)
def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Update last_active
    user.last_active = datetime.utcnow()
    db.commit()

    access_token = create_access_token(subject=user.id)
    log_audit_event(db, action="login", user=user, request=request)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _format_user_response(user, db)
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Update last_active heartbeat
    current_user.last_active = datetime.utcnow()
    db.commit()
    return _format_user_response(current_user, db)


@router.post("/google", response_model=TokenResponse)
def google_oauth_login(
    req_body: GoogleAuthRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handles Google OAuth2 login & callback.
    Authenticates or provisions user with provider='google' within default Organization.
    """
    google_email = (req_body.email or "google.analyst@finance.corp").lower().strip()
    google_name = req_body.name or "Google Workspace Analyst"

    default_org = db.query(Organization).first()
    org_id = default_org.id if default_org else None

    user = db.query(User).filter(User.email == google_email).first()
    if not user:
        # Provision new Google OAuth user
        user = User(
            email=google_email,
            hashed_password=get_password_hash(os.urandom(24).hex()),
            full_name=google_name,
            role=req_body.role or "analyst",
            provider="google",
            organization_id=org_id,
            last_active=datetime.utcnow(),
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        log_audit_event(db, action="google_register", user=user, request=request, details={"provider": "google"})
    else:
        user.last_active = datetime.utcnow()
        if not user.provider:
            user.provider = "google"
        if not user.organization_id:
            user.organization_id = org_id
        db.commit()

    access_token = create_access_token(subject=user.id)
    log_audit_event(db, action="google_login", user=user, request=request, details={"provider": "google"})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": _format_user_response(user, db)
    }
