import { Injectable } from '@nestjs/common';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed';
export type IncidentType = 'model_failure' | 'performance_degradation' | 'bias_detected' | 'security_breach' | 'drift_detected' | 'other';

export interface Incident {
  incidentId: string;
  modelId: string;
  modelName: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  reportedBy: string;
  reportedAt: Date;
  assignedTo?: string;
  assignedAt?: Date;
  investigationStartedAt?: Date;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  rootCause?: string;
  impactAssessment?: string;
  mitigationActions?: string[];
  resolutionNotes?: string;
  affectedUsers?: number;
  affectedTransactions?: number;
  relatedAnomalies?: string[];
}

export interface IncidentAction {
  actionId: string;
  incidentId: string;
  action: string;
  takenBy: string;
  takenAt: Date;
  notes?: string;
}

@Injectable()
export class AIIncidentResponseService {
  private incidents: Map<string, Incident> = new Map();
  private incidentActions: Map<string, IncidentAction[]> = new Map();

  async createIncident(
    modelId: string,
    modelName: string,
    type: IncidentType,
    severity: IncidentSeverity,
    title: string,
    description: string,
    reportedBy: string,
  ): Promise<Incident> {
    const incidentId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const incident: Incident = {
      incidentId,
      modelId,
      modelName,
      type,
      severity,
      status: 'open',
      title,
      description,
      reportedBy,
      reportedAt: new Date(),
    };
    
    this.incidents.set(incidentId, incident);
    this.incidentActions.set(incidentId, []);
    
    // Auto-assign based on severity
    await this.autoAssignIncident(incidentId);
    
    return incident;
  }

  private async autoAssignIncident(incidentId: string): Promise<void> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return;

    // Auto-assign based on severity
    const assignee = incident.severity === 'critical' || incident.severity === 'high'
      ? 'ai_governance_lead'
      : incident.severity === 'medium'
      ? 'ml_engineer'
      : 'data_scientist';

