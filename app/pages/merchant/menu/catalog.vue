<script setup lang="ts">
// V2 FINAL - 3 Tabs terpisah: Menu | Kategori | Topping Master Shared
// Kategori management dengan icon foto 1:1 400, sort, active, COS auto-delete
// Topping Master independent shared: Keju, Bobba, Eskrim bisa dipakai banyak menu, opsi foto 400, COS auto-delete
// Menu: kategori, varian ±harga dengan foto 600, topping foto 400, foto produk wajib crop 1:1 1200, COS auto-delete
import { Plus, Edit, Trash2, RefreshCw, Utensils, ArrowLeft, Camera, Tag, Layers, PlusCircle, ChefHat, CupSoda } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'user', ssr: false })
const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const checkLoading = ref(true)
const actionLoading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const activeTab = ref<'menu'|'category'|'topping'>('menu')

const menuForm = ref({ name: '', description: '', price: 0, image_url: '', category_id: '' as string|null, is_available: true })
const editMenuId = ref('')
const selectedFile = ref<File|null>(null)
const previewUrl = ref('')
const togglingMenuId = ref('')
const deletingMenuId = ref('')

const categories = ref<Array<{ id: string; name: string; image_url?: string; sort_order: number; is_active: boolean }>>([])
const activeCategoryId = ref<string|null>(null)
const showCategoryModal = ref(false)
const categoryForm = ref({ name: '', image_url: '', sort_order: 0, is_active: true })
const categoryPreviewUrl = ref('')
const categoryFile = ref<File|null>(null)
const saveCategoryLoading = ref(false)
const deleteCategoryId = ref<string|null>(null)
const catFileInputRef = ref<HTMLInputElement|null>(null)

interface VariantOptionForm { id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null; is_default: boolean; is_available: boolean; sort_order: number }
interface VariantGroupForm { id?: string; name: string; type: 'single'|'multiple'; is_required: boolean; min_select: number; max_select: number|null; sort_order: number; options: VariantOptionForm[] }
interface ToppingOptionForm { id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null; is_available: boolean; sort_order: number }
interface ToppingGroupForm { id?: string; name: string; type: 'single'|'multiple'; is_required: boolean; min_select: number; max_select: number|null; sort_order: number; variant_option_id?: string|null; options: ToppingOptionForm[] }

const variantGroups = ref<VariantGroupForm[]>([])
const toppingGroups = ref<ToppingGroupForm[]>([])

const toppingMasters = ref<Array<{ id: string; name: string; image_url?: string; options: Array<{ id: string; label: string; price_delta: number; image_url?: string; previewUrl?: string }> }>>([])
const showToppingMasterModal = ref(false)
const toppingMasterForm = ref({ name: '', image_url: '' })
const toppingMasterPreviewUrl = ref('')
const toppingMasterOptions = ref<Array<{ id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null }>>([])
const toppingMasterSaving = ref(false)

const cropperOpen = ref(false)
const cropperSrc = ref('')
const croppedBlob = ref<Blob|null>(null)
const cropperTarget = ref<'menu'|'category'|'variant'|'topping'|'toppingMasterOption'>('menu')
const cropperVariantIdx = ref<{ g:number; o:number }|null>(null)
const cropperToppingIdx = ref<{ g:number; o:number }|null>(null)
const cropperToppingMasterIdx = ref<number|null>(null)
const addFileInputRef = ref<HTMLInputElement|null>(null)
const editFileInputRef = ref<HTMLInputElement|null>(null)

const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      await merchantsStore.fetchMerchantMenu()
      categories.value = await merchantsStore.fetchCategories() as any
      // Topping Masters - try store method, fallback aggregasi dari menu existing
      try {
        const { request } = useApi()
        // Try new endpoint if exists, else aggregate
        try {
          const res = await request<{ data: any[] }>('/merchant/toppings')
          if (res.data && Array.isArray(res.data)) toppingMasters.value = res.data
          else throw new Error('no data')
        } catch {
          // Fallback: aggregasi topping groups dari semua menu sebagai shared view
          const aggregated: Map<string, any> = new Map()
          for (const m of (merchantsStore.merchantMenus as any[])) {
            try {
              const tgs = await merchantsStore.fetchToppingGroups(m.id) as any[]
              for (const tg of tgs) {
                if (!aggregated.has(tg.name)) aggregated.set(tg.name, { id: tg.id, name: tg.name, image_url: '', options: tg.options||[] })
              }
            } catch {}
          }
          toppingMasters.value = Array.from(aggregated.values())
        }
      } catch {}
    } else { await navigateTo('/merchant/menu'); return }
  } catch (e) { console.warn(e) } finally { checkLoading.value=false }
}

const filteredMenus = computed(() => {
  if (!activeCategoryId.value) return merchantsStore.merchantMenus as any[]
  return (merchantsStore.merchantMenus as any[]).filter((m:any)=> (m.category_id||m.category?.id)===activeCategoryId.value)
})

const handleFileChange = async (event: Event, target: 'menu'|'category'|'variant'|'topping'|'toppingMasterOption'='menu', vIdx?: {g:number;o:number}, tIdx?: {g:number;o:number}, tmIdx?: number) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { error('Harus gambar'); input.value=''; return }
  if (file.size>10*1024*1024) { error('Maks 10MB'); input.value=''; return }
  cropperTarget.value=target
  if (vIdx) cropperVariantIdx.value=vIdx
  if (tIdx) cropperToppingIdx.value=tIdx
  if (tmIdx!==undefined) cropperToppingMasterIdx.value=tmIdx
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
  cropperSrc.value=URL.createObjectURL(file)
  await nextTick()
  cropperOpen.value=true
  input.value=''
}

