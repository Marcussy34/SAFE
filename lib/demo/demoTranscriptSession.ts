import type { SafeDemoRunRecord } from "@/lib/demo/demoRunner";

export function filterRunsAfterDashboardLoad(
  runs: SafeDemoRunRecord[],
  dashboardLoadedAtMs: number
): SafeDemoRunRecord[] {
  return runs.filter((run) => {
    const completedAtMs = Date.parse(run.completedAt);
    return Number.isFinite(completedAtMs) && completedAtMs > dashboardLoadedAtMs;
  });
}
