import React, { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { verifyEmail, resetStatus, clearError } from "../../features/auth/authSlice";
import { selectAuthLoading, selectAuthError, selectAuthStatus } from "../../features/auth/authSelectors";
import Logo from "../assets/R.png";

export const VerifyEmailPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (uid && token) {
      dispatch(verifyEmail({ uid, token }));
    }
  }, [dispatch, uid, token]);

  const handleGoToLogin = () => {
    dispatch(resetStatus());
    dispatch(clearError());
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2.5">
            <img src={Logo} alt="Logo" className="w-auto h-20" />
          </div>
          <h1 className="text-2xl">Email Verification</h1>
        </div>

        <Card className="shadow-xl  overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">
              {status === "loading" && "Verifying your account"}
              {status === "succeeded" && "Verification Successful!"}
              {status === "failed" && "Verification Failed"}
            </CardTitle>
            <CardDescription className="text-center">
              {status === "loading" && "Please wait while we verify your email address..."}
              {status === "succeeded" && "Your email has been verified. You can now access all features."}
              {status === "failed" && "We couldn't verify your email address. The link may be invalid or expired."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-6">
            {status === "loading" && (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-500 font-medium animate-pulse">
                  Connecting to server...
                </p>
              </div>
            )}

            {status === "succeeded" && (
              <div className="flex flex-col items-center space-y-6 w-full">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <Button onClick={handleGoToLogin} className="w-full h-12 text-lg">
                  Go to Login
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}

            {status === "failed" && (
              <div className="flex flex-col items-center space-y-6 w-full">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <div className="p-4 bg-red-50 border border-red-100 rounded-lg w-full text-center">
                  <p className="text-sm text-red-700">{error || "Invalid verification link."}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full">
                  <Link to="/signup">
                    <Button variant="outline" className="w-full">
                      Try Signup Again
                    </Button>
                  </Link>
                  <Button onClick={handleGoToLogin} className="w-full">
                    Back to Login
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
