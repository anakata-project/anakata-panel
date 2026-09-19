<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('engineSettings.localeTitle')">
    <div class="engine-locale">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('engineSettings.localeCol') }}</th>
            <th>{{ t('engineSettings.statusCol') }}</th>
            <th>{{ t('engineSettings.notesCol') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('engineSettings.localeEn') }}</td>
            <td>
              <AnkPill tone="ok">
                {{ t('engineSettings.localeEnStatus') }}
              </AnkPill>
            </td>
            <td>{{ t('engineSettings.localeEnNote') }}</td>
          </tr>
          <tr>
            <td>{{ t('engineSettings.localeEs') }}</td>
            <td>
              <AnkPill>{{ t('engineSettings.localeEsStatus') }}</AnkPill>
            </td>
            <td>{{ t('engineSettings.localeEsNote') }}</td>
          </tr>
          <tr>
            <td>{{ t('engineSettings.localeCurrency') }}</td>
            <td>
              <AnkPill tone="ok">
                {{ t('engineSettings.localeCurrencyStatus') }}
              </AnkPill>
            </td>
            <td>{{ t('engineSettings.localeCurrencyNote') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AnkPanel>
</template>
