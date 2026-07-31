export type PaymentStatus =
  | 'INITIATED'
  | 'AUTHORIZED'
  | 'SENT_TO_RAIL'
  | 'RAIL_ACCEPTED'
  | 'SETTLED'
  | 'FAILED'
  | 'CANCELLED';

export class PaymentStateMachine {
  private static readonly transitions: Record<PaymentStatus, PaymentStatus[]> = {
    INITIATED: ['AUTHORIZED', 'FAILED', 'CANCELLED'],
    AUTHORIZED: ['SENT_TO_RAIL', 'FAILED'],
    SENT_TO_RAIL: ['RAIL_ACCEPTED', 'FAILED'],
    RAIL_ACCEPTED: ['SETTLED', 'FAILED'],
    SETTLED: [],
    FAILED: ['INITIATED'],
    CANCELLED: [],
  };

  private static readonly statusMapping: Record<string, PaymentStatus> = {
    PENDING: 'INITIATED',
    INITIATED: 'INITIATED',
    AUTHORIZED: 'AUTHORIZED',
    SENT_TO_RAIL: 'SENT_TO_RAIL',
    RAIL_ACCEPTED: 'RAIL_ACCEPTED',
    SETTLED: 'SETTLED',
    SUCCESS: 'SETTLED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
  };

  static canTransition(current: PaymentStatus, next: string): boolean {
    const nextStatus = this.statusMapping[next] || (next as PaymentStatus);
    return this.transitions[current]?.includes(nextStatus) || false;
  }

  static fromTransactionStatus(status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED'): PaymentStatus {
    return this.statusMapping[status] || 'INITIATED';
  }

  static toTransactionStatus(status: PaymentStatus | string): 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' {
    switch (status) {
      case 'SETTLED':
        return 'SUCCESS';
      case 'FAILED':
        return 'FAILED';
      case 'CANCELLED':
        return 'CANCELLED';
      default:
        return 'PENDING';
    }
  }

  static isTerminal(status: PaymentStatus): boolean {
    return status === 'SETTLED' || status === 'FAILED' || status === 'CANCELLED';
  }
}
