from datetime import datetime
from io import BytesIO
from django.core.files.base import ContentFile
from django.utils import timezone

from enrollments_app.models import Enrollment
from progress_app.models import CourseProgress
from assessments_app.models import Attempt


def course_completed_by_student(student, course_id):
    """
    Check if a student has completed a course.
    Returns: (final_passed, enrollment, course_progress)
    """
    enrollment = Enrollment.objects.filter(
        student=student,
        course_id=course_id,
        status__in=[Enrollment.Status.ACTIVE, Enrollment.Status.COMPLETED],
    ).first()

    if not enrollment:
        return False, None, None

    course_progress = CourseProgress.objects.filter(
        student=student,
        course_id=course_id,
        completed=True,
    ).first()

    if not course_progress:
        return False, enrollment, None

    final_attempt = Attempt.objects.filter(
        student=student,
        assessment__course_id=course_id,
        assessment__assessment_type="FINAL",
        is_submitted=True,
        is_passed=True,
    ).order_by("-submitted_at").first()

    return bool(final_attempt), enrollment, course_progress


def build_plain_pdf_bytes(certificate):
    """
    Generate a simple PDF certificate as bytes.
    """
    lines = [
        "Certificate of Completion",
        "", 
        f"This certifies that {certificate.student.full_name}",
        f"has successfully completed the course:",
        f"{certificate.course.title}",
        "",
        f"Score: {certificate.score:.2f}",
        f"Percentage: {certificate.percentage:.2f}%",
        f"Issued at: {certificate.issued_at.strftime('%B %d, %Y')}",
        f"Certificate number: {certificate.certificate_number}",
    ]

    safe_lines = [
        line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)") for line in lines
    ]

    content_lines = "\n".join(
        f"BT /F1 14 Tf 50 {760 - index * 24} Td ({safe_line}) Tj ET"
        for index, safe_line in enumerate(safe_lines)
    )
    stream_bytes = content_lines.encode("latin-1")

    objects = []
    objects.append(b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n")
    objects.append(b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n")
    objects.append(
        b"3 0 obj\n"
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n"
        b"endobj\n"
    )
    objects.append(
        b"4 0 obj\n"
        b"<< /Length "
        + str(len(stream_bytes)).encode("ascii")
        + b" >>\nstream\n"
        + stream_bytes
        + b"\nendstream\nendobj\n"
    )
    objects.append(b"5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n")

    pdf = BytesIO()
    pdf.write(b"%PDF-1.4\n")
    offsets = []
    for obj in objects:
        offsets.append(pdf.tell())
        pdf.write(obj)

    xref_offset = pdf.tell()
    pdf.write(f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode("ascii"))
    for offset in offsets:
        pdf.write(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.write(
        b"trailer\n<< /Size "
        + str(len(objects) + 1).encode("ascii")
        + b" /Root 1 0 R >>\nstartxref\n"
        + str(xref_offset).encode("ascii")
        + b"\n%%EOF"
    )

    return pdf.getvalue()


def generate_certificate_file(certificate):
    """
    Generate and save the certificate PDF file if it doesn't already exist.
    """
    if certificate.certificate_file:
        return certificate.certificate_file.path

    pdf_bytes = build_plain_pdf_bytes(certificate)
    filename = f"certificate_{certificate.certificate_number}.pdf"
    certificate.certificate_file.save(filename, ContentFile(pdf_bytes), save=True)
    return certificate.certificate_file.path
