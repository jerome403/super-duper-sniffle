"""PDF processing service using PyMuPDF."""

import fitz  # PyMuPDF
import os
import uuid
from typing import Optional, List, Dict, Any
from PIL import Image
import io

from app.config import settings
from app.models.pdf import DocumentSegment, DocumentType, PageOCRResult


class PDFProcessor:
    """Service for PDF processing operations."""

    def get_page_count(self, file_path: str) -> int:
        """Get the total number of pages in a PDF."""
        with fitz.open(file_path) as doc:
            return len(doc)

    async def extract_text(
        self,
        file_path: str,
        page_start: Optional[int] = None,
        page_end: Optional[int] = None,
        use_ocr: bool = False,
    ) -> Dict[str, Any]:
        """
        Extract text from a PDF file.

        Args:
            file_path: Path to the PDF file
            page_start: Starting page (0-indexed), defaults to 0
            page_end: Ending page (exclusive), defaults to total pages
            use_ocr: Whether to use OCR for text extraction

        Returns:
            Dictionary with extracted text and metadata
        """
        with fitz.open(file_path) as doc:
            total_pages = len(doc)
            start = page_start if page_start is not None else 0
            end = page_end if page_end is not None else total_pages

            # Clamp values
            start = max(0, min(start, total_pages))
            end = max(start, min(end, total_pages))

            texts = []
            ocr_confidence = None

            for page_num in range(start, end):
                page = doc[page_num]

                if use_ocr:
                    # Use OCR
                    ocr_result = await self._ocr_page(page, page_num)
                    texts.append(ocr_result["text"])
                    if ocr_confidence is None:
                        ocr_confidence = ocr_result["confidence"]
                    else:
                        ocr_confidence = (ocr_confidence + ocr_result["confidence"]) / 2
                else:
                    # Use native text extraction
                    text = page.get_text()
                    texts.append(text)

                    # Check if we should fall back to OCR
                    if not text.strip() and not use_ocr:
                        # Page appears to be scanned, try OCR
                        ocr_result = await self._ocr_page(page, page_num)
                        if ocr_result["text"].strip():
                            texts[-1] = ocr_result["text"]
                            ocr_confidence = ocr_result["confidence"]

            return {
                "text": "\n\n".join(texts),
                "page_start": start,
                "page_end": end,
                "page_count": end - start,
                "ocr_used": use_ocr or ocr_confidence is not None,
                "ocr_confidence": ocr_confidence,
            }

    async def _ocr_page(self, page: fitz.Page, page_num: int) -> Dict[str, Any]:
        """Perform OCR on a single page."""
        try:
            import pytesseract

            # Render page to image
            mat = fitz.Matrix(settings.ocr_dpi / 72, settings.ocr_dpi / 72)
            pix = page.get_pixmap(matrix=mat)

            # Convert to PIL Image
            img = Image.open(io.BytesIO(pix.tobytes("png")))

            # Perform OCR with confidence data
            data = pytesseract.image_to_data(img, output_type=pytesseract.Output.DICT)

            # Extract text and calculate confidence
            texts = []
            confidences = []
            for i, conf in enumerate(data["conf"]):
                if conf != -1:  # -1 means no confidence (not a word)
                    texts.append(data["text"][i])
                    confidences.append(conf)

            text = " ".join(filter(None, texts))
            avg_confidence = sum(confidences) / len(confidences) if confidences else 0

            return {
                "text": text,
                "confidence": avg_confidence / 100,  # Normalize to 0-1
            }
        except ImportError:
            # pytesseract not available
            return {
                "text": "",
                "confidence": 0,
            }
        except Exception as e:
            print(f"OCR failed for page {page_num}: {e}")
            return {
                "text": "",
                "confidence": 0,
            }

    async def split_cfile(
        self,
        case_id: str,
        file_path: str,
    ) -> Dict[str, Any]:
        """
        Split a C-file PDF into individual documents.

        This uses heuristics to detect document boundaries:
        - Page headers/footers that indicate new documents
        - Blank pages between documents
        - Standard VA form headers
        - Date changes and provider changes

        Args:
            case_id: The case ID for organizing output
            file_path: Path to the C-file PDF

        Returns:
            Dictionary with split results
        """
        output_dir = os.path.join(settings.storage_path, case_id, "documents")
        os.makedirs(output_dir, exist_ok=True)

        with fitz.open(file_path) as doc:
            total_pages = len(doc)
            documents: List[DocumentSegment] = []

            # Simple splitting strategy for MVP:
            # Look for document boundary indicators
            current_start = 0
            boundaries = [0]  # Start with first page

            for page_num in range(total_pages):
                page = doc[page_num]
                text = page.get_text()

                # Check for document boundary indicators
                if self._is_document_boundary(text, page_num, total_pages):
                    if page_num > current_start:
                        boundaries.append(page_num)
                        current_start = page_num

            # Ensure we have the last boundary
            if boundaries[-1] != total_pages:
                boundaries.append(total_pages)

            # Create document segments
            for i in range(len(boundaries) - 1):
                start = boundaries[i]
                end = boundaries[i + 1]

                # Extract this segment
                segment_id = str(uuid.uuid4())
                output_path = os.path.join(output_dir, f"{segment_id}.pdf")

                # Create new PDF with these pages
                new_doc = fitz.open()
                new_doc.insert_pdf(doc, from_page=start, to_page=end - 1)
                new_doc.save(output_path)
                new_doc.close()

                # Get first page text for classification hint
                first_page_text = doc[start].get_text()[:1000]
                suggested_type, confidence = self._guess_document_type(first_page_text)

                documents.append(
                    DocumentSegment(
                        page_start=start + 1,  # 1-indexed for user display
                        page_end=end,
                        suggested_type=suggested_type,
                        confidence=confidence,
                        output_path=output_path,
                    )
                )

            return {
                "total_pages": total_pages,
                "documents": documents,
            }

    def _is_document_boundary(
        self, text: str, page_num: int, total_pages: int
    ) -> bool:
        """
        Detect if this page represents a document boundary.

        Uses various heuristics common in VA C-files.
        """
        text_lower = text.lower()

        # Common document start indicators
        boundary_indicators = [
            "department of veterans affairs",
            "va form",
            "standard form",
            "dd form 214",
            "certificate of release",
            "medical record",
            "clinical note",
            "progress note",
            "discharge summary",
            "compensation and pension",
            "c&p examination",
            "disability benefits questionnaire",
            "dbq",
            "rating decision",
            "notice of disagreement",
            "board of veterans",
            "service treatment record",
        ]

        for indicator in boundary_indicators:
            # Check if indicator appears near the top of the page
            first_500_chars = text_lower[:500]
            if indicator in first_500_chars:
                return True

        # Check for mostly blank page (often separators)
        if len(text.strip()) < 50:
            return True

        return False

    def _guess_document_type(self, text: str) -> tuple[DocumentType, float]:
        """
        Make an initial guess at document type based on text content.

        This is a simple heuristic - actual classification uses AI.
        """
        text_lower = text.lower()

        type_indicators = [
            (DocumentType.DD214, ["dd form 214", "dd-214", "certificate of release", "discharge"], 0.8),
            (DocumentType.CP_EXAM, ["compensation and pension", "c&p exam", "c & p exam"], 0.7),
            (DocumentType.DBQ, ["disability benefits questionnaire", "dbq"], 0.8),
            (DocumentType.SERVICE_TREATMENT_RECORD, ["service treatment record", "str", "service medical record"], 0.6),
            (DocumentType.VA_TREATMENT_RECORD, ["va medical center", "vamc", "va treatment"], 0.6),
            (DocumentType.PRIVATE_MEDICAL_RECORD, ["private medical", "outside medical"], 0.5),
            (DocumentType.RATING_DECISION, ["rating decision", "service-connected", "disability rating"], 0.7),
            (DocumentType.BOARD_DECISION, ["board of veterans' appeals", "bva decision"], 0.8),
            (DocumentType.INDEPENDENT_MEDICAL_OPINION, ["independent medical opinion", "imo", "independent medical exam"], 0.7),
            (DocumentType.LAY_STATEMENT, ["lay statement", "buddy statement", "personal statement"], 0.6),
            (DocumentType.NOTICE_OF_DISAGREEMENT, ["notice of disagreement", "nod"], 0.7),
            (DocumentType.SERVICE_PERSONNEL_RECORD, ["personnel record", "service record"], 0.5),
            (DocumentType.CORRESPONDENCE, ["dear veteran", "dear mr", "dear ms"], 0.4),
        ]

        for doc_type, indicators, confidence in type_indicators:
            for indicator in indicators:
                if indicator in text_lower:
                    return doc_type, confidence

        return DocumentType.UNCLASSIFIED, 0.0

    async def ocr_pages(
        self,
        file_path: str,
        pages: List[int],
        dpi: int = 300,
    ) -> Dict[str, Any]:
        """
        Perform OCR on specific pages of a PDF.

        Args:
            file_path: Path to the PDF file
            pages: List of page numbers (0-indexed)
            dpi: DPI for rendering pages

        Returns:
            Dictionary with OCR results
        """
        results: List[PageOCRResult] = []
        total_confidence = 0

        with fitz.open(file_path) as doc:
            for page_num in pages:
                if page_num < 0 or page_num >= len(doc):
                    continue

                page = doc[page_num]
                ocr_result = await self._ocr_page(page, page_num)

                results.append(
                    PageOCRResult(
                        page_number=page_num + 1,  # 1-indexed for display
                        text=ocr_result["text"],
                        confidence=ocr_result["confidence"],
                    )
                )
                total_confidence += ocr_result["confidence"]

        avg_confidence = total_confidence / len(results) if results else 0

        return {
            "pages": results,
            "average_confidence": avg_confidence,
        }
