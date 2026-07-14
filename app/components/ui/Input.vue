<script setup lang="ts">
interface Props {
  modelValue?: string | number
  type?: string
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  disabled: false,
  modelValue: undefined,
  placeholder: undefined,
  label: undefined,
  error: undefined,
})

const emit = defineEmits(['update:modelValue'])

const onInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div class="flex flex-col gap-1.5 w-full">
    <label v-if="props.label" class="text-sm font-medium text-foreground/80 ml-1">
      {{ props.label }}
    </label>
    <input
      :type="props.type"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      class="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-normal ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all"
      :class="{ 'border-destructive ring-destructive': props.error }"
      @input="onInput"
    >
    <span v-if="props.error" class="text-xs text-destructive ml-1">
      {{ props.error }}
    </span>
  </div>
</template>
