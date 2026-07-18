<script setup lang="ts">
import { Settings, Save, RefreshCw, AlertCircle } from '@lucide/vue'
import { useConfigsStore } from '~/stores/configs'
import { useToast } from '~/stores/toast'

definePageMeta({
  layout: 'admin',
})

const configsStore = useConfigsStore()
const { success, error } = useToast()

const editedValues = ref<Record<string, string>>({})
const editedDescriptions = ref<Record<string, string>>({})

const fetchAllConfigs = async () => {
  await configsStore.fetchConfigs()
  // Initialize editable fields
  configsStore.configs.forEach((c) => {
    editedValues.value[c.key] = c.value
    editedDescriptions.value[c.key] = c.description || ''
  })
}

onMounted(() => {
  fetchAllConfigs()
})

const handleSave = async (key: string) => {
  const value = editedValues.value[key] || ''
  const desc = editedDescriptions.value[key] || ''
  const ok = await configsStore.updateConfig(key, value, desc)
  if (ok) {
    success(`Konfigurasi "${key}" berhasil diperbarui.`)
  } else {
    error(`Gagal memperbarui konfigurasi "${key}".`)
  }
}

// Group configs for better UI organization
const groupedConfigs = computed(() => {
  const groups = {
    'Tarif & Jasa (Fees)': [] as typeof configsStore.configs,
    'Batas Transaksi & COD': [] as typeof configsStore.configs,
    'Limit Akun (Non-KYC)': [] as typeof configsStore.configs,
    'Lain-lain': [] as typeof configsStore.configs,
  }

  configsStore.configs.forEach((c) => {
    if (c.key.startsWith('fee_') || c.key.includes('fee')) {
      groups['Tarif & Jasa (Fees)'].push(c)
    } else if (c.key.startsWith('cod_')) {
      groups['Batas Transaksi & COD'].push(c)
    } else if (c.key.startsWith('kyc_') || c.key.includes('limit')) {
      groups['Limit Akun (Non-KYC)'].push(c)
    } else {
      groups['Lain-lain'].push(c)
    }
  })

  // Filter out empty groups
  return Object.fromEntries(Object.entries(groups).filter(([_, list]) => list.length > 0))
})
</script>

<template>
  <div class="space-y-6 animate-in fade-in duration-500">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 class="text-phi-xl font-bold tracking-tight">System Settings</h1>
        <p class="text-sm text-muted-foreground mt-0.5">
          Modifikasi konfigurasi tarif, batasan COD, dan limit harian sistem secara langsung.
        </p>
      </div>
      <UiButton
        variant="secondary"
        size="sm"
        :loading="configsStore.loading"
        @click="fetchAllConfigs"
      >
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </UiButton>
    </div>

    <!-- Empty State -->
    <div
      v-if="!configsStore.loading && configsStore.configs.length === 0"
      class="flex flex-col items-center justify-center py-20 text-center gap-3 bg-card rounded-xl border border-border"
    >
      <div class="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
        <Settings class="w-7 h-7 text-muted-foreground" />
      </div>
      <div>
        <p class="font-semibold text-foreground">Tidak ada konfigurasi ditemukan</p>
        <p class="text-sm text-muted-foreground mt-0.5">Hubungi pengembang sistem jika database kosong.</p>
      </div>
    </div>

    <!-- Config Form Groups -->
    <div v-else class="space-y-8">
      <div 
        v-for="(configs, groupName) in groupedConfigs" 
        :key="groupName" 
        class="space-y-4"
      >
        <h2 class="text-sm font-extrabold uppercase tracking-wider text-muted-foreground pl-1">
          {{ groupName }}
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UiCard 
            v-for="cfg in configs" 
            :key="cfg.key" 
            class="p-5 flex flex-col justify-between hover:border-primary/30 transition-colors"
          >
            <div class="space-y-3">
              <div class="flex items-start justify-between gap-2">
                <span class="font-mono text-xs font-bold text-primary truncate max-w-[70%]" :title="cfg.key">
                  {{ cfg.key }}
                </span>
                <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  Global
                </span>
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-muted-foreground uppercase">Nilai Konfigurasi</label>
                <input
                  v-model="editedValues[cfg.key]"
                  type="text"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-all"
                >
              </div>

              <div class="space-y-1">
                <label class="text-[10px] font-bold text-muted-foreground uppercase">Deskripsi</label>
                <textarea
                  v-model="editedDescriptions[cfg.key]"
                  rows="2"
                  class="w-full text-xs p-2.5 border border-input rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div class="pt-4 flex items-center justify-between border-t border-slate-100 mt-4">
              <span class="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle class="w-3.5 h-3.5 text-amber-500" />
                Disimpan dinamis ke DB
              </span>
              <UiButton
                size="sm"
                variant="primary"
                :disabled="configsStore.actionLoading"
                @click="handleSave(cfg.key)"
              >
                <Save class="w-3.5 h-3.5 mr-1.5" />
                Simpan
              </UiButton>
            </div>
          </UiCard>
        </div>
      </div>
    </div>
  </div>
</template>
