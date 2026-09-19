import type { Permission } from '../types/api'

export function isCopyPath(path: string, copyPaths: Array<string>): boolean {
  return copyPaths.some((copyPath) => {
    return path === copyPath || path.startsWith(`${copyPath}.`)
  })
}

export function canEditPath(
  path: string,
  copyPaths: Array<string>,
  can: (permission: Permission) => boolean
): boolean {
  if (can('engine_settings.manage')) {
    return true
  }

  return isCopyPath(path, copyPaths) && can('engine_copy.manage')
}
