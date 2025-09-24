import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PricingSection = () => {
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      description: "Ideal for occasional use",
      monthlyPrice: 0,
      yearlyPrice: 0,
      features: [
        "5 file merges per month",
        "Basic file types (PDF, DOCX, TXT)",
        "Standard processing speed",
        "Email support"
      ],
      buttonText: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      description: "For professionals and teams",
      monthlyPrice: 19,
      yearlyPrice: 190,
      features: [
        "Unlimited file merges",
        "All file types supported",
        "Priority processing",
        "Advanced AI optimization",
        "24/7 priority support",
        "Custom output settings"
      ],
      buttonText: "Start Free Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      monthlyPrice: 99,
      yearlyPrice: 990,
      features: [
        "Everything in Pro",
        "API access",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
        "Custom file processing rules",
        "White-label solution"
      ],
      buttonText: "Contact Sales",
      popular: false
    }
  ];

  const getPrice = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return "Free";
    const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
    const period = isYearly ? "year" : "month";
    return `$${price}/${period}`;
  };

  const getSavings = (plan: typeof plans[0]) => {
    if (plan.monthlyPrice === 0) return null;
    const yearlyTotal = plan.monthlyPrice * 12;
    const savings = ((yearlyTotal - plan.yearlyPrice) / yearlyTotal * 100).toFixed(0);
    return isYearly ? `Save ${savings}%` : null;
  };

  return (
    <section className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-foreground mb-6">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Choose the plan that fits your needs. All plans include our core AI-powered merging technology.
          </p>

          {/* Toggle */}
          <div className="inline-flex items-center bg-secondary rounded-xl p-1">
            <button
              onClick={() => setIsYearly(false)}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 ${
                !isYearly
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsYearly(true)}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-300 relative ${
                isYearly
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              {isYearly && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative rounded-2xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "bg-primary text-primary-foreground shadow-glow scale-105 border-2 border-primary"
                  : "bg-card text-card-foreground shadow-card hover:shadow-glow border border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-accent text-accent-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className={`text-sm mb-6 ${plan.popular ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {plan.description}
                </p>
                
                <div className="mb-2">
                  <span className="text-4xl font-black">{getPrice(plan)}</span>
                </div>
                
                {getSavings(plan) && (
                  <span className="text-sm text-green-400 font-semibold">
                    {getSavings(plan)}
                  </span>
                )}
              </div>

              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center">
                    <Check className={`w-5 h-5 mr-3 ${plan.popular ? "text-primary-foreground" : "text-green-500"}`} />
                    <span className={`text-sm ${plan.popular ? "text-primary-foreground" : "text-foreground"}`}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Button
                className={`w-full py-3 rounded-xl font-semibold transition-all duration-300 ${
                  plan.popular
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-primary text-primary-foreground hover:bg-hover hover:text-hover-foreground"
                }`}
              >
                {plan.buttonText}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;