    await this.assignIncident(incidentId, assignee);
  }

  async assignIncident(incidentId: string, assignedTo: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.assignedTo = assignedTo;
    incident.assignedAt = new Date();
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'assigned', assignedTo, `Assigned to ${assignedTo}`);

    return incident;
  }

  async startInvestigation(incidentId: string, investigator: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (incident.status !== 'open' && incident.status !== 'investigating') {
      throw new Error(`Cannot start investigation for incident with status ${incident.status}`);
    }

    incident.status = 'investigating';
    incident.investigationStartedAt = new Date();
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'investigation_started', investigator, 'Investigation started');

    return incident;
  }

  async addImpactAssessment(
    incidentId: string,
    impactAssessment: string,
    affectedUsers?: number,
    affectedTransactions?: number,
  ): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.impactAssessment = impactAssessment;
    incident.affectedUsers = affectedUsers;
    incident.affectedTransactions = affectedTransactions;
    this.incidents.set(incidentId, incident);

    return incident;
  }

  async addRootCause(incidentId: string, rootCause: string, addedBy: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.rootCause = rootCause;
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'root_cause_identified', addedBy, `Root cause: ${rootCause}`);

    return incident;
  }

  async addMitigationActions(
    incidentId: string,
    actions: string[],
    addedBy: string,
  ): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    incident.mitigationActions = actions;
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'mitigation_actions_added', addedBy, `Actions: ${actions.join(', ')}`);

    return incident;
  }

  async markMitigated(incidentId: string, mitigatedBy: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (incident.status !== 'investigating') {
      throw new Error(`Cannot mark as mitigated for incident with status ${incident.status}`);
    }

    incident.status = 'mitigated';
    incident.mitigatedAt = new Date();
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'mitigated', mitigatedBy, 'Incident mitigated');

    return incident;
  }

  async resolveIncident(
    incidentId: string,
    resolutionNotes: string,
    resolvedBy: string,
  ): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (incident.status !== 'mitigated') {
      throw new Error(`Cannot resolve incident with status ${incident.status}`);
    }

    incident.status = 'resolved';
    incident.resolvedAt = new Date();
    incident.resolutionNotes = resolutionNotes;
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'resolved', resolvedBy, resolutionNotes);

    return incident;
  }

  async closeIncident(incidentId: string, closedBy: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (incident.status !== 'resolved') {
      throw new Error(`Cannot close incident with status ${incident.status}`);
    }

    incident.status = 'closed';
    incident.closedAt = new Date();
    this.incidents.set(incidentId, incident);

    await this.recordAction(incidentId, 'closed', closedBy, 'Incident closed');

    return incident;
  }

  async linkAnomaly(incidentId: string, anomalyId: string): Promise<Incident> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident ${incidentId} not found`);
    }

    if (!incident.relatedAnomalies) {
      incident.relatedAnomalies = [];
    }
    incident.relatedAnomalies.push(anomalyId);
    this.incidents.set(incidentId, incident);

    return incident;
  }

  async getIncident(incidentId: string): Promise<Incident | null> {
    return this.incidents.get(incidentId) || null;
  }

  async getIncidentsByModel(modelId: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.modelId === modelId);
  }

  async getIncidentsByStatus(status: IncidentStatus): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.status === status);
  }

  async getIncidentsBySeverity(severity: IncidentSeverity): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.severity === severity);
  }

  async getOpenIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.status === 'open' || i.status === 'investigating');
  }

  async getCriticalIncidents(): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.severity === 'critical' && i.status !== 'closed');
  }

  async getIncidentActions(incidentId: string): Promise<IncidentAction[]> {
    return this.incidentActions.get(incidentId) || [];
  }

  private async recordAction(incidentId: string, action: string, takenBy: string, notes?: string): Promise<void> {
    const actions = this.incidentActions.get(incidentId) || [];
    const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    actions.push({
      actionId,
      incidentId,
      action,
      takenBy,
      takenAt: new Date(),
      notes,
    });
    
    this.incidentActions.set(incidentId, actions);
  }

  async getIncidentStatistics(): Promise<{
    total: number;
    open: number;
    investigating: number;
    mitigated: number;
    resolved: number;
    closed: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    averageResolutionTime: number;
  }> {
    const incidents = Array.from(this.incidents.values());
    
    const open = incidents.filter(i => i.status === 'open').length;
    const investigating = incidents.filter(i => i.status === 'investigating').length;
    const mitigated = incidents.filter(i => i.status === 'mitigated').length;
    const resolved = incidents.filter(i => i.status === 'resolved').length;
    const closed = incidents.filter(i => i.status === 'closed').length;

    const bySeverity: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const byType: Record<string, number> = {
      model_failure: 0,
      performance_degradation: 0,
      bias_detected: 0,
      security_breach: 0,
      drift_detected: 0,
      other: 0,
    };

    incidents.forEach(incident => {
      if (bySeverity[incident.severity] !== undefined) {
        bySeverity[incident.severity]++;
      }
      if (byType[incident.type] !== undefined) {
        byType[incident.type]++;
      }
    });

    // Calculate average resolution time (for resolved incidents)
    const resolvedIncidents = incidents.filter(i => i.resolvedAt);
    const averageResolutionTime = resolvedIncidents.length > 0
      ? resolvedIncidents.reduce((sum, i) => sum + (i.resolvedAt!.getTime() - i.reportedAt.getTime()), 0) / resolvedIncidents.length
      : 0;

    return {
      total: incidents.length,
      open,
      investigating,
      mitigated,
      resolved,
      closed,
      bySeverity,
      byType,
      averageResolutionTime,
    };
  }

  async getIncidentsByAssignee(assignee: string): Promise<Incident[]> {
    return Array.from(this.incidents.values()).filter(i => i.assignedTo === assignee);
  }
}
