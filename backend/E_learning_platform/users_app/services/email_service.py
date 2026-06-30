"""
Email Service Module

This module provides reusable email sending functions for the E-Learning Platform.
All emails are sent using Django HTML templates for a professional appearance.
"""

import logging

from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def _send_html_email(subject, plain_message, recipient_email, html_message):
    email = EmailMultiAlternatives(
        subject=subject,
        body=plain_message,
        from_email=settings.EMAIL_HOST_USER,
        to=[recipient_email],
    )
    email.attach_alternative(html_message, 'text/html')
    email.send(fail_silently=False)


def send_verification_email(user, verification_link):
    """
    Send email verification email to newly signed up users.
    
    Args:
        user: User object containing email and full_name
        verification_link: The verification URL containing token and uidb64
        
    Returns:
        bool: True if email sent successfully, False otherwise
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': user.full_name or user.email,
            'verification_link': verification_link,
        }
        
        html_message = render_to_string('emails/verify_email.html', context)
        
        _send_html_email(
            subject='Verify Your Email - E-Learning Platform',
            plain_message='Please verify your email to complete your account setup.',
            recipient_email=user.email,
            html_message=html_message,
        )
        
        logger.info(f"Verification email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {user.email}: {str(e)}")
        raise


def send_invitation_email(user, set_password_link):
    """
    Send account invitation email when admin creates a user account.
    
    Args:
        user: User object containing email and full_name
        set_password_link: The password setup URL containing token and uidb64
        
    Returns:
        bool: True if email sent successfully, False otherwise
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': user.full_name or user.email,
            'set_password_link': set_password_link,
        }
        
        html_message = render_to_string('emails/account_invitation.html', context)
        
        _send_html_email(
            subject='Your Account Has Been Created - E-Learning Platform',
            plain_message='You have been invited to join the E-Learning Platform. Please set your password to activate your account.',
            recipient_email=user.email,
            html_message=html_message,
        )
        
        logger.info(f"Invitation email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send invitation email to {user.email}: {str(e)}")
        raise


def send_password_reset_email(user, reset_link):
    """
    Send password reset email for forgot password flow.
    
    Args:
        user: User object containing email and full_name
        reset_link: The password reset URL containing token and uidb64
        
    Returns:
        bool: True if email sent successfully, False otherwise
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': user.full_name or user.email,
            'reset_link': reset_link,
        }
        
        html_message = render_to_string('emails/password_reset.html', context)
        
        _send_html_email(
            subject='Reset Your Password - E-Learning Platform',
            plain_message='You requested to reset your password. Please click the link in this email to set a new password.',
            recipient_email=user.email,
            html_message=html_message,
        )
        
        logger.info(f"Password reset email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
        raise


def send_password_changed_email(user):
    """
    Send confirmation email after user successfully changes password.
    
    Args:
        user: User object containing email and full_name
        
    Returns:
        bool: True if email sent successfully, False otherwise
        
    Raises:
        Exception: If email sending fails
    """
    try:
        context = {
            'full_name': user.full_name or user.email,
            'current_time': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
        }
        
        html_message = render_to_string('emails/password_changed.html', context)
        
        _send_html_email(
            subject='Your Password Has Been Changed - E-Learning Platform',
            plain_message='This is a confirmation that your account password was successfully changed.',
            recipient_email=user.email,
            html_message=html_message,
        )
        
        logger.info(f"Password changed confirmation email sent successfully to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password changed email to {user.email}: {str(e)}")
        raise
