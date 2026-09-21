export default defineNuxtConfig({
  extends: ['../anakata-ui'],

  modules: [
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
