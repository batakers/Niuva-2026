import { appError } from "./errors";

export type TransitionOutcome = "ALLOWED" | "REJECTED";

export type TransitionAuditEvent = Readonly<{
  entityId?: string;
  entityType: string;
  from: string;
  outcome: TransitionOutcome;
  to: string;
}>;

export type TransitionAuditWriter = (
  event: TransitionAuditEvent,
) => void | Promise<void>;

export type TransitionMap<Status extends string> = Readonly<
  Record<Status, readonly Status[]>
>;

export function isTransitionAllowed<Status extends string>(
  map: TransitionMap<Status>,
  current: Status,
  next: Status,
): boolean {
  return (map[current] ?? []).includes(next);
}

export async function transitionStatus<Status extends string>(
  map: TransitionMap<Status>,
  input: Readonly<{
    audit?: TransitionAuditWriter;
    current: Status;
    entityId?: string;
    entityType: string;
    next: Status;
  }>,
): Promise<Status> {
  const allowed = isTransitionAllowed(map, input.current, input.next);

  await input.audit?.({
    entityId: input.entityId,
    entityType: input.entityType,
    from: input.current,
    outcome: allowed ? "ALLOWED" : "REJECTED",
    to: input.next,
  });

  if (!allowed) {
    throw appError("INVALID_STATE_TRANSITION", {
      details: {
        entityType: input.entityType,
        from: input.current,
        to: input.next,
      },
    });
  }

  return input.next;
}

export async function recordRejectedTransition(input: Readonly<{
  audit?: TransitionAuditWriter;
  current: string;
  entityId?: string;
  entityType: string;
  next: string;
}>): Promise<void> {
  await input.audit?.({
    entityId: input.entityId,
    entityType: input.entityType,
    from: input.current,
    outcome: "REJECTED",
    to: input.next,
  });
}
