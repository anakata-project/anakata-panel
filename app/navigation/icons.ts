const NAV_ICONS: Record<string, string> = {
  '/crm/sales/pipeline': 'i-lucide-kanban',
  '/crm/sales/tasks': 'i-lucide-list-checks',
  '/crm/sales/inbox': 'i-lucide-inbox',
  '/crm/sales/contacts': 'i-lucide-users',
  '/crm/sales/b2b-partners': 'i-lucide-handshake',
  '/crm/sales/documents': 'i-lucide-file-text',
  '/crm/marketing/journeys': 'i-lucide-route',
  '/crm/marketing/segments': 'i-lucide-layers',
  '/crm/marketing/campaigns': 'i-lucide-megaphone',
  '/crm/engine/activity': 'i-lucide-activity',
  '/crm/engine/automations': 'i-lucide-zap',
  '/crm/engine/alerts': 'i-lucide-bell',
  '/crm/system/sync': 'i-lucide-refresh-cw',
  '/crm/system/consent': 'i-lucide-shield-check',
  '/rms/reservations/booking-requests': 'i-lucide-inbox',
  '/rms/reservations/calendar': 'i-lucide-calendar',
  '/rms/reservations/yacht-layout': 'i-lucide-sailboat',
  '/rms/reservations/bookings': 'i-lucide-list',
  '/rms/commercial/dashboard': 'i-lucide-layout-dashboard',
  '/rms/commercial/reports': 'i-lucide-chart-column',
  '/rms/commercial/payments': 'i-lucide-credit-card',
  '/rms/commercial/rates': 'i-lucide-tags',
  '/rms/commercial/b2b': 'i-lucide-building-2',
  '/rms/commercial/contacts-in': 'i-lucide-user',
  '/rms/operations/holds': 'i-lucide-clock',
  '/rms/operations/refunds': 'i-lucide-undo-2',
  '/rms/operations/blocks': 'i-lucide-ban',
  '/rms/operations/documents': 'i-lucide-files',
  '/rms/operations/alerts': 'i-lucide-triangle-alert',
  '/rms/operations/guest-experience': 'i-lucide-star',
  '/rms/booking-engine/itineraries': 'i-lucide-route',
  '/rms/booking-engine/departures': 'i-lucide-ship',
  '/rms/booking-engine/offers': 'i-lucide-percent',
  '/rms/booking-engine/settings': 'i-lucide-settings',
  '/rms/booking-engine/map': 'i-lucide-map',
  '/rms/admin/permissions': 'i-lucide-shield',
  '/rms/admin/business-rules': 'i-lucide-scale'
}

const FALLBACK_ICON = 'i-lucide-circle'

export function navIcon(to: string): string {
  return NAV_ICONS[to] ?? FALLBACK_ICON
}
