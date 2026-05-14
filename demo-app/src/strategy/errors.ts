export type ExecutionErrorKind =
  | 'insufficient_funds'
  | 'not_authenticated'
  | 'market_closed'
  | 'unknown';

export interface ExecutionErrorInfo {
  kind: ExecutionErrorKind;
  /** Raw underlying message — display only as a last-resort detail. */
  message: string;
}

export function classifyExecutionError(err: unknown): ExecutionErrorInfo {
  const message = err instanceof Error ? err.message : String(err);
  const m = message.toLowerCase();

  if (m.includes('insufficient') || m.includes('not enough') || m.includes('balance')) {
    return { kind: 'insufficient_funds', message };
  }
  if (m.includes('authentication') || m.includes('unauthorized') || m.includes('sign in')) {
    return { kind: 'not_authenticated', message };
  }
  if (m.includes('closed') || m.includes('resolved') || m.includes('not open')) {
    return { kind: 'market_closed', message };
  }
  return { kind: 'unknown', message };
}
