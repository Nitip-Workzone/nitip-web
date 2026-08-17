<script setup lang="ts">
// V2 FINAL FIXED LAYOUT - Tidak terpotong, responsive, 3 Tabs: Menu | Kategori | Tambahan
import { Plus, Edit, Trash2, RefreshCw, Utensils, ArrowLeft, Camera, Tag, Layers, PlusCircle, Sparkles, CupSoda } from '@lucide/vue'
import { useMerchantsStore } from '~/stores/merchants'
import { useToast } from '~/composables/useToast'

definePageMeta({ layout: 'user', ssr: false })
const merchantsStore = useMerchantsStore()
const { success, error } = useToast()

const checkLoading = ref(true)
const actionLoading = ref(false)
const showAddModal = ref(false)
const showEditModal = ref(false)
const activeTab = ref<'menu'|'category'|'addon'>('menu')

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
interface AddonOptionForm { id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null; is_available: boolean; sort_order: number }
interface AddonGroupForm { id?: string; name: string; type: 'single'|'multiple'; is_required: boolean; min_select: number; max_select: number|null; sort_order: number; variant_option_id?: string|null; options: AddonOptionForm[] }

const variantGroups = ref<VariantGroupForm[]>([])
const addonGroups = ref<AddonGroupForm[]>([])

const addonMasters = ref<Array<{ id: string; name: string; image_url?: string; options: Array<{ id: string; label: string; price_delta: number; image_url?: string; previewUrl?: string }> }>>([])
const showAddonMasterModal = ref(false)
const addonMasterForm = ref({ name: '', image_url: '' })
const addonMasterOptions = ref<Array<{ id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null }>>([])
const addonMasterSaving = ref(false)

const cropperOpen = ref(false)
const cropperSrc = ref('')
const croppedBlob = ref<Blob|null>(null)
const cropperTarget = ref<'menu'|'category'|'variant'|'addon'|'addonMasterOption'>('menu')
const cropperVariantIdx = ref<{ g:number; o:number }|null>(null)
const cropperAddonIdx = ref<{ g:number; o:number }|null>(null)
const cropperAddonMasterIdx = ref<number|null>(null)
const addFileInputRef = ref<HTMLInputElement|null>(null)
const editFileInputRef = ref<HTMLInputElement|null>(null)

