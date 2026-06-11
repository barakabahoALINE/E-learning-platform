"""
Shared password rules and validation messaging for consistent UX across frontend and backend.
"""


PASSWORD_RULES = {
    "min_length": 8,
    "requirements": [
        "At least 8 characters",
        "At least one uppercase letter (A-Z)",
        "At least one lowercase letter (a-z)",
        "At least one digit (0-9)",
        "At least one special character (!@#$%^&*, etc.)",
    ],
    "message": "Password must be at least 8 characters and contain uppercase, lowercase, digit, and special character.",
}


def get_password_rules_display():
    """
    Return human-readable password rules for frontend display.
    
    Returns:
        dict: Password rules with min_length, requirements list, and user-friendly message.
    """
    return PASSWORD_RULES


def get_password_requirements_text():
    """
    Return a simple text summary of password requirements.
    
    Returns:
        str: Human-readable password requirements.
    """
    return PASSWORD_RULES["message"]


def get_password_requirements_list():
    """
    Return password requirements as a list for detailed display.
    
    Returns:
        list: List of password requirement strings.
    """
    return PASSWORD_RULES["requirements"]
