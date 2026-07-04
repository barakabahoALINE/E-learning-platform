import os
import base64
from datetime import datetime
from io import BytesIO
from django.core.files.base import ContentFile
from django.templatetags.static import static
from django.utils import timezone
from django.template.loader import render_to_string
from django.conf import settings

from enrollments_app.models import Enrollment
from progress_app.models import CourseProgress
from assessments_app.models import Attempt


def _get_image_as_data_uri(file_path):
    """Convert an image file to a data URI (base64-encoded)."""
    try:
        with open(file_path, 'rb') as f:
            image_data = f.read()
        b64_data = base64.b64encode(image_data).decode('utf-8')
        # Detect MIME type from extension
        ext = os.path.splitext(file_path)[1].lower()
        mime_type = 'image/png' if ext == '.png' else 'image/jpeg' if ext in ['.jpg', '.jpeg'] else 'image/png'
        return f"data:{mime_type};base64,{b64_data}"
    except Exception:
        return None


def build_certificate_template_context(certificate, request=None, embed_images=False):
    """Build the shared context used by the Django certificate template.
    
    Args:
        certificate: Certificate instance
        request: HTTP request object (optional). If provided, generates absolute URLs.
        embed_images: If True, embeds images as base64 data URIs (for preview). Overrides request-based URLs.
    """
    if embed_images:
        # For preview HTML (iframe with srcDoc), embed images as data URIs
        logo_path = os.path.join(settings.BASE_DIR, 'certificate_app', 'static', 'assets', 'nisr_logo.png')
        signature_path = os.path.join(settings.BASE_DIR, 'certificate_app', 'templates', 'assets', 'Signature_transparent.png')
        logo_url = _get_image_as_data_uri(logo_path) or ''
        signature_url = _get_image_as_data_uri(signature_path) or ''
    elif request is not None:
        logo_url = request.build_absolute_uri(static("assets/nisr_logo.png"))
        signature_url = request.build_absolute_uri(static("assets/Signature_transparent.png"))
    else:
        logo_path = os.path.join(settings.BASE_DIR, 'certificate_app', 'static', 'assets', 'nisr_logo.png')
        signature_path = os.path.join(settings.BASE_DIR, 'certificate_app', 'templates', 'assets', 'Signature_transparent.png')
        logo_url = f"file:///{logo_path.replace(chr(92), '/')}"
        signature_url = f"file:///{signature_path.replace(chr(92), '/')}"

    return {
        "learner_name": certificate.student.full_name,
        "course_name": certificate.course.title,
        "certificate_id": certificate.certificate_number,
        "issue_date": certificate.issued_at.strftime("%B %d, %Y") if getattr(certificate, "issued_at", None) else timezone.now().strftime("%B %d, %Y"),
        "logo_url": logo_url,
        "director_signature_url": signature_url,
        "manager_signature_url": signature_url,
    }


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


def generate_certificate_file(certificate, force=False):
    """
    Generate and save the certificate PDF file.

    Prefer rendering an HTML template to PDF using WeasyPrint when available.
    Falls back to xhtml2pdf, and finally the plain PDF builder.
    """
    if certificate.certificate_file and not force:
        return certificate.certificate_file.path

    if certificate.certificate_file and force:
        try:
            certificate.certificate_file.delete(save=False)
        except Exception:
            pass

    context = build_certificate_template_context(certificate)

    html_string = render_to_string("certificate_app/certificate.html", context)
    base_url = getattr(settings, "BASE_DIR", None) or None

    try:
        from weasyprint import HTML, CSS
        pdf_bytes = HTML(string=html_string, base_url=base_url).write_pdf()
    except Exception:
        try:
            from xhtml2pdf import pisa
            pdf_io = BytesIO()
            pisa.CreatePDF(html_string, dest=pdf_io)
            pdf_bytes = pdf_io.getvalue()
        except Exception:
            pdf_bytes = build_plain_pdf_bytes(certificate)

    filename = f"certificate_{certificate.certificate_number}.pdf"
    certificate.certificate_file.save(filename, ContentFile(pdf_bytes), save=True)
    return certificate.certificate_file.path