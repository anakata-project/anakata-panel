import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const localUi = resolve(import.meta.dirname, '../anakata-ui')
const uiLayer = existsSync(localUi)
  ? '../anakata-ui'
  : 'github:anakata-project/anakata-ui#v0.9.0'

export default defineNuxtConfig({
  extends: [uiLayer],

  alias: existsSync(localUi)
    ? { '#anakata-ui': localUi }
    : {},

  modules: [
    (_options, nuxt) => {
      const layer = nuxt.options._layers.find(item => item.cwd.includes('anakata-ui'))
      if (layer) {
        nuxt.options.alias['#anakata-ui'] = layer.cwd
      }
    },
    '@nuxt/ui',
    '@nuxt/eslint'
  ],

  ssr: false,

  css: ['~/assets/css/shell.css', '~/assets/css/lists.css', '~/assets/css/config.css', '~/assets/css/inventory.css', '~/assets/css/bookings.css', '~/assets/css/documents.css'],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000'
    }
  },

  devServer: {
    port: 3001
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  i18n: {
    locales: [
      { code: 'en', language: 'en', file: 'en.json' }
    ]
  }
})
