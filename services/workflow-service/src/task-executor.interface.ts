/**
 * Interface for executing external service tasks within a workflow.
 *
 * Workflow nodes of type `task` may declare a `config.service` target that
 * should be invoked when the node is reached. The actual dispatch mechanism
 * (HTTP call, gRPC, in-process, message bus, etc.) is implementation-specific
 * and provided by a concrete `TaskExecutor`.
 *
 * TODO: Replace {@link PlaceholderTaskExecutor} with a real implementation
 * that dispatches to downstream services (e.g. via HTTP/gRPC).
 */
export abstract class TaskExecutor {
  /**
   * Execute a workflow task by invoking the configured external service.
   *
   * @param params Information about the task to execute.
   * @returns The raw output returned by the external service, to be mapped
   *          into workflow variables via the node's `outputMapping`.
   */
  abstract execute(params: TaskExecutionRequest): Promise<TaskExecutionResult>;
}

export interface TaskExecutionRequest {
  /** Tenant identifier for scoping the downstream call. */
  tenantId: string;
  /** The workflow instance identifier. */
  instanceId: string;
  /** The node identifier of the task being executed. */
  nodeId: string;
  /** The node name (human-readable) of the task. */
  nodeName: string;
  /** The service target declared in the node config (e.g. 'pricing-service'). */
  service: string;
  /** The method/action to invoke on the target service. */
  method?: string;
  /** Parameters to pass to the target service. */
  params?: Record<string, any>;
  /** Current workflow variables, made available to the executor. */
  variables: Record<string, any>;
}

export interface TaskExecutionResult {
  /** Whether the task execution succeeded. */
  success: boolean;
  /** The raw output payload from the external service. */
  output?: Record<string, any>;
  /** Error message when `success` is false. */
  error?: string;
}
