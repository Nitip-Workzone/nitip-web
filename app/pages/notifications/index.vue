<script setup lang="ts">
import { Bell, Check, ArrowLeft, Inbox, Wallet, Package, ArrowRight } from '@lucide/vue'
import { useNotificationsStore } from '~/stores/notifications'

definePageMeta({
  layout: 'user',
})

const notificationsStore = useNotificationsStore()
const loading = ref(true)
const activeTab = ref<'all' | 'unread'>('all')

onMounted(async () => {
  loading.value = true
  await notificationsStore.fetchNotifications()
  loading.value = false
})

const filteredNotifications = computed(() => {
  if (activeTab.value === 'unread') {
    return notificationsStore.notifications.filter(n => !n.is_read)
  }
  return notificationsStore.notifications
})

async function markAllRead() {
  if (notificationsStore.unreadCount === 0) return
  await notificationsStore.markAllAsRead()
}

async function readNotif(id: string) {
  await notificationsStore.markAsRead(id)
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Helper to determine notification category icon
function getNotifCategory(title: string, message: string) {
  const t = (title + ' ' + message).toLowerCase()
  if (t.includes('saldo') || t.includes('wallet') || t.includes('top up') || t.includes('tarik') || t.includes('pay')) {
    return {
      icon: Wallet,
      bg: 'bg-amber-50 border-amber-200/50',
      color: 'text-amber-500'
    }
  }
  if (t.includes('order') || t.includes('pesanan') || t.includes('titip') || t.includes('belanja') || t.includes('antar') || t.includes('status')) {
    return {
      icon: Package,
      bg: 'bg-primary/10 border-primary/15',
      color: 'text-primary'
    }
  }
  return {
    icon: Bell,
    bg: 'bg-slate-50 border-slate-200/50',
    color: 'text-slate-500'
  }
}
</script>

<template>
  <div class="relative min-h-screen bg-slate-50">
    <!-- Ambient top glow -->
    <div class="absolute top-0 left-0 right-0 h-44 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

    <div class="relative z-10 max-w-md mx-auto px-5 pt-5 pb-24 space-y-5">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <NuxtLink to="/dashboard" class="p-2 -ml-2 text-slate-500 hover:text-slate-900 bg-white rounded-full border border-slate-100 shadow-sm transition-all active:scale-90">
            <ArrowLeft class="w-5 h-5" />
          </NuxtLink>
          <h1 class="text-lg font-black text-slate-900 tracking-tight">Notifikasi</h1>
        </div>

        <button 
          v-if="notificationsStore.unreadCount > 0"
          class="text-xs font-bold text-primary hover:text-primary-dark flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/15 transition-all active:scale-95 border border-primary/10"
          @click="markAllRead" 
        >
          <Check class="w-3.5 h-3.5" />
          Baca Semua
        </button>
      </div>

      <!-- Tab Filters -->
      <div class="flex bg-slate-200/60 p-1 rounded-2xl border border-slate-200/20">
        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            activeTab === 'all' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          ]"
          @click="activeTab = 'all'"
        >
          Semua ({{ notificationsStore.notifications.length }})
        </button>
        <button
          :class="[
            'flex-1 py-2 text-xs font-bold rounded-xl transition-all',
            activeTab === 'unread' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          ]"
          @click="activeTab = 'unread'"
        >
          Belum Dibaca ({{ notificationsStore.unreadCount }})
        </button>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 3" :key="i" class="bg-white border border-slate-100 rounded-3xl p-4 animate-pulse flex gap-3 shadow-soft">
          <div class="w-10 h-10 bg-slate-100 rounded-full shrink-0" />
          <div class="flex-1 space-y-2">
            <div class="h-3.5 bg-slate-100 rounded w-1/3" />
            <div class="h-3 bg-slate-100 rounded w-full" />
            <div class="h-2.5 bg-slate-100 rounded w-1/6 self-end" />
          </div>
        </div>
      </div>

      <template v-else>
        <!-- Empty State -->
        <div v-if="filteredNotifications.length === 0" class="bg-white border border-slate-100 rounded-3xl p-10 text-center shadow-soft">
          <div class="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
            <Inbox class="w-7 h-7 text-slate-300" />
          </div>
          <h3 class="text-sm font-bold text-slate-700">Tidak ada notifikasi</h3>
          <p class="text-xs text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed">
            {{ activeTab === 'unread' ? 'Hebat! Semua notifikasi Anda sudah dibaca.' : 'Semua info terbaru seputar pesanan Anda akan muncul di sini.' }}
          </p>
        </div>

        <!-- Notification List -->
        <div v-else class="space-y-3">
          <div
            v-for="notif in filteredNotifications"
            :key="notif.id"
            :class="[
              'p-4 rounded-3xl border transition-all cursor-pointer flex gap-3.5 relative shadow-sm',
              notif.is_read 
                ? 'bg-white/80 border-slate-100 text-slate-500 hover:bg-white hover:border-slate-200' 
                : 'bg-white border-primary/10 text-slate-900 font-medium hover:border-primary/25 shadow-primary/5 shadow-md'
            ]"
            @click="readNotif(notif.id)"
          >
            <!-- Unread Indicator Dot -->
            <span v-if="!notif.is_read" class="absolute top-4 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse" />

            <!-- Dynamic Category Icon -->
            <div 
              class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border shadow-inner"
              :class="getNotifCategory(notif.title, notif.message).bg"
            >
              <component 
                :is="getNotifCategory(notif.title, notif.message).icon" 
                class="w-5.5 h-5.5" 
                :class="getNotifCategory(notif.title, notif.message).color" 
              />
            </div>

            <!-- Content details -->
            <div class="min-w-0 flex-1 space-y-1">
              <h4 
                class="text-xs font-black tracking-tight" 
                :class="notif.is_read ? 'text-slate-700' : 'text-slate-900'"
              >
                {{ notif.title }}
              </h4>
              <p class="text-[11px] leading-relaxed text-slate-500">{{ notif.message }}</p>
              
              <div class="flex items-center justify-between pt-1">
                <span class="text-[9px] text-slate-400 font-bold tracking-wide uppercase">{{ formatDate(notif.created_at) }}</span>
                <span v-if="!notif.is_read" class="text-[9px] font-extrabold text-primary flex items-center gap-0.5">
                  Tandai dibaca <ArrowRight class="w-2.5 h-2.5" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>
