import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';

export interface FirebaseSubscription {
  id: string;
  user_id: string;
  stripe_subscription_id: string;
  stripe_customer_id: string;
  stripe_price_id: string;
  status: string;
  tier: string;
  interval: string;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at_period_end: boolean;
  canceled_at: Date | null;
  trial_start: Date | null;
  trial_end: Date | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface StripeCustomer {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

function timestampToDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
}

function convertSubscriptionFromFirestore(docId: string, data: any): FirebaseSubscription {
  return {
    id: docId,
    user_id: data.user_id,
    stripe_subscription_id: data.stripe_subscription_id,
    stripe_customer_id: data.stripe_customer_id,
    stripe_price_id: data.stripe_price_id,
    status: data.status,
    tier: data.tier,
    interval: data.interval,
    current_period_start: timestampToDate(data.current_period_start),
    current_period_end: timestampToDate(data.current_period_end),
    cancel_at_period_end: data.cancel_at_period_end || false,
    canceled_at: data.canceled_at ? timestampToDate(data.canceled_at) : null,
    trial_start: data.trial_start ? timestampToDate(data.trial_start) : null,
    trial_end: data.trial_end ? timestampToDate(data.trial_end) : null,
    metadata: data.metadata || {},
    created_at: timestampToDate(data.created_at),
    updated_at: timestampToDate(data.updated_at),
  };
}

export async function getActiveSubscription(userId: string): Promise<FirebaseSubscription | null> {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(
      subscriptionsRef,
      where('user_id', '==', userId),
      where('status', 'in', ['active', 'trialing']),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return null;
    }

    const docSnap = querySnapshot.docs[0];
    return convertSubscriptionFromFirestore(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error fetching active subscription:', error);
    return null;
  }
}

export async function getStripeCustomer(userId: string): Promise<StripeCustomer | null> {
  try {
    const customerDocRef = doc(db, 'stripe_customers', userId);
    const customerDoc = await getDoc(customerDocRef);

    if (!customerDoc.exists()) {
      return null;
    }

    const data = customerDoc.data();
    return {
      id: customerDoc.id,
      user_id: data.user_id,
      stripe_customer_id: data.stripe_customer_id,
      email: data.email,
      created_at: timestampToDate(data.created_at),
      updated_at: timestampToDate(data.updated_at),
    };
  } catch (error) {
    console.error('Error fetching Stripe customer:', error);
    return null;
  }
}

export async function getAllSubscriptions(userId: string): Promise<FirebaseSubscription[]> {
  try {
    const subscriptionsRef = collection(db, 'subscriptions');
    const q = query(
      subscriptionsRef,
      where('user_id', '==', userId),
      orderBy('created_at', 'desc')
    );

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc =>
      convertSubscriptionFromFirestore(doc.id, doc.data())
    );
  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    return [];
  }
}

export function subscribeToSubscriptionChanges(
  userId: string,
  callback: (subscription: FirebaseSubscription | null) => void
): () => void {
  const subscriptionsRef = collection(db, 'subscriptions');
  const q = query(
    subscriptionsRef,
    where('user_id', '==', userId),
    orderBy('created_at', 'desc')
  );

  const unsubscribe = onSnapshot(q, async (snapshot) => {
    console.log('Subscription change detected in Firestore');

    const activeSubscription = await getActiveSubscription(userId);
    callback(activeSubscription);
  }, (error) => {
    console.error('Error listening to subscription changes:', error);
    callback(null);
  });

  return unsubscribe;
}

export async function createOrUpdateSubscription(
  subscriptionData: Partial<FirebaseSubscription>
): Promise<void> {
  try {
    if (!subscriptionData.stripe_subscription_id) {
      throw new Error('stripe_subscription_id is required');
    }

    const subscriptionRef = doc(db, 'subscriptions', subscriptionData.stripe_subscription_id);

    await setDoc(subscriptionRef, {
      ...subscriptionData,
      updated_at: Timestamp.now(),
      created_at: subscriptionData.created_at || Timestamp.now(),
    }, { merge: true });

    console.log('Subscription created/updated:', subscriptionData.stripe_subscription_id);
  } catch (error) {
    console.error('Error creating/updating subscription:', error);
    throw error;
  }
}

export async function createOrUpdateStripeCustomer(
  userId: string,
  stripeCustomerId: string,
  email: string
): Promise<void> {
  try {
    const customerRef = doc(db, 'stripe_customers', userId);

    await setDoc(customerRef, {
      user_id: userId,
      stripe_customer_id: stripeCustomerId,
      email: email,
      updated_at: Timestamp.now(),
      created_at: Timestamp.now(),
    }, { merge: true });

    console.log('Stripe customer created/updated:', userId);
  } catch (error) {
    console.error('Error creating/updating Stripe customer:', error);
    throw error;
  }
}