const onCropped = async (payload: { blob: Blob; url: string; file: File }) => {
  let uploadedUrl=''
  try { uploadedUrl = await merchantsStore.uploadMenuImage(payload.file) } catch {}
  if (cropperTarget.value==='menu') {
    croppedBlob.value=payload.blob
    selectedFile.value=payload.file
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
    previewUrl.value=payload.url
    if (uploadedUrl) menuForm.value.image_url=uploadedUrl
  } else if (cropperTarget.value==='category') {
    categoryFile.value=payload.file
    if (categoryPreviewUrl.value) URL.revokeObjectURL(categoryPreviewUrl.value)
    categoryPreviewUrl.value=payload.url
    if (uploadedUrl) categoryForm.value.image_url=uploadedUrl
  } else if (cropperTarget.value==='variant' && cropperVariantIdx.value) {
    const {g,o}=cropperVariantIdx.value
    const vg=variantGroups.value[g]
    if (vg?.options[o]) {
      vg.options[o].file=payload.file
      if (vg.options[o].previewUrl) URL.revokeObjectURL(vg.options[o].previewUrl!)
      vg.options[o].previewUrl=payload.url
      if (uploadedUrl) vg.options[o].image_url=uploadedUrl
    }
  } else if (cropperTarget.value==='topping' && cropperToppingIdx.value) {
    const {g,o}=cropperToppingIdx.value
    const tg=toppingGroups.value[g]
    if (tg?.options[o]) {
      tg.options[o].file=payload.file
      if (tg.options[o].previewUrl) URL.revokeObjectURL(tg.options[o].previewUrl!)
      tg.options[o].previewUrl=payload.url
      if (uploadedUrl) tg.options[o].image_url=uploadedUrl
    }
  } else if (cropperTarget.value==='toppingMasterOption' && cropperToppingMasterIdx.value!==null) {
    const idx=cropperToppingMasterIdx.value
    const opt=toppingMasterOptions.value[idx]
    if (opt) {
      opt.file=payload.file
      if (opt.previewUrl) URL.revokeObjectURL(opt.previewUrl!)
      opt.previewUrl=payload.url
      if (uploadedUrl) opt.image_url=uploadedUrl
    }
  }
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' }
  cropperOpen.value=false
  cropperVariantIdx.value=null
  cropperToppingIdx.value=null
  cropperToppingMasterIdx.value=null
}
const onCropCancel = () => {
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' }
  cropperOpen.value=false
}

const openAddModal = () => {
  menuForm.value={ name:'', description:'', price:0, image_url:'', category_id: activeCategoryId.value, is_available:true }
  selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null
  variantGroups.value=[]; toppingGroups.value=[]
  showAddModal.value=true
}
const handleAddMenu = async () => {
  if (!menuForm.value.name) { error('Nama wajib'); return }
  if (menuForm.value.price<=0) { error('Harga >0'); return }
  if (selectedFile.value && !croppedBlob.value && !menuForm.value.image_url) { error('Foto wajib crop 1:1'); return }
  actionLoading.value=true
  let finalImageUrl=menuForm.value.image_url
  if (selectedFile.value && !finalImageUrl) { try { finalImageUrl=await merchantsStore.uploadMenuImage(selectedFile.value) } catch { error('Gagal upload'); actionLoading.value=false; return } }
  try {
    const menu = await merchantsStore.createMenuItem({ name: menuForm.value.name, description: menuForm.value.description, price: Number(menuForm.value.price), image_url: finalImageUrl, is_available: menuForm.value.is_available } as any) as any
    const menuId=menu?.id
    if (menuId && menuForm.value.category_id) {
      const { request } = useApi()
      try { await request(`/merchant/menu/${menuId}`, { method:'PUT', body:{ name:menuForm.value.name, description:menuForm.value.description, price:Number(menuForm.value.price), image_url:finalImageUrl, is_available:menuForm.value.is_available, category_id:menuForm.value.category_id } }) } catch {}
    }
    if (menuId) {
      for (const vg of variantGroups.value) {
        const g = await merchantsStore.createVariantGroup(menuId, { name:vg.name, type:vg.type, is_required:vg.is_required, min_select:vg.min_select, max_select:vg.max_select, sort_order:vg.sort_order }) as any
        const gid=g?.id; if (!gid) continue
        for (const opt of vg.options) {
          let imgUrl=opt.image_url
          if (opt.file && !imgUrl) { try { imgUrl=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} }
          await merchantsStore.createVariantOption(gid, { label:opt.label, price_delta:opt.price_delta, image_url:imgUrl, is_default:opt.is_default, is_available:opt.is_available, sort_order:opt.sort_order })
        }
      }
      for (const tg of toppingGroups.value) {
        const g = await merchantsStore.createToppingGroup(menuId, { name:tg.name, type:tg.type, variant_option_id:tg.variant_option_id||null, is_required:tg.is_required, min_select:tg.min_select, max_select:tg.max_select, sort_order:tg.sort_order }) as any
        const gid=g?.id; if (!gid) continue
        for (const opt of tg.options) {
          let imgUrl=opt.image_url
          if (opt.file && !imgUrl) { try { imgUrl=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} }
          await (merchantsStore as any).createToppingOption(gid, { label:opt.label, price_delta:opt.price_delta, image_url:imgUrl, is_available:opt.is_available, sort_order:opt.sort_order })
        }
      }
    }
    success('Menu V2 ditambahkan — kategori, varian ±foto, topping foto. COS auto-delete saat hapus.')
    showAddModal.value=false
    if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' }
    await merchantsStore.fetchMerchantMenu()
  } catch { error('Gagal tambah menu') } finally { actionLoading.value=false }
}

