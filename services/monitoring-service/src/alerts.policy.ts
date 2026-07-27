export function mapComplaintSlaBreachToSeverity(params: { elapsedHours: number | null | undefined }): 'critical' | 'warning' | 'info' {
  const h = typeof params.elapsedHours === 'number' && Number.isFinite(params.elapsedHours) ? params.elapsedHours : 0;
  if (h >= 24) return 'critical';
  if (h >= 4) return 'warning';
  return 'info';
}