const fetchProfile = async () => {
  try {
    const profile = await merchantsStore.fetchMerchantProfile()
    if (profile) {
      await merchantsStore.fetchMerchantMenu()
      categories.value = await merchantsStore.fetchCategories() as any
      try {
        const { request } = useApi()
        let data: any[] | null = null
        try { const res = await request<{ data: any[] }>('/merchant/addons'); data = res.data } catch { try { const res2 = await request<{ data: any[] }>('/merchant/toppings'); data = res2.data } catch {} }
        if (data && Array.isArray(data)) addonMasters.value = data
        else if (addonMasters.value.length===0) {
          const aggregated: Map<string, any> = new Map()
          for (const m of (merchantsStore.merchantMenus as any[])) { try { const tgs = await merchantsStore.fetchToppingGroups(m.id) as any[]; for (const tg of tgs) { if (!aggregated.has(tg.name)) aggregated.set(tg.name, { id: tg.id, name: tg.name, options: tg.options||[] }) } } catch {} }
          if (aggregated.size>0) addonMasters.value = Array.from(aggregated.values())
        }
      } catch (e) { console.warn(e) }
    } else { await navigateTo('/merchant/menu'); return }
  } catch (e) { console.warn(e) } finally { checkLoading.value=false }
}
const filteredMenus = computed(() => {
  if (!activeCategoryId.value) return merchantsStore.merchantMenus as any[]
  return (merchantsStore.merchantMenus as any[]).filter((m:any)=> (m.category_id||m.category?.id)===activeCategoryId.value)
})
const handleFileChange = async (event: Event, target: 'menu'|'category'|'variant'|'addon'|'addonMasterOption'='menu', vIdx?: {g:number;o:number}, tIdx?: {g:number;o:number}, tmIdx?: number) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { error('Harus gambar'); input.value=''; return }
  if (file.size>10*1024*1024) { error('Maks 10MB'); input.value=''; return }
  cropperTarget.value=target
  if (vIdx) cropperVariantIdx.value=vIdx
  if (tIdx) cropperAddonIdx.value=tIdx
  if (tmIdx!==undefined) cropperAddonMasterIdx.value=tmIdx
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
    if (vg?.options[o]) { vg.options[o].file=payload.file; if (vg.options[o].previewUrl) URL.revokeObjectURL(vg.options[o].previewUrl!); vg.options[o].previewUrl=payload.url; if (uploadedUrl) vg.options[o].image_url=uploadedUrl }
  } else if (cropperTarget.value==='addon' && cropperAddonIdx.value) {
    const {g,o}=cropperAddonIdx.value
    const tg=addonGroups.value[g]
    if (tg?.options[o]) { tg.options[o].file=payload.file; if (tg.options[o].previewUrl) URL.revokeObjectURL(tg.options[o].previewUrl!); tg.options[o].previewUrl=payload.url; if (uploadedUrl) tg.options[o].image_url=uploadedUrl }
  } else if (cropperTarget.value==='addonMasterOption' && cropperAddonMasterIdx.value!==null) {
    const idx=cropperAddonMasterIdx.value
    const opt=addonMasterOptions.value[idx]
    if (opt) { opt.file=payload.file; if (opt.previewUrl) URL.revokeObjectURL(opt.previewUrl!); opt.previewUrl=payload.url; if (uploadedUrl) opt.image_url=uploadedUrl }
  }
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' }
  cropperOpen.value=false
  cropperVariantIdx.value=null
  cropperAddonIdx.value=null
  cropperAddonMasterIdx.value=null
}
const onCropCancel = () => { if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' } cropperOpen.value=false }

const openAddModal = () => { menuForm.value={ name:'', description:'', price:0, image_url:'', category_id: activeCategoryId.value, is_available:true }; selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null; variantGroups.value=[]; addonGroups.value=[]; showAddModal.value=true }
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
    if (menuId && menuForm.value.category_id) { const { request } = useApi(); try { await request(`/merchant/menu/${menuId}`, { method:'PUT', body:{ name:menuForm.value.name, description:menuForm.value.description, price:Number(menuForm.value.price), image_url:finalImageUrl, is_available:menuForm.value.is_available, category_id:menuForm.value.category_id } }) } catch {} }
    if (menuId) {
      for (const vg of variantGroups.value) { const g = await merchantsStore.createVariantGroup(menuId, { name:vg.name, type:vg.type, is_required:vg.is_required, min_select:vg.min_select, max_select:vg.max_select, sort_order:vg.sort_order }) as any; const gid=g?.id; if (!gid) continue; for (const opt of vg.options) { let imgUrl=opt.image_url; if (opt.file && !imgUrl) { try { imgUrl=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} } await merchantsStore.createVariantOption(gid, { label:opt.label, price_delta:opt.price_delta, image_url:imgUrl, is_default:opt.is_default, is_available:opt.is_available, sort_order:opt.sort_order }) } }
      for (const tg of addonGroups.value) { const g = await merchantsStore.createToppingGroup(menuId, { name:tg.name, type:tg.type, variant_option_id:tg.variant_option_id||null, is_required:tg.is_required, min_select:tg.min_select, max_select:tg.max_select, sort_order:tg.sort_order }) as any; const gid=g?.id; if (!gid) continue; for (const opt of tg.options) { let imgUrl=opt.image_url; if (opt.file && !imgUrl) { try { imgUrl=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} } await (merchantsStore as any).createToppingOption(gid, { label:opt.label, price_delta:opt.price_delta, image_url:imgUrl, is_available:opt.is_available, sort_order:opt.sort_order }) } }
    }
    success('Menu ditambahkan — kategori, varian, tambahan foto. COS auto-delete.')
    showAddModal.value=false
    if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' }
    await merchantsStore.fetchMerchantMenu()
  } catch { error('Gagal tambah menu') } finally { actionLoading.value=false }
}
const openEditModal = (menu:any) => {
  editMenuId.value=menu.id
  menuForm.value={ name:menu.name, description:menu.description||'', price:menu.price, image_url:menu.image_url||'', category_id:menu.category_id||menu.category?.id||null, is_available:menu.is_available }
  selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null; variantGroups.value=[]; addonGroups.value=[]; showEditModal.value=true
  setTimeout(async()=>{ try { const vgs=await merchantsStore.fetchVariantGroups(menu.id) as any[]; variantGroups.value=vgs.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_default:o.is_default, is_available:o.is_available, sort_order:o.sort_order })) })); const tgs=await merchantsStore.fetchToppingGroups(menu.id) as any[]; addonGroups.value=tgs.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, variant_option_id:g.variant_option_id||null, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_available:o.is_available, sort_order:o.sort_order })) })) } catch {} },200)
}
const handleEditMenu = async () => {
  if (!menuForm.value.name) { error('Nama wajib'); return }
  if (menuForm.value.price<=0) { error('Harga >0'); return }
  actionLoading.value=true
  let finalImageUrl=menuForm.value.image_url
  if (selectedFile.value && !finalImageUrl) { try { finalImageUrl=await merchantsStore.uploadMenuImage(selectedFile.value) } catch { error('Gagal upload'); actionLoading.value=false; return } }
  try { const { request } = useApi(); await request(`/merchant/menu/${editMenuId.value}`, { method:'PUT', body:{ name:menuForm.value.name, description:menuForm.value.description, price:Number(menuForm.value.price), image_url:finalImageUrl, is_available:menuForm.value.is_available, category_id:menuForm.value.category_id } }); success('Menu diperbarui — COS auto-delete lama.'); showEditModal.value=false; if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' } await merchantsStore.fetchMerchantMenu() } catch { error('Gagal update') } finally { actionLoading.value=false }
}
const handleDeleteMenu = async (id:string) => { if (!confirm('Yakin hapus menu? Gambar COS auto-delete.')) return; deletingMenuId.value=id; try { await merchantsStore.deleteMenuItem(id); success('Menu & COS terhapus.') } catch { error('Gagal hapus') } finally { deletingMenuId.value='' } }
const toggleMenuAvailable = async (menu:any) => { togglingMenuId.value=menu.id; try { await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available); success(menu.is_available ? 'Dinonaktifkan' : 'Diaktifkan') } catch { error('Gagal toggle') } finally { togglingMenuId.value='' } }

