"""Document classification service using Claude AI."""

import os
from typing import Optional, Dict, Any
from datetime import datetime
import re

from anthropic import Anthropic

from app.config import settings
from app.models.pdf import DocumentType
from app.services.pdf_processor import PDFProcessor


class DocumentClassifier:
    """Service for AI-powered document classification."""

    def __init__(self):
        self.client = None
        if settings.anthropic_api_key:
            self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.pdf_processor = PDFProcessor()

    async def classify(
        self,
        document_id: str,
        file_path: str,
        extracted_text: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Classify a document using AI.

        Args:
            document_id: The document ID
            file_path: Path to the PDF file
            extracted_text: Pre-extracted text (optional)

        Returns:
            Dictionary with classification results
        """
        # Get text if not provided
        if not extracted_text:
            result = await self.pdf_processor.extract_text(file_path)
            extracted_text = result["text"]

        # Truncate text for API call (use first 8000 chars)
        text_for_analysis = extracted_text[:8000] if extracted_text else ""

        if not self.client:
            # Fallback to heuristic classification if no API key
            return self._heuristic_classify(text_for_analysis)

        # Use Claude for classification
        return await self._ai_classify(text_for_analysis)

    async def _ai_classify(self, text: str) -> Dict[str, Any]:
        """Use Claude AI for document classification."""
        prompt = f"""Analyze this document text from a VA disability claims file (C-file) and classify it.

Document text:
---
{text}
---

Classify this document into ONE of these categories:
- SERVICE_TREATMENT_RECORD: Military medical records from active duty
- DD214: Certificate of Release or Discharge from Active Duty
- SERVICE_PERSONNEL_RECORD: Non-medical military service records
- CP_EXAM: VA Compensation & Pension examination
- VA_TREATMENT_RECORD: Medical records from VA facilities
- PRIVATE_MEDICAL_RECORD: Medical records from non-VA providers
- DBQ: Disability Benefits Questionnaire
- INDEPENDENT_MEDICAL_OPINION: IMO/IME from private physician
- RATING_DECISION: VA rating decision on disability claim
- NOTICE_OF_DISAGREEMENT: NOD filed by veteran
- BOARD_DECISION: Decision from Board of Veterans Appeals
- CORRESPONDENCE: Letters, notices, general correspondence
- LAY_STATEMENT: Personal or buddy statements
- OTHER: Documents that don't fit other categories
- UNCLASSIFIED: Cannot determine document type

Also extract:
1. Document date (if visible)
2. Provider/facility name (if medical record)
3. Your confidence level (0.0-1.0)

Respond in this exact format:
DOCUMENT_TYPE: [type]
CONFIDENCE: [0.0-1.0]
DATE: [YYYY-MM-DD or UNKNOWN]
PROVIDER: [provider name or UNKNOWN]
REASONING: [one sentence explanation]"""

        try:
            response = self.client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}],
            )

            response_text = response.content[0].text
            return self._parse_classification_response(response_text)
        except Exception as e:
            print(f"AI classification failed: {e}")
            return self._heuristic_classify(text)

    def _parse_classification_response(self, response: str) -> Dict[str, Any]:
        """Parse the AI classification response."""
        result = {
            "document_type": DocumentType.UNCLASSIFIED,
            "confidence": 0.5,
            "provider": None,
            "document_date": None,
            "reasoning": "Could not parse classification response",
        }

        lines = response.strip().split("\n")
        for line in lines:
            if line.startswith("DOCUMENT_TYPE:"):
                type_str = line.replace("DOCUMENT_TYPE:", "").strip()
                try:
                    result["document_type"] = DocumentType(type_str)
                except ValueError:
                    result["document_type"] = DocumentType.UNCLASSIFIED

            elif line.startswith("CONFIDENCE:"):
                try:
                    conf = float(line.replace("CONFIDENCE:", "").strip())
                    result["confidence"] = max(0.0, min(1.0, conf))
                except ValueError:
                    pass

            elif line.startswith("DATE:"):
                date_str = line.replace("DATE:", "").strip()
                if date_str != "UNKNOWN":
                    try:
                        result["document_date"] = datetime.strptime(
                            date_str, "%Y-%m-%d"
                        )
                    except ValueError:
                        pass

            elif line.startswith("PROVIDER:"):
                provider = line.replace("PROVIDER:", "").strip()
                if provider != "UNKNOWN":
                    result["provider"] = provider

            elif line.startswith("REASONING:"):
                result["reasoning"] = line.replace("REASONING:", "").strip()

        return result

    def _heuristic_classify(self, text: str) -> Dict[str, Any]:
        """Fallback heuristic classification when AI is unavailable."""
        text_lower = text.lower()

        # Try to extract date
        document_date = None
        date_patterns = [
            r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
            r"(\d{4}[/-]\d{1,2}[/-]\d{1,2})",
            r"((?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2},? \d{4})",
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text_lower)
            if match:
                try:
                    # Try various date formats
                    date_str = match.group(1)
                    for fmt in ["%m/%d/%Y", "%m-%d-%Y", "%Y-%m-%d", "%Y/%m/%d"]:
                        try:
                            document_date = datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                except Exception:
                    pass
            if document_date:
                break

        # Classification rules
        if "dd form 214" in text_lower or "dd-214" in text_lower:
            return {
                "document_type": DocumentType.DD214,
                "confidence": 0.9,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains DD Form 214 identifier",
            }

        if "compensation and pension" in text_lower or "c&p exam" in text_lower:
            return {
                "document_type": DocumentType.CP_EXAM,
                "confidence": 0.85,
                "provider": "VA",
                "document_date": document_date,
                "reasoning": "Contains C&P examination indicators",
            }

        if "disability benefits questionnaire" in text_lower or "dbq" in text_lower[:500]:
            return {
                "document_type": DocumentType.DBQ,
                "confidence": 0.9,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains DBQ form identifier",
            }

        if "rating decision" in text_lower:
            return {
                "document_type": DocumentType.RATING_DECISION,
                "confidence": 0.85,
                "provider": "VA",
                "document_date": document_date,
                "reasoning": "Contains rating decision language",
            }

        if "board of veterans" in text_lower and "appeal" in text_lower:
            return {
                "document_type": DocumentType.BOARD_DECISION,
                "confidence": 0.85,
                "provider": "BVA",
                "document_date": document_date,
                "reasoning": "Contains BVA decision indicators",
            }

        if "service treatment record" in text_lower or "service medical record" in text_lower:
            return {
                "document_type": DocumentType.SERVICE_TREATMENT_RECORD,
                "confidence": 0.7,
                "provider": "Military",
                "document_date": document_date,
                "reasoning": "Contains service treatment record indicators",
            }

        if "vamc" in text_lower or "va medical center" in text_lower:
            return {
                "document_type": DocumentType.VA_TREATMENT_RECORD,
                "confidence": 0.75,
                "provider": "VA",
                "document_date": document_date,
                "reasoning": "Contains VA medical facility reference",
            }

        if "independent medical opinion" in text_lower or "imo" in text_lower[:200]:
            return {
                "document_type": DocumentType.INDEPENDENT_MEDICAL_OPINION,
                "confidence": 0.7,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains IMO indicators",
            }

        if "notice of disagreement" in text_lower:
            return {
                "document_type": DocumentType.NOTICE_OF_DISAGREEMENT,
                "confidence": 0.8,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains NOD language",
            }

        if "lay statement" in text_lower or "buddy statement" in text_lower:
            return {
                "document_type": DocumentType.LAY_STATEMENT,
                "confidence": 0.7,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains lay statement indicators",
            }

        # Check for generic medical record indicators
        medical_indicators = ["diagnosis", "treatment", "patient", "physician", "medical"]
        medical_count = sum(1 for ind in medical_indicators if ind in text_lower)
        if medical_count >= 3:
            return {
                "document_type": DocumentType.PRIVATE_MEDICAL_RECORD,
                "confidence": 0.5,
                "provider": None,
                "document_date": document_date,
                "reasoning": "Contains general medical terminology",
            }

        return {
            "document_type": DocumentType.UNCLASSIFIED,
            "confidence": 0.3,
            "provider": None,
            "document_date": document_date,
            "reasoning": "Could not determine document type from content",
        }