const openEditModal = (menu:any) => {
  editMenuId.value=menu.id
  menuForm.value={ name:menu.name, description:menu.description||'', price:menu.price, image_url:menu.image_url||'', category_id:menu.category_id||menu.category?.id||null, is_available:menu.is_available }
  selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null
  variantGroups.value=[]; toppingGroups.value=[]
  showEditModal.value=true
  setTimeout(async()=>{
    try {
      const vgs=await merchantsStore.fetchVariantGroups(menu.id) as any[]
      variantGroups.value=vgs.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_default:o.is_default, is_available:o.is_available, sort_order:o.sort_order })) }))
      const tgs=await merchantsStore.fetchToppingGroups(menu.id) as any[]
      toppingGroups.value=tgs.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, variant_option_id:g.variant_option_id||null, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_available:o.is_available, sort_order:o.sort_order })) }))
    } catch {}
  },200)
}
const handleEditMenu = async () => {
  if (!menuForm.value.name) { error('Nama wajib'); return }
  if (menuForm.value.price<=0) { error('Harga >0'); return }
  actionLoading.value=true
  let finalImageUrl=menuForm.value.image_url
  if (selectedFile.value && !finalImageUrl) { try { finalImageUrl=await merchantsStore.uploadMenuImage(selectedFile.value) } catch { error('Gagal upload'); actionLoading.value=false; return } }
  try {
    const { request } = useApi()
    await request(`/merchant/menu/${editMenuId.value}`, { method:'PUT', body:{ name:menuForm.value.name, description:menuForm.value.description, price:Number(menuForm.value.price), image_url:finalImageUrl, is_available:menuForm.value.is_available, category_id:menuForm.value.category_id } })
    success('Menu diperbarui — gambar lama COS auto-delete jika ganti.')
    showEditModal.value=false
    if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' }
    await merchantsStore.fetchMerchantMenu()
  } catch { error('Gagal update') } finally { actionLoading.value=false }
}
const handleDeleteMenu = async (id:string) => {
  if (!confirm('Yakin hapus menu ini? Gambar produk + varian + topping di COS akan dihapus otomatis.')) return
  deletingMenuId.value=id
  try { await merchantsStore.deleteMenuItem(id); success('Menu & semua gambar COS terhapus.') } catch { error('Gagal hapus') } finally { deletingMenuId.value='' }
}
const toggleMenuAvailable = async (menu:any) => {
  togglingMenuId.value=menu.id
  try { await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available); success(menu.is_available ? 'Dinonaktifkan' : 'Diaktifkan') } catch { error('Gagal toggle') } finally { togglingMenuId.value='' }
}

// Category
const openCategoryModal = (cat?:any) => {
  if (cat) { categoryForm.value={ name:cat.name, image_url:cat.image_url||'', sort_order:cat.sort_order||0, is_active:cat.is_active }; categoryPreviewUrl.value=cat.image_url||''; (categoryForm as any).id=cat.id } else { categoryForm.value={ name:'', image_url:'', sort_order:categories.value.length, is_active:true }; categoryPreviewUrl.value=''; delete (categoryForm as any).id }
  categoryFile.value=null
  showCategoryModal.value=true
}
const handleSaveCategory = async () => {
  if (!categoryForm.value.name) { error('Nama kategori wajib'); return }
  saveCategoryLoading.value=true
  try {
    const id=(categoryForm as any).id
    let finalUrl=categoryForm.value.image_url
    if (categoryFile.value && !finalUrl) { try { finalUrl=await merchantsStore.uploadMenuImage(categoryFile.value) } catch { error('Gagal upload icon'); saveCategoryLoading.value=false; return } }
    if (id) await merchantsStore.updateCategory(id, { name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order, is_active:categoryForm.value.is_active })
    else await merchantsStore.createCategory({ name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order })
    success('Kategori disimpan (icon 1:1 400px, COS auto-delete)')
    showCategoryModal.value=false
    categories.value=await merchantsStore.fetchCategories() as any
  } catch { error('Gagal kategori') } finally { saveCategoryLoading.value=false }
}
const handleDeleteCategory = async (id:string) => {
  if (!confirm('Hapus kategori? Menu jadi tanpa kategori. Icon COS akan auto-delete.')) return
  deleteCategoryId.value=id
  try { await merchantsStore.deleteCategory(id); success('Kategori dihapus, icon COS terhapus'); categories.value=await merchantsStore.fetchCategories() as any } catch { error('Gagal hapus') } finally { deleteCategoryId.value=null }
}

// Varian & Topping per menu modal
const addVariantGroup = () => { variantGroups.value.push({ name:'Ukuran', type:'single', is_required:true, min_select:1, max_select:1, sort_order:variantGroups.value.length, options:[{ label:'Regular', price_delta:0, image_url:'', is_default:true, is_available:true, sort_order:0 }] }) }
const addVariantOption = (gIdx:number) => { variantGroups.value[gIdx].options.push({ label:'', price_delta:0, image_url:'', is_default:false, is_available:true, sort_order:variantGroups.value[gIdx].options.length }) }
const removeVariantGroup = (idx:number) => { variantGroups.value.splice(idx,1) }
const removeVariantOption = (gIdx:number,oIdx:number) => { variantGroups.value[gIdx].options.splice(oIdx,1) }
const addToppingGroup = () => { toppingGroups.value.push({ name:'Topping', type:'multiple', is_required:false, min_select:0, max_select:null, sort_order:toppingGroups.value.length, options:[{ label:'Keju', price_delta:3000, image_url:'', is_available:true, sort_order:0 }] }) }
const addToppingOption = (gIdx:number) => { toppingGroups.value[gIdx].options.push({ label:'', price_delta:0, image_url:'', is_available:true, sort_order:toppingGroups.value[gIdx].options.length }) }
const removeToppingGroup = (idx:number) => { toppingGroups.value.splice(idx,1) }
const removeToppingOption = (gIdx:number,oIdx:number) => { toppingGroups.value[gIdx].options.splice(oIdx,1) }

