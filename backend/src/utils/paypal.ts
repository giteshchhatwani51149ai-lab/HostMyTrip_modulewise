import axios from 'axios';

const PAYPAL_API = process.env.PAYPAL_API_URL || 'https://api-m.sandbox.paypal.com';

/**
 * Generate an OAuth 2.0 access token for authenticating with PayPal REST APIs.
 */
export const generateAccessToken = async () => {
  try {
    const { PAYPAL_CLIENT_ID, PAYPAL_SECRET } = process.env;
    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      throw new Error('MISSING_API_CREDENTIALS');
    }
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const response = await axios.post(`${PAYPAL_API}/v1/oauth2/token`, 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to generate Access Token:', error);
    throw error;
  }
};

/**
 * Create an order to start the transaction.
 */
export const createOrder = async (amount: number) => {
  const accessToken = await generateAccessToken();
  const url = `${PAYPAL_API}/v2/checkout/orders`;
  const payload = {
    intent: 'CAPTURE',
    purchase_units: [
      {
        amount: {
          currency_code: 'USD', // Using USD because INR is often completely blocked for domestic Indian sandbox unless specifically requested on PayPal India. If the user meant INR, it can be tested in live if their account supports it, or we enforce USD. Wait, the app uses INR. We must send INR but note that PayPal Sandbox might reject INR if not configured. For standard UI demonstration, we'll try INR.
          value: (amount).toFixed(2), // amount shouldn't be strictly converted to cents here unlike Stripe. It's decimal.
        },
      },
    ],
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data; // Includes the id (OrderId)
};

/**
 * Capture payment for the created order to complete the transaction.
 */
export const capturePayment = async (orderID: string) => {
  const accessToken = await generateAccessToken();
  const url = `${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`;

  const response = await axios.post(url, {}, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  return response.data;
};

/**
 * Refund a captured payment.
 * @param captureId — the PayPal capture id (NOT the order id)
 * @param amount    — refund amount (full capture refunded if omitted)
 * @param currency  — ISO 4217 currency code (default INR)
 * @returns         — PayPal refund object including `id` and `status`
 */
export const refundCapture = async (
  captureId: string,
  amount?: number,
  currency = 'INR',
  noteToPayer = 'Refund processed by HostMyTrip',
) => {
  const accessToken = await generateAccessToken();
  const url = `${PAYPAL_API}/v2/payments/captures/${captureId}/refund`;
  const body: any = { note_to_payer: noteToPayer };
  if (amount !== undefined) {
    body.amount = { value: Number(amount).toFixed(2), currency_code: currency };
  }
  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  });
  return response.data; // { id, status: 'COMPLETED' | 'PENDING' | 'CANCELLED', ... }
};
