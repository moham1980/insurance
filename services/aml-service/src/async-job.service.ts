import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

// P2 #2: Simple in-memory async job queue for long-running operations.
// Stores job status and results in memory (no Redis required).

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AsyncJob {
  jobId: string;
  status: JobStatus;
  result?: any;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AsyncJobService {
  private readonly logger = new Logger(AsyncJobService.name);
  private jobs = new Map<string, AsyncJob>();

  createJob(): AsyncJob {
    const jobId = uuidv4();
    const job: AsyncJob = {
      jobId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId: string): AsyncJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return { ...job };
  }

  updateJob(jobId: string, status: JobStatus, result?: any, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      this.logger.warn(`Job not found for update: ${jobId}`);
      return;
    }
    job.status = status;
    job.result = result;
    job.error = error;
    job.updatedAt = new Date();
  }

  async runJob<T>(jobId: string, fn: () => Promise<T>): Promise<void> {
    this.updateJob(jobId, 'processing');
    try {
      const result = await fn();
      this.updateJob(jobId, 'completed', result);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(String(e));
      this.updateJob(jobId, 'failed', undefined, err.message);
    }
  }
}