// Topping Master Shared
const openToppingMasterModal = (master?:any) => {
  if (master) { toppingMasterForm.value={ name:master.name, image_url:master.image_url||'' }; toppingMasterPreviewUrl.value=master.image_url||''; toppingMasterOptions.value=(master.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url })); (toppingMasterForm as any).id=master.id } else { toppingMasterForm.value={ name:'', image_url:'' }; toppingMasterPreviewUrl.value=''; toppingMasterOptions.value=[{ label:'Keju Parut', price_delta:3000, image_url:'', previewUrl:'' }, { label:'Bobba', price_delta:4000, image_url:'', previewUrl:'' }] }
  showToppingMasterModal.value=true
}
const handleSaveToppingMaster = async () => {
  if (!toppingMasterForm.value.name) { error('Nama topping master wajib'); return }
  toppingMasterSaving.value=true
  try {
    for (const opt of toppingMasterOptions.value) { if (opt.file && !opt.image_url) { try { opt.image_url=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} } }
    const id=(toppingMasterForm as any).id
    try {
      const { request } = useApi()
      const payload={ name:toppingMasterForm.value.name, image_url:toppingMasterForm.value.image_url, options: toppingMasterOptions.value.map(o=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url })) }
      if (id) await request(`/merchant/toppings/${id}`, { method:'PUT', body:payload })
      else await request('/merchant/toppings', { method:'POST', body:payload })
      const res=await request<{ data:any[] }>('/merchant/toppings'); if (res.data) toppingMasters.value=res.data
    } catch {
      // fallback local
      if (id) {
        const idx=toppingMasters.value.findIndex(t=>t.id===id)
        if (idx>=0) toppingMasters.value[idx]={ id, name:toppingMasterForm.value.name, image_url:toppingMasterForm.value.image_url, options: toppingMasterOptions.value.map((o,i)=>({ id:o.id||`opt-${i}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) }
      } else {
        toppingMasters.value.push({ id:`local-${Date.now()}`, name:toppingMasterForm.value.name, image_url:toppingMasterForm.value.image_url, options: toppingMasterOptions.value.map((o,i)=>({ id:`opt-${i}-${Date.now()}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) })
      }
    }
    success('Topping master disimpan — shared bisa dipakai banyak menu')
    showToppingMasterModal.value=false
  } catch { error('Gagal simpan topping master') } finally { toppingMasterSaving.value=false }
}
const handleDeleteToppingMaster = async (id:string) => {
  if (!confirm('Hapus topping master ini? Gambar COS akan dihapus.')) return
  try {
    try { const { request } = useApi(); await request(`/merchant/toppings/${id}`, { method:'DELETE' }) } catch {}
    toppingMasters.value=toppingMasters.value.filter(t=>t.id!==id)
    success('Topping master dihapus, COS auto-delete')
  } catch { error('Gagal hapus') }
}
const duplicateFromMaster = (master:any) => {
  toppingGroups.value.push({ name: master.name, type:'multiple', is_required:false, min_select:0, max_select:null, sort_order:toppingGroups.value.length, variant_option_id:null, options: (master.options||[]).map((o:any,i:number)=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'', is_available:true, sort_order:i })) })
  success(`"${master.name}" dipakai ke menu ini`)
}

onMounted(()=>{ fetchProfile() })
</script>

