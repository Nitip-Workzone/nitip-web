<script setup lang="ts">
import { Shield, ShieldOff, Star, ShieldAlert } from '@lucide/vue'
import type { AdminUser } from '~/stores/users'

const props = defineProps<{
  open: boolean
  user: AdminUser | null
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'updated'): void
}>()

const usersStore = useUsersStore()
const { success, error } = useToast()
const trustInput = ref(0)
const suspendReason = ref('')

watch(() => props.user, (u) => {
  if (u) {
    trustInput.value = u.trust_score
    suspendReason.value = u.suspended_reason || ''
  }
}, { immediate: true })

const close = () => emit('update:open', false)

const handleVerify = async () => {
  if (!props.user) return
  const newVal = !props.user.is_verified
  const ok = await usersStore.verifyUser(props.user.id, newVal)
  if (ok) {
    success(`User ${newVal ? 'verified' : 'unverified'} successfully`)
    emit('updated')
  }
}

const handleUpdateTrust = async () => {
  if (!props.user) return
  const ok = await usersStore.updateTrust(props.user.id, trustInput.value)
  if (ok) {
    success('Trust score updated successfully')
    emit('updated')
  }
}

const handleSuspend = async () => {
  if (!props.user) return
  const newVal = !props.user.is_suspended
  
  if (newVal && !suspendReason.value.trim()) {
    error('Please provide a reason for suspension')
    return
  }

  const ok = await usersStore.suspendUser(props.user.id, newVal, suspendReason.value)
  if (ok) {
    success(`User ${newVal ? 'suspended' : 'unsuspended'} successfully`)
    emit('updated')
  }
}

const handleDisableTotp = async () => {
  if (!props.user) return
  if (confirm(`Yakin ingin menonaktifkan 2FA (TOTP) untuk pengguna ${props.user.name}?`)) {
    const ok = await usersStore.adminDisableTotp(props.user.id)
    if (ok) {
      success(`2FA (TOTP) untuk ${props.user.name} berhasil dinonaktifkan`)
      emit('updated')
    }
  }
}

const roleVariant = (role: string) => {
  if (role === ROLE_ADMIN) return 'destructive'
  if (role === ROLE_RUNNER) return 'info'
  return 'secondary'
}
</script>

<template>
  <UiModal
    :open="open"
    :title="user?.name || 'User Detail'"
    description="View and manage user details"
    max-width="max-w-xl"
    @update:open="close"
  >
    <div v-if="user" class="space-y-6">
      <!-- Avatar + Basic Info -->
      <div class="flex items-center gap-4">
        <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
          {{ user.name.substring(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <p class="font-semibold text-foreground text-base">{{ user.name }}</p>
          <p class="text-sm text-muted-foreground truncate">{{ user.email }}</p>
          <div class="flex items-center gap-2 mt-1">
            <UiBadge :variant="roleVariant(user.role)">{{ user.role }}</UiBadge>
            <UiBadge :variant="user.is_verified ? 'success' : 'warning'">
              {{ user.is_verified ? 'Verified' : 'Unverified' }}
            </UiBadge>
            <UiBadge v-if="user.is_suspended" variant="destructive">
              Suspended
            </UiBadge>
          </div>
        </div>
      </div>

      <!-- Stats Row -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-secondary/40 rounded-lg p-3 border border-border/50">
          <p class="text-xs text-muted-foreground">Trust Score</p>
          <p class="text-2xl font-bold text-foreground mt-0.5">{{ user.trust_score }}</p>
        </div>
        <div class="bg-secondary/40 rounded-lg p-3 border border-border/50">
          <p class="text-xs text-muted-foreground">Member Since</p>
          <p class="text-sm font-semibold text-foreground mt-0.5">
            {{ new Date(user.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) }}
          </p>
        </div>
      </div>

      <!-- Trust Score Editor -->
      <div class="space-y-2">
        <label class="text-sm font-medium text-foreground">Update Trust Score</label>
        <div class="flex items-center gap-2">
          <UiInput
            v-model="trustInput"
            type="number"
            placeholder="0-100"
            class="flex-1"
          />
          <UiButton
            variant="secondary"
            :loading="usersStore.actionLoading"
            @click="handleUpdateTrust"
          >
            <Star class="w-4 h-4 mr-1.5" />
            Save
          </UiButton>
        </div>
      </div>

      <!-- Verify Action -->
      <div class="border border-border/50 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium">Account Verification</p>
          <p class="text-xs text-muted-foreground mt-0.5">
            {{ user.is_verified ? 'This account is currently verified.' : 'This account is not yet verified.' }}
          </p>
        </div>
        <UiButton
          :variant="user.is_verified ? 'destructive' : 'primary'"
          size="sm"
          :loading="usersStore.actionLoading"
          @click="handleVerify"
        >
          <ShieldOff v-if="user.is_verified" class="w-4 h-4 mr-1.5" />
          <Shield v-else class="w-4 h-4 mr-1.5" />
          {{ user.is_verified ? 'Unverify' : 'Verify' }}
        </UiButton>
      </div>

      <!-- Suspend Action -->
      <div class="border border-border/50 rounded-lg p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium">Suspend Account</p>
            <p class="text-xs text-muted-foreground mt-0.5">
              {{ user.is_suspended ? 'This user is currently restricted.' : 'Restrict user from making or receiving orders.' }}
            </p>
          </div>
          <UiButton
            :variant="user.is_suspended ? 'secondary' : 'destructive'"
            size="sm"
            :loading="usersStore.actionLoading"
            @click="handleSuspend"
          >
            <ShieldAlert v-if="!user.is_suspended" class="w-4 h-4 mr-1.5" />
            {{ user.is_suspended ? 'Unsuspend' : 'Suspend User' }}
          </UiButton>
        </div>
        
        <div v-if="!user.is_suspended || user.is_suspended" class="space-y-1.5">
          <label class="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {{ user.is_suspended ? 'Suspended Reason' : 'Suspension Reason (Required)' }}
          </label>
          <UiInput
            v-model="suspendReason"
            placeholder="e.g. Unusual activity or payment failure"
            :disabled="user.is_suspended && usersStore.actionLoading"
          />
        </div>
      </div>

      <!-- TOTP Action -->
      <div v-if="user.totp_enabled" class="border border-red-200/50 bg-red-50/30 rounded-lg p-4 flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-red-700">Nonaktifkan 2FA (TOTP)</p>
          <p class="text-xs text-red-600/80 mt-0.5">
            Gunakan fitur ini jika pengguna kehilangan akses ke aplikasi Authenticator mereka.
          </p>
        </div>
        <UiButton
          variant="destructive"
          size="sm"
          :loading="usersStore.actionLoading"
          @click="handleDisableTotp"
        >
          <ShieldOff class="w-4 h-4 mr-1.5" />
          Matikan 2FA
        </UiButton>
      </div>
    </div>

    <template #footer>
      <UiButton variant="ghost" class="w-full" @click="close">Close</UiButton>
    </template>
  </UiModal>
</template>
