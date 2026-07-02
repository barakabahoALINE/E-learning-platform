"""
Certificate Sharing Services
Handles sharing certificates via different platforms
"""
import requests
from django.conf import settings


class CertificateShareService:
    """Service for sharing certificates across different platforms"""

    @staticmethod
    def share_via_linkedin(certificate, access_token):
        """
        Share certificate on LinkedIn
        Requires OAuth2 access token with LinkedIn Share API permissions
        
        Args:
            certificate: Certificate model instance
            access_token: LinkedIn OAuth access token
            
        Returns:
            dict: Success status and message
        """
        try:
            # LinkedIn API endpoint
            linkedin_api_url = "https://api.linkedin.com/v2/ugcPosts"
            
            headers = {
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
                "LinkedIn-Version": "202404",
            }

            # Prepare the post content
            post_content = f"""
            🎉 I'm proud to announce that I've completed the "{certificate.course.title}" course!
            
            📊 Achievement:
            • Score: {certificate.score:.2f}
            • Percentage: {certificate.percentage:.2f}%
            • Certificate ID: {certificate.certificate_number}
            • Issued: {certificate.issued_at.strftime('%B %d, %Y')}
            
            Thanks to the E-Learning Platform for this amazing learning experience! 🚀
            
            #Learning #CertificateOfCompletion #ProfessionalDevelopment
            """

            # Build the request payload
            payload = {
                "actor": "urn:li:person:{linkedin_id}",  # This needs to be obtained from user profile
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {
                            "text": post_content
                        },
                        "shareMediaCategory": "DOCUMENT",
                        "media": [
                            {
                                "status": "READY",
                                "description": {
                                    "text": f"{certificate.course.title} Certificate"
                                },
                                "originalUrl": certificate.certificate_file_url if hasattr(certificate, 'certificate_file_url') else None,
                            }
                        ]
                    }
                },
                "visibility": {
                    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
                }
            }

            # Make API call
            response = requests.post(
                linkedin_api_url,
                headers=headers,
                json=payload,
                timeout=10
            )

            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "message": "Certificate shared on LinkedIn successfully",
                    "linkedin_post_url": response.json().get("id")
                }
            else:
                return {
                    "success": False,
                    "message": f"LinkedIn API error: {response.text}"
                }

        except Exception as e:
            return {
                "success": False,
                "message": f"Failed to share on LinkedIn: {str(e)}"
            }


def get_sharing_method(platform):
    """Get the appropriate sharing method for a platform"""
    sharing_methods = {
        "linkedin": CertificateShareService.share_via_linkedin,
    }
    return sharing_methods.get(platform.lower())
