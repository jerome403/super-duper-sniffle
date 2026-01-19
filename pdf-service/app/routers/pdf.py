"""PDF processing endpoints."""

from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Optional
import os
import uuid

from app.models.pdf import (
    SplitRequest,
    SplitResult,
    ClassifyRequest,
    ClassifyResult,
    ExtractTextRequest,
    ExtractTextResult,
    OCRRequest,
    OCRResult,
    ProcessingStatus,
)
from app.services.pdf_processor import PDFProcessor
from app.services.document_classifier import DocumentClassifier
from app.config import settings

router = APIRouter()
pdf_processor = PDFProcessor()
document_classifier = DocumentClassifier()


@router.post("/upload")
async def upload_pdf(
    case_id: str,
    file: UploadFile = File(...),
):
    """
    Upload a PDF file for processing.

    Returns the storage path and basic file info.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File must be a PDF")

    # Generate unique filename
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}.pdf"
    case_dir = os.path.join(settings.storage_path, case_id)
    os.makedirs(case_dir, exist_ok=True)
    file_path = os.path.join(case_dir, safe_filename)

    # Save file
    try:
        contents = await file.read()
        file_size = len(contents)

        # Check file size
        max_size = settings.max_file_size_mb * 1024 * 1024
        if file_size > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.max_file_size_mb}MB",
            )

        with open(file_path, "wb") as f:
            f.write(contents)

        # Get page count
        page_count = pdf_processor.get_page_count(file_path)

        if page_count > settings.max_pages_per_document:
            os.remove(file_path)
            raise HTTPException(
                status_code=413,
                detail=f"PDF has too many pages ({page_count}). Maximum is {settings.max_pages_per_document}",
            )

        return {
            "file_id": file_id,
            "case_id": case_id,
            "original_filename": file.filename,
            "storage_path": file_path,
            "file_size": file_size,
            "page_count": page_count,
        }
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")


@router.post("/extract-text", response_model=ExtractTextResult)
async def extract_text(request: ExtractTextRequest):
    """
    Extract text from a PDF file.

    Can extract from specific page ranges and optionally use OCR.
    """
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        result = await pdf_processor.extract_text(
            file_path=request.file_path,
            page_start=request.page_start,
            page_end=request.page_end,
            use_ocr=request.use_ocr,
        )

        return ExtractTextResult(
            case_id=request.case_id,
            file_path=request.file_path,
            page_start=result["page_start"],
            page_end=result["page_end"],
            text=result["text"],
            ocr_used=result["ocr_used"],
            ocr_confidence=result.get("ocr_confidence"),
            page_count=result["page_count"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Text extraction failed: {str(e)}")


@router.post("/split", response_model=SplitResult)
async def split_pdf(request: SplitRequest, background_tasks: BackgroundTasks):
    """
    Split a C-file PDF into individual documents.

    Uses document boundary detection to identify where one document
    ends and another begins within the C-file.
    """
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        result = await pdf_processor.split_cfile(
            case_id=request.case_id,
            file_path=request.file_path,
        )

        return SplitResult(
            case_id=request.case_id,
            source_file=request.file_path,
            total_pages=result["total_pages"],
            documents=result["documents"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF splitting failed: {str(e)}")


@router.post("/classify", response_model=ClassifyResult)
async def classify_document(request: ClassifyRequest):
    """
    Classify a document by type.

    Uses AI to analyze the document content and determine its type
    (e.g., DD214, C&P Exam, Treatment Record, etc.)
    """
    try:
        result = await document_classifier.classify(
            document_id=request.document_id,
            file_path=request.file_path,
            extracted_text=request.extracted_text,
        )

        return ClassifyResult(
            document_id=request.document_id,
            document_type=result["document_type"],
            confidence=result["confidence"],
            provider=result.get("provider"),
            document_date=result.get("document_date"),
            reasoning=result["reasoning"],
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Document classification failed: {str(e)}"
        )


@router.post("/ocr", response_model=OCRResult)
async def perform_ocr(request: OCRRequest):
    """
    Perform OCR on specific pages of a PDF.

    Use this for scanned documents where text extraction returns
    empty or low-quality results.
    """
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        result = await pdf_processor.ocr_pages(
            file_path=request.file_path,
            pages=request.pages,
            dpi=request.dpi,
        )

        return OCRResult(
            case_id=request.case_id,
            pages=result["pages"],
            average_confidence=result["average_confidence"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR failed: {str(e)}")


@router.get("/status/{job_id}", response_model=ProcessingStatus)
async def get_processing_status(job_id: str):
    """Get the status of a processing job."""
    # This would typically query Redis or a database for job status
    # For now, return a placeholder
    return ProcessingStatus(
        job_id=job_id,
        case_id="",
        status="unknown",
        progress=0.0,
        current_step="Status tracking not yet implemented",
    )


@router.get("/download/{case_id}/{file_id}")
async def download_document(case_id: str, file_id: str):
    """Download a processed document."""
    file_path = os.path.join(settings.storage_path, case_id, f"{file_id}.pdf")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=f"{file_id}.pdf",
    )
