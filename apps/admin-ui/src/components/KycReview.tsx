/**
 * KYC Review Component
 * Displays and manages KYC reviews with document trust chain, identity proofing, external verification, and exception handling
 */

import React, { useState, useEffect } from 'react';

interface KycReview {
  kycReviewId: string;
  partyId: string;
  status: 'pending' | 'approved' | 'rejected';
  workflowStage: string;
  reviewerUserId: string | null;
  notes: string | null;
  decidedAt: Date | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical' | null;
  riskScore: number | null;
  riskFactors: string[] | null;
  amlScreeningStatus: string;
  pepScreeningStatus: string | null;
  sanctionsScreeningStatus: string | null;
  adverseMediaStatus: string | null;
  documentStatus: string;
  dueDate: Date;
  createdAt: Date;
}

interface DocumentTrustChain {
  documentId: string;
  documentType: string;
  uploadedAt: Date;
  uploadedBy: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  verificationMethod: string;
  trustLevel: 'low' | 'medium' | 'high';
  hash: string;
  previousHash?: string;
  chainPosition: number;
}

interface IdentityProofingResult {
  proofingId: string;
  partyId: string;
  faceMatchScore: number;
  faceMatchThreshold: number;
  dedupMatchFound: boolean;
  dedupMatchIds: string[];
  livenessCheck: boolean;
  documentAuthenticity: boolean;
  confidenceScore: number;
  status: 'passed' | 'failed' | 'manual_review';
  completedAt: Date;
}

interface KycException {
  exceptionId: string;
  partyId: string;
  kycReviewId: string;
  exceptionType: 'document_issue' | 'screening_failure' | 'consent_issue' | 'verification_timeout' | 'external_service_failure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  raisedAt: Date;
  raisedBy: string;
  assignedTo?: string;
  status: 'pending' | 'in_progress' | 'resolved' | 'escalated';
  resolutionNotes?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}

interface SlaCompliance {
  compliant: boolean;
  daysRemaining: number;
  dueDate: Date;
}

