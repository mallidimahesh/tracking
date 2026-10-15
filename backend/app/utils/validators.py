import re

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
VIT_STUDENT_DOMAIN = "@vitstudent.ac.in"

ALLOWED_SHUTTLE_CODES = {"SH-01", "SH-02", "SH-03", "SH-04", "SH-05", "SH-06"}

def is_valid_email_format(email: str) -> bool:
    if not email or not isinstance(email, str):
        return False
    return bool(EMAIL_REGEX.match(email.strip()))

def is_vit_student_email(email: str) -> bool:
    """
    Validates that the email belongs strictly to VIT student domain: @vitstudent.ac.in
    e.g. rahul.sharma2023@vitstudent.ac.in
    """
    if not is_valid_email_format(email):
        return False
    return email.strip().lower().endswith(VIT_STUDENT_DOMAIN)

def is_valid_shuttle_code(code: str) -> bool:
    if not code or not isinstance(code, str):
        return False
    return code.strip().upper() in ALLOWED_SHUTTLE_CODES

def validate_password_strength(password: str) -> tuple[bool, str]:
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long"
    return True, ""
