import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import LocaleSwitch from '../../app/components/shell/LocaleSwitch.vue'

const Probe = defineComponent({
  components: { LocaleSwitch },
  async setup() {
    const { t, locale, setLocale } = useI18n()
    const route = useRoute()

    if (locale.value !== 'en') {
      await setLocale('en')
    }

    return { t, route, setLocale }
  },
  template: '<div><LocaleSwitch /><p data-sample>{{ t(\'shell.signOut\') }}</p><p data-path>{{ route.fullPath }}</p></div>'
})

describe('LocaleSwitch', () => {
  it('switches rendered copy without a navigation', async () => {
    const wrapper = await mountSuspended(Probe)
    const path = wrapper.get('[data-path]').text()

    expect(wrapper.get('[data-sample]').text()).toBe('Sign out')

    await wrapper.get('[data-locale="es"]').trigger('click')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-sample]').text()).toBe('Cerrar sesión')
    })
    expect(wrapper.get('[data-path]').text()).toBe(path)
  })

  it('restores the locale from the cookie', async () => {
    const wrapper = await mountSuspended(Probe)
    const sw = wrapper.getComponent(LocaleSwitch)

    await sw.vm.choose('es')

    await vi.waitFor(() => {
      expect(sw.vm.stored).toBe('es')
      expect(wrapper.get('[data-sample]').text()).toBe('Cerrar sesión')
    })

    await wrapper.vm.setLocale('en')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-sample]').text()).toBe('Sign out')
    })

    await sw.vm.applyStored()

    await vi.waitFor(() => {
      expect(wrapper.get('[data-sample]').text()).toBe('Cerrar sesión')
    })
  })
})
