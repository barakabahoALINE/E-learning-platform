import traceback
from django.conf import settings
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first to get the standard error response.
    response = exception_handler(exc, context)

    if response is None:
        # If response is None, it means DRF did not handle this exception (e.g. database goes away, database OperationalError, server-side code error, etc.)
        traceback.print_exc()

        # Build a structured response
        err_message = str(exc)
        
        response_data = {
            "success": "False",
            "message": "A server error occurred. Please try again later.",
            "error_class": exc.__class__.__name__
        }
        
        if settings.DEBUG:
            # Under DEBUG = True, we provide more detailed information for debugging
            # but in a clean JSON format instead of a massive HTML traceback page
            response_data["message"] = f"Internal Server Error: {err_message}"
            response_data["detail"] = err_message
            response_data["traceback"] = traceback.format_exc()
            
        return Response(response_data, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # For standard DRF exceptions, ensure consistent keys (e.g. "success": "False")
    if isinstance(response.data, dict):
        response.data["success"] = "False"
        if "detail" in response.data and "message" not in response.data:
            response.data["message"] = response.data["detail"]
    elif isinstance(response.data, list):
        response.data = {
            "success": "False",
            "message": response.data[0] if response.data else "Validation failed",
            "errors": response.data
        }

    return response
