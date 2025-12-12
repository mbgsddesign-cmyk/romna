'use client';

import { PageWrapper } from '@/components/page-wrapper';
import { useTranslation } from '@/hooks/use-translation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEntitlements } from '@/hooks/use-entitlements';
import { Check, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Basic task management',
      '10,000 AI tokens/month',
      '30 voice minutes/month',
      'Basic notifications',
      'Calendar integration'
    ]
  },
  {
    name: 'Pro',
    price: '$9.99',
    period: 'month',
    popular: true,
    features: [
      'Everything in Free',
      '100,000 AI tokens/month',
      '300 voice minutes/month',
      'Unlimited insights',
      'Full history & trends',
      'Advanced analytics',
      'Delegate tasks',
      'Smart batching',
      'Priority support'
    ]
  }
];

export default function BillingPage() {
  const { t, locale } = useTranslation();
  const { entitlements, loading } = useEntitlements();

  return (
    <PageWrapper className="px-5">
      <div className="mobile-container">
        <header className="pt-8 pb-6">
          <Link href="/settings">
            <Button variant="ghost" size="icon" className="mb-4">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-[28px] font-extrabold mb-2">
            {locale === 'ar' ? 'الفوترة' : 'Billing'}
          </h1>
          <p className="text-muted-foreground text-[14px]">
            {locale === 'ar' 
              ? 'إدارة اشتراكك وخطة الفوترة' 
              : 'Manage your subscription and billing'}
          </p>
        </header>

        {entitlements.isPro && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="p-5 bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border-accent/20">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-[16px] bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-[16px] font-bold">ROMANA Pro</h3>
                    <Badge className="bg-accent text-accent-foreground">Active</Badge>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Next billing: January 15, 2025
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <div className="space-y-4 pb-24">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-5 relative ${
                plan.popular ? 'border-accent/50 shadow-lg' : ''
              }`}>
                {plan.popular && (
                  <Badge 
                    className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-accent to-accent/80"
                  >
                    Most Popular
                  </Badge>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">/{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-accent" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                {plan.name === 'Free' && entitlements.isPro && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                )}

                {plan.name === 'Free' && !entitlements.isPro && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Current Plan
                  </Button>
                )}

                {plan.name === 'Pro' && !entitlements.isPro && (
                  <Button 
                    size="lg" 
                    className="w-full bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70"
                  >
                    Upgrade to Pro
                  </Button>
                )}

                {plan.name === 'Pro' && entitlements.isPro && (
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full"
                  >
                    Manage Subscription
                  </Button>
                )}
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
