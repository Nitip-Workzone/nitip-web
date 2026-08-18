<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  code: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showName: false,
})

// Official brand colors mapping - replaces AI-generated PNGs with official guideline colors
// Source: Official brand guidelines BCA #0060AF, Mandiri #003A6E ribbon #FED700, BNI #F15A23 + #46A5DB, BRI #00529C, DANA #118EEA, GoPay #00AED6, OVO #4C3497, ShopeePay #EE4D2D
const BRANDS: Record<string, { name: string; short: string; bg: string; text: string; border: string; accent?: string }> = {
  BCA: { name: 'Bank Central Asia', short: 'BCA', bg: '#E6F0FA', text: '#0060AF', border: '#0060AF' },
  MANDIRI: { name: 'Bank Mandiri', short: 'Mandiri', bg: '#E6EEF5', text: '#003A6E', border: '#003A6E', accent: '#FED700' },
  BNI: { name: 'Bank Negara Indonesia', short: 'BNI', bg: '#FFF0EB', text: '#0066B2', border: '#F15A23' },
  BRI: { name: 'Bank Rakyat Indonesia', short: 'BRI', bg: '#E6EEF7', text: '#00529C', border: '#00529C' },
  GOPAY: { name: 'GoPay', short: 'GoPay', bg: '#E6F7FC', text: '#00AED6', border: '#00AED6' },
  OVO: { name: 'OVO', short: 'OVO', bg: '#F0EBFA', text: '#4C3497', border: '#4C3497' },
  DANA: { name: 'DANA', short: 'DANA', bg: '#E7F4FD', text: '#118EEA', border: '#118EEA' },
  SHOPEEPAY: { name: 'ShopeePay', short: 'SPay', bg: '#FEECE8', text: '#EE4D2D', border: '#EE4D2D' },
  MANUAL: { name: 'Manual', short: 'Manual', bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
}

const brand = computed(() => {
  const upper = (props.code || '').toUpperCase()
  return BRANDS[upper] || { name: props.code, short: props.code.slice(0, 4).toUpperCase(), bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' }
})

const sizeClasses = computed(() => {
  switch (props.size) {
    case 'sm': return 'w-7 h-7 text-[10px]'
    case 'lg': return 'w-12 h-12 text-[13px]'
    default: return 'w-9 h-9 text-[11px]'
  }
})
</script>

<template>
  <div
    :class="['inline-flex items-center justify-center rounded-xl border font-black tracking-wide select-none shrink-0', sizeClasses]"
    :style="{ backgroundColor: brand.bg, color: brand.text, borderColor: brand.border }"
    :title="brand.name + ' - Official brand color (replaces AI-generated PNG)'"
  >
    <span class="relative">
      {{ brand.short }}
      <span v-if="brand.accent" class="absolute -bottom-0.5 left-0 right-0 h-0.5 rounded-full" :style="{ backgroundColor: brand.accent }"/>
    </span>
  </div>
</template>
