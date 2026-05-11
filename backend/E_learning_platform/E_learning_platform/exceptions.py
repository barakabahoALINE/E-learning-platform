from rest_framework.views import exception_handler

def custom_exception_handler(exc, context):
    """
    Custom exception handler for the API
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    # Add custom error handling here if needed
    if response is not None:
        response.data['status_code'] = response.status_code
    
    return response