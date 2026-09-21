import { ApiError } from '#imports'

export type FormFieldErrors = Record<string, string>

export function applyApiFormError(
  error: unknown,
  assign: (fields: FormFieldErrors, conflict: string) => void
): boolean {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (error.status === 422) {
    const fields: FormFieldErrors = {}

    for (const [key, messages] of Object.entries(error.errors ?? {})) {
      const first = messages[0]

      if (first) {
        fields[key] = first
      }
    }

    assign(fields, '')
    return true
  }

  if (error.status === 409 || error.status === 403) {
    assign({}, error.message)
    return true
  }

  return false
}

export function firstApiMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null
  }

  if (error.status === 422) {
    for (const messages of Object.values(error.errors ?? {})) {
      if (messages[0]) {
        return messages[0]
      }
    }

    return error.message
  }

  if (error.status === 409 || error.status === 403) {
    return error.message
  }

  return null
}
