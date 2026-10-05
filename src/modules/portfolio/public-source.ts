import { isPreviewParameter } from "@/features/frontend-preview/scenarios";
import { decide, type CapabilityContext } from "@/modules/capabilities/resolver";

export type PublicContentSource = "database" | "localReference" | "scenarioFixture";

/**
 * Single decision point for where public content comes from (Req 15.1, 15.4).
 *
 * - A recognised `?preview=` scenario plus an allowed `publicPreviewScenario`
 *   capability selects the fixture scenarios.
 * - An allowed `localContentReference` capability selects the approved local
 *   reference.
 * - Anything else, including every denial or unreadable configuration, selects
 *   the database path, so production never falls back to local content.
 *
 * `NODE_ENV` is not read here. It only influences the result indirectly through
 * the deployment tier the capability resolver derives, and the resolver forces
 * `production` whenever NODE_ENV is `production`.
 */
export function resolvePublicContentSource(
  requested: unknown,
  context?: CapabilityContext,
): PublicContentSource {
  if (isPreviewParameter(requested) && decide("publicPreviewScenario", context).allowed) {
    return "scenarioFixture";
  }

  if (decide("localContentReference", context).allowed) {
    return "localReference";
  }

  return "database";
}
