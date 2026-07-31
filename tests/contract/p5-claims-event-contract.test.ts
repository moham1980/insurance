import { describe, test, expect, beforeAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('Contract: P5 Claims Event Coverage', () => {
  let asyncApiContent: string;
  let claimsServiceSrcDir: string;
  let billingServiceSrcDir: string;

  beforeAll(() => {
    const asyncApiPath = path.resolve(__dirname, '../../doc/asyncapi/insurance-events.asyncapi.yml');
    asyncApiContent = fs.readFileSync(asyncApiPath, 'utf-8');
    claimsServiceSrcDir = path.resolve(__dirname, '../../services/claims-service/src');
    billingServiceSrcDir = path.resolve(__dirname, '../../services/billing-service/src');
  });

  const P5_EVENTS = [
    { topic: 'insurance.claim.registered', eventType: 'ClaimRegistered' },
    { topic: 'insurance.claim.acknowledged', eventType: 'ClaimAcknowledged' },
    { topic: 'insurance.claim.submitted_to_carrier', eventType: 'ClaimSubmittedToCarrier' },
    { topic: 'insurance.claim.status_updated', eventType: 'ClaimStatusUpdated' },
    { topic: 'insurance.claim.assessed', eventType: 'ClaimAssessed' },
    { topic: 'insurance.claim.approved', eventType: 'ClaimApproved' },
    { topic: 'insurance.claim.rejected', eventType: 'ClaimRejected' },
    { topic: 'insurance.claim.paid', eventType: 'ClaimPaid' },
    { topic: 'insurance.claim.closed', eventType: 'ClaimClosed' },
    { topic: 'insurance.claim.appealed', eventType: 'ClaimAppealed' },
    { topic: 'insurance.claim.projection_updated', eventType: 'ClaimProjectionUpdated' },
    { topic: 'insurance.claim.advocacy_case_opened', eventType: 'ClaimAdvocacyCaseOpened' },
    { topic: 'insurance.claim.advocacy_case_escalated', eventType: 'ClaimAdvocacyCaseEscalated' },
    { topic: 'insurance.claim.advocacy_task_created', eventType: 'AdvocacyTaskCreated' },
    { topic: 'insurance.claim.advocacy_task_overdue', eventType: 'AdvocacyTaskOverdue' },
    { topic: 'insurance.claim.adjuster_referred', eventType: 'AdjusterReferred' },
    { topic: 'insurance.claim.adjuster_report_received', eventType: 'AdjusterReportReceived' },
    { topic: 'insurance.claim.recovery_case_created', eventType: 'RecoveryCaseCreated' },
    { topic: 'insurance.claim.recovery_received', eventType: 'RecoveryReceived' },
    { topic: 'insurance.claim.document_attached', eventType: 'ClaimDocumentAttached' },
    { topic: 'insurance.claim.payment_processed', eventType: 'ClaimPaymentProcessed' },
  ];

  describe('AsyncAPI channel coverage', () => {
    for (const evt of P5_EVENTS) {
      test(`T-CON-P5-${evt.eventType}: AsyncAPI defines channel ${evt.topic}`, () => {
        expect(asyncApiContent).toContain(evt.topic);
      });

      test(`T-CON-P5-${evt.eventType}: AsyncAPI defines message ${evt.eventType}`, () => {
        expect(asyncApiContent).toContain(`    ${evt.eventType}:`);
      });

      test(`T-CON-P5-${evt.eventType}: message has name property`, () => {
        expect(asyncApiContent).toContain(`name: ${evt.eventType}`);
      });

      test(`T-CON-P5-${evt.eventType}: message has contentType application/json`, () => {
        const afterMsg = (asyncApiContent.split(`    ${evt.eventType}:`)[1] || '').replace(/^\n/, '');
        const msgSection = afterMsg.split(/\n    \S/)[0] || '';
        expect(msgSection).toContain('contentType: application/json');
      });

      test(`T-CON-P5-${evt.eventType}: message has required fields`, () => {
        const afterMsg = (asyncApiContent.split(`    ${evt.eventType}:`)[1] || '').replace(/^\n/, '');
        const msgSection = afterMsg.split(/\n    \S/)[0] || '';
        expect(msgSection).toContain('required:');
        expect(msgSection).toContain('eventType');
        expect(msgSection).toContain('eventVersion');
        expect(msgSection).toContain('correlationId');
        expect(msgSection).toContain('subject');
        expect(msgSection).toContain('payload');
      });
    }
  });

  describe('Producer code coverage', () => {
    const claimsSourceFiles: string[] = [];
    const billingSourceFiles: string[] = [];

    beforeAll(() => {
      function collectTsFiles(dir: string, files: string[]) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            collectTsFiles(fullPath, files);
          } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
            files.push(fullPath);
          }
        }
      }
      collectTsFiles(claimsServiceSrcDir, claimsSourceFiles);
      collectTsFiles(billingServiceSrcDir, billingSourceFiles);
    });

    for (const evt of P5_EVENTS) {
      test(`T-CON-P5-${evt.eventType}: producer code publishes event type`, () => {
        const files = evt.eventType === 'ClaimPaymentProcessed' ? billingSourceFiles : claimsSourceFiles;
        const found = files.some((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          return content.includes(`'${evt.eventType}'`);
        });
        expect(found).toBe(true);
      });

      test(`T-CON-P5-${evt.eventType}: producer code uses topic`, () => {
        const files = evt.eventType === 'ClaimPaymentProcessed' ? billingSourceFiles : claimsSourceFiles;
        const found = files.some((file) => {
          const content = fs.readFileSync(file, 'utf-8');
          return content.includes(`'${evt.topic}'`);
        });
        expect(found).toBe(true);
      });
    }
  });

  describe('OpenAPI contract coverage', () => {
    let openApiContent: string;

    beforeAll(() => {
      const openApiPath = path.resolve(__dirname, '../../contracts/openapi/claims-service-p5.openapi.yaml');
      openApiContent = fs.readFileSync(openApiPath, 'utf-8');
    });

    const P5_ENDPOINTS = [
      'POST /claims',
      'GET /claims',
      'GET /claims/{claimId}',
      'PATCH /claims/{claimId}',
      'POST /claims/{claimId}/acknowledge',
      'POST /claims/{claimId}/submit-to-carrier',
      'POST /claims/{claimId}/assess',
      'POST /claims/{claimId}/approve',
      'POST /claims/{claimId}/reject',
      'POST /claims/{claimId}/pay',
      'POST /claims/{claimId}/close',
      'POST /claims/{claimId}/appeal',
      'POST /claims/{claimId}/refer-to-adjuster',
      'GET /claims/{claimId}/history',
      'POST /claims/{claimId}/calculate-deductible',
      'POST /claims/fnol',
      'GET /claims/fnol/form-defaults',
      'POST /claims/{claimId}/validate-policy',
      'POST /claims/{claimId}/advocacy-cases',
      'GET /advocacy-cases',
      'GET /advocacy-cases/{caseId}',
      'POST /advocacy-cases/{caseId}/tasks',
      'PATCH /advocacy-cases/{caseId}/tasks/{taskId}',
      'POST /advocacy-cases/{caseId}/communications',
      'POST /advocacy-cases/{caseId}/escalate',
      'POST /advocacy-cases/{caseId}/close',
      'POST /claims/{claimId}/adjuster-referrals',
      'GET /claims/{claimId}/adjuster-referrals',
      'POST /adjuster-referrals/{referralId}/accept',
      'POST /adjuster-referrals/{referralId}/reject',
      'POST /adjuster-referrals/{referralId}/submit-report',
      'GET /claims/{claimId}/projections',
      'POST /claims/{claimId}/projections',
      'POST /claims/{claimId}/recovery',
      'POST /claims/{claimId}/documents',
      'GET /claims/{claimId}/documents',
      'GET /claims/{claimId}/documents/{documentId}/download',
    ];

    for (const endpoint of P5_ENDPOINTS) {
      test(`T-CON-P5-OAS: OpenAPI defines ${endpoint}`, () => {
        const [method, ...pathParts] = endpoint.split(' ');
        const apiPath = pathParts.join(' ');
        expect(openApiContent).toContain(apiPath);
        expect(openApiContent.toLowerCase()).toContain(method.toLowerCase());
      });
    }

    test('T-CON-P5-OAS: OpenAPI has BearerAuth security scheme', () => {
      expect(openApiContent).toContain('BearerAuth');
      expect(openApiContent).toContain('bearerFormat: JWT');
    });

    test('T-CON-P5-OAS: OpenAPI has server definition', () => {
      expect(openApiContent).toContain('servers:');
      expect(openApiContent).toContain('localhost:18010');
    });

    test('T-CON-P5-OAS: OpenAPI defines Claim schema', () => {
      expect(openApiContent).toContain('Claim:');
      expect(openApiContent).toContain('claimId');
      expect(openApiContent).toContain('claimNumber');
    });

    test('T-CON-P5-OAS: OpenAPI defines AdvocacyCase schema', () => {
      expect(openApiContent).toContain('AdvocacyCase:');
      expect(openApiContent).toContain('caseId');
      expect(openApiContent).toContain('priority');
    });

    test('T-CON-P5-OAS: OpenAPI defines AdjusterReferral schema', () => {
      expect(openApiContent).toContain('AdjusterReferral:');
      expect(openApiContent).toContain('referralId');
      expect(openApiContent).toContain('reportRef');
    });

    test('T-CON-P5-OAS: OpenAPI defines ClaimProjection schema', () => {
      expect(openApiContent).toContain('ClaimProjection:');
      expect(openApiContent).toContain('projectionId');
      expect(openApiContent).toContain('sourceSystemId');
    });

    test('T-CON-P5-OAS: OpenAPI defines ClaimDocument schema', () => {
      expect(openApiContent).toContain('ClaimDocument:');
      expect(openApiContent).toContain('virusScanStatus');
      expect(openApiContent).toContain('piiScanStatus');
      expect(openApiContent).toContain('classification');
    });
  });
});
