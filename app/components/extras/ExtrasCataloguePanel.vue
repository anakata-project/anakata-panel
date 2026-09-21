<script setup lang="ts">
import {
  emptyCatalogueItem,
  EXTRAS_DRAFT_KEY
} from './extrasCatalogueHelpers'

const props = defineProps<{
  canPublish: boolean
  publishedCodes: ReadonlySet<string>
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(EXTRAS_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('ExtrasCataloguePanel requires a provided extras draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('ExtrasCataloguePanel requires an extras draft')
  }

  return value
})

const { t } = useI18n()

function pathFor(index: number, field: string): string {
  return `items.${String(index)}.${field}`
}

function isPublished(code: string): boolean {
  return code !== '' && props.publishedCodes.has(code)
}

function onPriceInput(index: number, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const item = draft.value.items[index]

  if (item === undefined) {
    return
  }

  item.price_usd = target.value.trim() === '' ? null : Number(target.value)
}

function addItem(): void {
  draft.value.items = [...draft.value.items, emptyCatalogueItem()]
}

function dropItem(index: number): void {
  const item = draft.value.items[index]

  if (item === undefined || isPublished(item.code)) {
    return
  }

  draft.value.items = draft.value.items.filter((_, row) => row !== index)
}
</script>

<template>
  <AnkPanel :title="t('rates.extrasTitle')">
    <template #actions>
      <AnkPill>{{ t('rates.adminDirector') }}</AnkPill>
    </template>

    <div class="anccat-wrap">
      <table class="list mini-t anccat">
        <thead>
          <tr>
            <th>{{ t('rates.extrasCode') }}</th>
            <th>{{ t('rates.extrasName') }}</th>
            <th>{{ t('rates.extrasUnit') }}</th>
            <th>{{ t('rates.extrasPrice') }}</th>
            <th>{{ t('rates.extrasTransfer') }}</th>
            <th>{{ t('rates.extrasActive') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(item, index) in draft.items"
            :key="index"
          >
            <td>
              <input
                v-model="item.code"
                class="rin anccat-code"
                :class="{ bad: errorsFor(pathFor(index, 'code')).length > 0 }"
                :disabled="!canPublish || isPublished(item.code)"
                :readonly="isPublished(item.code)"
              >
              <p
                v-for="message in errorsFor(pathFor(index, 'code'))"
                :key="message"
                class="pline-err"
              >
                {{ message }}
              </p>
            </td>
            <td>
              <input
                v-model="item.name"
                class="rin anccat-name"
                :class="{ bad: errorsFor(pathFor(index, 'name')).length > 0 }"
                :disabled="!canPublish"
              >
              <p
                v-for="message in errorsFor(pathFor(index, 'name'))"
                :key="message"
                class="pline-err"
              >
                {{ message }}
              </p>
            </td>
            <td>
              <input
                v-model="item.unit"
                class="rin"
                :class="{ bad: errorsFor(pathFor(index, 'unit')).length > 0 }"
                :disabled="!canPublish"
              >
              <p
                v-for="message in errorsFor(pathFor(index, 'unit'))"
                :key="message"
                class="pline-err"
              >
                {{ message }}
              </p>
            </td>
            <td>
              <input
                class="rin anccat-price"
                type="number"
                min="0"
                :value="item.price_usd ?? ''"
                :placeholder="t('rates.extrasOnRequest')"
                :class="{ bad: errorsFor(pathFor(index, 'price_usd')).length > 0 }"
                :disabled="!canPublish"
                @input="onPriceInput(index, $event)"
              >
              <p
                v-for="message in errorsFor(pathFor(index, 'price_usd'))"
                :key="message"
                class="pline-err"
              >
                {{ message }}
              </p>
            </td>
            <td>
              <label class="chkline">
                <input
                  v-model="item.triggers_transfer_voucher"
                  type="checkbox"
                  :disabled="!canPublish"
                >
              </label>
            </td>
            <td>
              <label class="chkline">
                <input
                  v-model="item.active"
                  type="checkbox"
                  :disabled="!canPublish"
                >
              </label>
            </td>
            <td>
              <button
                v-if="canPublish && !isPublished(item.code)"
                type="button"
                class="mini"
                @click="dropItem(index)"
              >
                ✕
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="rhelp">
      <p class="note">
        {{ t('rates.extrasHelp') }}
      </p>
      <UButton
        v-if="canPublish"
        variant="outline"
        @click="addItem"
      >
        {{ t('rates.extrasAdd') }}
      </UButton>
    </div>
  </AnkPanel>
</template>
