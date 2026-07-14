export function useCurrencyInput(initialValue: number | null = null) {
  const numericValue = ref<number | null>(initialValue)
  const displayValue = ref(initialValue ? formatToDisplay(initialValue) : '')

  function formatToDisplay(value: number): string {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  function _parseFromDisplay(value: string): number {
    const cleaned = value.replace(/[^0-9]/g, '')
    return cleaned ? parseInt(cleaned, 10) : 0
  }

  function onInput(event: Event) {
    const input = event.target as HTMLInputElement
    const raw = input.value.replace(/[^0-9]/g, '')

    if (!raw) {
      displayValue.value = ''
      numericValue.value = null
      return
    }

    const number = parseInt(raw, 10)
    numericValue.value = number
    displayValue.value = formatToDisplay(number)

    // Update input value to formatted version
    input.value = displayValue.value
  }

  return {
    numericValue,
    displayValue,
    onInput,
  }
}