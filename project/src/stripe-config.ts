export interface StripeProduct {
  id: string;
  priceId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  popular?: boolean;
  tier: 'premium';
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'premium-monthly',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_MONTHLY || 'price_monthly_placeholder',
    name: 'Focus Path™ Premium - Monthly',
    description: 'Unlock unlimited focus sessions, enhanced AI coaching, mini-games, custom dashboard, and more.',
    price: 7.99,
    currency: 'usd',
    interval: 'month',
    tier: 'premium',
    popular: false,
    features: [
      'Unlimited focus sessions',
      'Unlimited AI queries & coaching',
      'All mini-games unlocked',
      'Custom dashboard widgets',
      'Premium backgrounds & themes',
      'Unlimited data exports',
      'Custom photo avatars',
      'All power-ups unlocked',
      'Full session history',
      'Priority support'
    ]
  },
  {
    id: 'premium-annual',
    priceId: import.meta.env.VITE_STRIPE_PRICE_ID_ANNUAL || 'price_annual_placeholder',
    name: 'Focus Path™ Premium - Annual',
    description: 'Get 12 months of Premium for the price of 9.4 months. Save $21.89 per year!',
    price: 74.99,
    currency: 'usd',
    interval: 'year',
    tier: 'premium',
    popular: true,
    features: [
      'Everything in Monthly',
      'Save $21.89 per year',
      '$6.25 per month when billed annually',
      'Unlimited focus sessions',
      'Unlimited AI queries & coaching',
      'All mini-games unlocked',
      'Custom dashboard widgets',
      'Premium backgrounds & themes',
      'Unlimited data exports',
      'Priority support'
    ]
  }
];

export function getProductById(id: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.id === id);
}

export function getProductByPriceId(priceId: string): StripeProduct | undefined {
  return stripeProducts.find(product => product.priceId === priceId);
}

export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
  successUrl: `${window.location.origin}/success`,
  cancelUrl: `${window.location.origin}/cancel`
};