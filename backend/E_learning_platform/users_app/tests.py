from django.test import SimpleTestCase
from django.conf import settings
from rest_framework import exceptions
from E_learning_platform.exceptions import custom_exception_handler

class CustomExceptionHandlerTests(SimpleTestCase):
    def test_drf_validation_error(self):
        # Create a mock DRF exception
        exc = exceptions.ValidationError({"email": ["This field is required."]})
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["success"], "False")
        self.assertEqual(response.data["email"][0], "This field is required.")
        
    def test_unhandled_exception(self):
        # Create a standard non-DRF python exception
        exc = ValueError("Database connection lost.")
        context = {}
        
        response = custom_exception_handler(exc, context)
        
        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.data["success"], "False")
        
        if settings.DEBUG:
            self.assertIn("Internal Server Error: Database connection lost.", response.data["message"])
            self.assertEqual(response.data["detail"], "Database connection lost.")
        else:
            self.assertEqual(response.data["message"], "A server error occurred. Please try again later.")
