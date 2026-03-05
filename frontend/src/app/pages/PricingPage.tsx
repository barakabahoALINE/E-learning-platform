import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Label } from "../components/ui/label";
import { CheckCircle, Star, Zap, Crown } from "lucide-react";
import { MainLayout } from "../components/MainLayout";
import { toast } from "sonner";

const PRICING_PLANS = [
  {
    id: "free",
    name: "Free",
    icon: Star,
    price: { monthly: 0, yearly: 0 },
    description: "Perfect for getting started",
    features: [
      "Access to free courses",
      "Basic course materials",
      "Community forum access",
      "Mobile app access",
      "Email support",
    ],
    limitations: [
      "Limited course selection",
      "No certificates",
      "Ads supported",
    ],
    highlighted: false,
    buttonText: "Get Started",
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    price: { monthly: 30000, yearly: 300000 },
    description: "Best for serious learners",
    features: [
      "Access to all courses",
      "Downloadable resources",
      "Certificates of completion",
      "Ad-free experience",
      "Priority email support",
      "Offline course downloads",
      "Project reviews",
      "Monthly live Q&A sessions",
    ],
    limitations: [],
    highlighted: true,
    buttonText: "Start Pro Trial",
    badge: "Most Popular",
  },
  {
    id: "premium",
    name: "Premium",
    icon: Crown,
    price: { monthly: 50000, yearly: 500000 },
    description: "For professionals and teams",
    features: [
      "Everything in Pro",
      "Personalized learning paths",
      "One-on-one mentoring sessions",
      "1-hour monthly instructor call",
      "Job placement assistance",
      "LinkedIn certification sharing",
      "Career counseling",
      "Early access to new courses",
      "Custom learning dashboard",
    ],
    limitations: [],
    highlighted: false,
    buttonText: "Go Premium",
    badge: "Best Value",
  },
];

export const PricingPage: React.FC = () => {
  const [isYearly, setIsYearly] = useState(false);

  const handleSubscribe = (planId: string) => {
    toast.success(`Successfully subscribed to ${planId} plan!`);
  };

  const calculateSavings = (monthly: number, yearly: number) => {
    if (monthly === 0) return 0;
    const yearlyCost = monthly * 12;
    return Math.round(((yearlyCost - yearly) / yearlyCost) * 100);
  };

  return (
    <MainLayout>
      <div className="space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-4">Pricing Plans</Badge>
          <h1 className="text-4xl mb-4">Choose the perfect plan for you</h1>
          <p className="text-xl text-gray-600">
            Start learning with our free plan or unlock everything with Pro or
            Premium
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            <Label
              htmlFor="billing-toggle"
              className={!isYearly ? "font-medium" : "text-gray-600"}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label
              htmlFor="billing-toggle"
              className={isYearly ? "font-medium" : "text-gray-600"}
            >
              Yearly
              <Badge variant="secondary" className="ml-2">
                Save up to 20%
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {PRICING_PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.price.yearly : plan.price.monthly;
            const savings = calculateSavings(
              plan.price.monthly,
              plan.price.yearly,
            );

            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.highlighted
                    ? "border-blue-600 shadow-xl scale-105"
                    : "border-gray-200"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600">{plan.badge}</Badge>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        plan.highlighted ? "bg-blue-600" : "bg-gray-100"
                      }`}
                    >
                      <Icon
                        className={`w-6 h-6 ${plan.highlighted ? "text-white" : "text-gray-600"}`}
                      />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-sm text-gray-600">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price */}
                  <div className="pt-4 border-t">
                    <div className="flex items-baseline mb-2">
                      <span className="text-4xl">Frw{price}</span>
                      {price > 0 && (
                        <span className="text-gray-600 ml-2">
                          /{isYearly ? "year" : "month"}
                        </span>
                      )}
                    </div>
                    {isYearly && savings > 0 && (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-800"
                      >
                        Save {savings}%
                      </Badge>
                    )}
                  </div>

                  {/* CTA Button */}
                  <Button
                    className="w-full"
                    variant={plan.highlighted ? "default" : "outline"}
                    size="lg"
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {plan.buttonText}
                  </Button>

                  {/* Features */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Features included:</p>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">Can I switch plans later?</h3>
                <p className="text-sm text-gray-600">
                  Yes! You can upgrade or downgrade your plan at any time.
                  Changes will be reflected in your next billing cycle.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">Is there a free trial?</h3>
                <p className="text-sm text-gray-600">
                  Pro and Premium plans come with a 7-day free trial. No credit
                  card required to start.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">
                  What payment methods do you accept?
                </h3>
                <p className="text-sm text-gray-600">
                  We accept all major credit cards, PayPal, and bank transfers
                  for annual plans.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">Can I cancel anytime?</h3>
                <p className="text-sm text-gray-600">
                  Absolutely! Cancel your subscription anytime with no questions
                  asked. You'll retain access until the end of your billing
                  period.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">
                  Do you offer student discounts?
                </h3>
                <p className="text-sm text-gray-600">
                  Yes! Students get 50% off on Pro and Premium plans. Contact
                  support with your student ID.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-2">
                  Are courses updated regularly?
                </h3>
                <p className="text-sm text-gray-600">
                  Yes, our instructors regularly update courses with new content
                  and ensure materials stay current with industry trends.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enterprise Section */}
        <Card className="bg-gradient-to-r from-[#33A7DF] to-[#2D51A1] text-white max-w-4xl mx-auto">
          <CardContent className="p-12 text-center">
            <h2 className="text-3xl mb-4">Need a plan for your team?</h2>
            <p className="text-xl text-blue-100 mb-6">
              Get custom pricing and features for teams of 10 or more
            </p>
            <Button size="lg" variant="secondary">
              Contact Sales
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};
