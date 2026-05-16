"""
CREST — User & Region Management API
Endpoints for Super-Admins and Sub-Admins to manage their teams and regions.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from backend.utils.db import get_db_optional
from backend.api.deps import get_current_user, require_role
from backend.models.user import User, Region

router = APIRouter(prefix="/api/admin", tags=["admin"])

# --- Schemas ---

class RegionCreate(BaseModel):
    name: str

class RegionOut(BaseModel):
    id: int
    name: str
    class Config: from_attributes = True

class UserCreate(BaseModel):
    email: str
    name: str
    password: str
    role: str
    region_id: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    region_id: Optional[int] = None
    is_active: bool
    class Config: from_attributes = True

# --- Regions ---

@router.post("/regions", response_model=RegionOut)
def create_region(payload: RegionCreate, db: Session = Depends(get_db_optional), admin: User = Depends(require_role("SUPER_ADMIN"))):
    region = Region(name=payload.name)
    db.add(region)
    db.commit()
    db.refresh(region)
    return region

@router.get("/regions", response_model=List[RegionOut])
def list_regions(db: Session = Depends(get_db_optional)):
    return db.query(Region).all()

# --- Users ---

from backend.utils.auth import get_password_hash

@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db_optional), admin: User = Depends(get_current_user)):
    # RBAC Check: Only Super Admin can create Sub Admins. Sub Admin can create Employees in their region.
    if admin.role == "SUB_ADMIN":
        if payload.role != "EMPLOYEE":
            raise HTTPException(status_code=403, detail="Sub-Admins can only create Employees")
        payload.region_id = admin.region_id # Force regional scoping
    elif admin.role != "SUPER_ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient authority")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        region_id=payload.region_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/users/me", response_model=UserOut)
def get_me(user: User = Depends(get_current_user)):
    return user

@router.patch("/users/status", response_model=UserOut)
def toggle_status(is_active: bool, db: Session = Depends(get_db_optional), user: User = Depends(get_current_user)):
    """Toggle On-Shift/Off-Shift status."""
    user = db.merge(user)
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user

@router.get("/users", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db_optional), admin: User = Depends(get_current_user)):
    """List users based on the requester's authority."""
    if admin.role == "SUPER_ADMIN":
        # Super-Admin sees everyone
        return db.query(User).all()
    elif admin.role == "SUB_ADMIN":
        # Sub-Admin sees only employees in their region
        return db.query(User).filter(User.region_id == admin.region_id, User.role == "EMPLOYEE").all()
    else:
        raise HTTPException(status_code=403, detail="Access denied")

@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db_optional), admin: User = Depends(get_current_user)):
    """Delete a user with RBAC enforcement."""
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    
    # 1. Super-Admin can delete anyone except themselves
    if admin.role == "SUPER_ADMIN":
        if target.id == admin.id:
            raise HTTPException(status_code=400, detail="Cannot delete self")
        db.delete(target)
        db.commit()
        return {"msg": "User deleted successfully"}
    
    # 2. Sub-Admin can only delete EMPLOYEES in their region
    if admin.role == "SUB_ADMIN":
        if target.role != "EMPLOYEE" or target.region_id != admin.region_id:
            raise HTTPException(status_code=403, detail="Authority restricted to regional employees only")
        db.delete(target)
        db.commit()
        return {"msg": "Employee deleted successfully"}
    
    raise HTTPException(status_code=403, detail="Insufficient authority")

@router.get("/employees", response_model=List[UserOut])
def list_employees(db: Session = Depends(get_db_optional), admin: User = Depends(require_role("SUB_ADMIN"))):
    """Sub-Admins can see employees in their region."""
    query = db.query(User).filter(User.role == "EMPLOYEE")
    if admin.role == "SUB_ADMIN":
        query = query.filter(User.region_id == admin.region_id)
    return query.all()