const openCategoryModal = (cat?:any) => { if (cat) { categoryForm.value={ name:cat.name, image_url:cat.image_url||'', sort_order:cat.sort_order||0, is_active:cat.is_active }; categoryPreviewUrl.value=cat.image_url||''; (categoryForm as any).id=cat.id } else { categoryForm.value={ name:'', image_url:'', sort_order:categories.value.length, is_active:true }; categoryPreviewUrl.value=''; delete (categoryForm as any).id } categoryFile.value=null; showCategoryModal.value=true }
const handleSaveCategory = async () => { if (!categoryForm.value.name) { error('Nama wajib'); return } saveCategoryLoading.value=true; try { const id=(categoryForm as any).id; let finalUrl=categoryForm.value.image_url; if (categoryFile.value && !finalUrl) { try { finalUrl=await merchantsStore.uploadMenuImage(categoryFile.value) } catch { error('Gagal upload'); saveCategoryLoading.value=false; return } } if (id) await merchantsStore.updateCategory(id, { name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order, is_active:categoryForm.value.is_active }); else await merchantsStore.createCategory({ name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order }); success('Kategori disimpan'); showCategoryModal.value=false; categories.value=await merchantsStore.fetchCategories() as any } catch { error('Gagal kategori') } finally { saveCategoryLoading.value=false } }
const handleDeleteCategory = async (id:string) => { if (!confirm('Hapus kategori? Icon COS auto-delete.')) return; deleteCategoryId.value=id; try { await merchantsStore.deleteCategory(id); success('Kategori dihapus'); categories.value=await merchantsStore.fetchCategories() as any } catch { error('Gagal hapus') } finally { deleteCategoryId.value=null } }

const addVariantGroup = () => { variantGroups.value.push({ name:'Ukuran', type:'single', is_required:true, min_select:1, max_select:1, sort_order:variantGroups.value.length, options:[{ label:'Regular', price_delta:0, image_url:'', is_default:true, is_available:true, sort_order:0 }] }) }
const addVariantOption = (gIdx:number) => { variantGroups.value[gIdx].options.push({ label:'', price_delta:0, image_url:'', is_default:false, is_available:true, sort_order:variantGroups.value[gIdx].options.length }) }
const removeVariantGroup = (idx:number) => { variantGroups.value.splice(idx,1) }
const removeVariantOption = (gIdx:number,oIdx:number) => { variantGroups.value[gIdx].options.splice(oIdx,1) }
const addAddonGroup = () => { addonGroups.value.push({ name:'Tambahan', type:'multiple', is_required:false, min_select:0, max_select:null, sort_order:addonGroups.value.length, options:[{ label:'Keju', price_delta:3000, image_url:'', is_available:true, sort_order:0 }] }) }
const addAddonOption = (gIdx:number) => { addonGroups.value[gIdx].options.push({ label:'', price_delta:0, image_url:'', is_available:true, sort_order:addonGroups.value[gIdx].options.length }) }
const removeAddonGroup = (idx:number) => { addonGroups.value.splice(idx,1) }
const removeAddonOption = (gIdx:number,oIdx:number) => { addonGroups.value[gIdx].options.splice(oIdx,1) }

