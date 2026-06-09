"""
Utility function to extract text from PDF
"""
import PyPDF2
from typing import Optional


def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """
    Extract all text from a PDF file

    Args:
        pdf_path: Path to PDF file

    Returns:
        Extracted text as string, or None if extraction fails
    """
    try:
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            text_parts = []

            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    text_parts.append(text)

            return '\n\n'.join(text_parts)

    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None
