function apiBase(): string {
  const config = useRuntimeConfig()

  return String(config.public.apiBase).replace(/\/$/, '')
}

async function fetchAuthed(path: string): Promise<Response> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: 'include'
  })

  if (!response.ok) {
    let message = `Request failed (${String(response.status)})`

    try {
      const data = await response.clone().json() as { message?: string }

      if (typeof data.message === 'string' && data.message !== '') {
        message = data.message
      }
    } catch {
      // HTML / PDF error bodies are not JSON.
    }

    throw new Error(message)
  }

  return response
}

export async function fetchDocumentHtml(path: string): Promise<string> {
  const response = await fetchAuthed(path)

  return await response.text()
}

export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (header === null) {
    return fallback
  }

  const utf = /filename\*=UTF-8''([^;]+)/i.exec(header)

  if (utf?.[1] !== undefined) {
    try {
      return decodeURIComponent(utf[1])
    } catch {
      return utf[1]
    }
  }

  const quoted = /filename="([^"]+)"/i.exec(header)

  if (quoted?.[1] !== undefined) {
    return quoted[1]
  }

  const bare = /filename=([^;]+)/i.exec(header)

  if (bare?.[1] !== undefined) {
    return bare[1].trim()
  }

  return fallback
}

export async function downloadDocumentFile(path: string, fallbackName: string): Promise<void> {
  const response = await fetchAuthed(path)
  const blob = await response.blob()
  const name = filenameFromDisposition(response.headers.get('content-disposition'), fallbackName)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
