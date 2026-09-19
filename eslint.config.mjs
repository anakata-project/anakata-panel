// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { getDefaultAttributes } from 'eslint-plugin-better-tailwindcss/api/defaults'

export default withNuxt(
  betterTailwindcss.configs['correctness-error'],
  {
    settings: {
      'better-tailwindcss': {
        entryPoint: '../anakata-ui/app/assets/css/main.css',
        attributes: [
          ...getDefaultAttributes(),
          ['^v-bind:ui$', [{ match: 'objectValues' }]]
        ]
      }
    },
    rules: {
      'better-tailwindcss/no-unknown-classes': ['error', {
        ignore: [
          '^(app|brand|brand-mark--dark|brand-mark--light|navsec|nav|nav-badge|sideprow|tophead|tophead--rms|tophead--crm|drbar-slot|who|who-select|who-email|mono|sysbadge|sys-rms|api-status|api-status--ok|api-status--down|placeholder-copy|section-switch|fchip|on|auth-layout|auth-theme|auth-column|auth-form|auth-actions|auth-hint|auth-link|notice|warnbox|list|list-toolbar|list-filters|list-search|list-pager|list-actions|user-cell|user-email|row-actions|modal-form|modal-actions|field-hint|history-drawer|bid|history-note|history-zone|history-load|tl2|tli|tlt|tlw|dr-empty|matrix-scroll|matrix-sticky|matrix-role|matrix-role-head|matrix-users|matrix-group|matrix-cell--dirty|matrix-cell-btn|matrix-warn|matrix-bar|matrix-bar-actions|matrix-tip)$'
        ]
      }]
    }
  }
)
