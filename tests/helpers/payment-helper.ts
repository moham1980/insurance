import { ApiClient } from './api-client';

export async function createExecutedPaymentForPolicy(
  apiClient: ApiClient,
  policyId: string,
  amount: number,
  tenantId: string
): Promise<string> {
  const idempotencyKey = `test-${policyId}-${Date.now()}`;
  const prepare = await apiClient.post('/payments/payments/prepare', {
    idempotencyKey,
    claimId: policyId,
    amount,
    currency: 'IRR',
  });
  if (!prepare.success) {
    throw new Error(`Payment prepare failed: ${JSON.stringify(prepare.error)}`);
  }
  const paymentIntentId = prepare.data.paymentIntentId;

  const approve = await apiClient.post(`/payments/payments/${paymentIntentId}/approve`, {});
  if (!approve.success) {
    throw new Error(`Payment approve failed: ${JSON.stringify(approve.error)}`);
  }

  const execute = await apiClient.post(`/payments/payments/${paymentIntentId}/execute`, {
    metadata: { policyId, tenantId },
  });
  if (!execute.success) {
    throw new Error(`Payment execute failed: ${JSON.stringify(execute.error)}`);
  }
  return execute.data.payment.paymentId as string;
}
