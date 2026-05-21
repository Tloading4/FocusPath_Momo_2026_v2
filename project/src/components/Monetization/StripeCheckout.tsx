import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Zap, Star, Check, Loader2, CreditCard, Shield, ArrowRight } from 'lucide-react';
import { stripeProducts } from '../../stripe-config';
import type { StripeProduct } from '../../stripe-config';

interface StripeCheckoutProps {
  onError?: (error: string) => void;
}

export function StripeCheckout({ onError }: StripeCheckoutProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const { currentUser } = useAuth();

  const handleCheckout = async (product: StripeProduct) => {
    if (!currentUser) {
      onError?.('Please log in to continue with checkout');
      return;
    }

    setLoading(product.id);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase configuration missing. Please check your environment variables.');
      }

      const functionUrl = `${supabaseUrl}/functions/v1/create-checkout-session`;

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          priceId: product.priceId,
          userId: currentUser.uid,
          email: currentUser.email || '',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error: any) {
      console.error('Checkout error:', error);
      onError?.(error.message || 'Failed to start checkout process');
      setLoading(null);
    }
  };

  const getProductIcon = (product: StripeProduct) => {
    if (product.interval === 'year') {
      return <Star className="h-8 w-8 text-white" />;
    }
    return <Zap className="h-8 w-8 text-white" />;
  };

  const getProductColor = (product: StripeProduct) => {
    if (product.interval === 'year') {
      return 'from-green-500 to-emerald-600';
    }
    return 'from-blue-500 to-blue-600';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h2>
        <p className="text-xl text-gray-300">Unlock your full focus potential with premium features</p>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {stripeProducts.map((product) => (
          <div
            key={product.id}
            className={`relative glass-card rounded-2xl p-8 border-2 transition-all hover:scale-105 ${
              product.popular 
                ? 'border-blue-500/50 ring-2 ring-blue-500/30' 
                : 'border-white/20 hover:border-white/30'
            }`}
          >
            {product.popular && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-4 py-2 rounded-full text-sm font-bold">
                  Most Popular
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r ${getProductColor(product)} mb-4`}>
                {getProductIcon(product)}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{product.description}</p>
            </div>

            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-2">
                <span className="text-4xl font-bold text-white">
                  ${product.price}
                </span>
                <span className="text-gray-400">
                  /{product.interval}
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {product.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">{feature}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => handleCheckout(product)}
              disabled={loading === product.id}
              className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${
                product.popular
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
              } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
            >
              {loading === product.id ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="h-5 w-5" />
                  Subscribe Now
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Trust Indicators */}
      <div className="rounded-2xl p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center">
            <Shield className="h-12 w-12 text-green-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Secure Payment</h4>
            <p className="text-gray-400 text-sm">Protected by industry-leading security</p>
          </div>
          <div className="flex flex-col items-center">
            <Check className="h-12 w-12 text-blue-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">30-Day Guarantee</h4>
            <p className="text-gray-400 text-sm">Full refund if you're not completely satisfied</p>
          </div>
          <div className="flex flex-col items-center">
            <CreditCard className="h-12 w-12 text-purple-400 mb-3" />
            <h4 className="font-semibold text-white mb-2">Cancel Anytime</h4>
            <p className="text-gray-400 text-sm">No long-term commitment required</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-2xl p-8 max-w-4xl mx-auto">
        <h3 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-2">What payment methods do you accept?</h4>
            <p className="text-gray-300 text-sm">We accept all major credit cards, debit cards, and digital wallets through our secure Stripe payment system.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">How does billing work?</h4>
            <p className="text-gray-300 text-sm">You'll be billed monthly on the same date you subscribe. You can cancel anytime before your next billing cycle.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Is my data secure?</h4>
            <p className="text-gray-300 text-sm">Absolutely. We use enterprise-grade encryption and never store your payment information.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">Can I upgrade or downgrade?</h4>
            <p className="text-gray-300 text-sm">Yes, you'll be able to change your plan at any time with prorated billing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}