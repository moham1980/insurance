/**
 * Data Subject Request Handling
 * GDPR-like implementation for data subject rights (access, deletion, portability, correction)
 */

export type RequestType = 'access' | 'deletion' | 'portability' | 'correction' | 'objection';

export type RequestStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface DataSubjectRequest {
  id: string;
  customerId: string;
  requestType: RequestType;
  status: RequestStatus;
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  reason?: string;
  scope: string[]; // Data categories affected
  requesterIdentity: {
    name: string;
    email: string;
    verified: boolean;
    verificationMethod: string;
  };
  processorNotes?: string;
  rejectionReason?: string;
  metadata?: Record<string, any>;
}

export interface DataSubjectResponse {
  requestId: string;
  customerId: string;
  requestType: RequestType;
  data?: any;
  deletionConfirmation?: string;
  portabilityFile?: string;
  correctionDetails?: Array<{ field: string; oldValue: any; newValue: any }>;
  generatedAt: Date;
}

/**
 * Data Subject Request Service
 */
export class DataSubjectRequestService {
  private requests: DataSubjectRequest[] = [];

  /**
   * Create a new data subject request
   */
  createRequest(params: {
    customerId: string;
    requestType: RequestType;
    requesterName: string;
    requesterEmail: string;
    verificationMethod: string;
    reason?: string;
    scope?: string[];
  }): DataSubjectRequest {
    const request: DataSubjectRequest = {
      id: `DSR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      customerId: params.customerId,
      requestType: params.requestType,
      status: 'pending',
      requestedAt: new Date(),
      scope: params.scope || ['customer', 'policy', 'claim'],
      requesterIdentity: {
        name: params.requesterName,
        email: params.requesterEmail,
        verified: false,
        verificationMethod: params.verificationMethod,
      },
      reason: params.reason,
    };

    this.requests.push(request);
    return request;
  }

  /**
   * Get request by ID
   */
  getRequest(requestId: string): DataSubjectRequest | undefined {
    return this.requests.find(r => r.id === requestId);
  }

  /**
   * Get all requests for a customer
   */
  getCustomerRequests(customerId: string): DataSubjectRequest[] {
    return this.requests
      .filter(r => r.customerId === customerId)
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());
  }

  /**
   * Verify requester identity
   */
  verifyRequester(requestId: string): DataSubjectRequest | null {
    const request = this.getRequest(requestId);
    if (!request) return null;

    request.requesterIdentity.verified = true;
    request.status = 'in_review';
    request.processedAt = new Date();

    return request;
  }

  /**
   * Approve a request
   */
  approveRequest(requestId: string, notes?: string): DataSubjectRequest | null {
    const request = this.getRequest(requestId);
    if (!request || request.status !== 'in_review') return null;

    request.status = 'approved';
    request.processorNotes = notes;
    request.processedAt = new Date();

    return request;
  }

  /**
   * Reject a request
   */
  rejectRequest(requestId: string, reason: string): DataSubjectRequest | null {
    const request = this.getRequest(requestId);
    if (!request || request.status !== 'in_review') return null;

    request.status = 'rejected';
    request.rejectionReason = reason;
    request.processedAt = new Date();

    return request;
  }

  /**
   * Complete a request
   */
  completeRequest(requestId: string): DataSubjectRequest | null {
    const request = this.getRequest(requestId);
    if (!request || request.status !== 'approved') return null;

    request.status = 'completed';
    request.completedAt = new Date();

    return request;
  }

  /**
   * Process data access request
   */
  processAccessRequest(customerId: string): DataSubjectResponse {
    // In a real implementation, this would query all data for the customer
    const customerData = {
      customerId,
      personalData: {
        name: '***',
        email: '***',
        phone: '***',
      },
      policies: [
        { policyNumber: '***', status: 'active' },
      ],
      claims: [],
      consents: [],
    };

    return {
      requestId: `DSR-${Date.now()}`,
      customerId,
      requestType: 'access',
      data: customerData,
      generatedAt: new Date(),
    };
  }

  /**
   * Process data deletion request
   */
  processDeletionRequest(customerId: string, scope: string[]): DataSubjectResponse {
    // In a real implementation, this would delete or anonymize data
    const deletedCategories = scope.join(', ');

    return {
      requestId: `DSR-${Date.now()}`,
      customerId,
      requestType: 'deletion',
      deletionConfirmation: `Data in categories [${deletedCategories}] has been marked for deletion`,
      generatedAt: new Date(),
    };
  }

  /**
   * Process data portability request
   */
  processPortabilityRequest(customerId: string): DataSubjectResponse {
    // In a real implementation, this would generate a machine-readable export
    const portableData = {
      customerId,
      exportFormat: 'JSON',
      exportedAt: new Date().toISOString(),
      data: {
        // Customer data in portable format
      },
    };

    return {
      requestId: `DSR-${Date.now()}`,
      customerId,
      requestType: 'portability',
      data: portableData,
      portabilityFile: `export_${customerId}_${Date.now()}.json`,
      generatedAt: new Date(),
    };
  }

  /**
   * Process data correction request
   */
  processCorrectionRequest(customerId: string, corrections: Array<{ field: string; newValue: any }>): DataSubjectResponse {
    // In a real implementation, this would apply corrections and log changes
    const correctionDetails = corrections.map(c => ({
      field: c.field,
      oldValue: '***', // In real implementation, this would be the actual old value
      newValue: c.newValue,
    }));

    return {
      requestId: `DSR-${Date.now()}`,
      customerId,
      requestType: 'correction',
      correctionDetails,
      generatedAt: new Date(),
    };
  }

  /**
   * Process objection request
   */
  processObjectionRequest(customerId: string, objectionReason: string): DataSubjectResponse {
    // In a real implementation, this would update consent and processing preferences
    return {
      requestId: `DSR-${Date.now()}`,
      customerId,
      requestType: 'objection',
      data: {
        objectionReason,
        status: 'recorded',
        processingRestricted: true,
      },
      generatedAt: new Date(),
    };
  }

  /**
   * Get request statistics
   */
  getRequestStats(): {
    total: number;
    byStatus: Record<RequestStatus, number>;
    byType: Record<RequestType, number>;
    pending: number;
    completed: number;
  } {
    const stats = {
      total: this.requests.length,
      byStatus: {} as Record<RequestStatus, number>,
      byType: {} as Record<RequestType, number>,
      pending: 0,
      completed: 0,
    };

    for (const request of this.requests) {
      stats.byStatus[request.status] = (stats.byStatus[request.status] || 0) + 1;
      stats.byType[request.requestType] = (stats.byType[request.requestType] || 0) + 1;

      if (request.status === 'pending' || request.status === 'in_review') {
        stats.pending++;
      }
      if (request.status === 'completed') {
        stats.completed++;
      }
    }

    return stats;
  }

  /**
   * Get pending requests
   */
  getPendingRequests(): DataSubjectRequest[] {
    return this.requests
      .filter(r => r.status === 'pending' || r.status === 'in_review')
      .sort((a, b) => a.requestedAt.getTime() - b.requestedAt.getTime());
  }

  /**
   * Cancel a request
   */
  cancelRequest(requestId: string): DataSubjectRequest | null {
    const request = this.getRequest(requestId);
    if (!request || (request.status !== 'pending' && request.status !== 'in_review')) return null;

    request.status = 'cancelled';
    return request;
  }

  /**
   * Check if customer has active requests
   */
  hasActiveRequests(customerId: string): boolean {
    const customerRequests = this.getCustomerRequests(customerId);
    return customerRequests.some(r => 
      ['pending', 'in_review', 'approved'].includes(r.status),
    );
  }
}

// Export singleton instance
export const dataSubjectRequestService = new DataSubjectRequestService();
