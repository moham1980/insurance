import { Injectable } from '@nestjs/common';

export interface CommitteeDecision {
  decisionId: string;
  committeeId: string;
  committeeName: string;
  modelId: string;
  modelName: string;
  decisionType: 'approval' | 'rejection' | 'request_for_changes' | 'deferred';
  decision: string;
  rationale: string;
  decidedBy: string;
  decidedAt: Date;
  meetingDate: Date;
  meetingMinutes?: string;
  attendees: string[];
  votingRecord: Array<{ member: string; vote: 'approve' | 'reject' | 'abstain'; comments?: string }>;
  conditions?: string[];
  nextReviewDate?: Date;
}

export interface CommitteeMember {
  memberId: string;
  committeeId: string;
  name: string;
  role: 'chair' | 'member' | 'observer';
  expertise: string[];
  joinedAt: Date;
  active: boolean;
}

@Injectable()
export class CommitteeAuditTrailService {
  private decisions: Map<string, CommitteeDecision> = new Map();
  private members: Map<string, CommitteeMember> = new Map();

  async recordDecision(decision: Omit<CommitteeDecision, 'decisionId'>): Promise<CommitteeDecision> {
    const decisionId = `decision-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullDecision: CommitteeDecision = {
      ...decision,
      decisionId,
    };
    
    this.decisions.set(decisionId, fullDecision);
    return fullDecision;
  }

  async getDecision(decisionId: string): Promise<CommitteeDecision | null> {
    return this.decisions.get(decisionId) || null;
  }

  async getDecisionsByModel(modelId: string): Promise<CommitteeDecision[]> {
    return Array.from(this.decisions.values()).filter(d => d.modelId === modelId);
  }

  async getDecisionsByCommittee(committeeId: string): Promise<CommitteeDecision[]> {
    return Array.from(this.decisions.values()).filter(d => d.committeeId === committeeId);
  }

  async getDecisionsByType(decisionType: CommitteeDecision['decisionType']): Promise<CommitteeDecision[]> {
    return Array.from(this.decisions.values()).filter(d => d.decisionType === decisionType);
  }

  async getDecisionsByDateRange(startDate: Date, endDate: Date): Promise<CommitteeDecision[]> {
    return Array.from(this.decisions.values()).filter(
      d => d.decidedAt >= startDate && d.decidedAt <= endDate
    );
  }

  async addCommitteeMember(member: Omit<CommitteeMember, 'memberId'>): Promise<CommitteeMember> {
    const memberId = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const fullMember: CommitteeMember = {
      ...member,
      memberId,
    };
    
    this.members.set(memberId, fullMember);
    return fullMember;
  }

  async getCommitteeMember(memberId: string): Promise<CommitteeMember | null> {
    return this.members.get(memberId) || null;
  }

  async getCommitteeMembers(committeeId: string): Promise<CommitteeMember[]> {
    return Array.from(this.members.values()).filter(m => m.committeeId === committeeId && m.active);
  }

  async getCommitteeMembersByRole(committeeId: string, role: CommitteeMember['role']): Promise<CommitteeMember[]> {
    return Array.from(this.members.values()).filter(
      m => m.committeeId === committeeId && m.role === role && m.active
    );
  }

  async updateCommitteeMember(
    memberId: string,
    updates: Partial<Omit<CommitteeMember, 'memberId'>>,
  ): Promise<CommitteeMember> {
    const existingMember = this.members.get(memberId);
    if (!existingMember) {
      throw new Error(`Committee member ${memberId} not found`);
    }

    const updatedMember: CommitteeMember = {
      ...existingMember,
      ...updates,
      memberId: existingMember.memberId,
    };

    this.members.set(memberId, updatedMember);
    return updatedMember;
  }

  async deactivateCommitteeMember(memberId: string): Promise<CommitteeMember> {
    const member = this.members.get(memberId);
    if (!member) {
      throw new Error(`Committee member ${memberId} not found`);
    }

    member.active = false;
    this.members.set(memberId, member);
    return member;
  }

  async getAuditTrail(filters: {
    modelId?: string;
    committeeId?: string;
    decisionType?: CommitteeDecision['decisionType'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<CommitteeDecision[]> {
    let decisions = Array.from(this.decisions.values());

    if (filters.modelId) {
      decisions = decisions.filter(d => d.modelId === filters.modelId);
    }

    if (filters.committeeId) {
      decisions = decisions.filter(d => d.committeeId === filters.committeeId);
    }

    if (filters.decisionType) {
      decisions = decisions.filter(d => d.decisionType === filters.decisionType);
    }

    if (filters.startDate) {
      decisions = decisions.filter(d => d.decidedAt >= filters.startDate!);
    }

    if (filters.endDate) {
      decisions = decisions.filter(d => d.decidedAt <= filters.endDate!);
    }

    return decisions.sort((a, b) => b.decidedAt.getTime() - a.decidedAt.getTime());
  }

  async getCommitteeStatistics(committeeId: string): Promise<{
    totalDecisions: number;
    approvals: number;
    rejections: number;
    requestsForChanges: number;
    deferred: number;
    averageDecisionTime: number;
    mostActiveMembers: Array<{ member: string; decisionCount: number }>;
  }> {
    const decisions = await this.getDecisionsByCommittee(committeeId);
    
    const totalDecisions = decisions.length;
    const approvals = decisions.filter(d => d.decisionType === 'approval').length;
    const rejections = decisions.filter(d => d.decisionType === 'rejection').length;
    const requestsForChanges = decisions.filter(d => d.decisionType === 'request_for_changes').length;
    const deferred = decisions.filter(d => d.decisionType === 'deferred').length;

    // Calculate average decision time (time from meeting to decision)
    const decisionsWithMeeting = decisions.filter(d => d.meetingDate);
    const averageDecisionTime = decisionsWithMeeting.length > 0
      ? decisionsWithMeeting.reduce((sum, d) => sum + (d.decidedAt.getTime() - d.meetingDate.getTime()), 0) / decisionsWithMeeting.length
      : 0;

    // Count most active members
    const memberCounts: Record<string, number> = {};
    decisions.forEach(d => {
      d.attendees.forEach(member => {
        memberCounts[member] = (memberCounts[member] || 0) + 1;
      });
    });

    const mostActiveMembers = Object.entries(memberCounts)
      .map(([member, decisionCount]) => ({ member, decisionCount }))
      .sort((a, b) => b.decisionCount - a.decisionCount)
      .slice(0, 5);

    return {
      totalDecisions,
      approvals,
      rejections,
      requestsForChanges,
      deferred,
      averageDecisionTime,
      mostActiveMembers,
    };
  }

  async getModelDecisionHistory(modelId: string): Promise<{
    totalDecisions: number;
    firstDecisionDate: Date | null;
    lastDecisionDate: Date | null;
    approvalRate: number;
    committeesInvolved: string[];
    decisionTimeline: Array<{
      date: Date;
      committee: string;
      decision: string;
      decisionType: CommitteeDecision['decisionType'];
    }>;
  }> {
    const decisions = await this.getDecisionsByModel(modelId);
    
    const totalDecisions = decisions.length;
    const firstDecisionDate = decisions.length > 0 
      ? decisions.reduce((min, d) => d.decidedAt < min ? d.decidedAt : min, decisions[0].decidedAt)
      : null;
    const lastDecisionDate = decisions.length > 0
      ? decisions.reduce((max, d) => d.decidedAt > max ? d.decidedAt : max, decisions[0].decidedAt)
      : null;
    
    const approvals = decisions.filter(d => d.decisionType === 'approval').length;
    const approvalRate = totalDecisions > 0 ? approvals / totalDecisions : 0;
    
    const committeesInvolved = Array.from(new Set(decisions.map(d => d.committeeId)));
    
    const decisionTimeline = decisions
      .sort((a, b) => a.decidedAt.getTime() - b.decidedAt.getTime())
      .map(d => ({
        date: d.decidedAt,
        committee: d.committeeName,
        decision: d.decision,
        decisionType: d.decisionType,
      }));

    return {
      totalDecisions,
      firstDecisionDate,
      lastDecisionDate,
      approvalRate,
      committeesInvolved,
      decisionTimeline,
    };
  }

  async searchDecisions(query: string): Promise<CommitteeDecision[]> {
    const lowerQuery = query.toLowerCase();
    
    return Array.from(this.decisions.values()).filter(d =>
      d.modelName.toLowerCase().includes(lowerQuery) ||
      d.rationale.toLowerCase().includes(lowerQuery) ||
      d.decision.toLowerCase().includes(lowerQuery) ||
      d.committeeName.toLowerCase().includes(lowerQuery)
    );
  }

  async exportAuditReport(filters: {
    modelId?: string;
    committeeId?: string;
    decisionType?: CommitteeDecision['decisionType'];
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    decisions: CommitteeDecision[];
    summary: {
      totalDecisions: number;
      approvals: number;
      rejections: number;
      uniqueModels: number;
      uniqueCommittees: number;
    };
    generatedAt: Date;
  }> {
    const decisions = await this.getAuditTrail(filters);
    
    const summary = {
      totalDecisions: decisions.length,
      approvals: decisions.filter(d => d.decisionType === 'approval').length,
      rejections: decisions.filter(d => d.decisionType === 'rejection').length,
      uniqueModels: new Set(decisions.map(d => d.modelId)).size,
      uniqueCommittees: new Set(decisions.map(d => d.committeeId)).size,
    };

    return {
      decisions,
      summary,
      generatedAt: new Date(),
    };
  }
}
