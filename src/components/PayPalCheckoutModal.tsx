'use client';

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import {
  X,
  Lock,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { Epoch, Inflow } from '@/lib/types';
import {
  allocateCentsFairly,
  calculatePayPalFeeCents,
  centsToDollars,
  dollarsToCents,
} from '@/lib/fairsplit-math';

type PayPalMode = 'sandbox' | 'simulated' | 'incomplete';

interface IntegrationResponse {
  paypalCheckout: {
    mode: PayPalMode;
    clientId?: string;
  };
}

interface CaptureApiResponse {
  id?: string;
  mode?: 'sandbox' | 'simulated';
  status?: string;
  purchase_units?: Array<{
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: {
          value?: string;
          currency_code?: string;
        };
        seller_receivable_breakdown?: {
          paypal_fee?: { value?: string; currency_code?: string };
          net_amount?: { value?: string; currency_code?: string };
        };
      }>;
    };
  }>;
}

interface PayPalButtonsOptions {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
}

interface PayPalButtonsInstance {
  render: (container: HTMLElement) => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: PayPalButtonsOptions) => PayPalButtonsInstance;
    };
  }
}

interface PayPalCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEpoch: Epoch;
  source: string;
  grossDollars: number;
  onSuccess: (inflow: Inflow) => void;
}

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json();
    if (typeof body.error === 'string') return new Error(body.error);
  } catch {
    // Use the caller's message when the server did not return JSON.
  }
  return new Error(fallback);
}

