export type PublishOutcome
  = | { kind: 'published', version: number }
    | { kind: 'conflict', message: string }
    | { kind: 'invalid', errors: Record<string, Array<string>>, message: string }

export function stripDocumentPrefix(key: string): string {
  return key.startsWith('document.') ? key.slice('document.'.length) : key
}

export function normaliseErrors(
  errors: Record<string, Array<string>> | Array<unknown> | undefined
): Record<string, Array<string>> {
  if (!errors || Array.isArray(errors)) {
    return {}
  }

  const out: Record<string, Array<string>> = {}

  for (const [key, messages] of Object.entries(errors)) {
    out[stripDocumentPrefix(key)] = messages
  }

  return out
}

export function applyPublishOutcome(
  status: number,
  body: {
    version?: number
    message?: string
    errors?: Record<string, Array<string>>
  }
): PublishOutcome {
  if (status === 201) {
    return {
      kind: 'published',
      version: body.version ?? 0
    }
  }

  if (status === 409) {
    return {
      kind: 'conflict',
      message: body.message ?? 'Someone published a newer version while you were editing.'
    }
  }

  return {
    kind: 'invalid',
    errors: normaliseErrors(body.errors),
    message: body.message ?? ''
  }
}
