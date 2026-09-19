export function useForbiddenToast() {
  const pending = useState('anakata.forbidden-toast', () => false)

  function showForbiddenToast(): void {
    pending.value = true
  }

  return {
    pending,
    showForbiddenToast
  }
}
