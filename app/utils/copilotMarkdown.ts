import DOMPurify from 'dompurify'
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: true
})

export function renderCopilotMarkdown(text: string): string {
  const html = marked.parse(text, { async: false }) as string

  if (typeof window === 'undefined') {
    return html
  }

  return DOMPurify.sanitize(html)
}
