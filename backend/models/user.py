"""
CREST — User and Region Models
Defines the RBAC hierarchy and regional mapping for automated routing.
"""

from __future__ import annotations

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from backend.utils.db import Base

class Region(Base):
    __tablename__ = "regions"

    id   = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True)
    
    users      = relationship("User", back_populates="region")
    complaints = relationship("Complaint", back_populates="region")

class User(Base):
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    name            = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    
    # Role: SUPER_ADMIN, SUB_ADMIN, EMPLOYEE
    role            = Column(String(50), nullable=False, default="EMPLOYEE")
    
    phone           = Column(String(50), nullable=True) # Added for regional directory
    
    region_id       = Column(Integer, ForeignKey("regions.id"), nullable=True)
    is_active       = Column(Boolean, default=True)  # Status toggle for shift/availability
    
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    region = relationship("Region", back_populates="users")
    assigned_complaints = relationship("Complaint", back_populates="assigned_employee")
