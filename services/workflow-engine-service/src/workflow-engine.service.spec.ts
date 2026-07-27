import { WorkflowEngineService } from './workflow-engine.service';
import { ProcessDefinition, ProcessDefinitionStatus } from './entities/process-definition.entity';

describe('WorkflowEngineService core helpers', () => {
  let service: WorkflowEngineService;

  beforeEach(() => {
    // Lightweight instantiation with no real collaborators for testing pure helpers.
    service = new WorkflowEngineService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      5000,
    );
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_AUDIENCES = 'test-audience';
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.JWT_AUDIENCES;
    delete process.env.WORKFLOW_API_ALLOW_LIST;
  });

  describe('sanitizeExpression', () => {
    it('removes ${} interpolation wrappers and normalizes strict equality', () => {
      const sanitized = (service as any).sanitizeExpression('${amount} === 100 && ${status} !== "failed"');
      expect(sanitized).toBe('amount == 100 && status != "failed"');
    });
  });

  describe('evaluateExpression', () => {
    it('evaluates arithmetic expressions', () => {
      const result = (service as any).evaluateExpression('amount * 2 + 1', { amount: 5 });
      expect(result).toBe(11);
    });

    it('evaluates boolean expressions with sanitized context', () => {
      const result = (service as any).evaluateExpression('${amount} > 100', { amount: 200 });
      expect(result).toBe(true);
    });

    it('returns false on invalid expressions instead of running arbitrary code', () => {
      const result = (service as any).evaluateExpression('process.exit(1)', {});
      expect(result).toBe(false);
    });
  });

  describe('evaluateEdges', () => {
    it('returns all outgoing edges when no conditions', () => {
      const definition = {
        graph: {
          nodes: [],
          edges: [
            { id: 'e1', from: 'start', to: 'a' },
            { id: 'e2', from: 'start', to: 'b' },
          ],
        },
      } as ProcessDefinition;
      const result = (service as any).evaluateEdges('start', definition, {});
      expect(result).toEqual(['a', 'b']);
    });

    it('filters edges by condition evaluation', () => {
      const definition = {
        graph: {
          nodes: [],
          edges: [
            { id: 'e1', from: 'decision', to: 'a', condition: '${amount} > 100' },
            { id: 'e2', from: 'decision', to: 'b', condition: '${amount} <= 100' },
          ],
        },
      } as unknown as ProcessDefinition;
      const result = (service as any).evaluateEdges('decision', definition, { amount: 50 });
      expect(result).toEqual(['b']);
    });
  });

  describe('isUrlAllowed', () => {
    it('blocks URLs not on the allow-list', () => {
      process.env.WORKFLOW_API_ALLOW_LIST = 'http://localhost:8080/api';
      const allowed = (service as any).isUrlAllowed('http://evil.com/api');
      expect(allowed).toBe(false);
    });

    it('allows URLs on the allow-list', () => {
      process.env.WORKFLOW_API_ALLOW_LIST = 'http://localhost:8080/api';
      const allowed = (service as any).isUrlAllowed('http://localhost:8080/api/payments');
      expect(allowed).toBe(true);
    });

    it('warns and allows all when allow-list is unset', () => {
      const allowed = (service as any).isUrlAllowed('http://example.com');
      expect(allowed).toBe(true);
    });
  });

  describe('createServiceToken', () => {
    it('creates a signed HS256 JWT for service-to-service calls', () => {
      const token = (service as any).createServiceToken();
      expect(typeof token).toBe('string');
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
    });

    it('throws when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;
      expect(() => (service as any).createServiceToken()).toThrow('JWT_SECRET is required');
    });
  });
});
