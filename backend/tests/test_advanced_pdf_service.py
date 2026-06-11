from pathlib import Path

from PyPDF2 import PdfReader, PdfWriter

from app.services.advanced_pdf_service import AdvancedPDFService


def test_protect_pdf_adds_open_password(tmp_path: Path):
    input_path = tmp_path / "input.pdf"
    output_path = tmp_path / "protected.pdf"

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    with input_path.open("wb") as output_file:
        writer.write(output_file)

    service = AdvancedPDFService()
    service.protect_pdf(
        pdf_path=str(input_path),
        output_path=str(output_path),
        user_password="Secure123",
    )

    protected_reader = PdfReader(str(output_path))
    assert protected_reader.is_encrypted is True
    assert protected_reader.decrypt("wrong-password") == 0
    assert protected_reader.decrypt("Secure123") in (1, 2)
    assert len(protected_reader.pages) == 1


def test_unlock_pdf_removes_open_password_with_correct_password(tmp_path: Path):
    protected_path = tmp_path / "protected.pdf"
    output_path = tmp_path / "unlocked.pdf"

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    try:
        writer.encrypt(user_password="Secure123", owner_password="Secure123", use_128bit=True)
    except TypeError:
        writer.encrypt("Secure123", "Secure123", use_128bit=True)
    with protected_path.open("wb") as output_file:
        writer.write(output_file)

    service = AdvancedPDFService()
    service.unlock_pdf(
        pdf_path=str(protected_path),
        output_path=str(output_path),
        password="Secure123",
    )

    unlocked_reader = PdfReader(str(output_path))
    assert unlocked_reader.is_encrypted is False
    assert len(unlocked_reader.pages) == 1


def test_unlock_pdf_rejects_wrong_password(tmp_path: Path):
    protected_path = tmp_path / "protected.pdf"
    output_path = tmp_path / "unlocked.pdf"

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    try:
        writer.encrypt(user_password="Secure123", owner_password="Secure123", use_128bit=True)
    except TypeError:
        writer.encrypt("Secure123", "Secure123", use_128bit=True)
    with protected_path.open("wb") as output_file:
        writer.write(output_file)

    service = AdvancedPDFService()
    try:
        service.unlock_pdf(
            pdf_path=str(protected_path),
            output_path=str(output_path),
            password="wrong-password",
        )
    except ValueError as error:
        assert "password" in str(error).lower()
    else:
        raise AssertionError("Wrong password should not unlock the PDF")


def test_repair_pdf_rebuilds_readable_pdf(tmp_path: Path):
    input_path = tmp_path / "input.pdf"
    output_path = tmp_path / "repaired.pdf"

    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    writer.add_blank_page(width=300, height=300)
    with input_path.open("wb") as output_file:
        writer.write(output_file)

    service = AdvancedPDFService()
    service.repair_pdf(
        pdf_path=str(input_path),
        output_path=str(output_path),
    )

    repaired_reader = PdfReader(str(output_path))
    assert repaired_reader.is_encrypted is False
    assert len(repaired_reader.pages) == 2
