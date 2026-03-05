import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Separator } from "../components/ui/separator";
import { Checkbox } from "../components/ui/checkbox";
import { User, Mail, Lock, Chrome, Github, Building2, ExternalLink, Eye, EyeOff } from "lucide-react";
import { useAppDispatch, useAppSelector } from "../../hooks/reduxHooks";
import { signup, resetStatus, clearError } from "../../features/auth/authSlice";
import { selectAuthLoading, selectAuthError, selectAuthStatus } from "../../features/auth/authSelectors";
import Logo from "../assets/R.png";
import Loader from "../components/ui/Loader";
import StatusModal from "../components/ui/StatusModal";
import { TermsModal } from "../components/TermsModal";

export const SignupPage: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [hasActuallyReadTerms, setHasActuallyReadTerms] = useState(false);

  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const status = useAppSelector(selectAuthStatus);

  useEffect(() => {
    if (status === 'succeeded' || status === 'failed') {
      setIsModalOpen(true);
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (acceptTerms && hasActuallyReadTerms) {
      dispatch(signup({ full_name: name, email, institution, password }));
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    dispatch(clearError());
    dispatch(resetStatus());
  };

  const handleModalConfirm = () => {
    setIsModalOpen(false);
    if (status === 'succeeded') {
      dispatch(resetStatus());
      navigate("/login");
    } else {
      handleModalClose();
    }
  };

  const handleAgreeToTerms = () => {
    setHasActuallyReadTerms(true);
    setAcceptTerms(true);
    setIsTermsModalOpen(false);
  };

  const handleSocialSignup = (provider: string) => {
    console.log(`Social signup with ${provider}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-2.5">
            <img src={Logo} alt="Logo" className="w-auto h-20" />
          </div>
          <h1 className="text-3xl mb-2">Start learning today</h1>
          <p className="text-gray-600">
            Create your account and unlock thousands of courses
          </p>
        </div>

        <Card className="shadow-lg overflow-hidden">
          {isLoading && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
              <Loader size="lg" />
            </div>
          )}
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Sign up to begin your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="GATAMBA Louis Prince"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
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

              <div className="space-y-2">
                <Label htmlFor="institution">Institution</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    id="institution"
                    type="text"
                    placeholder="University or Organization"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
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
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Must be at least 8 characters
                </p>
              </div>

              <div className="flex items-start space-x-2 bg-gray-50/50">
                <Checkbox
                  id="terms"
                  checked={acceptTerms}
                  className="mt-2"
                  onCheckedChange={(checked) => {
                    if (!hasActuallyReadTerms) {
                      setIsTermsModalOpen(true);
                    } else {
                      setAcceptTerms(checked as boolean);
                    }
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="terms"
                    className="text-sm font-medium text-gray-700 leading-none cursor-pointer"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsTermsModalOpen(true);
                      }}
                      className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                    >
                      Terms and Privacy Policy
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </label>
                  {!hasActuallyReadTerms && (
                    <p className="text-[10px] text-gray-500">
                      Click to read and agree before proceeding
                    </p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={!acceptTerms || !hasActuallyReadTerms || isLoading}>
                {isLoading ? "Creating account..." : "Create account"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">
                    Or sign up with
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignup("google")}
                  className="w-full"
                  disabled={isLoading}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignup("github")}
                  className="w-full"
                  disabled={isLoading}
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </Button>
              </div>
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link to="/login" className="text-blue-600 hover:underline">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAgree={handleAgreeToTerms}
      />

      <StatusModal
        isOpen={isModalOpen}
        type={status === 'succeeded' ? 'success' : 'error'}
        title={status === 'succeeded' ? 'Account Created!' : 'Signup Failed'}
        description={status === 'succeeded' 
          ? 'Your account has been created successfully. Please check your email to verify your account.' 
          : (error as string) || 'Something went wrong during signup.'}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        confirmLabel={status === 'succeeded' ? 'Go to Login' : 'Try Again'}
      />
    </div>
  );
};
