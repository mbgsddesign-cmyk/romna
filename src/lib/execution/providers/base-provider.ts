export interface ExecutionResult {
  success: boolean;
  error?: string;
}

export abstract class BaseExecutionProvider {
  abstract execute(payload: Record<string, unknown>): Promise<ExecutionResult>;
}
