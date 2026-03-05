import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { resetPassword, resetStatus, clearError } from "../../features/auth/authSlice";
import { selectAuthLoading, selectAuthError, selectAuthStatus } from "../../features/auth/authSelectors";
import Logo from "../assets/R.png";
import StatusModal from "../components/ui/StatusModal";

export const ResetPasswordPage: React.FC = () => {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === "succeeded" || status === "failed") {
      setIsModalOpen(true);
    }
  }, [status]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    if (uid && token) {
      dispatch(
        resetPassword({
          uid,
          token,
          data: { new_password: password, comfirm_new_password: confirmPassword },
        })
      );
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    dispatch(clearError());
    dispatch(resetStatus());
  };

  const handleModalConfirm = () => {
    setIsModalOpen(false);
    if (status === "succeeded") {
      dispatch(resetStatus());
      navigate("/login");
    } else {
      handleModalClose();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2.5">
            <img src={Logo} alt="Logo" className="w-auto h-20" />
          </div>
          <h1 className="text-3xl mb-2">Reset Password</h1>
          <p className="text-gray-600 mt-2">Create a new secure password for your account</p>
        </div>

        <Card className="shadow-lg overflow-hidden">
          <CardHeader>
            <CardTitle>Enter New Password</CardTitle>
            <CardDescription>
              Your new password must be different from previous ones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Resetting...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </form>

            <Link to="/login" className="flex items-center justify-center mt-6 text-sm text-gray-500 hover:text-blue-600 transition-colors">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Link>
          </CardContent>
        </Card>
      </div>

      <StatusModal
        isOpen={isModalOpen}
        type={status === "succeeded" ? "success" : "error"}
        title={status === "succeeded" ? "Password Reset Successfully!" : "Reset Failed"}
        description={
          status === "succeeded"
            ? "Your password has been updated. You can now log in with your new password."
            : (error as string) || "Something went wrong. The link may be invalid or expired."
        }
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        confirmLabel={status === "succeeded" ? "Go to Login" : "Try Again"}
      />
    </div>
  );
};