const openAddonMasterModal = (master?:any) => { if (master) { addonMasterForm.value={ name:master.name, image_url:master.image_url||'' }; addonMasterOptions.value=(master.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url })); (addonMasterForm as any).id=master.id } else { addonMasterForm.value={ name:'', image_url:'' }; addonMasterOptions.value=[{ label:'Keju Parut', price_delta:3000, image_url:'', previewUrl:'' }] } showAddonMasterModal.value=true }
const handleSaveAddonMaster = async () => {
  if (!addonMasterForm.value.name) { error('Nama tambahan wajib'); return }
  addonMasterSaving.value=true
  try {
    for (const opt of addonMasterOptions.value) { if (opt.file && !opt.image_url) { try { opt.image_url=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} } }
    const id=(addonMasterForm as any).id
    const { request } = useApi()
    try {
      const payload={ name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, sort_order:0, options: addonMasterOptions.value.map(o=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url })) }
      if (id) await request(`/merchant/addons/${id}`, { method:'PUT', body:payload }); else await request('/merchant/addons', { method:'POST', body:payload })
      const res=await request<{ data:any[] }>('/merchant/addons'); if (res.data) addonMasters.value=res.data
    } catch { try { const payload={ name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map(o=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url })) }; if (id) await request(`/merchant/toppings/${id}`, { method:'PUT', body:payload }); else await request('/merchant/toppings', { method:'POST', body:payload }); const res=await request<{ data:any[] }>('/merchant/toppings'); if (res.data) addonMasters.value=res.data } catch { if (id) { const idx=addonMasters.value.findIndex(t=>t.id===id); if (idx>=0) addonMasters.value[idx]={ id, name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map((o,i)=>({ id:o.id||`opt-${i}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) } } else { addonMasters.value.push({ id:`local-${Date.now()}`, name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map((o,i)=>({ id:`opt-${i}-${Date.now()}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) }) } } }
    success('Tambahan disimpan — shared banyak menu')
    showAddonMasterModal.value=false
  } catch { error('Gagal simpan') } finally { addonMasterSaving.value=false }
}
const handleDeleteAddonMaster = async (id:string) => { if (!confirm('Hapus tambahan? COS auto-delete.')) return; try { const { request } = useApi(); try { await request(`/merchant/addons/${id}`, { method:'DELETE' }) } catch { try { await request(`/merchant/toppings/${id}`, { method:'DELETE' }) } catch {} } addonMasters.value=addonMasters.value.filter(t=>t.id!==id); success('Tambahan dihapus') } catch { error('Gagal hapus') } }
const duplicateFromMaster = (master:any) => { addonGroups.value.push({ name: master.name, type:'multiple', is_required:false, min_select:0, max_select:null, sort_order:addonGroups.value.length, variant_option_id:null, options: (master.options||[]).map((o:any,i:number)=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'', is_available:true, sort_order:i })) }); success(`"${master.name}" dipakai`) }

onMounted(()=>{ fetchProfile() })
</script>

