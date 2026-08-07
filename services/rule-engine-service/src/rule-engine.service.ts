import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import {Repository, DataSource} from 'typeorm';
import { Rule, RuleStatus, RuleType } from './entities/Rule';
import { RuleExecution, ExecutionStatus } from './entities/RuleExecution';
import { RuleTemplate } from './entities/RuleTemplate';
import { AuditLog } from './entities/AuditLog'; // P1 #10
import { EntityVersion } from './entities/EntityVersion'; // P1 #10
import { OutboxPublisher } from '@insurance/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(Rule)
    private ruleRepo: Repository<Rule>,
    @InjectRepository(RuleExecution)
    private executionRepo: Repository<RuleExecution>,
    @InjectRepository(RuleTemplate)
    private templateRepo: Repository<RuleTemplate>,
    @InjectRepository(AuditLog)
    private auditLogRepo: Repository<AuditLog>, // P1 #10
    @InjectRepository(EntityVersion)
    private entityVersionRepo: Repository<EntityVersion>, // P1 #10
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #10: Audit trail & versioning helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Write an immutable audit log entry within the current transaction.
   */
  private async writeAuditLog(manager: any, params: {
    resourceType: string;
    resourceId: string;
    action: string;
    actor: string;
    tenantId?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    correlationId?: string | null;
  }): Promise<void> {
    const entry = manager.create(AuditLog, {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      actor: params.actor,
      tenantId: params.tenantId ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
      correlationId: params.correlationId ?? null,
    });
    await manager.save(entry);
  }

  /**
   * Write an immutable entity version snapshot within the current transaction.
   */
  private async writeEntityVersion(manager: any, params: {
    resourceType: string;
    resourceId: string;
    snapshot: Record<string, any>;
    actor: string;
    tenantId?: string | null;
  }): Promise<void> {
    const versions = await manager.find(EntityVersion, {
      where: { resourceType: params.resourceType, resourceId: params.resourceId },
      order: { version: 'DESC' },
      take: 1,
    });
    const nextVersion = (versions.length > 0 ? versions[0].version : 0) + 1;
    const entry = manager.create(EntityVersion, {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      version: nextVersion,
      snapshot: params.snapshot,
      actor: params.actor,
      tenantId: params.tenantId ?? null,
    });
    await manager.save(entry);
  }

  async createRule(params: {
    tenantId: string;
    name: string;
    ruleSetKey: string;
    type: RuleType;
    description?: string;
    condition: { expression: string; variables: string[] };
    action?: any;
    priority?: number;
    metadata?: Record<string, any>;
    templateId?: string;
    version?: number;
    tags?: string[];
  }): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      let version = params.version;
      if (!version) {
        const lastRule = await manager.findOne(Rule, {
          where: {
            tenantId: params.tenantId,
            ruleSetKey: params.ruleSetKey,
            name: params.name,
          },
          order: { version: 'DESC' },
        });
        version = (lastRule?.version || 0) + 1;
      }

      const rule = manager.create(Rule, {
        tenantId: params.tenantId,
        name: params.name,
        ruleSetKey: params.ruleSetKey,
        type: params.type,
        description: params.description || null,
        condition: params.condition,
        action: params.action || null,
        priority: params.priority || 0,
        status: RuleStatus.DRAFT,
        metadata: params.metadata || null,
        templateId: params.templateId || null,
        version,
        tags: params.tags || [],
      });
      const saved = await manager.save(rule);
      // P1 #10: write immutable audit log and entity version
      await this.writeAuditLog(manager, {
        resourceType: 'rule',
        resourceId: saved.id,
        action: 'created',
        actor: 'system',
        tenantId: saved.tenantId,
        before: null,
        after: { id: saved.id, name: saved.name, ruleSetKey: saved.ruleSetKey, type: saved.type, version: saved.version, status: saved.status },
      });
      await this.writeEntityVersion(manager, {
        resourceType: 'rule',
        resourceId: saved.id,
        snapshot: { id: saved.id, name: saved.name, ruleSetKey: saved.ruleSetKey, type: saved.type, condition: saved.condition, action: saved.action, priority: saved.priority, status: saved.status, version: saved.version, metadata: saved.metadata, tags: saved.tags },
        actor: 'system',
        tenantId: saved.tenantId,
      });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.created',
        eventType: 'RuleCreated',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: params.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          ruleSetKey: saved.ruleSetKey,
          type: saved.type,
          version: saved.version,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async activateRule(tenantId: string, id: string): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) throw new Error('Rule not found');
      // P1 #5 (SoD): prefer activation from APPROVED status (after approval workflow).
      // DRAFT is still allowed for backward compatibility.
      rule.status = RuleStatus.ACTIVE;
      rule.activatedAt = new Date();
      const saved = await manager.save(rule);
      // P1 #10: write immutable audit log and entity version
      await this.writeAuditLog(manager, {
        resourceType: 'rule',
        resourceId: saved.id,
        action: 'activated',
        actor: 'system',
        tenantId: saved.tenantId,
        before: { status: rule.status, activatedAt: null },
        after: { status: saved.status, activatedAt: saved.activatedAt },
      });
      await this.writeEntityVersion(manager, {
        resourceType: 'rule',
        resourceId: saved.id,
        snapshot: { id: saved.id, name: saved.name, status: saved.status, version: saved.version, activatedAt: saved.activatedAt },
        actor: 'system',
        tenantId: saved.tenantId,
      });
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.activated',
        eventType: 'RuleActivated',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // P1 #5 (SoD): Approval state machine — DRAFT → PENDING_APPROVAL → APPROVED/REJECTED
  // The submitter cannot be the approver (Segregation of Duties).
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Submit a rule for approval.
   * Transitions: DRAFT → PENDING_APPROVAL
   * The actor is recorded as the submitter and cannot later approve the same rule.
   */
  async submitRuleForApproval(tenantId: string, id: string, submittedBy: string): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) throw new Error('Rule not found');
      if (rule.status !== RuleStatus.DRAFT) {
        throw new Error(`Rule must be in DRAFT status to submit for approval. Current status: ${rule.status}`);
      }
      rule.status = RuleStatus.PENDING_APPROVAL;
      rule.submittedBy = submittedBy;
      const saved = await manager.save(rule);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.submitted',
        eventType: 'RuleSubmittedForApproval',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          status: saved.status,
          submittedBy,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  /**
   * Approve a rule that was submitted for approval.
   * Transitions: PENDING_APPROVAL → APPROVED
   * SoD check: the approver must NOT be the same user as the submitter.
   */
  async approveRule(tenantId: string, id: string, approvedBy: string): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) throw new Error('Rule not found');
      if (rule.status !== RuleStatus.PENDING_APPROVAL) {
        throw new Error(`Rule must be in PENDING_APPROVAL status to approve. Current status: ${rule.status}`);
      }
      // P1 #5 (SoD): submitter cannot be the approver
      if (rule.submittedBy && rule.submittedBy === approvedBy) {
        throw new ForbiddenException(
          'Segregation of Duties violation: the submitter cannot approve their own submission',
        );
      }
      rule.status = RuleStatus.APPROVED;
      rule.approvedBy = approvedBy;
      rule.submittedBy = null;
      const saved = await manager.save(rule);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.approved',
        eventType: 'RuleApproved',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          status: saved.status,
          approvedBy,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  /**
   * Reject a rule that was submitted for approval.
   * Transitions: PENDING_APPROVAL → REJECTED
   * SoD check: the rejector must NOT be the same user as the submitter.
   */
  async rejectRule(tenantId: string, id: string, rejectedBy: string, reason?: string): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) throw new Error('Rule not found');
      if (rule.status !== RuleStatus.PENDING_APPROVAL) {
        throw new Error(`Rule must be in PENDING_APPROVAL status to reject. Current status: ${rule.status}`);
      }
      // P1 #5 (SoD): submitter cannot be the rejector
      if (rule.submittedBy && rule.submittedBy === rejectedBy) {
        throw new ForbiddenException(
          'Segregation of Duties violation: the submitter cannot reject their own submission',
        );
      }
      rule.status = RuleStatus.REJECTED;
      rule.approvedBy = rejectedBy;
      rule.submittedBy = null;
      if (rule.metadata) {
        (rule.metadata as any).rejectionReason = reason || null;
      } else {
        rule.metadata = { rejectionReason: reason || null };
      }
      const saved = await manager.save(rule);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.rejected',
        eventType: 'RuleRejected',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          status: saved.status,
          rejectedBy,
          reason: reason || null,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async deactivateRule(tenantId: string, id: string): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) throw new Error('Rule not found');
      rule.status = RuleStatus.INACTIVE;
      rule.deactivatedAt = new Date();
      const saved = await manager.save(rule);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.deactivated',
        eventType: 'RuleDeactivated',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async validateRule(tenantId: string, ruleId: string): Promise<{ valid: boolean; errors: string[] }> {
    const rule = await this.ruleRepo.findOne({ where: { id: ruleId, tenantId } });
    if (!rule) return { valid: false, errors: ['Rule not found'] };

    const errors: string[] = [];

    // Validate condition expression
    try {
      this.evaluateCondition(rule.condition.expression, {});
    } catch (e) {
      errors.push(`Invalid condition expression: ${e.message}`);
    }

    // Validate variables are defined in condition
    const variablesInExpression = this.extractVariables(rule.condition.expression);
    const missingVariables = variablesInExpression.filter(v => !rule.condition.variables.includes(v));
    if (missingVariables.length > 0) {
      errors.push(`Variables used in expression but not declared: ${missingVariables.join(', ')}`);
    }

    // Validate action if present
    if (rule.action) {
      if (!rule.action.type) {
        errors.push('Action must have a type');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async evaluateRules(params: {
    tenantId: string;
    ruleSetKey: string;
    businessKey?: string;
    input: Record<string, any>;
    metadata?: Record<string, any>;
    dryRun?: boolean;
  }): Promise<RuleExecution> {
    const startTime = Date.now();

    const rules = await this.ruleRepo.find({
      where: {
        tenantId: params.tenantId,
        ruleSetKey: params.ruleSetKey,
        status: RuleStatus.ACTIVE,
      },
      order: { priority: 'DESC' },
    });

    const output: Record<string, any> = this.deepClone(params.input);
    const matchedRules: Array<{ ruleId: string; ruleName: string; priority: number; version: number }> = [];
    let error: { message: string; ruleId?: string } | null = null;
    let status = ExecutionStatus.SUCCESS;
    const executionDetails: any[] = [];
    const sideEffects: { type: 'call' | 'emit'; topic: string; payload: any }[] = [];

    for (const rule of rules) {
      try {
        const conditionResult = this.evaluateCondition(rule.condition.expression, params.input);

        executionDetails.push({
          ruleId: rule.id,
          ruleName: rule.name,
          condition: rule.condition.expression,
          result: conditionResult,
        });

        if (conditionResult) {
          matchedRules.push({
            ruleId: rule.id,
            ruleName: rule.name,
            priority: rule.priority,
            version: rule.version,
          });

          if (rule.action && !params.dryRun) {
            this.applyAction(rule.action, output, params.input, sideEffects);
          }

          // CONDITION and VALIDATION rules stop after the first match by default.
          // CALCULATION rules may chain unless the action explicitly requests a stop.
          if (
            rule.type === RuleType.CONDITION ||
            rule.type === RuleType.VALIDATION ||
            rule.action?.stopAfterFirstMatch === true
          ) {
            break;
          }
        }
      } catch (e: any) {
        this.logger.error(`Error evaluating rule ${rule.id}: ${e.message}`);
        error = { message: e.message, ruleId: rule.id };
        status = ExecutionStatus.FAILED;
        break;
      }
    }

    const executionTimeMs = Date.now() - startTime;

    return await this.dataSource.transaction(async (manager) => {
      const execution = manager.create(RuleExecution, {
        tenantId: params.tenantId,
        ruleSetKey: params.ruleSetKey,
        businessKey: params.businessKey || null,
        input: params.input,
        output,
        status,
        matchedRules: matchedRules.length > 0 ? matchedRules : null,
        error,
        executionTimeMs,
        executedAt: new Date(),
        executionDetails: executionDetails.length > 0 ? executionDetails : null,
        dryRun: params.dryRun || false,
      });
      const saved = await manager.save(execution);
      if (!params.dryRun) {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.rule_engine.evaluated',
          eventType: 'RuleEvaluated',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId: params.tenantId,
          subject: { ruleSetKey: params.ruleSetKey, businessKey: params.businessKey || '' },
          payload: {
            executionId: saved.id,
            ruleSetKey: params.ruleSetKey,
            businessKey: params.businessKey || null,
            status: saved.status,
            matchedRules: saved.matchedRules,
            tenantId: params.tenantId,
            executionTimeMs,
          },
        });
        for (const sideEffect of sideEffects) {
          await outbox.publish({
            topic: sideEffect.topic,
            eventType: sideEffect.type === 'emit' ? 'RuleEmitted' : 'RuleCalled',
            eventVersion: 1,
            correlationId: uuidv4(),
            tenantId: params.tenantId,
            subject: { ruleSetKey: params.ruleSetKey, businessKey: params.businessKey || '' },
            payload: sideEffect.payload,
          });
        }
      }
      return saved;
    });
  }

  private evaluateCondition(expression: string, context: Record<string, any>): boolean {
    // Enhanced expression evaluation with support for:
    // - Logical operators: &&, ||, !
    // - Comparison operators: ==, !=, >, <, >=, <=
    // - Membership operator: in
    // - Functions: contains(), startsWith(), endsWith(), matches()
    // - Nested conditions with parentheses
    try {
      return this.evaluateExpression(expression, context);
    } catch (e) {
      this.logger.error(`Expression evaluation failed: ${expression}`, e);
      throw new Error(`Failed to evaluate expression: ${e.message}`);
    }
  }

  private evaluateExpression(expr: string, context: Record<string, any>): boolean {
    // Handle negation
    if (expr.trim().startsWith('!')) {
      return !this.evaluateExpression(expr.slice(1).trim(), context);
    }

    // Handle parentheses
    if (expr.includes('(') && expr.includes(')')) {
      const result = this.evaluateParentheses(expr, context);
      return result;
    }

    // Handle logical OR
    if (expr.includes('||')) {
      const parts = this.splitLogical(expr, '||');
      return parts.some((part) => this.evaluateExpression(part, context));
    }

    // Handle logical AND
    if (expr.includes('&&')) {
      const parts = this.splitLogical(expr, '&&');
      return parts.every((part) => this.evaluateExpression(part, context));
    }

    // Handle simple conditions
    return this.evaluateSimpleCondition(expr, context);
  }

  private evaluateParentheses(expr: string, context: Record<string, any>): boolean {
    let depth = 0;
    let start = -1;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') {
        if (depth === 0) start = i;
        depth++;
      } else if (expr[i] === ')') {
        depth--;
        if (depth === 0 && start !== -1) {
          const inner = expr.slice(start + 1, i);
          const before = expr.slice(0, start).trim();
          const after = expr.slice(i + 1).trim();
          
          const innerResult = this.evaluateExpression(inner, context);
          
          if (before === '' && after === '') {
            return innerResult;
          } else if (before.startsWith('!')) {
            return !innerResult;
          } else {
            // Replace the parenthesized expression with its result and continue
            const newExpr = before + innerResult + after;
            return this.evaluateExpression(newExpr, context);
          }
        }
      }
    }
    return this.evaluateSimpleCondition(expr, context);
  }

  private splitLogical(expr: string, operator: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = '';
    
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      else if (expr[i] === ')') depth--;
      
      if (depth === 0 && expr.slice(i, i + operator.length) === operator) {
        parts.push(current.trim());
        current = '';
        i += operator.length - 1;
      } else {
        current += expr[i];
      }
    }
    if (current.trim()) parts.push(current.trim());
    
    return parts;
  }

  private evaluateSimpleCondition(expression: string, context: Record<string, any>): boolean {
    // Check for function calls
    const funcMatch = expression.match(/^(\w+)\(([^)]+)\)$/);
    if (funcMatch) {
      const [, funcName, argsStr] = funcMatch;
      const args = this.parseArguments(argsStr, context);
      return this.evaluateFunction(funcName, args, context);
    }

    // Format: "variableName == value" or "variableName > value"
    const match = expression.match(/^(\w+(?:\.\w+)*)\s*(==|!=|>|<|>=|<=|in|contains|startsWith|endsWith|matches)\s*(.+)$/);
    if (!match) return false;

    const [, varPath, operator, valueStr] = match;
    const varValue = this.getNestedValue(context, varPath);
    let value: any = this.parseValue(valueStr);

    switch (operator) {
      case '==': return varValue == value;
      case '!=': return varValue != value;
      case '>': return varValue > value;
      case '<': return varValue < value;
      case '>=': return varValue >= value;
      case '<=': return varValue <= value;
      case 'in': return Array.isArray(value) && value.includes(varValue);
      case 'contains': return typeof varValue === 'string' && varValue.includes(value);
      case 'startsWith': return typeof varValue === 'string' && varValue.startsWith(value);
      case 'endsWith': return typeof varValue === 'string' && varValue.endsWith(value);
      case 'matches': return typeof varValue === 'string' && this.safeRegexTest(value, varValue);
      default: return false;
    }
  }

  private evaluateFunction(funcName: string, args: any[], context: Record<string, any>): boolean {
    switch (funcName) {
      case 'contains':
        return typeof args[0] === 'string' && args[0].includes(args[1]);
      case 'startsWith':
        return typeof args[0] === 'string' && args[0].startsWith(args[1]);
      case 'endsWith':
        return typeof args[0] === 'string' && args[0].endsWith(args[1]);
      case 'matches':
        return typeof args[0] === 'string' && this.safeRegexTest(args[1], args[0]);
      case 'in':
        return Array.isArray(args[1]) && args[1].includes(args[0]);
      case 'between':
        return args[0] >= args[1] && args[0] <= args[2];
      case 'isEmpty':
        return !args[0] || (Array.isArray(args[0]) && args[0].length === 0);
      case 'isNotEmpty':
        return args[0] && (!Array.isArray(args[0]) || args[0].length > 0);
      default:
        throw new Error(`Unknown function: ${funcName}`);
    }
  }

  private parseArguments(argsStr: string, context: Record<string, any>): any[] {
    if (!argsStr.trim()) return [];
    
    const args: any[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if ((char === '"' || char === "'") && !inQuotes) {
        inQuotes = true;
        quoteChar = char;
      } else if (char === quoteChar && inQuotes) {
        inQuotes = false;
      } else if (char === ',' && !inQuotes) {
        args.push(this.parseValue(current.trim()));
        current = '';
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      args.push(this.parseValue(current.trim()));
    }
    
    return args;
  }

  private parseValue(valueStr: string): any {
    valueStr = valueStr.trim();
    
    // Remove quotes
    if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || 
        (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
      return valueStr.slice(1, -1);
    }

    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    if (valueStr === 'null') return null;
    if (valueStr === 'undefined') return undefined;
    
    const num = parseFloat(valueStr);
    if (!isNaN(num) && isFinite(num)) return num;
    
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      return valueStr.slice(1, -1).split(',').map((v) => this.parseValue(v.trim()));
    }
    
    return valueStr;
  }

  private extractVariables(expression: string): string[] {
    const variables = new Set<string>();
    const variablePattern = /\b[a-zA-Z_][a-zA-Z0-9_.]*\b/g;
    const matches = expression.match(variablePattern);
    
    if (matches) {
      for (const match of matches) {
        if (!['true', 'false', 'null', 'undefined', 'and', 'or', 'not', 'in', 'contains', 'startsWith', 'endsWith', 'matches', 'between', 'isEmpty', 'isNotEmpty'].includes(match)) {
          variables.add(match);
        }
      }
    }
    
    return Array.from(variables);
  }

  private applyAction(
    action: any,
    output: Record<string, any>,
    input: Record<string, any>,
    sideEffects: { type: 'call' | 'emit'; topic: string; payload: any }[],
  ): void {
    switch (action.type) {
      case 'return':
        if (action.value !== undefined) {
          Object.assign(output, action.value);
        }
        break;
      case 'set':
        if (action.target && action.value !== undefined) {
          this.setNestedValue(output, action.target, action.value);
        }
        break;
      case 'add':
        if (action.target && action.value !== undefined) {
          const current = this.getNestedValue(output, action.target) || 0;
          this.setNestedValue(output, action.target, current + action.value);
        }
        break;
      case 'multiply':
        if (action.target && action.value !== undefined) {
          const current = this.getNestedValue(output, action.target) || 1;
          this.setNestedValue(output, action.target, current * action.value);
        }
        break;
      case 'push':
        if (action.target && action.value !== undefined) {
          const current = this.getNestedValue(output, action.target) || [];
          if (!Array.isArray(current)) {
            this.setNestedValue(output, action.target, [action.value]);
          } else {
            current.push(action.value);
            this.setNestedValue(output, action.target, current);
          }
        }
        break;
      case 'call':
        this.logger.log(`Action call: ${action.service}.${action.method}`, action.params);
        sideEffects.push({
          type: 'call',
          topic: `insurance.rule_engine.action.called`,
          payload: {
            service: action.service,
            method: action.method,
            params: action.params,
          },
        });
        break;
      case 'emit':
        this.logger.log(`Emit event: ${action.event}`, action.payload);
        sideEffects.push({
          type: 'emit',
          topic: action.event,
          payload: action.payload,
        });
        break;
      case 'log':
        this.logger.log(`Rule action log: ${action.message}`);
        break;
      default:
        this.logger.warn(`Unknown action type: ${action.type}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((o, p) => o[p] = o[p] || {}, obj);
    target[lastKey] = value;
  }

  private deepClone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private safeRegexTest(pattern: string, value: string): boolean {
    const MAX_PATTERN_LENGTH = 200;
    if (!pattern || pattern.length > MAX_PATTERN_LENGTH) {
      throw new Error(`Regex pattern too long or empty (max ${MAX_PATTERN_LENGTH} chars)`);
    }
    // Reject patterns with excessive nested quantifiers that are typical ReDoS signatures
    const dangerous = /(\([^)]*\)[*+?]){2,}|([*+?]){3,}|\([^)]*\)\*\+|\([^)]*\)\+\*/;
    if (dangerous.test(pattern)) {
      throw new Error('Regex pattern contains potentially catastrophic constructs');
    }
    try {
      const re = new RegExp(pattern);
      return re.test(value);
    } catch (e: any) {
      throw new Error(`Invalid regex pattern: ${e.message}`);
    }
  }

  async listRules(params: {
    tenantId: string;
    ruleSetKey?: string;
    status?: RuleStatus;
    type?: RuleType;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{ items: Rule[]; total: number }> {
    const qb = this.ruleRepo.createQueryBuilder('r')
      .where('r.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.ruleSetKey) {
      qb.andWhere('r.ruleSetKey = :ruleSetKey', { ruleSetKey: params.ruleSetKey });
    }
    if (params.status) {
      qb.andWhere('r.status = :status', { status: params.status });
    }
    if (params.type) {
      qb.andWhere('r.type = :type', { type: params.type });
    }
    if (params.tags && params.tags.length > 0) {
      qb.andWhere(':tag = ANY(r.tags)', { tag: params.tags[0] });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('r.priority', 'DESC').addOrderBy('r.createdAt', 'DESC')
      .take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getRule(tenantId: string, id: string): Promise<Rule | null> {
    return this.ruleRepo.findOne({ where: { id, tenantId } });
  }

  async updateRule(
    tenantId: string,
    id: string,
    patch: {
      name?: string;
      description?: string;
      condition?: { expression: string; variables: string[] };
      action?: any;
      priority?: number;
      status?: RuleStatus;
      metadata?: Record<string, any>;
      tags?: string[];
    },
  ): Promise<Rule | null> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) return null;

      if (patch.name) rule.name = patch.name;
      if (patch.description !== undefined) rule.description = patch.description;
      if (patch.condition) rule.condition = patch.condition;
      if (patch.action !== undefined) rule.action = patch.action;
      if (patch.priority !== undefined) rule.priority = patch.priority;
      if (patch.status) rule.status = patch.status;
      if (patch.metadata !== undefined) rule.metadata = patch.metadata;
      if (patch.tags !== undefined) rule.tags = patch.tags;
      rule.updatedAt = new Date();

      const saved = await manager.save(rule);
      const outbox = new OutboxPublisher(manager);
      await outbox.publish({
        topic: 'insurance.rule_engine.rule.updated',
        eventType: 'RuleUpdated',
        eventVersion: 1,
        correlationId: uuidv4(),
        tenantId: saved.tenantId,
        subject: { ruleId: saved.id, ruleSetKey: saved.ruleSetKey },
        payload: {
          ruleId: saved.id,
          name: saved.name,
          ruleSetKey: saved.ruleSetKey,
          type: saved.type,
          version: saved.version,
          status: saved.status,
          tenantId: saved.tenantId,
        },
      });
      return saved;
    });
  }

  async deleteRule(tenantId: string, id: string): Promise<boolean> {
    return await this.dataSource.transaction(async (manager) => {
      const rule = await manager.findOne(Rule, { where: { id, tenantId } });
      if (!rule) return false;
      const result = await manager.delete(Rule, { id, tenantId });
      const deleted = (result.affected ?? 0) > 0;
      if (deleted) {
        const outbox = new OutboxPublisher(manager);
        await outbox.publish({
          topic: 'insurance.rule_engine.rule.deleted',
          eventType: 'RuleDeleted',
          eventVersion: 1,
          correlationId: uuidv4(),
          tenantId: rule.tenantId,
          subject: { ruleId: rule.id, ruleSetKey: rule.ruleSetKey },
          payload: {
            ruleId: rule.id,
            name: rule.name,
            ruleSetKey: rule.ruleSetKey,
            type: rule.type,
            version: rule.version,
            tenantId: rule.tenantId,
          },
        });
      }
      return deleted;
    });
  }

  async listExecutions(params: {
    tenantId: string;
    ruleSetKey?: string;
    businessKey?: string;
    status?: ExecutionStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: RuleExecution[]; total: number }> {
    const qb = this.executionRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.ruleSetKey) {
      qb.andWhere('e.ruleSetKey = :ruleSetKey', { ruleSetKey: params.ruleSetKey });
    }
    if (params.businessKey) {
      qb.andWhere('e.businessKey = :businessKey', { businessKey: params.businessKey });
    }
    if (params.status) {
      qb.andWhere('e.status = :status', { status: params.status });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('e.executedAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getExecution(tenantId: string, id: string): Promise<RuleExecution | null> {
    return this.executionRepo.findOne({ where: { id, tenantId } });
  }

  async getExecutionMetrics(params: {
    tenantId: string;
    ruleSetKey?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{
    totalExecutions: number;
    successRate: number;
    avgExecutionTimeMs: number;
    mostMatchedRules: Array<{ ruleId: string; ruleName: string; matchCount: number }>;
  }> {
    const qb = this.executionRepo.createQueryBuilder('e')
      .where('e.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.ruleSetKey) {
      qb.andWhere('e.ruleSetKey = :ruleSetKey', { ruleSetKey: params.ruleSetKey });
    }
    if (params.fromDate) {
      qb.andWhere('e.executedAt >= :fromDate', { fromDate: params.fromDate });
    }
    if (params.toDate) {
      qb.andWhere('e.executedAt <= :toDate', { toDate: params.toDate });
    }

    const executions = await qb.getMany();

    const totalExecutions = executions.length;
    const successCount = executions.filter(e => e.status === ExecutionStatus.SUCCESS).length;
    const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0;
    const avgExecutionTimeMs = totalExecutions > 0 
      ? executions.reduce((sum, e) => sum + e.executionTimeMs, 0) / totalExecutions 
      : 0;

    // Count matched rules
    const ruleMatchCount = new Map<string, { ruleName: string; count: number }>();
    for (const exec of executions) {
      if (exec.matchedRules) {
        for (const matched of exec.matchedRules) {
          const existing = ruleMatchCount.get(matched.ruleId);
          if (existing) {
            existing.count++;
          } else {
            ruleMatchCount.set(matched.ruleId, { ruleName: matched.ruleName, count: 1 });
          }
        }
      }
    }

    const mostMatchedRules = Array.from(ruleMatchCount.entries())
      .map(([ruleId, data]) => ({ ruleId, ruleName: data.ruleName, matchCount: data.count }))
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, 10);

    return {
      totalExecutions,
      successRate,
      avgExecutionTimeMs,
      mostMatchedRules,
    };
  }

  async createTemplate(params: {
    tenantId: string;
    name: string;
    category: string;
    description?: string;
    conditionTemplate: string;
    actionTemplate?: any;
    variables: string[];
  }): Promise<RuleTemplate> {
    const template = this.templateRepo.create({
      tenantId: params.tenantId,
      name: params.name,
      category: params.category,
      description: params.description || null,
      conditionTemplate: params.conditionTemplate,
      actionTemplate: params.actionTemplate || null,
      variables: params.variables,
    });
    return this.templateRepo.save(template);
  }

  async listTemplates(params: {
    tenantId: string;
    category?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: RuleTemplate[]; total: number }> {
    const qb = this.templateRepo.createQueryBuilder('t')
      .where('t.tenantId = :tenantId', { tenantId: params.tenantId });

    if (params.category) {
      qb.andWhere('t.category = :category', { category: params.category });
    }

    const limit = Math.min(params.limit || 50, 200);
    const offset = params.offset || 0;

    qb.orderBy('t.createdAt', 'DESC').take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createRuleFromTemplate(params: {
    tenantId: string;
    templateId: string;
    name: string;
    ruleSetKey: string;
    type: RuleType;
    variableValues: Record<string, any>;
    priority?: number;
  }): Promise<Rule> {
    return await this.dataSource.transaction(async (manager) => {
      const template = await manager.findOne(RuleTemplate, {
        where: { id: params.templateId, tenantId: params.tenantId },
      });
      if (!template) throw new Error('Template not found');

      let conditionExpression = template.conditionTemplate;
      for (const [key, value] of Object.entries(params.variableValues)) {
        conditionExpression = conditionExpression.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }

      let version: number | undefined = undefined;
      const lastRule = await manager.findOne(Rule, {
        where: {
          tenantId: params.tenantId,
          ruleSetKey: params.ruleSetKey,
          name: params.name,
        },
        order: { version: 'DESC' },
      });
      version = (lastRule?.version || 0) + 1;

      const rule = manager.create(Rule, {
        tenantId: params.tenantId,
        name: params.name,
        ruleSetKey: params.ruleSetKey,
        type: params.type,
        description: `Created from template: ${template.name}`,
        condition: {
          expression: conditionExpression,
          variables: template.variables,
        },
        action: template.actionTemplate || null,
        priority: params.priority || 0,
        status: RuleStatus.DRAFT,
        metadata: null,
        templateId: template.id,
        version,
        tags: [],
      });
      return manager.save(rule);
    });
  }
}
