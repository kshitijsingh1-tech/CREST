"""
CREST — Authentication API
Login and Token endpoints.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel

from backend.utils.db import get_db_optional
from backend.utils.auth import verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from backend.models.user import User

router = APIRouter(prefix="/api/auth", tags=["auth"])

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    role: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login", response_model=Token)
def login_for_access_token(
    payload: LoginRequest, 
    db: Session = Depends(get_db_optional)
):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user_id": user.id,
        "role": user.role,
        "name": user.name
    }
