import { documentsEqual } from './documentsEqual'

export function hasValidationErrors(
  errors: Record<string, Array<string>> | Array<unknown>
): boolean {
  if (Array.isArray(errors)) {
    return errors.length > 0
  }

  return Object.keys(errors).length > 0
}

export function isConfigDirty(input: {
  inFlight: boolean
  errors: Record<string, Array<string>> | Array<unknown>
  changes: Array<unknown>
  draft: unknown
  published: unknown
}): boolean {
  if (input.inFlight || hasValidationErrors(input.errors)) {
    return !documentsEqual(input.draft, input.published)
  }

  return input.changes.length > 0
}