export const KycReview: React.FC = () => {
  const [kycReviews, setKycReviews] = useState<KycReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<KycReview | null>(null);
  const [documentTrustChain, setDocumentTrustChain] = useState<DocumentTrustChain[]>([]);
  const [identityProofing, setIdentityProofing] = useState<IdentityProofingResult | null>(null);
  const [exceptions, setExceptions] = useState<KycException[]>([]);
  const [slaCompliance, setSlaCompliance] = useState<SlaCompliance | null>(null);
  const [activeTab, setActiveTab] = useState<'reviews' | 'details' | 'exceptions' | 'sla'>('reviews');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchKycReviews();
  }, []);

  const fetchKycReviews = async () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setKycReviews([
        {
          kycReviewId: 'kyc-1',
          partyId: 'party-1',
          status: 'pending',
          workflowStage: 'aml_screening',
          reviewerUserId: null,
          notes: null,
          decidedAt: null,
          riskLevel: null,
          riskScore: null,
          riskFactors: null,
          amlScreeningStatus: 'passed',
          pepScreeningStatus: 'passed',
          sanctionsScreeningStatus: 'passed',
          adverseMediaStatus: 'passed',
          documentStatus: 'submitted',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          kycReviewId: 'kyc-2',
          partyId: 'party-2',
          status: 'approved',
          workflowStage: 'completed',
          reviewerUserId: 'user-1',
          notes: 'All checks passed',
          decidedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          riskLevel: 'low',
          riskScore: 10,
          riskFactors: [],
          amlScreeningStatus: 'passed',
          pepScreeningStatus: 'passed',
          sanctionsScreeningStatus: 'passed',
          adverseMediaStatus: 'passed',
          documentStatus: 'verified',
          dueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        },
      ]);
      setLoading(false);
    }, 1000);
  };

  const selectReview = async (review: KycReview) => {
    setSelectedReview(review);
    setActiveTab('details');
    
    // Fetch related data
    setDocumentTrustChain([
      {
        documentId: 'doc-1',
        documentType: 'national_id',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        uploadedBy: 'user-1',
        verified: true,
        verifiedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        verifiedBy: 'user-2',
        verificationMethod: 'ai',
        trustLevel: 'high',
        hash: 'abc123',
        chainPosition: 1,
      },
      {
        documentId: 'doc-2',
        documentType: 'passport',
        uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        uploadedBy: 'user-1',
        verified: false,
        verificationMethod: 'manual',
        trustLevel: 'low',
        hash: 'def456',
        previousHash: 'abc123',
        chainPosition: 2,
      },
    ]);

    setIdentityProofing({
      proofingId: 'proof-1',
      partyId: review.partyId,
      faceMatchScore: 92,
      faceMatchThreshold: 85,
      dedupMatchFound: false,
      dedupMatchIds: [],
      livenessCheck: true,
      documentAuthenticity: true,
      confidenceScore: 88,
      status: 'passed',
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    });

    setExceptions([
      {
        exceptionId: 'exc-1',
        partyId: review.partyId,
        kycReviewId: review.kycReviewId,
        exceptionType: 'document_issue',
        severity: 'medium',
        description: 'Passport document quality is low',
        raisedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        raisedBy: 'system',
        status: 'pending',
      },
    ]);

    setSlaCompliance({
      compliant: true,
      daysRemaining: 5,
      dueDate: review.dueDate,
    });
  };

  const approveReview = () => {
    if (!selectedReview) return;
    // Simulate API call
    alert('Review approved');
    fetchKycReviews();
  };

  const rejectReview = () => {
    if (!selectedReview) return;
    // Simulate API call
    alert('Review rejected');
    fetchKycReviews();
  };

  const resolveException = (exceptionId: string) => {
    // Simulate API call
    alert('Exception resolved');
    setExceptions(exceptions.filter(e => e.exceptionId !== exceptionId));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'passed':
      case 'verified':
        return 'bg-green-100 text-green-800';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'manual_review':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskLevelColor = (level: string | null) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">KYC Review</h2>
        <p className="text-gray-600">Manage KYC reviews, document trust chain, identity proofing, and exceptions</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviews'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('details')}
            disabled={!selectedReview}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'details'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('exceptions')}
            disabled={!selectedReview}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'exceptions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Exceptions
          </button>
          <button
            onClick={() => setActiveTab('sla')}
            disabled={!selectedReview}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sla'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SLA
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            kycReviews.map(review => (
              <div key={review.kycReviewId} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer" onClick={() => selectReview(review)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{review.partyId}</h3>
                    <p className="text-sm text-gray-500">Stage: {review.workflowStage}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 text-sm rounded ${getStatusColor(review.status)}`}>
                      {review.status}
                    </span>
                    {review.riskLevel && (
                      <span className={`px-3 py-1 text-sm rounded ${getRiskLevelColor(review.riskLevel)}`}>
                        {review.riskLevel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Created:</span> {review.createdAt.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Due:</span> {review.dueDate.toLocaleDateString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Document Status:</span> {review.documentStatus}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'details' && selectedReview && (
        <div className="space-y-6">
          {/* Review Details */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Review Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-sm text-gray-500">Party ID</span>
                <p className="font-medium">{selectedReview.partyId}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Status</span>
                <p className="font-medium">{selectedReview.status}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Workflow Stage</span>
                <p className="font-medium">{selectedReview.workflowStage}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Risk Level</span>
                <p className="font-medium">{selectedReview.riskLevel || 'N/A'}</p>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              {selectedReview.status === 'pending' && (
                <>
                  <button onClick={approveReview} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={rejectReview} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Reject
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Document Trust Chain */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Document Trust Chain</h3>
            <div className="space-y-2">
              {documentTrustChain.map((doc, index) => (
                <div key={doc.documentId} className="flex items-center space-x-4 p-2 bg-gray-50 rounded">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{doc.documentType}</p>
                    <p className="text-sm text-gray-500">Hash: {doc.hash}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded ${doc.verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {doc.verified ? 'Verified' : 'Pending'}
                    </span>
                    <p className="text-sm text-gray-500">{doc.trustLevel} trust</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Identity Proofing */}
          {identityProofing && (
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Identity Proofing</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Face Match Score</span>
                  <p className="font-medium">{identityProofing.faceMatchScore}%</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Liveness Check</span>
                  <p className="font-medium">{identityProofing.livenessCheck ? 'Passed' : 'Failed'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Document Authenticity</span>
                  <p className="font-medium">{identityProofing.documentAuthenticity ? 'Verified' : 'Failed'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Confidence Score</span>
                  <p className="font-medium">{identityProofing.confidenceScore}%</p>
                </div>
              </div>
              <div className="mt-4">
                <span className={`px-3 py-1 text-sm rounded ${getStatusColor(identityProofing.status)}`}>
                  Status: {identityProofing.status}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'exceptions' && selectedReview && (
        <div className="space-y-4">
          {exceptions.length === 0 ? (
            <p className="text-gray-500">No exceptions for this review</p>
          ) : (
            exceptions.map(exception => (
              <div key={exception.exceptionId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{exception.exceptionType}</h3>
                    <p className="text-sm text-gray-500">{exception.description}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-3 py-1 text-sm rounded ${getStatusColor(exception.status)}`}>
                      {exception.status}
                    </span>
                    <span className={`px-3 py-1 text-sm rounded ${
                      exception.severity === 'critical' ? 'bg-red-100 text-red-800' :
                      exception.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      exception.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {exception.severity}
                    </span>
                  </div>
                </div>
                {exception.status === 'pending' && (
                  <button onClick={() => resolveException(exception.exceptionId)} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Resolve
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sla' && selectedReview && slaCompliance && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">SLA Compliance</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-sm text-gray-500">Compliant</span>
              <p className={`font-medium text-xl ${slaCompliance.compliant ? 'text-green-600' : 'text-red-600'}`}>
                {slaCompliance.compliant ? 'Yes' : 'No'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Days Remaining</span>
              <p className={`font-medium text-xl ${slaCompliance.daysRemaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {slaCompliance.daysRemaining}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Due Date</span>
              <p className="font-medium text-xl">{slaCompliance.dueDate.toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KycReview;
