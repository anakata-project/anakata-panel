<script setup lang="ts">
const { t } = useI18n()
const { can } = useAuth()
</script>

<template>
  <div>
    <AnkPanel :title="t('admin.matrixTitle')">
      <p class="placeholder-copy">
        {{ t('admin.matrixPlaceholder') }}
      </p>
    </AnkPanel>
    <AdminTeamMembersPanel v-if="can('users.manage')" />
  </div>
</template>
