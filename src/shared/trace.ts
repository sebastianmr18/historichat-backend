import { RequestTraceContext } from "./types.js";

export function generateTraceId(prefix: string = "trace"): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

export function createTraceContext(
  base: RequestTraceContext | undefined,
  extras: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    traceId: base?.traceId ?? generateTraceId(),
    socketId: base?.socketId,
    event: base?.event,
    ...extras,
  };
}
