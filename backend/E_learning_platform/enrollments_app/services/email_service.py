"""
Email Service Module for Enrollments

This module provides reusable email sending functions for enrollment-related events.
All emails are sent using Django HTML templates for a professional appearance.
"""

import logging

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings

logger = logging.getLogger(__name__)


def _send_html_email(subject, plain_message, recipient_email, html_message):
    """
    Internal helper function to send HTML emails.
    
    Args:
        subject: Email subject line
        plain_message: Plain text fallback message
        recipient_email: Recipient's email address
        html_message: HTML version of the email
        
    Raises:
        Exception: If email sending fails
    """
    email = EmailMultiAlternatives(
        subject=subject,
        body=plain_message,
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient_email],
    )
    email.attach_alternative(html_message, 'text/html')
    email.send(fail_silently=False)


def send_enrollment_confirmation_email(user, course, course_link):
    """
    Send enrollment confirmation email when a student enrolls in a course.
    
    Args:
        user: User object containing email and full_name
        course: Course object containing title
        course_link: Link to access the course
        
    Returns:
        bool: True if email sent successfully
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': user.full_name or user.email,
            'course_title': course.title,
            'course_link': course_link,
        }
        
        html_message = render_to_string('emails/enrollment_confirmation.html', context)
        
        _send_html_email(
            subject=f'Enrollment Confirmation: {course.title} - E-Learning Platform',
            plain_message=f'You have successfully enrolled in {course.title}. Log in to start learning.',
            recipient_email=user.email,
            html_message=html_message,
        )
        
        logger.info(f"Enrollment confirmation email sent to {user.email} for course {course.title}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send enrollment confirmation email to {user.email}: {str(e)}")
        raise


def send_enrollment_admin_email(student, course, course_link):
    """
    Send enrollment notification email when admin enrolls a student in a course.
    
    Args:
        student: Student user object containing email and full_name
        course: Course object containing title
        course_link: Link to access the course
        
    Returns:
        bool: True if email sent successfully
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': student.full_name or student.email,
            'course_title': course.title,
            'course_link': course_link,
        }
        
        html_message = render_to_string('emails/enrollment_admin.html', context)
        
        _send_html_email(
            subject=f'You Have Been Enrolled: {course.title} - E-Learning Platform',
            plain_message=f'You have been enrolled in {course.title} by your administrator. You can now access the course.',
            recipient_email=student.email,
            html_message=html_message,
        )
        
        logger.info(f"Admin enrollment email sent to {student.email} for course {course.title}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send admin enrollment email to {student.email}: {str(e)}")
        raise
