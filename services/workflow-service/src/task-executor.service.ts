import { Injectable, Logger } from '@nestjs/common';
import { TaskExecutor, TaskExecutionRequest, TaskExecutionResult } from './task-executor.interface';

/**
 * Placeholder implementation of {@link TaskExecutor}.
 *
 * This does NOT invoke any real downstream service. It simply logs the
 * request and returns an empty successful result so that workflow execution
 * can proceed without blocking on unimplemented integrations.
 *
 * TODO: Replace this with a concrete implementation that dispatches to the
 * appropriate downstream service (e.g. via HTTP client or service bus).
 * Until then, task nodes that declare `config.service` will complete with
 * an empty output and a warning log.
 */
@Injectable()
export class PlaceholderTaskExecutor extends TaskExecutor {
  private readonly logger = new Logger(PlaceholderTaskExecutor.name);

  async execute(params: TaskExecutionRequest): Promise<TaskExecutionResult> {
    this.logger.warn(
      `PlaceholderTaskExecutor: task "${params.nodeName}" (node=${params.nodeId}) for instance ${params.instanceId} ` +
      `would call service "${params.service}" method "${params.method || 'default'}" — ` +
      `no real downstream call is performed. Replace with a concrete TaskExecutor implementation.`,
    );
    // TODO: dispatch to the real downstream service and return its output.
    return { success: true, output: {} };
  }
}
