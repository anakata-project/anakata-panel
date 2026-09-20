import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import { h } from 'vue'
import EngineField from '../../app/components/engine/EngineField.vue'

describe('EngineField', () => {
  it('associates the visible label with the slotted control', async () => {
    const wrapper = await mountSuspended(EngineField, {
      props: { label: 'Max guests per cabin' },
      slots: {
        default: ({ id }: { id: string }) => h('input', { id })
      }
    })

    const label = wrapper.get('label')
    const input = wrapper.get('input')

    expect(label.attributes('for')).toBe(input.attributes('id'))
    expect(input.attributes('id')).toBeTruthy()
    expect(label.text()).toBe('Max guests per cabin')
  })
})
