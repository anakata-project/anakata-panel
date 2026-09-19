export function linesToList(text: string): Array<string> {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
}