<template>
  <div class="px-4 pb-24 space-y-4">
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw class="w-9 h-9 animate-spin text-primary mb-3" />
      <p class="text-sm font-semibold text-muted-foreground">Memuat katalog...</p>
    </div>
    <div v-else class="space-y-4">
      <div class="flex items-center gap-2.5 pt-1">
        <NuxtLink to="/merchant/menu" class="w-9 h-9 shrink-0 bg-white border border-slate-200 rounded-xl flex items-center justify-center"><ArrowLeft class="w-4 h-4" /></NuxtLink>
        <div class="flex-1 min-w-0"><h2 class="text-[15px] font-black leading-tight">Katalog Menu</h2><p class="text-[10px] text-slate-400 truncate">Menu · Kategori · Tambahan shared foto</p></div>
        <button class="shrink-0 h-9 px-3.5 rounded-xl text-xs font-black bg-primary text-white flex items-center gap-1" @click="openAddModal"><Plus class="w-4 h-4" /> Menu</button>
      </div>

      <div class="flex gap-2 bg-slate-100 p-1 rounded-2xl">
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='menu' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='menu'"><Utensils class="w-3.5 h-3.5" /> Menu</button>
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='category' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='category'"><Tag class="w-3.5 h-3.5" /> Kategori</button>
        <button class="flex-1 h-9 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5" :class="activeTab==='addon' ? 'bg-white text-slate-900 shadow-sm border' : 'text-slate-500'" @click="activeTab='addon'"><Sparkles class="w-3.5 h-3.5" /> Tambahan</button>
      </div>

      <!-- MENU TAB -->
      <div v-if="activeTab==='menu'" class="space-y-3">
        <div class="flex gap-2 overflow-x-auto pb-1">
          <button class="shrink-0 h-8 px-4 rounded-full text-[11px] font-black border" :class="!activeCategoryId ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'" @click="activeCategoryId=null">Semua</button>
          <button v-for="cat in categories" :key="cat.id" class="shrink-0 h-8 pl-2 pr-3 rounded-full text-[11px] font-bold border flex items-center gap-1.5" :class="activeCategoryId===cat.id ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200'" @click="activeCategoryId=cat.id">
            <div class="w-5 h-5 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center shrink-0"><img v-if="cat.image_url" :src="cat.image_url" class="w-full h-full object-cover" /><Tag v-else class="w-3 h-3 text-slate-400" /></div>{{ cat.name }}
          </button>
        </div>
        <div v-if="filteredMenus.length===0" class="py-10 px-6 text-center bg-white border rounded-[24px]"><div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border flex items-center justify-center mb-3"><Utensils class="w-7 h-7 text-slate-400" /></div><p class="text-[13px] font-black">Belum Ada Menu</p><p class="text-[11px] text-slate-500 mt-1 max-w-[260px] mx-auto">Kategori & tambahan dipisah. Tambah menu foto 1:1, varian foto, tambahan foto.</p><button class="mt-4 h-10 px-5 rounded-full text-xs font-black bg-primary text-white" @click="openAddModal">+ Tambah Menu</button></div>
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

      <!-- KATEGORI TAB -->
      <div v-if="activeTab==='category'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><Tag class="w-4 h-4 text-primary" /> Kategori</h3><button class="h-8 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1" @click="openCategoryModal()"><Plus class="w-3.5 h-3.5" /> Tambah</button></div>
          <p class="text-[10px] text-slate-500 leading-relaxed bg-indigo-50/50 border border-indigo-100 rounded-xl p-2.5">Kelola terpisah: icon 1:1 400, dipakai di filter chips.</p>
          <div v-if="categories.length===0" class="py-10 text-center"><div class="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 border flex items-center justify-center mb-3"><Tag class="w-7 h-7 text-indigo-400" /></div><p class="text-xs font-black">Belum Ada Kategori</p><button class="mt-3 h-9 px-4 rounded-full bg-slate-900 text-white text-xs font-bold" @click="openCategoryModal()">+ Tambah</button></div>
          <div v-else class="grid grid-cols-1 gap-2">
            <div v-for="cat in categories" :key="cat.id" class="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-full bg-white border shadow-sm overflow-hidden flex items-center justify-center shrink-0"><img v-if="cat.image_url" :src="cat.image_url" class="w-full h-full object-cover" /><Tag v-else class="w-5 h-5 text-slate-400" /></div>
              <div class="flex-1 min-w-0"><p class="text-[12px] font-black truncate">{{ cat.name }}</p><p class="text-[9px] text-slate-400">Sort {{ cat.sort_order }} • {{ cat.is_active ? 'Aktif' : 'Nonaktif' }}</p></div>
              <div class="flex gap-1"><button class="w-8 h-8 rounded-full bg-white border flex items-center justify-center" @click="openCategoryModal(cat)"><Edit class="w-3.5 h-3.5" /></button><button class="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" :disabled="deleteCategoryId===cat.id" @click="handleDeleteCategory(cat.id)"><RefreshCw v-if="deleteCategoryId===cat.id" class="w-3.5 h-3.5 animate-spin" /><Trash2 v-else class="w-3.5 h-3.5" /></button></div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAMBAHAN TAB -->
      <div v-if="activeTab==='addon'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><Sparkles class="w-4 h-4 text-amber-500" /> Tambahan Master</h3><button class="h-8 px-3 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center gap-1" @click="openAddonMasterModal()"><Plus class="w-3.5 h-3.5" /> Baru</button></div>
          <p class="text-[10px] text-slate-500 leading-relaxed bg-amber-50/70 border border-amber-100 rounded-xl p-2.5">Istilah Indonesia: Keju, Bobba, Eskrim, Sambal, Kerupuk. Shared banyak menu, opsi foto 400.</p>
          <div v-if="addonMasters.length===0" class="py-10 text-center"><div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border flex items-center justify-center mb-2"><CupSoda class="w-6 h-6 text-amber-400" /></div><p class="text-xs text-slate-500">Belum ada tambahan.</p><button class="mt-3 h-9 px-4 rounded-full bg-primary text-white text-xs font-bold" @click="openAddonMasterModal()">+ Tambah</button></div>
          <div v-else class="space-y-2.5">
            <div v-for="tm in addonMasters" :key="tm.id" class="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-white border overflow-hidden flex items-center justify-center shrink-0"><img v-if="tm.image_url" :src="tm.image_url" class="w-full h-full object-cover" /><CupSoda v-else class="w-5 h-5 text-amber-400" /></div>
              <div class="flex-1 min-w-0"><p class="text-xs font-black">{{ tm.name }}</p><p class="text-[10px] text-slate-500">{{ tm.options?.length||0 }} opsi • Shared</p><div class="flex gap-1 mt-1.5 flex-wrap"><span v-for="opt in (tm.options||[]).slice(0,6)" :key="opt.id" class="px-2 py-0.5 rounded-full bg-white border text-[9px] font-bold flex items-center gap-1"><span v-if="opt.image_url||opt.previewUrl" class="w-3 h-3 rounded-full overflow-hidden inline-flex"><img :src="opt.image_url||opt.previewUrl" class="w-full h-full object-cover" /></span>{{ opt.label }} +Rp{{ Number(opt.price_delta).toLocaleString('id-ID') }}</span></div></div>
              <div class="flex flex-col gap-1 shrink-0"><div class="flex gap-1"><button class="w-7 h-7 rounded-full bg-white border flex items-center justify-center" @click="openAddonMasterModal(tm)"><Edit class="w-3 h-3" /></button><button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteAddonMaster(tm.id)"><Trash2 class="w-3 h-3" /></button></div><button class="h-6 px-2 rounded-full bg-slate-900 text-white text-[8px] font-black" @click="duplicateFromMaster(tm)">Pakai</button></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL TAMBAH MENU - FIX LAYOUT TIDAK TERPOTONG -->
    <UiModal v-model:open="showAddModal" title="Tambah Menu" max-width="max-w-lg">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1 -mr-1">
        <!-- Basic -->
        <div class="space-y-3">
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase tracking-wide text-slate-600">Nama Menu *</label><input v-model="menuForm.name" type="text" placeholder="Ayam Geprek, Es Teler..." class="h-11 w-full rounded-xl border border-slate-200 px-4 text-[13px] font-semibold focus:border-primary focus:outline-none"></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase tracking-wide text-slate-600">Deskripsi</label><textarea v-model="menuForm.description" placeholder="Deskripsi singkat..." class="w-full rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-medium min-h-[64px] focus:border-primary focus:outline-none resize-none" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase tracking-wide text-slate-600">Harga Dasar *</label><input v-model.number="menuForm.price" type="number" placeholder="15000" class="h-11 w-full rounded-xl border border-slate-200 px-4 text-[13px] font-bold focus:border-primary focus:outline-none"></div>
            <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase tracking-wide text-slate-600">Kategori</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-medium focus:border-primary focus:outline-none"><option :value="null">Tanpa kategori</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
          </div>
        </div>

        <!-- Foto Produk -->
        <div class="space-y-2.5 pt-2 border-t">
          <label class="text-[11px] font-black uppercase tracking-wide flex items-center gap-2">Gambar Produk <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-bold">Wajib Crop 1:1 • 1200</span></label>
          <div class="flex gap-3 items-start">
            <div class="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><Camera v-else class="w-7 h-7 text-amber-400" /></div>
            <div class="flex-1 min-w-0 space-y-2">
              <button type="button" class="w-full h-10 rounded-xl border bg-white text-[12px] font-bold hover:bg-slate-50 active:scale-[0.98]" @click="()=>addFileInputRef?.click()">{{ previewUrl ? 'Ganti Foto & Crop' : 'Pilih Foto → Crop 1:1' }}</button>
              <input ref="addFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" />
              <p v-if="croppedBlob" class="text-[11px] text-emerald-600 font-bold">✓ Crop 1200 siap</p><p v-else class="text-[10px] text-slate-400 leading-tight">Foto akan di-crop 1:1 agar konsisten di katalog.</p>
            </div>
          </div>
        </div>

        <!-- Quick Tambahan Master -->
        <div v-if="addonMasters.length>0" class="rounded-2xl border bg-amber-50/40 border-amber-100 p-3 space-y-2">
          <p class="text-[10px] font-black uppercase flex items-center gap-1.5"><Sparkles class="w-3.5 h-3.5 text-amber-500" /> Ambil cepat dari Tambahan Master</p>
          <div class="flex gap-1.5 flex-wrap"><button v-for="tm in addonMasters" :key="tm.id" class="h-7 px-3 rounded-full bg-white border text-[11px] font-bold hover:bg-slate-900 hover:text-white active:scale-95 flex items-center gap-1" @click="duplicateFromMaster(tm)"><Plus class="w-3 h-3" />{{ tm.name }}</button></div>
        </div>

        <!-- VARIAN -->
        <div class="space-y-3 pt-3 border-t">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5"><Layers class="w-4 h-4" /> Varian ± Harga</p><button class="h-8 px-3 rounded-full bg-primary text-white text-[11px] font-bold flex items-center gap-1" @click="addVariantGroup"><PlusCircle class="w-4 h-4" /> Varian</button></div>
          <div v-if="variantGroups.length===0" class="py-4 px-3 rounded-2xl bg-slate-50 border border-dashed text-center"><p class="text-[11px] text-slate-500 leading-relaxed">Belum ada varian.<br>Contoh: Ukuran Regular / Besar +5k dengan foto.</p></div>
          <div v-for="(vg,gIdx) in variantGroups" :key="gIdx" class="bg-slate-50 border rounded-2xl p-3 space-y-3">
            <div class="flex gap-2">
              <input v-model="vg.name" placeholder="Ukuran / Level" class="flex-1 min-w-0 h-9 rounded-xl border bg-white px-3 text-[13px] font-bold focus:border-primary focus:outline-none">
              <select v-model="vg.type" class="h-9 rounded-xl border bg-white px-2 text-[11px] font-bold shrink-0"><option value="single">Single</option><option value="multiple">Multi</option></select>
              <button class="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeVariantGroup(gIdx)"><Trash2 class="w-4 h-4" /></button>
            </div>
            <div class="flex gap-1.5 flex-wrap text-[10px]">
              <label class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1.5 font-medium"><input type="checkbox" v-model="vg.is_required" class="w-3 h-3"> Wajib</label>
              <span class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1.5">Min <input v-model.number="vg.min_select" type="number" class="w-10 h-6 rounded border px-1 text-[11px]"></span>
              <span class="flex items-center gap-1 bg-white border rounded-full px-2.5 py-1.5">Max <input v-model.number="vg.max_select" type="number" class="w-10 h-6 rounded border px-1 text-[11px]"></span>
            </div>
            <div class="space-y-2">
              <div v-for="(opt,oIdx) in vg.options" :key="oIdx" class="bg-white border rounded-xl p-2.5 flex gap-2 items-center">
                <div class="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-4 h-4 text-slate-300" /></div>
                <div class="flex-1 min-w-0 space-y-1.5">
                  <input v-model="opt.label" placeholder="Besar / Pedas" class="w-full h-8 rounded-lg border px-3 text-[12px] font-bold focus:border-primary focus:outline-none">
                  <div class="flex gap-1.5"><input v-model.number="opt.price_delta" type="number" placeholder="+3000" class="flex-1 min-w-0 h-8 rounded-lg border px-2 text-[11px] font-bold"><button type="button" class="shrink-0 h-8 px-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'variant',{g:gIdx,o:oIdx}); input.click() })()">Foto</button></div>
                </div>
                <button class="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeVariantOption(gIdx,oIdx)"><Trash2 class="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <button class="w-full h-8 rounded-xl bg-slate-900 text-white text-[11px] font-bold" @click="addVariantOption(gIdx)">+ Opsi Varian</button>
          </div>
        </div>

        <!-- TAMBAHAN PER MENU -->
        <div class="space-y-3 pt-3 border-t">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase tracking-wide flex items-center gap-1.5"><Sparkles class="w-4 h-4 text-amber-500" /> Tambahan (Per Menu)</p><button class="h-8 px-3 rounded-full bg-slate-900 text-white text-[11px] font-bold" @click="addAddonGroup">+ Group</button></div>
          <div v-if="addonGroups.length===0" class="py-4 px-3 rounded-2xl bg-amber-50/40 border border-dashed border-amber-200 text-center"><p class="text-[11px] text-slate-500 leading-relaxed">Belum ada tambahan di menu ini.<br>Gunakan cepat dari master atau buat baru.</p></div>
          <div v-for="(tg,gIdx) in addonGroups" :key="gIdx" class="bg-amber-50/30 border border-amber-100 rounded-2xl p-3 space-y-2.5">
            <div class="flex gap-2"><input v-model="tg.name" placeholder="Topping / Tambahan" class="flex-1 min-w-0 h-9 rounded-xl border bg-white px-3 text-[13px] font-bold focus:border-primary focus:outline-none"><button class="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeAddonGroup(gIdx)"><Trash2 class="w-4 h-4" /></button></div>
            <div v-for="(opt,oIdx) in tg.options" :key="oIdx" class="bg-white border rounded-xl p-2 flex gap-2 items-center">
              <div class="w-9 h-9 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-3.5 h-3.5 text-slate-300" /></div>
              <div class="flex-1 min-w-0 space-y-1.5">
                <input v-model="opt.label" placeholder="Keju / Boba" class="w-full h-8 rounded-lg border px-2.5 text-[12px] font-bold focus:border-primary focus:outline-none">
                <div class="flex gap-1.5"><input v-model.number="opt.price_delta" type="number" placeholder="+3000" class="flex-1 min-w-0 h-8 rounded-lg border px-2 text-[11px] font-bold"><button type="button" class="shrink-0 h-8 px-2.5 rounded-lg bg-amber-50 border text-[10px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'addon',undefined,{g:gIdx,o:oIdx}); input.click() })()">Foto</button></div>
              </div>
              <button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="removeAddonOption(gIdx,oIdx)"><Trash2 class="w-3 h-3" /></button>
            </div>
            <button class="w-full h-7 rounded-xl bg-white border text-[11px] font-bold" @click="addAddonOption(gIdx)">+ Opsi Tambahan</button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border border-slate-200 text-[13px] font-bold hover:bg-slate-50" @click="showAddModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold shadow-md disabled:opacity-50" :disabled="actionLoading" @click="handleAddMenu">{{ actionLoading ? 'Menyimpan...' : 'Tambahkan' }}</button></div>
      </template>
    </UiModal>

    <UiModal v-model:open="showEditModal" title="Edit Menu" max-width="max-w-lg">
      <div class="space-y-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama</label><input v-model="menuForm.name" type="text" class="h-11 w-full rounded-xl border px-4 text-[13px] font-semibold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Harga</label><input v-model.number="menuForm.price" type="number" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Kategori</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-xl border px-3 text-[13px]"><option :value="null">Tanpa kategori</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
        <div class="space-y-2"><label class="text-[10px] font-bold uppercase">Gambar <span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Crop 1:1</span></label><div class="flex gap-3 items-center"><div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><img v-else-if="menuForm.image_url" :src="menuForm.image_url" class="w-full h-full object-cover opacity-70" /><Camera v-else class="w-6 h-6 text-amber-400" /></div><button type="button" class="h-10 px-4 rounded-xl border bg-slate-50 text-[12px] font-bold" @click="()=>editFileInputRef?.click()">{{ previewUrl ? 'Ganti & Crop' : 'Pilih & Crop' }}</button><input ref="editFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" /></div></div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showEditModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold disabled:opacity-50" :disabled="actionLoading" @click="handleEditMenu">{{ actionLoading ? 'Menyimpan...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <UiModal v-model:open="showCategoryModal" title="Kategori" max-width="max-w-md">
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-indigo-700 leading-relaxed">Icon foto 1:1 400, COS auto-delete.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Kategori *</label><input v-model="categoryForm.name" placeholder="Makanan, Minuman..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase flex items-center gap-2">Icon Foto <span class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] border">1:1 • 400</span></label>
          <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full border-2 border-dashed border-indigo-200 bg-indigo-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="categoryPreviewUrl" :src="categoryPreviewUrl" class="w-full h-full object-cover" /><Tag v-else class="w-5 h-5 text-indigo-300" /></div><button type="button" class="h-9 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold" @click="()=>catFileInputRef?.click()">{{ categoryPreviewUrl ? 'Ganti & Crop' : 'Upload & Crop' }}</button><input ref="catFileInputRef" type="file" accept="image/*" class="hidden" @change="(e)=>handleFileChange(e,'category')" /></div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showCategoryModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold disabled:opacity-50" :disabled="saveCategoryLoading" @click="handleSaveCategory">{{ saveCategoryLoading ? '...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <UiModal v-model:open="showAddonMasterModal" title="Tambahan Master" max-width="max-w-lg">
      <div class="space-y-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-[11px] text-amber-800 leading-relaxed">Shared banyak menu: Keju, Sambal, Kerupuk, Boba. Opsi foto 400.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Tambahan *</label><input v-model="addonMasterForm.name" placeholder="Keju, Sambal, Kerupuk..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-2">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase">Opsi dengan Foto 400</p><button class="h-7 px-3 rounded-full bg-primary text-white text-[11px] font-bold" @click="addonMasterOptions.push({ label:'', price_delta:3000, image_url:'', previewUrl:'' })">+ Opsi</button></div>
          <div v-for="(opt,idx) in addonMasterOptions" :key="idx" class="bg-white border rounded-xl p-2.5 flex gap-2 items-center">
            <div class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 overflow-hidden flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-5 h-5 text-amber-300" /></div>
            <div class="flex-1 min-w-0 space-y-1.5">
              <input v-model="opt.label" placeholder="Keju Mozarella" class="w-full h-8 rounded-lg border px-2.5 text-[12px] font-bold focus:border-primary focus:outline-none">
              <div class="flex gap-1.5"><input v-model.number="opt.price_delta" type="number" placeholder="3000" class="flex-1 min-w-0 h-8 rounded-lg border px-2 text-[11px] font-bold"><button type="button" class="shrink-0 h-8 px-2.5 rounded-lg bg-amber-50 border text-[10px] font-bold text-amber-700" @click="(()=>{ const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev)=>handleFileChange(ev as any,'addonMasterOption',undefined,undefined,idx); input.click() })()">Foto</button></div>
            </div>
            <button class="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="addonMasterOptions.splice(idx,1)"><Trash2 class="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddonMasterModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold disabled:opacity-50" :disabled="addonMasterSaving" @click="handleSaveAddonMaster">{{ addonMasterSaving ? '...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <CommonImageCropper v-if="cropperOpen" :src="cropperSrc" :type="cropperTarget==='category' ? 'logo' : cropperTarget==='addonMasterOption' ? 'logo' : cropperTarget==='addon' ? 'logo' : 'product'" @cropped="onCropped" @cancel="onCropCancel" />
  </div>
</template>
