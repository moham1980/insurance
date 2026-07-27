import { Injectable, Logger } from '@nestjs/common';

export interface ProfileRecoRecommendation {
  recommendationId: string;
  category: string;
  title: string;
  description: string;
  confidence: number;
  domain: string;
  metadata?: Record<string, any>;
}

export interface ProfileRecoFeedbackRequest {
  subjectId: string;
  recommendationId: string;
  eventType: string;
  metadata?: Record<string, any>;
}

export interface ProfileRecoTraitUpsert {
  subjectId: string;
  traits: Record<string, any>;
}

@Injectable()
export class ProfileRecoAdapter {
  private readonly logger = new Logger(ProfileRecoAdapter.name);
  private readonly baseURL: string;

  constructor() {
    this.baseURL = process.env.PROFILE_RECO_FABRIC_URL || 'http://localhost:8546';
  }

  async getRecommendations(
    authToken: string,
    subjectId: string,
    domain: string,
    maxResults = 5,
  ): Promise<ProfileRecoRecommendation[]> {
    try {
      const resp = await fetch(`${this.baseURL}/api/v1/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ subjectId, domain, maxResults }),
      });

      if (!resp.ok) {
        this.logger.warn(`profile-reco-fabric returned ${resp.status}`);
        return [];
      }

      const data = await resp.json() as any;
      return data.candidates || [];
    } catch (err) {
      this.logger.warn(`Failed to get recommendations: ${err.message}`);
      return [];
    }
  }

  async publishDomainSignals(
    authToken: string,
    subjectId: string,
    traits: Record<string, any>,
  ): Promise<void> {
    try {
      const resp = await fetch(`${this.baseURL}/api/v1/profile/${subjectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ traits }),
      });

      if (!resp.ok) {
        this.logger.warn(`profile-reco-fabric upsert returned ${resp.status}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to publish domain signals: ${err.message}`);
    }
  }

  async recordFeedback(
    authToken: string,
    feedback: ProfileRecoFeedbackRequest,
  ): Promise<void> {
    try {
      const resp = await fetch(`${this.baseURL}/api/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(feedback),
      });

      if (!resp.ok) {
        this.logger.warn(`profile-reco-fabric feedback returned ${resp.status}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to record feedback: ${err.message}`);
    }
  }
}
