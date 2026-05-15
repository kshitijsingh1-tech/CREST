"""
CREST — API Dependencies
Authentication and RBAC logic.
"""

from typing import Optional
from fastapi import Header, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.utils.db import get_db_optional
from backend.models.user import User

from fastapi.security import OAuth2PasswordBearer
from backend.utils.auth import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db_optional)
) -> User:
    """
    Dependency to get the current user by decoding the JWT token.
    """
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=401, 
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def require_role(role: str):
    def role_checker(user: User = Depends(get_current_user)):
        if user.role != role and user.role != "SUPER_ADMIN":
            raise HTTPException(status_code=403, detail="Insufficient authority")
        return user
    return role_checker
