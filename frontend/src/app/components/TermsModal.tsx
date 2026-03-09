import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({
  isOpen,
  onClose,
  onAgree,
}) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHasScrolledToBottom(false);
    }
  }, [isOpen]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 5;
    
    if (isBottom) {
      setHasScrolledToBottom(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-md">Terms of Service & Privacy Policy</DialogTitle>
          <DialogDescription className="text-base">
            Please read our terms and conditions carefully.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mx-6 border rounded-xl bg-gray-50/30">
          <ScrollArea className="h-[400px] w-full px-4" onScroll={handleScroll}>
            <div className="space-y-4 text-sm text-gray-600 leading-relaxed pb-10 mt-4">
              <h3 className="font-bold text-gray-900 text-base">1. Acceptance of Terms</h3>
              <p>
                By creating an account on the E-learning Platform, you agree to
                be bound by these Terms of Service and our Privacy Policy. If
                you do not agree to these terms, please do not use our services.
              </p>

              <h3 className="font-bold text-gray-900 text-base">2. User Accounts</h3>
              <p>
                You are responsible for maintaining the confidentiality of your
                account and password. You agree to accept responsibility for all
                activities that occur under your account.
              </p>

              <h3 className="font-bold text-gray-900 text-base">3. Content and Conduct</h3>
              <p>
                Our platform provides access to various educational materials.
                Users are expected to maintain professional conduct and respect
                intellectual property rights. Any misuse of content or
                harassment of other users will result in immediate account
                termination.
              </p>

              <h3 className="font-bold text-gray-900 text-base">4. Privacy Policy</h3>
              <p>
                We value your privacy. Our Privacy Policy explains how we
                collect, use, and protect your personal information. By using
                our platform, you consent to our data practices.
              </p>

              <h3 className="font-bold text-gray-900 text-base">5. Subscription and Payments</h3>
              <p>
                Certain features of the platform may require a paid
                subscription. Fees are non-refundable except as required by law.
              </p>

              <h3 className="font-bold text-gray-900 text-base">6. Modifications</h3>
              <p>
                We reserve the right to modify these terms at any time. We will
                notify users of any significant changes via email or platform
                notifications.
              </p>

              <h3 className="font-bold text-gray-900 text-base">7. Termination</h3>
              <p>
                We may terminate or suspend your account at our sole discretion,
                without notice, for conduct that we believe violates these Terms
                or is harmful to other users or the platform.
              </p>

              <div className="pt-8 border-t text-center italic text-gray-400">
                End of Terms of Service. Thank you for choosing our E-learning Platform.
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="flex sm:justify-between items-center bg-gray-50 px-8 py-4 rounded-b-lg border-t">
          <p className="text-xs text-gray-500 max-sm:mb-2">
            {!hasScrolledToBottom? "Please scroll to the bottom to enable agreement.": "You have read the terms. You can now agree."}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onAgree}
              disabled={!hasScrolledToBottom}
              className={hasScrolledToBottom ? "bg-[#2D51A1] hover:bg-[#2D51A1]" : ""}
            >
              I Agree
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
