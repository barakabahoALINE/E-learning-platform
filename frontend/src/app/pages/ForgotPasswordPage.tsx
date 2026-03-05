import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { forgotPassword, resetStatus, clearError } from "../../features/auth/authSlice";
import { selectAuthLoading, selectAuthError, selectAuthStatus } from "../../features/auth/authSelectors";
import Logo from "../assets/R.png";
import Loader from "../components/ui/Loader";
import StatusModal from "../components/ui/StatusModal";

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dispatch = useAppDispatch();

  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === 'succeeded' || status === 'failed') {
      setIsModalOpen(true);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(forgotPassword(email));
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (status === 'succeeded') {
      dispatch(resetStatus());
    } else {
      dispatch(clearError());
      dispatch(resetStatus());
    }
  };

  if (status === 'succeeded' && !isModalOpen) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl mb-2">Check your email</h1>
            <p className="text-gray-600">
              We've sent a password reset link to <span className="font-medium">{email}</span>
            </p>
          </div>

          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <p className="text-sm text-gray-600 mb-4">
                Didn't receive the email? Check your spam folder or try another email address.
              </p>
              <Button variant="outline" className="w-full mb-3" onClick={() => dispatch(resetStatus())}>
                Try another email
              </Button>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2.5">
            <img src={Logo} alt="Logo" className="w-auto h-20" />
          </div>
          <h1 className="text-3xl mb-2">Forgot password?</h1>
          <p className="text-gray-600">No worries, we'll send you reset instructions</p>
        </div>

        <Card className="shadow-lg relative overflow-hidden">
          {isLoading && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
              <Loader size="lg" />
            </div>
          )}
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
            <CardDescription>Enter your email to receive a reset link</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending link..." : "Send reset link"}
              </Button>
            </form>

            <Link to="/login">
              <Button variant="ghost" className="w-full mt-4" disabled={isLoading}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <StatusModal
        isOpen={isModalOpen}
        type={status === 'succeeded' ? 'success' : 'error'}
        title={status === 'succeeded' ? 'Email Sent!' : 'Request Failed'}
        description={status === 'succeeded' 
          ? `A password reset link has been sent to ${email}.` 
          : (error as string) || 'Something went wrong. Please try again later.'}
        onClose={handleModalClose}
      />
    </div>
  );
};
