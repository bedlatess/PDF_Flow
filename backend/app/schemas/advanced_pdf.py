"""
Pydantic schemas for advanced PDF features
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Tuple


class WatermarkRequest(BaseModel):
    """Request to add watermark to PDF"""
    text: str = Field(..., min_length=1, max_length=200, description="Watermark text")
    opacity: float = Field(0.3, ge=0.0, le=1.0, description="Opacity (0.0-1.0)")
    rotation: int = Field(45, ge=-180, le=180, description="Rotation angle")
    font_size: int = Field(40, ge=10, le=200, description="Font size")
    position: str = Field('center', description="Position: center, diagonal, top, bottom")


class FormFillRequest(BaseModel):
    """Request to fill PDF form"""
    field_data: Dict[str, str] = Field(..., description="Field names and values")


class AnnotationRequest(BaseModel):
    """Request to add annotation"""
    page_number: int = Field(..., ge=0, description="Page number (0-indexed)")
    text: str = Field(..., min_length=1, description="Annotation text")
    x: float = Field(..., description="X position")
    y: float = Field(..., description="Y position")
    width: float = Field(200, description="Width")
    height: float = Field(100, description="Height")


class HighlightRequest(BaseModel):
    """Request to add highlight"""
    page_number: int = Field(..., ge=0, description="Page number (0-indexed)")
    x: float = Field(..., description="X position")
    y: float = Field(..., description="Y position")
    width: float = Field(..., description="Width")
    height: float = Field(..., description="Height")


class SignatureFieldRequest(BaseModel):
    """Request to add signature field"""
    page_number: int = Field(..., ge=0, description="Page number (0-indexed)")
    x: float = Field(..., description="X position")
    y: float = Field(..., description="Y position")
    width: float = Field(200, description="Width")
    height: float = Field(50, description="Height")
    field_name: str = Field("Signature", description="Field name")