export const PayPalCheckoutModal: React.FC<PayPalCheckoutModalProps> = ({
  isOpen,
  onClose,
  activeEpoch,
  source,
  grossDollars,
  onSuccess,
}) => {
  const [stage, setStage] = useState<'checkout' | 'authorizing' | 'success'>('checkout');
  const [integration, setIntegration] = useState<IntegrationResponse['paypalCheckout'] | null>(null);
  const [integrationError, setIntegrationError] = useState<string | null>(null);
  const [paypalSdkReady, setPaypalSdkReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    captureId: string;
    mode: 'sandbox' | 'simulated';
    inflow: Inflow;
  } | null>(null);
  const paypalButtonContainerRef = useRef<HTMLDivElement>(null);
  const paypalButtonsRef = useRef<PayPalButtonsInstance | null>(null);

  const contextRef = useRef({ activeEpoch, source, grossDollars, onSuccess });
  contextRef.current = { activeEpoch, source, grossDollars, onSuccess };

  const grossCents = dollarsToCents(grossDollars);
  const estimatedFeeCents = calculatePayPalFeeCents(grossCents);
  const estimatedNetCents = Math.max(0, grossCents - estimatedFeeCents);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setStage('checkout');
    setOrderResult(null);
    setErrorMessage(null);
    setIntegrationError(null);
    setIntegration(null);
    setPaypalSdkReady(false);

    fetch('/api/integration-status', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load payment integration status.');
        return (await response.json()) as IntegrationResponse;
      })
      .then((status) => {
        if (!cancelled) setIntegration(status.paypalCheckout);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setIntegrationError(
            error instanceof Error ? error.message : 'Could not check PayPal configuration.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const finishCapture = async (orderId: string, captureData: CaptureApiResponse) => {
    const context = contextRef.current;
    if (captureData.status !== 'COMPLETED') {
      throw new Error('PayPal did not confirm a completed capture.');
    }
    if (!captureData.mode) {
      throw new Error('The server did not confirm which payment path completed.');
    }
    if (integration?.mode === 'sandbox' && captureData.mode !== 'sandbox') {
      throw new Error('The capture response did not come from PayPal Sandbox.');
    }

    const capture = captureData.purchase_units?.[0]?.payments?.captures?.[0];
    const grossValue = Number(capture?.amount?.value);
    if (!Number.isFinite(grossValue) || grossValue <= 0) {
      throw new Error('The capture response did not include a valid settled amount.');
    }

    const settledGrossCents = dollarsToCents(grossValue);
    const reportedFee = capture?.seller_receivable_breakdown?.paypal_fee?.value;
    const reportedNet = capture?.seller_receivable_breakdown?.net_amount?.value;
    const feeCents =
      reportedFee !== undefined && Number.isFinite(Number(reportedFee))
        ? dollarsToCents(Number(reportedFee))
        : calculatePayPalFeeCents(settledGrossCents);
    const netCents =
      reportedNet !== undefined && Number.isFinite(Number(reportedNet))
        ? dollarsToCents(Number(reportedNet))
        : Math.max(0, settledGrossCents - feeCents);
    const inflow: Inflow = {
      id: 'INF-' + Math.floor(100 + Math.random() * 900),
      source: context.source,
      grossCents: settledGrossCents,
      feeCents,
      netCents,
      currency: 'USD',
      timestamp: new Date().toISOString(),
      paypalOrderId: orderId,
      paypalCaptureId: capture?.id,
      paymentMode: captureData.mode === 'sandbox' ? 'PAYPAL_SANDBOX' : 'SIMULATED',
      paymentStatus: captureData.mode === 'sandbox' ? 'COMPLETED' : 'SIMULATED',
      epochId: context.activeEpoch.epochId,
      epochHash: context.activeEpoch.hash,
      allocations: allocateCentsFairly(netCents, context.activeEpoch.splits),
    };

    setOrderResult({
      orderId,
      captureId: capture?.id || 'Capture ID unavailable',
      mode: captureData.mode,
      inflow,
    });
    setStage('success');
    context.onSuccess(inflow);
  };

  const finishCaptureRef = useRef(finishCapture);
  finishCaptureRef.current = finishCapture;

  useEffect(() => {
    if (
      !isOpen ||
      integration?.mode !== 'sandbox' ||
      !paypalSdkReady ||
      !window.paypal ||
      !paypalButtonContainerRef.current
    ) {
      return;
    }

    const buttons = window.paypal.Buttons({
      createOrder: async () => {
        const context = contextRef.current;
        setErrorMessage(null);
        const response = await fetch('/api/paypal/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountDollars: context.grossDollars,
            description: context.source,
          }),
        });
        if (!response.ok) throw await responseError(response, 'PayPal order creation failed.');

        const order = (await response.json()) as { id?: string; mode?: string };
        if (!order.id || order.mode !== 'sandbox') {
          throw new Error('PayPal Sandbox did not create a valid order.');
        }
        return order.id;
      },
      onApprove: async ({ orderID }) => {
        setStage('authorizing');
        setErrorMessage(null);
        try {
          const response = await fetch('/api/paypal/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: orderID }),
          });
          if (!response.ok) throw await responseError(response, 'PayPal capture failed.');
          await finishCaptureRef.current(orderID, (await response.json()) as CaptureApiResponse);
        } catch (error: unknown) {
          setErrorMessage(error instanceof Error ? error.message : 'PayPal capture failed.');
          setStage('checkout');
          throw error;
        }
      },
      onCancel: () => {
        setErrorMessage('Checkout was cancelled. No capture was recorded.');
        setStage('checkout');
      },
      onError: (error) => {
        setErrorMessage(
          error instanceof Error ? error.message : 'PayPal Checkout could not continue.'
        );
        setStage('checkout');
      },
    });

    paypalButtonsRef.current = buttons;
    buttons.render(paypalButtonContainerRef.current).catch((error: unknown) => {
      setErrorMessage(
        error instanceof Error ? error.message : 'PayPal Checkout buttons could not load.'
      );
    });

    return () => {
      paypalButtonsRef.current = null;
      if (paypalButtonContainerRef.current) {
        paypalButtonContainerRef.current.innerHTML = '';
      }
      void buttons.close().catch(() => undefined);
    };
  }, [isOpen, integration, paypalSdkReady]);

  if (!isOpen) return null;

  const handleSimulatedCheckout = async () => {
    setStage('authorizing');
    setErrorMessage(null);

    try {
      const context = contextRef.current;
      const createResponse = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountDollars: context.grossDollars,
          description: context.source,
        }),
      });
      if (!createResponse.ok) {
        throw await responseError(createResponse, 'Could not create the simulated order.');
      }

      const order = (await createResponse.json()) as { id?: string; mode?: string };
      if (!order.id || order.mode !== 'simulated') {
        throw new Error('The server is not in simulator mode.');
      }

      const captureResponse = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          amountDollars: context.grossDollars,
        }),
      });
      if (!captureResponse.ok) {
        throw await responseError(captureResponse, 'Could not simulate the capture.');
      }

      await finishCaptureRef.current(
        order.id,
        (await captureResponse.json()) as CaptureApiResponse
      );
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Simulated checkout failed.');
      setStage('checkout');
    }
  };

  const paypalSdkUrl = integration?.clientId
    ? 'https://www.paypal.com/sdk/js?client-id=' +
      encodeURIComponent(integration.clientId) +
      '&currency=USD&intent=capture&components=buttons'
    : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center text-white font-black tracking-tight text-lg">
              <span className="text-[#0079C1] italic">Pay</span>
              <span className="text-[#00457C] italic">Pal</span>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-950 text-blue-300 border border-blue-800">
              {integration?.mode === 'sandbox'
                ? 'PayPal Developer Sandbox'
                : integration?.mode === 'simulated'
                  ? 'Local checkout simulator'
                  : 'Payment setup'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>
                {integration?.mode === 'sandbox'
                  ? 'PayPal Sandbox'
                  : integration?.mode === 'simulated'
                    ? 'No external transaction'
                    : 'Payment setup'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={stage === 'authorizing'}
              aria-label="Close checkout"
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2 disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {stage === 'checkout' && (
            <>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <span>Purchase summary</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 text-slate-400 border border-slate-800">
                    Epoch {activeEpoch.version}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span className="font-semibold">{source}</span>
                    <span className="font-bold text-white">{centsToDollars(grossCents)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Estimated processing fee:</span>
                    <span className="text-red-400 font-medium">
                      -{centsToDollars(estimatedFeeCents)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-xs">
                    <span className="text-slate-300 font-bold">Estimated studio net:</span>
                    <span className="text-emerald-400 font-extrabold">
                      {centsToDollars(estimatedNetCents)}
                    </span>
                  </div>
                </div>
              </div>

              {integration?.mode === 'sandbox' && (
                <div className="p-3 rounded-xl bg-blue-950/50 border border-blue-900 text-blue-200 text-xs">
                  Approve the order in PayPal Sandbox with a sandbox buyer account. FairSplit
                  records the order only after PayPal confirms the capture.
                </div>
              )}

              {integration?.mode === 'simulated' && (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-900 text-amber-200 text-xs">
                  Simulator mode: no PayPal account is opened and no external transaction occurs.
                  The generated order and capture IDs are demo data.
                </div>
              )}

              {integration?.mode === 'incomplete' && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    PayPal is partly configured. Set both PAYPAL_CLIENT_ID and
                    PAYPAL_CLIENT_SECRET, or remove both to use the local simulator.
                  </span>
                </div>
              )}

              {integrationError && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs">
                  {integrationError}
                </div>
              )}
              {!integration && !integrationError && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-xs">
                  Checking checkout configuration…
                </div>
              )}

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-950 border border-red-800 text-red-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {integration?.mode === 'simulated' && (
                <button
                  type="button"
                  onClick={handleSimulatedCheckout}
                  className="w-full h-12 rounded-full bg-[#FFC439] hover:bg-[#F2BA36] text-black font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#FFC439]/20 transition"
                >
                  <span className="text-[#0079C1] italic text-base">Pay</span>
                  <span className="text-[#00457C] italic text-base">Pal</span>
                  <span className="ml-1">Run demo capture ({centsToDollars(grossCents)})</span>
                </button>
              )}

              {integration?.mode === 'sandbox' && (
                <>
                  {paypalSdkUrl && (
                    <Script
                      id="paypal-sandbox-sdk"
                      src={paypalSdkUrl}
                      strategy="afterInteractive"
                      onReady={() => setPaypalSdkReady(true)}
                      onError={() => setErrorMessage('PayPal Sandbox Checkout could not load.')}
                    />
                  )}
                  {!paypalSdkReady && (
                    <div className="w-full h-12 rounded-xl bg-slate-800 text-slate-300 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading PayPal Sandbox Checkout…
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {stage === 'authorizing' && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-950/80 border border-blue-700 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  {integration?.mode === 'sandbox'
                    ? 'Confirming capture with PayPal…'
                    : 'Creating demo capture…'}
                </h3>
                <p className="text-xs text-slate-400 max-w-xs">
                  The capture is checked before the inflow is added to Epoch {activeEpoch.version}.
                </p>
              </div>
            </div>
          )}

          {stage === 'success' && orderResult && (
            <div className="space-y-5 animate-in fade-in duration-300">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-600 mx-auto flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {orderResult.mode === 'sandbox'
                    ? 'PayPal Sandbox capture confirmed'
                    : 'Demo capture simulated'}
                </h3>
                <p className="text-xs text-slate-400">
                  The inflow was stamped to the active agreement epoch.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>PayPal order ID:</span>
                  <span className="font-mono text-blue-400 font-bold">{orderResult.orderId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Capture ID:</span>
                  <span className="font-mono text-slate-300">{orderResult.captureId}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Gross settled:</span>
                  <span className="text-white font-bold">
                    {centsToDollars(orderResult.inflow.grossCents)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>PayPal fee or estimate:</span>
                  <span className="text-red-400 font-medium">
                    -{centsToDollars(orderResult.inflow.feeCents)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span className="font-bold">Net distributed:</span>
                  <span className="text-emerald-400 font-extrabold">
                    {centsToDollars(orderResult.inflow.netCents)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px] pt-1 border-t border-slate-800">
                  <span>Anchored epoch:</span>
                  <span className="font-mono text-emerald-400">
                    {activeEpoch.version} ({orderResult.inflow.epochHash.slice(0, 10)}...)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition shadow-lg shadow-blue-600/30"
              >
                Done (view in Trust Ledger)
              </button>
            </div>
          )}

          <div
            className={
              integration?.mode === 'sandbox' && stage === 'checkout' && paypalSdkReady
                ? 'rounded-xl overflow-hidden bg-white min-h-12'
                : 'hidden'
            }
          >
            <div ref={paypalButtonContainerRef} />
          </div>
          {integration?.mode === 'sandbox' && errorMessage && (
            <div className="text-center text-[10px] text-slate-500">
              Try closing and reopening checkout if the PayPal button failed to initialize.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
