import type { NavGroup } from './types'

export const crmNav: Array<NavGroup> = [
  {
    id: 'sales',
    labelKey: 'nav.crm.sales',
    items: [
      {
        id: 'pipeline',
        labelKey: 'nav.crm.pipeline',
        glyph: '⊞',
        to: '/crm/sales/pipeline',
        sprint: 10
      },
      {
        id: 'tasks',
        labelKey: 'nav.crm.tasks',
        glyph: '✓',
        to: '/crm/sales/tasks',
        sprint: 10
      },
      {
        id: 'inbox',
        labelKey: 'nav.crm.inbox',
        glyph: '✉',
        to: '/crm/sales/inbox',
        sprint: 'later'
      },
      {
        id: 'contacts',
        labelKey: 'nav.crm.contacts',
        glyph: '◉',
        to: '/crm/sales/contacts',
        sprint: 9
      },
      {
        id: 'b2b-partners',
        labelKey: 'nav.crm.b2bPartners',
        glyph: '⬡',
        to: '/crm/sales/b2b-partners',
        sprint: 'later'
      },
      {
        id: 'documents',
        labelKey: 'nav.crm.documents',
        glyph: '▤',
        to: '/crm/sales/documents',
        sprint: 10
      }
    ]
  },
  {
    id: 'marketing',
    labelKey: 'nav.crm.marketing',
    items: [
      {
        id: 'journeys',
        labelKey: 'nav.crm.journeys',
        glyph: '➤',
        to: '/crm/marketing/journeys',
        sprint: 14
      },
      {
        id: 'segments',
        labelKey: 'nav.crm.segments',
        glyph: '◫',
        to: '/crm/marketing/segments',
        sprint: 14
      },
      {
        id: 'campaigns',
        labelKey: 'nav.crm.campaigns',
        glyph: '◈',
        to: '/crm/marketing/campaigns',
        sprint: 10
      }
    ]
  },
  {
    id: 'engine',
    labelKey: 'nav.crm.engine',
    items: [
      {
        id: 'activity',
        labelKey: 'nav.crm.activity',
        glyph: '⌁',
        to: '/crm/engine/activity',
        sprint: 9
      },
      {
        id: 'automations',
        labelKey: 'nav.crm.automations',
        glyph: '↻',
        to: '/crm/engine/automations',
        sprint: 14
      },
      {
        id: 'alerts',
        labelKey: 'nav.crm.alerts',
        glyph: '▲',
        to: '/crm/engine/alerts',
        sprint: 11
      }
    ]
  },
  {
    id: 'system',
    labelKey: 'nav.crm.system',
    items: [
      {
        id: 'sync',
        labelKey: 'nav.crm.sync',
        glyph: '⇄',
        to: '/crm/system/sync',
        sprint: 9
      },
      {
        id: 'consent',
        labelKey: 'nav.crm.consent',
        glyph: '⛉',
        to: '/crm/system/consent',
        sprint: 10
      }
    ]
  }
]
