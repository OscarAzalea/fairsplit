import { getPayPalIntegrationStatus } from '@/lib/paypal';

export async function GET(request: Request) {
  // Reading the request URL makes this status response request-time data.
  void request.url;

  return Response.json({
    paypalCheckout: getPayPalIntegrationStatus(),
    gemini: process.env.GEMINI_API_KEY ? 'key-configured' : 'heuristic',
    payouts: 'simulated',
  });
}
