import type { NavGroup } from './types'

export const rmsNav: Array<NavGroup> = [
  {
    id: 'reservations',
    labelKey: 'nav.rms.reservations',
    items: [
      {
        id: 'booking-requests',
        labelKey: 'nav.rms.bookingRequests',
        glyph: '◍',
        to: '/rms/reservations/booking-requests',
        sprint: 4,
        badge: true,
        permission: ['requests.confirm', 'requests.release']
      },
      {
        id: 'calendar',
        labelKey: 'nav.rms.calendar',
        glyph: '◫',
        to: '/rms/reservations/calendar',
        sprint: 3
      },
      {
        id: 'yacht-layout',
        labelKey: 'nav.rms.yachtLayout',
        glyph: '⛵',
        to: '/rms/reservations/yacht-layout',
        sprint: 3
      },
      {
        id: 'bookings',
        labelKey: 'nav.rms.bookings',
        glyph: '≣',
        to: '/rms/reservations/bookings',
        sprint: 4
      }
    ]
  },
  {
    id: 'commercial',
    labelKey: 'nav.rms.commercial',
    items: [
      {
        id: 'payments',
        labelKey: 'nav.rms.payments',
        glyph: '◈',
        to: '/rms/commercial/payments',
        sprint: 5,
        permission: 'bookings.view_all'
      },
      {
        id: 'rates',
        labelKey: 'nav.rms.rates',
        glyph: '◆',
        to: '/rms/commercial/rates',
        sprint: 2
      },
      {
        id: 'b2b',
        labelKey: 'nav.rms.b2b',
        glyph: '⬡',
        to: '/rms/commercial/b2b',
        sprint: 11
      },
      {
        id: 'contacts-in',
        labelKey: 'nav.rms.contactsIn',
        glyph: '◉',
        to: '/rms/commercial/contacts-in',
        sprint: 6
      }
    ]
  },
  {
    id: 'operations',
    labelKey: 'nav.rms.operations',
    items: [
      {
        id: 'holds',
        labelKey: 'nav.rms.holds',
        glyph: '◔',
        to: '/rms/operations/holds',
        sprint: 4
      },
      {
        id: 'refunds',
        labelKey: 'nav.rms.refunds',
        glyph: '↺',
        to: '/rms/operations/refunds',
        sprint: 5
      },
      {
        id: 'blocks',
        labelKey: 'nav.rms.blocks',
        glyph: '▦',
        to: '/rms/operations/blocks',
        sprint: 3
      },
      {
        id: 'documents',
        labelKey: 'nav.rms.documents',
        glyph: '▤',
        to: '/rms/operations/documents',
        sprint: 7
      },
      {
        id: 'guest-experience',
        labelKey: 'nav.rms.guestExperience',
        glyph: '✧',
        to: '/rms/operations/guest-experience',
        sprint: 11
      }
    ]
  },
  {
    id: 'booking-engine',
    labelKey: 'nav.rms.bookingEngine',
    items: [
      {
        id: 'itineraries',
        labelKey: 'nav.rms.itineraries',
        glyph: '◇',
        to: '/rms/booking-engine/itineraries',
        sprint: 3
      },
      {
        id: 'departures',
        labelKey: 'nav.rms.departures',
        glyph: '◷',
        to: '/rms/booking-engine/departures',
        sprint: 3
      },
      {
        id: 'offers',
        labelKey: 'nav.rms.offers',
        glyph: '✦',
        to: '/rms/booking-engine/offers',
        sprint: 8
      },
      {
        id: 'settings',
        labelKey: 'nav.rms.engineSettings',
        glyph: '⚙',
        to: '/rms/booking-engine/settings',
        sprint: 2
      },
      {
        id: 'map',
        labelKey: 'nav.rms.engineMap',
        glyph: '⌗',
        to: '/rms/booking-engine/map',
        sprint: 8
      }
    ]
  },
  {
    id: 'admin',
    labelKey: 'nav.rms.admin',
    items: [
      {
        id: 'permissions',
        labelKey: 'nav.rms.permissions',
        glyph: '◈',
        to: '/rms/admin/permissions',
        sprint: 1,
        permission: ['users.manage', 'roles.manage']
      },
      {
        id: 'business-rules',
        labelKey: 'nav.rms.businessRules',
        glyph: '⚖',
        to: '/rms/admin/business-rules',
        sprint: 2,
        permission: 'rules.view'
      }
    ]
  }
]