<template>
  <div class="px-4 pb-24 space-y-4">
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw class="w-9 h-9 animate-spin text-primary mb-3" />
      <p class="text-sm font-semibold text-muted-foreground">Memuat katalog V2...</p>
    </div>
    <div v-else class="space-y-4">
      <div class="flex items-center gap-2.5 pt-1">
        <NuxtLink to="/merchant/menu" class="w-9 h-9 shrink-0 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-700"><ArrowLeft class="w-4 h-4" /></NuxtLink>
        <div class="flex-1 min-w-0"><h2 class="text-[15px] font-black leading-tight">Katalog Menu V2</h2><p class="text-[10px] text-slate-400 font-medium truncate">Menu · Kategori terpisah · Topping Master shared sampai opsi foto</p></div>
        <button class="shrink-0 h-9 px-3.5 rounded-xl text-xs font-black bg-primary text-white flex items-center gap-1 shadow-md" @click="openAddModal"><Plus class="w-4 h-4" /> Menu</button>
      </div>

      <div class="flex gap-2 bg-slate-100 p-1 rounded-2xl">
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='menu' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='menu'"><Utensils class="w-3.5 h-3.5" /> Menu</button>
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='category' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='category'"><Tag class="w-3.5 h-3.5" /> Kategori</button>
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='topping' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='topping'"><ChefHat class="w-3.5 h-3.5" /> Topping</button>
      </div>

      <!-- MENU TAB -->
      <div v-if="activeTab==='menu'" class="space-y-3">
        <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button class="shrink-0 h-8 px-4 rounded-full text-[11px] font-black border" :class="!activeCategoryId ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'" @click="activeCategoryId=null">Semua</button>
          <button v-for="cat in categories" :key="cat.id" class="shrink-0 h-8 pl-2 pr-3 rounded-full text-[11px] font-bold border flex items-center gap-1.5" :class="activeCategoryId===cat.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200'" @click="activeCategoryId=cat.id">
            <div class="w-5 h-5 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0"><img v-if="cat.image_url" :src="cat.image_url" class="w-full h-full object-cover" /><Tag v-else class="w-3 h-3 text-slate-400" /></div>{{ cat.name }}
          </button>
        </div>
        <div v-if="filteredMenus.length===0" class="py-10 px-6 text-center bg-white border rounded-[24px]"><div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border flex items-center justify-center mb-3"><Utensils class="w-7 h-7 text-slate-400" /></div><p class="text-[13px] font-black">Belum Ada Menu</p><p class="text-[11px] text-slate-500 mt-1 max-w-[260px] mx-auto">Kategori & topping sudah dipisah managemen nya. Tambah menu dengan foto 1:1, varian foto, topping foto.</p><button class="mt-4 h-10 px-5 rounded-full text-xs font-black bg-primary text-white" @click="openAddModal">+ Tambah Menu</button></div>
        <div v-else class="space-y-3">
          <div v-for="menu in filteredMenus as any" :key="menu.id" class="bg-white border border-slate-100 rounded-3xl p-4 flex gap-4 items-center justify-between shadow-sm">
            <div class="flex items-center gap-3.5 min-w-0 flex-1">
              <div class="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="menu.image_url" :src="menu.image_url" class="w-full h-full object-cover"><Utensils v-else class="w-6 h-6 text-slate-300" /></div>
              <div class="min-w-0 space-y-1">
                <div class="flex items-center gap-1.5"><h4 class="text-xs font-black truncate">{{ menu.name }}</h4><span v-if="menu.category?.name" class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-bold border">{{ menu.category.name }}</span></div>
                <p class="text-[10px] text-slate-400 truncate max-w-[220px]">{{ menu.description }}</p>
                <p class="text-xs font-black text-primary">Rp {{ Number(menu.price).toLocaleString('id-ID') }}</p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 pl-3.5 border-l">
              <button class="h-7 px-3 text-[10px] font-black rounded-xl border flex items-center gap-1" :class="menu.is_available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'" :disabled="togglingMenuId===menu.id" @click="toggleMenuAvailable(menu)"><RefreshCw v-if="togglingMenuId===menu.id" class="w-3 h-3 animate-spin" /><template v-else>{{ menu.is_available ? 'Tersedia' : 'Habis' }}</template></button>
              <div class="flex gap-1.5"><button class="w-8 h-8 rounded-xl border flex items-center justify-center" @click="openEditModal(menu)"><Edit class="w-4 h-4" /></button><button class="w-8 h-8 rounded-xl border border-rose-100 flex items-center justify-center text-rose-500" :disabled="deletingMenuId===menu.id" @click="handleDeleteMenu(menu.id)"><RefreshCw v-if="deletingMenuId===menu.id" class="w-4 h-4 animate-spin" /><Trash2 v-else class="w-4 h-4" /></button></div>
            </div>
          </div>
        </div>
      </div>

      <!-- KATEGORI TAB - Terpisah -->
      <div v-if="activeTab==='category'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><Tag class="w-4 h-4 text-primary" /> Kategori Makanan & Minuman (Terpisah)</h3><button class="h-8 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1" @click="openCategoryModal()"><Plus class="w-3.5 h-3.5" /> Tambah</button></div>
          <p class="text-[10px] text-slate-500 leading-relaxed bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5">Management kategori <b>terpisah</b> dari menu. Setiap kategori punya <b>icon foto 1:1 400x400</b> (opsional), sort_order, dan is_active. Icon dipakai di filter chips menu & browse user. COS auto-delete saat kategori dihapus.</p>
          <div v-if="categories.length===0" class="py-10 text-center"><div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border flex items-center justify-center mb-3"><Tag class="w-7 h-7 text-indigo-400" /></div><p class="text-xs font-black">Belum Ada Kategori</p><p class="text-[11px] text-slate-500 mt-1">Buat Makanan, Minuman, Snack — dengan icon foto 1:1.</p><button class="mt-3 h-9 px-4 rounded-full bg-slate-900 text-white text-xs font-bold" @click="openCategoryModal()">+ Tambah Kategori</button></div>
          <div v-else class="grid grid-cols-1 gap-2">
            <div v-for="cat in categories" :key="cat.id" class="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-full bg-white border shadow-sm overflow-hidden flex items-center justify-center shrink-0"><img v-if="cat.image_url" :src="cat.image_url" class="w-full h-full object-cover" /><Tag v-else class="w-5 h-5 text-slate-400" /></div>
              <div class="flex-1 min-w-0"><p class="text-[12px] font-black truncate">{{ cat.name }}</p><p class="text-[9px] text-slate-400">Sort {{ cat.sort_order }} • {{ cat.is_active ? 'Aktif' : 'Nonaktif' }} • {{ (filteredMenus as any[]).filter((m:any)=>(m.category_id||m.category?.id)===cat.id).length }} menu</p></div>
              <div class="flex gap-1"><button class="w-8 h-8 rounded-full bg-white border flex items-center justify-center" @click="openCategoryModal(cat)"><Edit class="w-3.5 h-3.5" /></button><button class="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" :disabled="deleteCategoryId===cat.id" @click="handleDeleteCategory(cat.id)"><RefreshCw v-if="deleteCategoryId===cat.id" class="w-3.5 h-3.5 animate-spin" /><Trash2 v-else class="w-3.5 h-3.5" /></button></div>
            </div>
          </div>
        </div>
      </div>

      <!-- TOPPING MASTER TAB - Terpisah sampai opsi foto -->
      <div v-if="activeTab==='topping'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><ChefHat class="w-4 h-4 text-amber-500" /> Topping Master Independent Shared (Terpisah)</h3><button class="h-8 px-3 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center gap-1" @click="openToppingMasterModal()"><Plus class="w-3.5 h-3.5" /> Baru</button></div>
          <p class="text-[10px] text-slate-500 leading-relaxed bg-amber-50/70 border border-amber-100 rounded-xl p-2.5">Topping Master <b>terpisah independent shared</b> — tidak melekat variant. 1 master bisa dipakai banyak menu: <b>Keju (Keju Parut +3k foto, Mozarella +5k foto), Bobba, Eskrim</b>. Setiap opsi punya <b>label, price_delta, image_url foto 400x400</b>. Kelola sekali di sini, pakai cepat via "Pakai ke Menu" saat tambah menu. COS auto-delete.</p>
          <div v-if="toppingMasters.length===0" class="py-10 text-center"><div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-2"><CupSoda class="w-6 h-6 text-amber-400" /></div><p class="text-xs text-slate-500">Belum ada topping master. Buat Keju, Bobba, Eskrim dengan opsi foto 400.</p><button class="mt-3 h-9 px-4 rounded-full bg-primary text-white text-xs font-bold" @click="openToppingMasterModal()">+ Topping Master</button></div>
          <div v-else class="space-y-2.5">
            <div v-for="tm in toppingMasters" :key="tm.id" class="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-white border overflow-hidden flex items-center justify-center shrink-0"><img v-if="tm.image_url" :src="tm.image_url" class="w-full h-full object-cover" /><CupSoda v-else class="w-5 h-5 text-amber-400" /></div>
              <div class="flex-1 min-w-0"><p class="text-xs font-black">{{ tm.name }}</p><p class="text-[10px] text-slate-500">{{ tm.options?.length||0 }} opsi • Shared</p><div class="flex gap-1 mt-1.5 flex-wrap"><span v-for="opt in (tm.options||[]).slice(0,6)" :key="opt.id" class="px-2 py-0.5 rounded-full bg-white border text-[9px] font-bold flex items-center gap-1"><span v-if="opt.image_url||opt.previewUrl" class="w-3 h-3 rounded-full overflow-hidden inline-flex"><img :src="opt.image_url||opt.previewUrl" class="w-full h-full object-cover" /></span>{{ opt.label }} +Rp{{ Number(opt.price_delta).toLocaleString('id-ID') }}</span><span v-if="(tm.options||[]).length>6" class="px-2 py-0.5 rounded-full bg-amber-100 text-[9px] font-bold">+{{ (tm.options||[]).length-6 }} lagi</span></div></div>
              <div class="flex flex-col gap-1 shrink-0"><div class="flex gap-1"><button class="w-7 h-7 rounded-full bg-white border flex items-center justify-center" @click="openToppingMasterModal(tm)"><Edit class="w-3 h-3" /></button><button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteToppingMaster(tm.id)"><Trash2 class="w-3 h-3" /></button></div><button class="h-6 px-2 rounded-full bg-slate-900 text-white text-[8px] font-black" @click="duplicateFromMaster(tm)">Pakai</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <UiModal v-model:open="showAddModal" title="Tambah Menu V2 — Kategori, Varian ±Foto, Topping">
      <div class="space-y-5 p-1 max-h-[75vh] overflow-y-auto">
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5 col-span-2"><label class="text-[10px] font-bold uppercase">Nama</label><input v-model="menuForm.name" type="text" placeholder="Es Teler Krimmi" class="h-11 w-full rounded-2xl border px-4 text-xs font-semibold"></div>
          <div class="space-y-1.5 col-span-2"><label class="text-[10px] font-bold uppercase">Deskripsi</label><textarea v-model="menuForm.description" placeholder="Deskripsi..." class="w-full rounded-2xl border px-4 py-3 text-xs font-semibold min-h-[60px]" /></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Harga Dasar</label><input v-model="menuForm.price" type="number" class="h-11 w-full rounded-2xl border px-4 text-xs font-semibold"></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Kategori</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-2xl border px-3 text-xs"><option :value="null">Tanpa kategori</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
        </div>
        <div class="space-y-2">
          <label class="text-[10px] font-bold uppercase flex items-center gap-2">Gambar Produk <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Wajib Crop 1:1 • 1200</span></label>
          <div class="flex items-center gap-3">
            <div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><Camera v-else class="w-6 h-6 text-amber-400" /></div>
            <div class="flex-1 space-y-1"><button type="button" class="h-11 px-4 rounded-2xl border bg-slate-50 text-xs font-bold w-full sm:w-auto" @click="()=>addFileInputRef?.click()">{{ previewUrl ? 'Ganti & Crop' : 'Pilih → Crop 1:1' }}</button><input ref="addFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" /><p v-if="croppedBlob" class="text-[10px] text-emerald-600 font-bold">✓ Sudah crop 1200 siap</p></div>
          </div>
        </div>
        <div v-if="toppingMasters.length>0" class="space-y-2 border rounded-2xl p-3 bg-amber-50/40 border-amber-100">
          <p class="text-[10px] font-black uppercase flex items-center gap-1"><ChefHat class="w-3 h-3" /> Ambil cepat dari Topping Master Shared</p>
          <div class="flex gap-1.5 overflow-x-auto pb-1"><button v-for="tm in toppingMasters" :key="tm.id" class="shrink-0 h-7 px-3 rounded-full bg-white border text-[10px] font-bold hover:bg-slate-900 hover:text-white flex items-center gap-1" @click="duplicateFromMaster(tm)"><Plus class="w-3 h-3" />{{ tm.name }}</button></div>
        </div>
        <div class="space-y-3 border-t pt-4">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase flex items-center gap-1"><Layers class="w-3.5 h-3.5" /> Varian ± Harga dengan Foto</p><button class="h-7 px-2.5 rounded-xl bg-primary text-white text-[10px] font-bold flex items-center gap-1" @click="addVariantGroup"><PlusCircle class="w-3 h-3" /> Tambah Varian</button></div>
          <div v-if="variantGroups.length===0" class="py-3 px-3 rounded-2xl bg-slate-50 border border-dashed text-[10px] text-slate-500 text-center">Belum ada varian. Contoh: Ukuran Regular/Besar +5k dengan foto.</div>
          <div v-for="(vg,gIdx) in variantGroups" :key="gIdx" class="bg-slate-50 border rounded-2xl p-3 space-y-3">
            <div class="flex gap-2"><input v-model="vg.name" placeholder="Ukuran" class="flex-1 h-9 rounded-xl border px-3 text-xs font-bold"><select v-model="vg.type" class="h-9 rounded-xl border px-2 text-[10px]"><option value="single">Single</option><option value="multiple">Multiple</option></select><button class="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeVariantGroup(gIdx)"><Trash2 class="w-4 h-4" /></button></div>
            <div class="flex gap-2 text-[10px] flex-wrap"><label class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1"><input type="checkbox" v-model="vg.is_required" class="w-3.5 h-3.5"> Wajib</label><span class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1">Min <input v-model.number="vg.min_select" type="number" class="w-8 h-5 rounded border px-1 text-[10px]"></span><span class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1">Max <input v-model.number="vg.max_select" type="number" class="w-8 h-5 rounded border px-1 text-[10px]"></span></div>
            <div class="space-y-2">
              <div v-for="(opt,oIdx) in vg.options" :key="oIdx" class="bg-white border rounded-2xl p-3 space-y-2">
                <div class="flex gap-2">
                  <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-4 h-4 text-slate-300" /></div>
                  <div class="flex-1 space-y-1.5"><input v-model="opt.label" placeholder="Besar" class="w-full h-8 rounded-xl border px-3 text-xs font-bold"><div class="flex gap-2"><input v-model.number="opt.price_delta" type="number" placeholder="+3000/-2000" class="flex-1 h-8 rounded-xl border px-2 text-[11px] font-bold"><button class="h-8 px-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'variant',{g:gIdx,o:oIdx}); input.click() })()">Foto 600</button></div></div>
                  <button class="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeVariantOption(gIdx,oIdx)"><Trash2 class="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            <button class="w-full h-8 rounded-xl bg-slate-900 text-white text-[11px] font-bold" @click="addVariantOption(gIdx)">+ Tambah Opsi Varian</button>
          </div>
        </div>
        <div class="space-y-3 border-t pt-4">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase">Topping dengan Foto</p><button class="h-7 px-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-bold" @click="addToppingGroup">+ Group</button></div>
          <div v-if="toppingGroups.length===0" class="py-3 px-3 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-[10px] text-slate-600 text-center">Belum ada topping. Gunakan cepat dari master di atas atau buat baru dengan foto.</div>
          <div v-for="(tg,gIdx) in toppingGroups" :key="gIdx" class="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 space-y-2">
            <div class="flex gap-2"><input v-model="tg.name" placeholder="Topping Extra" class="flex-1 h-8 rounded-xl border px-2 text-xs font-bold"><button class="w-8 h-8 rounded-xl bg-rose-50 border text-rose-500 flex items-center justify-center" @click="removeToppingGroup(gIdx)"><Trash2 class="w-3.5 h-3.5" /></button></div>
            <div v-for="(opt,oIdx) in tg.options" :key="oIdx" class="bg-white border rounded-xl p-2 flex gap-2 items-center">
              <div class="w-8 h-8 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-3 h-3 text-slate-300" /></div>
              <input v-model="opt.label" placeholder="Keju" class="flex-1 h-7 rounded-lg border px-2 text-[11px] font-bold"><input v-model.number="opt.price_delta" type="number" placeholder="+3000" class="w-16 h-7 rounded-lg border px-1 text-[10px] font-bold"><button class="h-7 px-2 rounded-lg bg-amber-50 border text-[9px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'topping',undefined,{g:gIdx,o:oIdx}); input.click() })()">Foto</button><button class="w-6 h-6 rounded-full bg-rose-50 border text-rose-500 flex items-center justify-center" @click="removeToppingOption(gIdx,oIdx)"><Trash2 class="w-3 h-3" /></button>
            </div>
            <button class="h-7 px-2 rounded-xl bg-slate-900 text-white text-[10px] font-bold" @click="addToppingOption(gIdx)">+ Opsi Topping</button>
          </div>
        </div>
        <div class="flex gap-3 pt-3"><button class="flex-1 h-11 rounded-2xl border text-xs font-bold" @click="showAddModal=false">Batal</button><button class="flex-1 h-11 rounded-2xl bg-primary text-white text-xs font-bold" :disabled="actionLoading" @click="handleAddMenu">{{ actionLoading ? 'Menyimpan...' : 'Tambahkan Menu' }}</button></div>
      </div>
    </UiModal>

    <UiModal v-model:open="showEditModal" title="Edit Menu">
      <div class="space-y-4 p-1 max-h-[70vh] overflow-y-auto">
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Nama</label><input v-model="menuForm.name" type="text" class="h-11 w-full rounded-2xl border px-4 text-xs font-semibold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Harga</label><input v-model="menuForm.price" type="number" class="h-11 w-full rounded-2xl border px-4 text-xs font-semibold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Kategori (terpisah)</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-2xl border px-3 text-xs"><option :value="null">Tanpa kategori</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
        <div class="space-y-2"><label class="text-[10px] font-bold uppercase">Gambar <span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Wajib Crop 1:1</span></label><div class="flex gap-3 items-center"><div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><img v-else-if="menuForm.image_url" :src="menuForm.image_url" class="w-full h-full object-cover opacity-60" /><Camera v-else class="w-6 h-6 text-amber-400" /></div><button type="button" class="h-11 px-4 rounded-2xl border bg-slate-50 text-xs font-bold" @click="()=>editFileInputRef?.click()">{{ previewUrl ? 'Ganti & Crop' : 'Pilih & Crop' }}</button><input ref="editFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" /></div></div>
        <div class="flex gap-3 pt-3"><button class="flex-1 h-11 rounded-2xl border text-xs font-bold" @click="showEditModal=false">Batal</button><button class="flex-1 h-11 rounded-2xl bg-primary text-white text-xs font-bold" :disabled="actionLoading" @click="handleEditMenu">{{ actionLoading ? 'Menyimpan...' : 'Simpan' }}</button></div>
      </div>
    </UiModal>

    <UiModal v-model:open="showCategoryModal" title="Kategori — Management Terpisah (Icon Foto)">
      <div class="space-y-4 p-1">
        <div class="bg-indigo-50 border border-indigo-100 rounded-2xl p-2.5 text-[10px] text-indigo-700 leading-relaxed">Kategori dikelola <b>terpisah</b>. Icon foto 1:1 400 opsional, ditampilkan di chips filter & browse user. COS auto-delete.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Nama Kategori (Makanan, Minuman...)</label><input v-model="categoryForm.name" placeholder="Makanan" class="h-11 w-full rounded-2xl border px-4 text-xs font-bold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase flex items-center gap-2">Icon Kategori Foto <span class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] border">1:1 • 400 • COS delete</span></label>
          <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full border-2 border-dashed border-indigo-200 bg-indigo-50/50 overflow-hidden flex items-center justify-center"><img v-if="categoryPreviewUrl" :src="categoryPreviewUrl" class="w-full h-full object-cover" /><Tag v-else class="w-5 h-5 text-indigo-300" /></div><button type="button" class="h-9 px-3 rounded-xl bg-slate-900 text-white text-[10px] font-bold" @click="()=>catFileInputRef?.click()">{{ categoryPreviewUrl ? 'Ganti Icon & Crop' : 'Upload & Crop 1:1' }}</button><input ref="catFileInputRef" type="file" accept="image/*" class="hidden" @change="(e)=>handleFileChange(e,'category')" /></div>
        </div>
        <div class="flex gap-3 pt-3"><button class="flex-1 h-11 rounded-2xl border text-xs font-bold" @click="showCategoryModal=false">Batal</button><button class="flex-1 h-11 rounded-2xl bg-slate-900 text-white text-xs font-bold" :disabled="saveCategoryLoading" @click="handleSaveCategory">{{ saveCategoryLoading ? 'Menyimpan...' : 'Simpan Kategori' }}</button></div>
      </div>
    </UiModal>

    <UiModal v-model:open="showToppingMasterModal" title="Topping Master Shared — Sampai Opsi Foto">
      <div class="space-y-4 p-1 max-h-[70vh] overflow-y-auto">
        <div class="bg-amber-50 border border-amber-100 rounded-2xl p-2.5 text-[10px] text-amber-800 leading-relaxed"><b>Terpisah sampai topping</b>: Master ini shared, bisa dipakai banyak menu. Setiap master punya banyak opsi, setiap opsi punya <b>label + price_delta + image_url foto 400</b> dengan crop & COS auto-delete.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase">Nama Topping Master (Keju, Bobba, Eskrim shared)</label><input v-model="toppingMasterForm.name" placeholder="Keju / Bobba / Eskrim" class="h-11 w-full rounded-2xl border px-4 text-xs font-bold"></div>
        <div class="space-y-2">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase">Opsi Topping dengan Foto 400x400</p><button class="h-7 px-2.5 rounded-xl bg-primary text-white text-[10px] font-bold" @click="toppingMasterOptions.push({ label:'', price_delta:3000, image_url:'', previewUrl:'' })">+ Opsi</button></div>
          <div v-for="(opt,idx) in toppingMasterOptions" :key="idx" class="bg-white border rounded-2xl p-3 space-y-2">
            <div class="flex gap-2">
              <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 overflow-hidden flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-5 h-5 text-amber-300" /></div>
              <div class="flex-1 space-y-1.5"><input v-model="opt.label" placeholder="Keju Mozarella / Bobba" class="w-full h-8 rounded-xl border px-3 text-xs font-bold"><div class="flex gap-2"><input v-model.number="opt.price_delta" type="number" placeholder="3000" class="flex-1 h-8 rounded-xl border px-2 text-[11px] font-bold"><button class="h-8 px-3 rounded-xl bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'toppingMasterOption',undefined,undefined,idx); input.click() })()">Foto 400</button></div></div>
              <button class="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="toppingMasterOptions.splice(idx,1)"><Trash2 class="w-4 h-4" /></button>
            </div>
          </div>
        </div>
        <div class="flex gap-3 pt-3"><button class="flex-1 h-11 rounded-2xl border text-xs font-bold" @click="showToppingMasterModal=false">Batal</button><button class="flex-1 h-11 rounded-2xl bg-primary text-white text-xs font-bold" :disabled="toppingMasterSaving" @click="handleSaveToppingMaster">{{ toppingMasterSaving ? 'Menyimpan...' : 'Simpan Topping Master' }}</button></div>
      </div>
    </UiModal>

    <CommonImageCropper v-if="cropperOpen" :src="cropperSrc" :type="cropperTarget==='category' ? 'logo' : cropperTarget==='toppingMasterOption' ? 'logo' : cropperTarget==='topping' ? 'logo' : 'product'" @cropped="onCropped" @cancel="onCropCancel" />
  </div>
</template>
