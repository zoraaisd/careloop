const DASHBOARD_REFRESH_EVENT = 'careloop-dashboard-refresh';

export const emitDashboardRefresh = (source?: string): void => {
  window.dispatchEvent(
    new CustomEvent(DASHBOARD_REFRESH_EVENT, {
      detail: { source: source ?? 'unknown', triggeredAt: Date.now() },
    }),
  );
};

export const subscribeToDashboardRefresh = (
  callback: (event: CustomEvent<{ source?: string; triggeredAt?: number }>) => void,
): (() => void) => {
  const listener = (event: Event) => {
    callback(event as CustomEvent<{ source?: string; triggeredAt?: number }>);
  };

  window.addEventListener(DASHBOARD_REFRESH_EVENT, listener as EventListener);
  return () => window.removeEventListener(DASHBOARD_REFRESH_EVENT, listener as EventListener);
};

export { DASHBOARD_REFRESH_EVENT };
