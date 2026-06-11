"""Schemas for user feedback and admin feedback triage."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class FeedbackCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=160)
    message: str = Field(..., min_length=5, max_length=4000)
    email: Optional[str] = Field(default=None, max_length=255)
    category: str = Field(default="bug", max_length=40)
    severity: str = Field(default="normal", max_length=40)
    page_url: Optional[str] = Field(default=None, max_length=4096)
    diagnostic_code: Optional[str] = Field(default=None, max_length=80)
    diagnostics: Optional[dict] = None


class FeedbackResponse(BaseModel):
    id: int
    status: str
    diagnostic_code: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AdminFeedbackResponse(BaseModel):
    id: int
    user_id: Optional[int]
    email: Optional[str]
    category: str
    severity: str
    status: str
    page_url: Optional[str]
    title: str
    message: str
    diagnostic_code: Optional[str]
    diagnostics: Optional[str]
    admin_note: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdminFeedbackUpdate(BaseModel):
    status: Optional[str] = Field(default=None, max_length=40)
    admin_note: Optional[str] = Field(default=None, max_length=2000)
