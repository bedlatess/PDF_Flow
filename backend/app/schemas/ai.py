"""
Pydantic schemas for AI features
"""
from datetime import datetime
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field


# ============================================================================
# Summarization Schemas
# ============================================================================

class SummarizeRequest(BaseModel):
    """Request to summarize a PDF"""
    length: str = Field('medium', description="Summary length: 'short', 'medium', or 'long'")


class SummarizeResponse(BaseModel):
    """Response from PDF summarization"""
    success: bool
    summary: str = ''
    key_points: List[str] = Field(default_factory=list)
    word_count: int = 0
    topics: List[str] = Field(default_factory=list)
    summary_length: str = ''
    generated_at: str
    error: Optional[str] = None


# ============================================================================
# Q&A Schemas
# ============================================================================

class QuestionRequest(BaseModel):
    """Request to ask a question about PDF"""
    question: str = Field(..., min_length=5, max_length=500, description="Question about the document")


class QuestionResponse(BaseModel):
    """Response from Q&A"""
    success: bool
    question: str = ''
    answer: str = ''
    confidence: str = ''
    relevant_excerpts: List[str] = Field(default_factory=list)
    found_in_document: bool = False
    generated_at: str
    error: Optional[str] = None


# ============================================================================
# Data Extraction Schemas
# ============================================================================

class ExtractRequest(BaseModel):
    """Request to extract structured data"""
    data_type: str = Field('general', description="Type of data: 'invoice', 'resume', 'contract', 'general'")


class ExtractResponse(BaseModel):
    """Response from data extraction"""
    success: bool
    data_type: str = ''
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    generated_at: str
    error: Optional[str] = None


# ============================================================================
# Batch Analysis Schemas
# ============================================================================

class BatchAnalyzeRequest(BaseModel):
    """Request to perform multiple AI operations"""
    operations: List[str] = Field(
        default=['summarize', 'extract'],
        description="Operations to perform: 'summarize', 'extract', 'classify'"
    )


class BatchAnalyzeResponse(BaseModel):
    """Response from batch analysis"""
    success: bool
    operations: List[str] = Field(default_factory=list)
    results: Dict[str, Any] = Field(default_factory=dict)
    generated_at: str
    error: Optional[str] = None
