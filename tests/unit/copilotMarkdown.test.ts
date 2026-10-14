import { describe, expect, it } from 'vitest'
import { renderCopilotMarkdown } from '../../app/utils/copilotMarkdown'

describe('copilot markdown', () => {
  it('renders emphasis and lists', () => {
    const html = renderCopilotMarkdown([
      '**Reading**',
      '',
      '- Contacts',
      '- Deals'
    ].join('\n'))

    expect(html).toContain('<strong>Reading</strong>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>Contacts</li>')
    expect(html).toContain('<li>Deals</li>')
  })
})
