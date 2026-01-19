"""PDF processing data models."""

from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class DocumentType(str, Enum):
    """Document types matching the database schema."""
    SERVICE_TREATMENT_RECORD = "SERVICE_TREATMENT_RECORD"
    DD214 = "DD214"
    SERVICE_PERSONNEL_RECORD = "SERVICE_PERSONNEL_RECORD"
    CP_EXAM = "CP_EXAM"
    VA_TREATMENT_RECORD = "VA_TREATMENT_RECORD"
    PRIVATE_MEDICAL_RECORD = "PRIVATE_MEDICAL_RECORD"
    DBQ = "DBQ"
    INDEPENDENT_MEDICAL_OPINION = "INDEPENDENT_MEDICAL_OPINION"
    RATING_DECISION = "RATING_DECISION"
    NOTICE_OF_DISAGREEMENT = "NOTICE_OF_DISAGREEMENT"
    BOARD_DECISION = "BOARD_DECISION"
    CORRESPONDENCE = "CORRESPONDENCE"
    LAY_STATEMENT = "LAY_STATEMENT"
    OTHER = "OTHER"
    UNCLASSIFIED = "UNCLASSIFIED"


class SplitRequest(BaseModel):
    """Request to split a PDF into individual documents."""
    case_id: str
    file_path: str
    callback_url: Optional[str] = None


class SplitResult(BaseModel):
    """Result of PDF splitting operation."""
    case_id: str
    source_file: str
    total_pages: int
    documents: List["DocumentSegment"]


class DocumentSegment(BaseModel):
    """A segment of a PDF representing a single document."""
    page_start: int
    page_end: int
    suggested_type: DocumentType = DocumentType.UNCLASSIFIED
    confidence: float = 0.0
    output_path: str


class ClassifyRequest(BaseModel):
    """Request to classify a document."""
    case_id: str
    document_id: str
    file_path: str
    extracted_text: Optional[str] = None


class ClassifyResult(BaseModel):
    """Result of document classification."""
    document_id: str
    document_type: DocumentType
    confidence: float
    provider: Optional[str] = None
    document_date: Optional[datetime] = None
    reasoning: str


class ExtractTextRequest(BaseModel):
    """Request to extract text from a PDF."""
    case_id: str
    file_path: str
    page_start: Optional[int] = None
    page_end: Optional[int] = None
    use_ocr: bool = False


class ExtractTextResult(BaseModel):
    """Result of text extraction."""
    case_id: str
    file_path: str
    page_start: int
    page_end: int
    text: str
    ocr_used: bool
    ocr_confidence: Optional[float] = None
    page_count: int


class OCRRequest(BaseModel):
    """Request to perform OCR on specific pages."""
    case_id: str
    file_path: str
    pages: List[int]  # 0-indexed page numbers
    dpi: int = 300


class OCRResult(BaseModel):
    """Result of OCR operation."""
    case_id: str
    pages: List["PageOCRResult"]
    average_confidence: float


class PageOCRResult(BaseModel):
    """OCR result for a single page."""
    page_number: int
    text: str
    confidence: float


class ProcessingStatus(BaseModel):
    """Status of an ongoing processing job."""
    job_id: str
    case_id: str
    status: str
    progress: float  # 0.0 to 1.0
    current_step: str
    error: Optional[str] = None


# Update forward references
SplitResult.model_rebuild()
OCRResult.model_rebuild()
