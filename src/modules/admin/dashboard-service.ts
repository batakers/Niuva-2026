import { dashboardWindow, projectDashboard, type DashboardResult } from "./dashboard";
import { PrismaDashboardRepository, type DashboardReader } from "./dashboard-repository";

export class DashboardService {
  private readonly now: () => Date;
  private readonly repository: DashboardReader;

  constructor(dependencies: { now?: () => Date; repository?: DashboardReader } = {}) {
    this.now = dependencies.now ?? (() => new Date());
    this.repository = dependencies.repository ?? new PrismaDashboardRepository();
  }

  async load(): Promise<DashboardResult> {
    const now = this.now();
    const window = dashboardWindow(now);
    const source = await this.repository.load(window);
    return projectDashboard(source, now, window);
  }
}
