<script setup lang="ts">
// V2 FIX VARIANT FOTO + KELola VARIANT SETELAH PRODUK DIBUAT
// - Modal tambah menu HANYA basic (nama, harga, kategori, foto) -> lebih simple, tidak kepotong
// - Foto variant FIX: pakai file input ref per-option + handler langsung, tidak pakai dynamic createElement yang gagal
// - Setelah produk dibuat: di list menu ada tombol "Varian" & "Tambahan" -> buka modal manager per-menu
// - Modal manager variant: list groups + options, edit label/price/foto, toggle habis/tersedia, is_default, hapus, COS auto-delete
import { Plus, Edit, Trash2, RefreshCw, Utensils, ArrowLeft, Camera, Tag, Layers, PlusCircle, Sparkles, CupSoda, Eye, EyeOff, Star } from '@lucide/vue'
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

const addonMasters = ref<Array<{ id: string; name: string; image_url?: string; options: Array<{ id: string; label: string; price_delta: number; image_url?: string; previewUrl?: string }> }>>([])
const showAddonMasterModal = ref(false)
const addonMasterForm = ref({ name: '', image_url: '' })
const addonMasterOptions = ref<Array<{ id?: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; file?: File|null }>>([])
const addonMasterSaving = ref(false)

// Variant Manager Modal per-menu (setelah produk dibuat)
const showVariantManagerModal = ref(false)
const variantManagerMenu = ref<any>(null)
const variantManagerGroups = ref<Array<{ id: string; name: string; type: string; is_required: boolean; min_select: number; max_select: number|null; sort_order: number; options: Array<{ id: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; is_default: boolean; is_available: boolean; sort_order: number }> }>>([])
const variantManagerLoading = ref(false)
const showAddVariantGroupModal = ref(false)
const variantGroupForm = ref({ name: 'Ukuran', type: 'single' as 'single'|'multiple', is_required: true, min_select: 1, max_select: 1 as number|null, sort_order: 0 })
const showAddVariantOptionModal = ref(false)
const variantOptionForm = ref({ groupId: '', label: '', price_delta: 0, image_url: '', previewUrl: '', file: null as File|null, is_default: false, is_available: true, sort_order: 0 })
const editingVariantOptionId = ref<string|null>(null)

const showAddonManagerModal = ref(false)
const addonManagerMenu = ref<any>(null)
const addonManagerGroups = ref<Array<{ id: string; name: string; type: string; is_required: boolean; min_select: number; max_select: number|null; sort_order: number; options: Array<{ id: string; label: string; price_delta: number; image_url?: string; previewUrl?: string; is_available: boolean; sort_order: number }> }>>([])
const addonManagerLoading = ref(false)
const showAddAddonGroupModal = ref(false)
const addonGroupForm = ref({ name: 'Tambahan', type: 'multiple' as 'single'|'multiple', is_required: false, min_select: 0, max_select: null as number|null, sort_order: 0 })
const showAddAddonOptionModal = ref(false)
const addonOptionForm = ref({ groupId: '', label: '', price_delta: 0, image_url: '', previewUrl: '', file: null as File|null, is_available: true, sort_order: 0 })
const editingAddonOptionId = ref<string|null>(null)

const cropperOpen = ref(false)
const cropperSrc = ref('')
const croppedBlob = ref<Blob|null>(null)
const cropperTarget = ref<'menu'|'category'|'variantOption'|'addonOption'|'addonMasterOption'>('menu')
const cropperVariantOptionTarget = ref<{ groupId: string; optionId?: string|null; mode: 'add'|'edit' }|null>(null)
const cropperAddonOptionTarget = ref<{ groupId: string; optionId?: string|null; mode: 'add'|'edit' }|null>(null)
const cropperAddonMasterIdx = ref<number|null>(null)

const addFileInputRef = ref<HTMLInputElement|null>(null)
const editFileInputRef = ref<HTMLInputElement|null>(null)
const variantOptionFileRef = ref<HTMLInputElement|null>(null)
const addonOptionFileRef = ref<HTMLInputElement|null>(null)

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
      } catch {}
    } else { await navigateTo('/merchant/menu'); return }
  } catch (e) { console.warn(e) } finally { checkLoading.value=false }
}
const filteredMenus = computed(() => {
  if (!activeCategoryId.value) return merchantsStore.merchantMenus as any[]
  return (merchantsStore.merchantMenus as any[]).filter((m:any)=> (m.category_id||m.category?.id)===activeCategoryId.value)
})

// File & Crop handling - FIX foto variant & foto menu utama
const handleFileChange = async (event: Event, target: 'menu'|'category'|'variantOption'|'addonOption'|'addonMasterOption'='menu') => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) { error('Harus gambar'); input.value=''; return }
  if (file.size>10*1024*1024) { error('Maks 10MB'); input.value=''; return }
  cropperTarget.value=target
  if (cropperSrc.value) URL.revokeObjectURL(cropperSrc.value)
  cropperSrc.value=URL.createObjectURL(file)
  await nextTick()
  cropperOpen.value=true
  input.value=''
}
const openAddFilePicker = () => { addFileInputRef.value?.click() }
const openEditFilePicker = () => { editFileInputRef.value?.click() }
const openCategoryFilePicker = () => { catFileInputRef.value?.click() }
const openVariantOptionFilePicker = () => { variantOptionFileRef.value?.click() }
const openAddonOptionFilePicker = () => { addonOptionFileRef.value?.click() }
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
  } else if (cropperTarget.value==='variantOption') {
    if (cropperVariantOptionTarget.value) {
      // disimpan di form variant option yang sedang diedit / tambah
      variantOptionForm.value.file = payload.file
      if (variantOptionForm.value.previewUrl) URL.revokeObjectURL(variantOptionForm.value.previewUrl)
      variantOptionForm.value.previewUrl = payload.url
      if (uploadedUrl) variantOptionForm.value.image_url = uploadedUrl
    }
  } else if (cropperTarget.value==='addonOption') {
    if (cropperAddonOptionTarget.value) {
      addonOptionForm.value.file = payload.file
      if (addonOptionForm.value.previewUrl) URL.revokeObjectURL(addonOptionForm.value.previewUrl)
      addonOptionForm.value.previewUrl = payload.url
      if (uploadedUrl) addonOptionForm.value.image_url = uploadedUrl
    }
  } else if (cropperTarget.value==='addonMasterOption' && cropperAddonMasterIdx.value!==null) {
    const idx=cropperAddonMasterIdx.value
    const opt=addonMasterOptions.value[idx]
    if (opt) { opt.file=payload.file; if (opt.previewUrl) URL.revokeObjectURL(opt.previewUrl!); opt.previewUrl=payload.url; if (uploadedUrl) opt.image_url=uploadedUrl }
  }
  if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' }
  cropperOpen.value=false
  cropperVariantOptionTarget.value=null
  cropperAddonOptionTarget.value=null
  cropperAddonMasterIdx.value=null
}
const onCropCancel = () => { if (cropperSrc.value) { URL.revokeObjectURL(cropperSrc.value); cropperSrc.value='' } cropperOpen.value=false }

const openAddModal = () => { menuForm.value={ name:'', description:'', price:0, image_url:'', category_id: activeCategoryId.value, is_available:true }; selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null; showAddModal.value=true }
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
    success('Menu ditambahkan. Sekarang kelola varian & tambahan via tombol Varian/Tambahan di list.')
    showAddModal.value=false
    if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' }
    await merchantsStore.fetchMerchantMenu()
  } catch { error('Gagal tambah menu') } finally { actionLoading.value=false }
}
const openEditModal = (menu:any) => {
  editMenuId.value=menu.id
  menuForm.value={ name:menu.name, description:menu.description||'', price:menu.price, image_url:menu.image_url||'', category_id:menu.category_id||menu.category?.id||null, is_available:menu.is_available }
  selectedFile.value=null; previewUrl.value=''; croppedBlob.value=null; showEditModal.value=true
}
const handleEditMenu = async () => {
  if (!menuForm.value.name) { error('Nama wajib'); return }
  if (menuForm.value.price<=0) { error('Harga >0'); return }
  actionLoading.value=true
  let finalImageUrl=menuForm.value.image_url
  if (selectedFile.value && !finalImageUrl) { try { finalImageUrl=await merchantsStore.uploadMenuImage(selectedFile.value) } catch { error('Gagal upload'); actionLoading.value=false; return } }
  try { const { request } = useApi(); await request(`/merchant/menu/${editMenuId.value}`, { method:'PUT', body:{ name:menuForm.value.name, description:menuForm.value.description, price:Number(menuForm.value.price), image_url:finalImageUrl, is_available:menuForm.value.is_available, category_id:menuForm.value.category_id } }); success('Menu diperbarui'); showEditModal.value=false; if (previewUrl.value) { URL.revokeObjectURL(previewUrl.value); previewUrl.value='' } await merchantsStore.fetchMerchantMenu() } catch { error('Gagal update') } finally { actionLoading.value=false }
}
const handleDeleteMenu = async (id:string) => { if (!confirm('Yakin hapus menu? COS auto-delete.')) return; deletingMenuId.value=id; try { await merchantsStore.deleteMenuItem(id); success('Menu & COS terhapus.') } catch { error('Gagal hapus') } finally { deletingMenuId.value='' } }
const toggleMenuAvailable = async (menu:any) => { togglingMenuId.value=menu.id; try { await merchantsStore.toggleMenuAvailability(menu.id, !menu.is_available); success(menu.is_available ? 'Dinonaktifkan' : 'Diaktifkan') } catch { error('Gagal toggle') } finally { togglingMenuId.value='' } }

const openCategoryModal = (cat?:any) => { if (cat) { categoryForm.value={ name:cat.name, image_url:cat.image_url||'', sort_order:cat.sort_order||0, is_active:cat.is_active }; categoryPreviewUrl.value=cat.image_url||''; (categoryForm as any).id=cat.id } else { categoryForm.value={ name:'', image_url:'', sort_order:categories.value.length, is_active:true }; categoryPreviewUrl.value=''; delete (categoryForm as any).id } categoryFile.value=null; showCategoryModal.value=true }
const handleSaveCategory = async () => { if (!categoryForm.value.name) { error('Nama wajib'); return } saveCategoryLoading.value=true; try { const id=(categoryForm as any).id; let finalUrl=categoryForm.value.image_url; if (categoryFile.value && !finalUrl) { try { finalUrl=await merchantsStore.uploadMenuImage(categoryFile.value) } catch { error('Gagal upload'); saveCategoryLoading.value=false; return } } if (id) await merchantsStore.updateCategory(id, { name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order, is_active:categoryForm.value.is_active }); else await merchantsStore.createCategory({ name:categoryForm.value.name, image_url:finalUrl, sort_order:categoryForm.value.sort_order }); success('Kategori disimpan'); showCategoryModal.value=false; categories.value=await merchantsStore.fetchCategories() as any } catch { error('Gagal kategori') } finally { saveCategoryLoading.value=false } }
const handleDeleteCategory = async (id:string) => { if (!confirm('Hapus kategori?')) return; deleteCategoryId.value=id; try { await merchantsStore.deleteCategory(id); success('Kategori dihapus'); categories.value=await merchantsStore.fetchCategories() as any } catch { error('Gagal hapus') } finally { deleteCategoryId.value=null } }

// Variant Manager - setelah produk dibuat
const openVariantManager = async (menu:any) => {
  variantManagerMenu.value=menu
  variantManagerLoading.value=true
  showVariantManagerModal.value=true
  try {
    const groups = await merchantsStore.fetchVariantGroups(menu.id) as any[]
    variantManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_default:o.is_default, is_available:o.is_available, sort_order:o.sort_order })) }))
  } catch { variantManagerGroups.value=[] } finally { variantManagerLoading.value=false }
}
const handleCreateVariantGroup = async () => {
  if (!variantManagerMenu.value?.id) return
  if (!variantGroupForm.value.name) { error('Nama varian wajib'); return }
  try {
    const g = await merchantsStore.createVariantGroup(variantManagerMenu.value.id, { name:variantGroupForm.value.name, type:variantGroupForm.value.type, is_required:variantGroupForm.value.is_required, min_select:variantGroupForm.value.min_select, max_select:variantGroupForm.value.max_select, sort_order:variantManagerGroups.value.length }) as any
    success(`Varian "${variantGroupForm.value.name}" ditambahkan`)
    showAddVariantGroupModal.value=false
    // refresh
    const groups = await merchantsStore.fetchVariantGroups(variantManagerMenu.value.id) as any[]
    variantManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_default:o.is_default, is_available:o.is_available, sort_order:o.sort_order })) }))
    variantGroupForm.value={ name:'Ukuran', type:'single', is_required:true, min_select:1, max_select:1, sort_order:0 }
  } catch { error('Gagal tambah varian group') }
}
const handleDeleteVariantGroup = async (groupId:string) => {
  if (!confirm('Hapus varian group ini beserta semua opsinya? Foto COS auto-delete.')) return
  try { await merchantsStore.deleteVariantGroup(groupId); success('Varian group dihapus'); variantManagerGroups.value=variantManagerGroups.value.filter(g=>g.id!==groupId) } catch { error('Gagal hapus') }
}
const openAddVariantOption = (groupId:string) => {
  variantOptionForm.value={ groupId, label:'', price_delta:0, image_url:'', previewUrl:'', file:null, is_default:false, is_available:true, sort_order:0 }
  editingVariantOptionId.value=null
  showAddVariantOptionModal.value=true
}
const openEditVariantOption = (groupId:string, opt:any) => {
  variantOptionForm.value={ groupId, label:opt.label, price_delta:opt.price_delta, image_url:opt.image_url||'', previewUrl:opt.image_url||opt.previewUrl||'', file:null, is_default:!!opt.is_default, is_available: opt.is_available!==false, sort_order:opt.sort_order||0 }
  editingVariantOptionId.value=opt.id
  showAddVariantOptionModal.value=true
}
const handleSaveVariantOption = async () => {
  if (!variantOptionForm.value.label) { error('Label wajib'); return }
  try {
    let finalImg = variantOptionForm.value.image_url
    if (variantOptionForm.value.file && !finalImg) { try { finalImg=await merchantsStore.uploadMenuImage(variantOptionForm.value.file as any) } catch { error('Gagal upload foto variant'); return } }
    if (editingVariantOptionId.value) {
      // update via API
      const { request } = useApi()
      await request(`/merchant/menu/variants/options/${editingVariantOptionId.value}`, { method:'PUT', body:{ label:variantOptionForm.value.label, price_delta:variantOptionForm.value.price_delta, image_url:finalImg, is_default:variantOptionForm.value.is_default, is_available:variantOptionForm.value.is_available, sort_order:variantOptionForm.value.sort_order } })
      success('Opsi varian diperbarui (foto, harga, status habis/tersedia)')
    } else {
      await merchantsStore.createVariantOption(variantOptionForm.value.groupId, { label:variantOptionForm.value.label, price_delta:variantOptionForm.value.price_delta, image_url:finalImg, is_default:variantOptionForm.value.is_default, is_available:variantOptionForm.value.is_available, sort_order:variantOptionForm.value.sort_order })
      success('Opsi varian ditambahkan dengan foto')
    }
    showAddVariantOptionModal.value=false
    // refresh
    if (variantManagerMenu.value?.id) {
      const groups = await merchantsStore.fetchVariantGroups(variantManagerMenu.value.id) as any[]
      variantManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_default:o.is_default, is_available:o.is_available, sort_order:o.sort_order })) }))
    }
  } catch { error('Gagal simpan opsi varian') }
}
const handleDeleteVariantOption = async (optionId:string) => {
  if (!confirm('Hapus opsi varian ini? Foto COS auto-delete.')) return
  try { await merchantsStore.deleteVariantOption(optionId); success('Opsi dihapus'); // remove from local
    variantManagerGroups.value = variantManagerGroups.value.map(g=>({ ...g, options: g.options.filter(o=>o.id!==optionId) }))
  } catch { error('Gagal hapus opsi') }
}
const toggleVariantOptionAvailable = async (opt:any) => {
  try {
    const { request } = useApi()
    await request(`/merchant/menu/variants/options/${opt.id}`, { method:'PUT', body:{ label:opt.label, price_delta:opt.price_delta, image_url:opt.image_url, is_default:opt.is_default, is_available:!opt.is_available, sort_order:opt.sort_order } })
    opt.is_available=!opt.is_available
    success(opt.is_available ? `${opt.label} tersedia` : `${opt.label} habis (dinonaktifkan)`)
  } catch { error('Gagal toggle') }
}
const startCropVariantOption = (groupId:string, optionEditing:boolean) => {
  cropperTarget.value='variantOption'
  cropperVariantOptionTarget.value={ groupId, optionId: editingVariantOptionId.value, mode: optionEditing ? 'edit' : 'add' }
  variantOptionFileRef.value?.click()
}

// Addon Manager per-menu (tambahan per menu, bukan master)
const openAddonManager = async (menu:any) => {
  addonManagerMenu.value=menu
  addonManagerLoading.value=true
  showAddonManagerModal.value=true
  try {
    const groups = await merchantsStore.fetchToppingGroups(menu.id) as any[]
    addonManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_available:o.is_available, sort_order:o.sort_order })) }))
  } catch { addonManagerGroups.value=[] } finally { addonManagerLoading.value=false }
}
const handleCreateAddonGroup = async () => {
  if (!addonManagerMenu.value?.id) return
  if (!addonGroupForm.value.name) { error('Nama tambahan wajib'); return }
  try {
    await merchantsStore.createToppingGroup(addonManagerMenu.value.id, { name:addonGroupForm.value.name, type:addonGroupForm.value.type, is_required:addonGroupForm.value.is_required, min_select:addonGroupForm.value.min_select, max_select:addonGroupForm.value.max_select, sort_order:addonManagerGroups.value.length })
    success(`Group "${addonGroupForm.value.name}" ditambahkan`)
    showAddAddonGroupModal.value=false
    const groups = await merchantsStore.fetchToppingGroups(addonManagerMenu.value.id) as any[]
    addonManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_available:o.is_available, sort_order:o.sort_order })) }))
    addonGroupForm.value={ name:'Tambahan', type:'multiple', is_required:false, min_select:0, max_select:null, sort_order:0 }
  } catch { error('Gagal tambah group tambahan') }
}
const handleDeleteAddonGroup = async (groupId:string) => { if (!confirm('Hapus group tambahan + semua opsi?')) return; try { await merchantsStore.deleteToppingGroup(groupId); success('Group dihapus'); addonManagerGroups.value=addonManagerGroups.value.filter(g=>g.id!==groupId) } catch { error('Gagal hapus') } }
const openAddAddonOption = (groupId:string) => { addonOptionForm.value={ groupId, label:'', price_delta:0, image_url:'', previewUrl:'', file:null, is_available:true, sort_order:0 }; editingAddonOptionId.value=null; showAddAddonOptionModal.value=true }
const openEditAddonOption = (groupId:string, opt:any) => { addonOptionForm.value={ groupId, label:opt.label, price_delta:opt.price_delta, image_url:opt.image_url||'', previewUrl:opt.image_url||opt.previewUrl||'', file:null, is_available:opt.is_available!==false, sort_order:opt.sort_order||0 }; editingAddonOptionId.value=opt.id; showAddAddonOptionModal.value=true }
const handleSaveAddonOption = async () => {
  if (!addonOptionForm.value.label) { error('Label wajib'); return }
  try {
    let finalImg=addonOptionForm.value.image_url
    if (addonOptionForm.value.file && !finalImg) { try { finalImg=await merchantsStore.uploadMenuImage(addonOptionForm.value.file as any) } catch { error('Gagal upload'); return } }
    if (editingAddonOptionId.value) {
      const { request } = useApi()
      await request(`/merchant/menu/toppings/options/${editingAddonOptionId.value}`, { method:'PUT', body:{ label:addonOptionForm.value.label, price_delta:addonOptionForm.value.price_delta, image_url:finalImg, is_available:addonOptionForm.value.is_available, sort_order:addonOptionForm.value.sort_order } })
      success('Opsi tambahan diperbarui')
    } else {
      await (merchantsStore as any).createToppingOption(addonOptionForm.value.groupId, { label:addonOptionForm.value.label, price_delta:addonOptionForm.value.price_delta, image_url:finalImg, is_available:addonOptionForm.value.is_available, sort_order:addonOptionForm.value.sort_order })
      success('Opsi tambahan ditambahkan')
    }
    showAddAddonOptionModal.value=false
    if (addonManagerMenu.value?.id) { const groups = await merchantsStore.fetchToppingGroups(addonManagerMenu.value.id) as any[]; addonManagerGroups.value = groups.map((g:any)=>({ id:g.id, name:g.name, type:g.type, is_required:g.is_required, min_select:g.min_select, max_select:g.max_select, sort_order:g.sort_order, options:(g.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url, is_available:o.is_available, sort_order:o.sort_order })) })) }
  } catch { error('Gagal simpan opsi tambahan') }
}
const handleDeleteAddonOption = async (optionId:string) => { if (!confirm('Hapus opsi tambahan?')) return; try { await merchantsStore.deleteToppingOption(optionId); success('Opsi dihapus'); addonManagerGroups.value=addonManagerGroups.value.map(g=>({ ...g, options: g.options.filter(o=>o.id!==optionId) })) } catch { error('Gagal hapus') } }
const toggleAddonOptionAvailable = async (opt:any) => { try { const { request } = useApi(); await request(`/merchant/menu/toppings/options/${opt.id}`, { method:'PUT', body:{ label:opt.label, price_delta:opt.price_delta, image_url:opt.image_url, is_available:!opt.is_available, sort_order:opt.sort_order } }); opt.is_available=!opt.is_available; success(opt.is_available ? `${opt.label} tersedia` : `${opt.label} habis`) } catch { error('Gagal toggle') } }
const startCropAddonOption = (groupId:string) => { cropperTarget.value='addonOption'; cropperAddonOptionTarget.value={ groupId, mode: editingAddonOptionId.value ? 'edit' : 'add' }; addonOptionFileRef.value?.click() }

// Addon Master (shared)
const openAddonMasterModal = (master?:any) => { if (master) { addonMasterForm.value={ name:master.name, image_url:master.image_url||'' }; addonMasterOptions.value=(master.options||[]).map((o:any)=>({ id:o.id, label:o.label, price_delta:o.price_delta, image_url:o.image_url, previewUrl:o.image_url })); (addonMasterForm as any).id=master.id } else { addonMasterForm.value={ name:'', image_url:'' }; addonMasterOptions.value=[{ label:'Keju Parut', price_delta:3000, image_url:'', previewUrl:'' }] } showAddonMasterModal.value=true }
const handleSaveAddonMaster = async () => {
  if (!addonMasterForm.value.name) { error('Nama tambahan wajib'); return }
  addonMasterSaving.value=true
  try {
    for (const opt of addonMasterOptions.value) { if (opt.file && !opt.image_url) { try { opt.image_url=await merchantsStore.uploadMenuImage(opt.file as any) } catch {} } }
    const id=(addonMasterForm as any).id
    const { request } = useApi()
    try { const payload={ name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, sort_order:0, options: addonMasterOptions.value.map(o=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url })) }; if (id) await request(`/merchant/addons/${id}`, { method:'PUT', body:payload }); else await request('/merchant/addons', { method:'POST', body:payload }); const res=await request<{ data:any[] }>('/merchant/addons'); if (res.data) addonMasters.value=res.data } catch { try { const payload={ name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map(o=>({ label:o.label, price_delta:o.price_delta, image_url:o.image_url })) }; if (id) await request(`/merchant/toppings/${id}`, { method:'PUT', body:payload }); else await request('/merchant/toppings', { method:'POST', body:payload }); const res=await request<{ data:any[] }>('/merchant/toppings'); if (res.data) addonMasters.value=res.data } catch { if (id) { const idx=addonMasters.value.findIndex(t=>t.id===id); if (idx>=0) addonMasters.value[idx]={ id, name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map((o,i)=>({ id:o.id||`opt-${i}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) } } else { addonMasters.value.push({ id:`local-${Date.now()}`, name:addonMasterForm.value.name, image_url:addonMasterForm.value.image_url, options: addonMasterOptions.value.map((o,i)=>({ id:`opt-${i}-${Date.now()}`, label:o.label, price_delta:o.price_delta, image_url:o.image_url||'', previewUrl:o.image_url||'' })) }) } } }
    success('Tambahan disimpan — shared banyak menu'); showAddonMasterModal.value=false
  } catch { error('Gagal simpan') } finally { addonMasterSaving.value=false }
}
const handleDeleteAddonMaster = async (id:string) => { if (!confirm('Hapus tambahan?')) return; try { const { request } = useApi(); try { await request(`/merchant/addons/${id}`, { method:'DELETE' }) } catch { try { await request(`/merchant/toppings/${id}`, { method:'DELETE' }) } catch {} } addonMasters.value=addonMasters.value.filter(t=>t.id!==id); success('Tambahan dihapus') } catch { error('Gagal hapus') } }

onMounted(()=>{ fetchProfile() })
</script>

<template>
  <div class="px-4 pb-24 space-y-4">
    <div v-if="checkLoading" class="min-h-[60vh] flex flex-col items-center justify-center">
      <RefreshCw class="w-9 h-9 animate-spin text-primary mb-3" /><p class="text-sm font-semibold text-muted-foreground">Memuat katalog...</p>
    </div>
    <div v-else class="space-y-4">
      <div class="flex items-center gap-2.5 pt-1">
        <NuxtLink to="/merchant/menu" class="w-9 h-9 shrink-0 bg-white border border-slate-200 rounded-xl flex items-center justify-center"><ArrowLeft class="w-4 h-4" /></NuxtLink>
        <div class="flex-1 min-w-0"><h2 class="text-[15px] font-black leading-tight">Katalog Menu</h2><p class="text-[10px] text-slate-400 truncate">Menu · Kategori · Tambahan · Varian edit setelah buat</p></div>
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
        <div v-if="filteredMenus.length===0" class="py-10 px-6 text-center bg-white border rounded-[24px]"><div class="w-14 h-14 mx-auto rounded-2xl bg-slate-50 border flex items-center justify-center mb-3"><Utensils class="w-7 h-7 text-slate-400" /></div><p class="text-[13px] font-black">Belum Ada Menu</p><p class="text-[11px] text-slate-500 mt-1">Buat menu dulu, lalu kelola varian & tambahan via tombol Varian/Tambahan.</p><button class="mt-4 h-10 px-5 rounded-full text-xs font-black bg-primary text-white" @click="openAddModal">+ Tambah Menu</button></div>
        <div v-else class="space-y-3">
          <div v-for="menu in filteredMenus as any" :key="menu.id" class="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm space-y-3">
            <div class="flex gap-4 items-center justify-between">
              <div class="flex items-center gap-3.5 min-w-0 flex-1">
                <div class="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="menu.image_url" :src="menu.image_url" class="w-full h-full object-cover"><Utensils v-else class="w-6 h-6 text-slate-300" /></div>
                <div class="min-w-0 space-y-1">
                  <div class="flex items-center gap-1.5"><h4 class="text-xs font-black truncate">{{ menu.name }}</h4><span v-if="menu.category?.name" class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] font-bold border">{{ menu.category.name }}</span></div>
                  <p class="text-[10px] text-slate-400 truncate max-w-[220px]">{{ menu.description }}</p>
                  <p class="text-xs font-black text-primary">Rp {{ Number(menu.price).toLocaleString('id-ID') }}</p>
                </div>
              </div>
              <div class="flex flex-col items-end gap-2 pl-3.5 border-l shrink-0">
                <button class="h-7 px-3 text-[10px] font-black rounded-xl border flex items-center gap-1" :class="menu.is_available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-500 border-rose-100'" :disabled="togglingMenuId===menu.id" @click="toggleMenuAvailable(menu)"><RefreshCw v-if="togglingMenuId===menu.id" class="w-3 h-3 animate-spin" /><template v-else>{{ menu.is_available ? 'Tersedia' : 'Habis' }}</template></button>
                <div class="flex gap-1.5"><button class="w-8 h-8 rounded-xl border flex items-center justify-center" @click="openEditModal(menu)"><Edit class="w-4 h-4" /></button><button class="w-8 h-8 rounded-xl border border-rose-100 flex items-center justify-center text-rose-500" :disabled="deletingMenuId===menu.id" @click="handleDeleteMenu(menu.id)"><RefreshCw v-if="deletingMenuId===menu.id" class="w-4 h-4 animate-spin" /><Trash2 v-else class="w-4 h-4" /></button></div>
              </div>
            </div>
            <!-- Quick action: kelola varian & tambahan setelah produk dibuat -->
            <div class="flex gap-2 pt-2 border-t border-slate-100">
              <button class="flex-1 h-9 rounded-xl border border-slate-200 bg-slate-50 text-[11px] font-bold flex items-center justify-center gap-1.5 hover:bg-slate-100 active:scale-[0.98]" @click="openVariantManager(menu)"><Layers class="w-4 h-4" /> Kelola Varian</button>
              <button class="flex-1 h-9 rounded-xl border border-amber-200 bg-amber-50/50 text-[11px] font-bold text-amber-700 flex items-center justify-center gap-1.5 hover:bg-amber-50 active:scale-[0.98]" @click="openAddonManager(menu)"><Sparkles class="w-4 h-4" /> Tambahan</button>
            </div>
          </div>
        </div>
      </div>

      <!-- KATEGORI TAB -->
      <div v-if="activeTab==='category'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><Tag class="w-4 h-4 text-primary" /> Kategori</h3><button class="h-8 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold flex items-center gap-1" @click="openCategoryModal()"><Plus class="w-3.5 h-3.5" /> Tambah</button></div>
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

      <!-- TAMBAHAN MASTER TAB -->
      <div v-if="activeTab==='addon'" class="space-y-3">
        <div class="bg-white border border-slate-100 rounded-3xl p-4 space-y-3 shadow-sm">
          <div class="flex items-center justify-between"><h3 class="text-xs font-black uppercase flex items-center gap-1.5"><Sparkles class="w-4 h-4 text-amber-500" /> Tambahan Master</h3><button class="h-8 px-3 rounded-xl bg-primary text-white text-[11px] font-bold flex items-center gap-1" @click="openAddonMasterModal()"><Plus class="w-3.5 h-3.5" /> Baru</button></div>
          <p class="text-[10px] text-slate-500 bg-amber-50/70 border border-amber-100 rounded-xl p-2.5">Keju, Bobba, Sambal, Kerupuk. Shared banyak menu, opsi foto 400.</p>
          <div v-if="addonMasters.length===0" class="py-10 text-center"><div class="w-12 h-12 mx-auto rounded-2xl bg-amber-50 border flex items-center justify-center mb-2"><CupSoda class="w-6 h-6 text-amber-400" /></div><p class="text-xs text-slate-500">Belum ada tambahan.</p><button class="mt-3 h-9 px-4 rounded-full bg-primary text-white text-xs font-bold" @click="openAddonMasterModal()">+ Tambah</button></div>
          <div v-else class="space-y-2.5">
            <div v-for="tm in addonMasters" :key="tm.id" class="bg-amber-50/50 border border-amber-100 rounded-2xl p-3 flex items-start gap-3">
              <div class="w-12 h-12 rounded-xl bg-white border overflow-hidden flex items-center justify-center shrink-0"><img v-if="tm.image_url" :src="tm.image_url" class="w-full h-full object-cover" /><CupSoda v-else class="w-5 h-5 text-amber-400" /></div>
              <div class="flex-1 min-w-0"><p class="text-xs font-black">{{ tm.name }}</p><p class="text-[10px] text-slate-500">{{ tm.options?.length||0 }} opsi</p><div class="flex gap-1 mt-1.5 flex-wrap"><span v-for="opt in (tm.options||[]).slice(0,6)" :key="opt.id" class="px-2 py-0.5 rounded-full bg-white border text-[9px] font-bold flex items-center gap-1"><span v-if="opt.image_url||opt.previewUrl" class="w-3 h-3 rounded-full overflow-hidden inline-flex"><img :src="opt.image_url||opt.previewUrl" class="w-full h-full object-cover" /></span>{{ opt.label }} +{{ Number(opt.price_delta).toLocaleString('id-ID') }}</span></div></div>
              <div class="flex gap-1 shrink-0"><button class="w-7 h-7 rounded-full bg-white border flex items-center justify-center" @click="openAddonMasterModal(tm)"><Edit class="w-3 h-3" /></button><button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteAddonMaster(tm.id)"><Trash2 class="w-3 h-3" /></button></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL TAMBAH MENU SIMPLIFIED - hanya basic, tidak ada varian/tambahan di sini -->
    <UiModal v-model:open="showAddModal" title="Tambah Menu" max-width="max-w-md">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="space-y-3">
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Menu *</label><input v-model="menuForm.name" type="text" placeholder="Ayam Geprek, Es Teler..." class="h-11 w-full rounded-xl border border-slate-200 px-4 text-[13px] font-semibold focus:border-primary focus:outline-none"></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Deskripsi</label><textarea v-model="menuForm.description" placeholder="Deskripsi singkat..." class="w-full rounded-xl border border-slate-200 px-4 py-3 text-[13px] font-medium min-h-[64px] focus:border-primary focus:outline-none resize-none" /></div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Harga *</label><input v-model.number="menuForm.price" type="number" placeholder="15000" class="h-11 w-full rounded-xl border border-slate-200 px-4 text-[13px] font-bold focus:border-primary focus:outline-none"></div>
            <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Kategori</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-xl border border-slate-200 px-3 text-[13px] font-medium focus:border-primary focus:outline-none"><option :value="null">Tanpa</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
          </div>
        </div>
        <div class="space-y-2.5 pt-2 border-t">
          <label class="text-[11px] font-black uppercase flex items-center gap-2">Foto Produk <span class="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Crop 1:1 • 1200</span></label>
          <div class="flex gap-3 items-start">
            <div class="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><Camera v-else class="w-7 h-7 text-amber-400" /></div>
            <div class="flex-1 min-w-0 space-y-2">
              <button type="button" class="w-full h-10 rounded-xl border bg-white text-[12px] font-bold hover:bg-slate-50 active:scale-[0.98]" @click="openAddFilePicker">{{ previewUrl ? 'Ganti & Crop' : 'Pilih Foto → Crop 1:1' }}</button>
              <input ref="addFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" />
              <p v-if="croppedBlob" class="text-[11px] text-emerald-600 font-bold">✓ Crop 1200 siap</p><p v-else class="text-[10px] text-slate-400 leading-tight">Setelah dibuat, kelola varian & tambahan via tombol di list menu.</p>
            </div>
          </div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold shadow-md disabled:opacity-50" :disabled="actionLoading" @click="handleAddMenu">{{ actionLoading ? 'Menyimpan...' : 'Tambahkan' }}</button></div></template>
    </UiModal>

    <UiModal v-model:open="showEditModal" title="Edit Menu" max-width="max-w-md">
      <div class="space-y-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama</label><input v-model="menuForm.name" type="text" class="h-11 w-full rounded-xl border px-4 text-[13px] font-semibold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Harga</label><input v-model.number="menuForm.price" type="number" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Kategori</label><select v-model="menuForm.category_id" class="h-11 w-full rounded-xl border px-3 text-[13px]"><option :value="null">Tanpa</option><option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option></select></div>
        <div class="space-y-2"><label class="text-[10px] font-bold uppercase">Foto <span class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px]">Crop 1:1</span></label><div class="flex gap-3 items-center"><div class="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="previewUrl" :src="previewUrl" class="w-full h-full object-cover" /><img v-else-if="menuForm.image_url" :src="menuForm.image_url" class="w-full h-full object-cover opacity-70" /><Camera v-else class="w-6 h-6 text-amber-400" /></div><button type="button" class="h-10 px-4 rounded-xl border bg-slate-50 text-[12px] font-bold active:scale-[0.98]" @click="openEditFilePicker">{{ previewUrl ? 'Ganti & Crop' : 'Pilih & Crop' }}</button><input ref="editFileInputRef" type="file" accept="image/jpeg,image/png,image/webp" class="hidden" @change="(e)=>handleFileChange(e,'menu')" /></div></div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showEditModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold disabled:opacity-50" :disabled="actionLoading" @click="handleEditMenu">{{ actionLoading ? '...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <!-- VARIANT MANAGER MODAL - Setelah Produk Dibuat -->
    <UiModal v-model:open="showVariantManagerModal" :title="`Kelola Varian — ${variantManagerMenu?.name||''}`" max-width="max-w-xl">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-indigo-700 leading-relaxed">Varian ditambahkan <b>setelah</b> produk dibuat. Foto variant FIX: klik tombol Foto (600x600) → crop → upload. Bisa toggle habis/tersedia, default, edit label & harga.</div>
        <div v-if="variantManagerLoading" class="py-8 text-center"><RefreshCw class="w-6 h-6 animate-spin mx-auto text-primary" /><p class="text-xs text-slate-500 mt-2">Memuat varian...</p></div>
        <div v-else>
          <div class="flex items-center justify-between mb-3"><p class="text-[11px] font-black uppercase">Group Varian (Ukuran, Level...)</p><button class="h-8 px-3 rounded-full bg-primary text-white text-[11px] font-bold flex items-center gap-1" @click="showAddVariantGroupModal=true"><Plus class="w-3.5 h-3.5" /> Group</button></div>
          <div v-if="variantManagerGroups.length===0" class="py-6 text-center border border-dashed rounded-2xl"><Layers class="w-8 h-8 mx-auto text-slate-300 mb-2" /><p class="text-xs font-bold">Belum ada varian</p><p class="text-[11px] text-slate-500 mt-1">Contoh: Ukuran Regular/Besar +5k dengan foto.</p></div>
          <div v-for="vg in variantManagerGroups" :key="vg.id" class="bg-slate-50 border rounded-2xl p-3 space-y-3 mb-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2"><p class="text-[12px] font-black">{{ vg.name }}</p><span class="px-2 py-0.5 rounded-full bg-white border text-[9px] font-bold">{{ vg.type==='single'?'Pilih 1':'Multi' }}</span><span v-if="vg.is_required" class="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[9px] font-bold">Wajib</span></div>
              <div class="flex gap-1"><button class="h-7 px-2.5 rounded-full bg-white border text-[11px] font-bold" @click="openAddVariantOption(vg.id)">+ Opsi</button><button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteVariantGroup(vg.id)"><Trash2 class="w-3.5 h-3.5" /></button></div>
            </div>
            <div v-if="vg.options.length===0" class="py-3 text-center text-[11px] text-slate-400 border border-dashed rounded-xl bg-white">Belum ada opsi. Tambah Regular, Besar, dll dengan foto.</div>
            <div v-for="opt in vg.options" :key="opt.id" class="bg-white border rounded-xl p-2.5 flex gap-2.5 items-start">
              <div class="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-5 h-5 text-slate-300" /></div>
              <div class="flex-1 min-w-0 space-y-1">
                <div class="flex items-center gap-1.5 flex-wrap"><p class="text-[12px] font-black truncate">{{ opt.label }}</p><span v-if="opt.is_default" class="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[8px] font-bold flex items-center gap-0.5"><Star class="w-2.5 h-2.5" /> Default</span><span class="px-1.5 py-0.5 rounded-full text-[8px] font-bold" :class="opt.is_available ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'">{{ opt.is_available ? 'Tersedia' : 'Habis' }}</span></div>
                <p class="text-[11px] font-bold" :class="opt.price_delta>=0 ? 'text-emerald-600' : 'text-rose-600'">{{ opt.price_delta===0 ? 'Harga dasar' : (opt.price_delta>0 ? `+Rp ${opt.price_delta.toLocaleString('id-ID')}` : `-Rp ${Math.abs(opt.price_delta).toLocaleString('id-ID')}`) }}</p>
              </div>
              <div class="flex flex-col gap-1 shrink-0">
                <div class="flex gap-1">
                  <button class="w-7 h-7 rounded-lg border bg-white flex items-center justify-center" title="Edit varian" @click="openEditVariantOption(vg.id,opt)"><Edit class="w-3.5 h-3.5" /></button>
                  <button class="w-7 h-7 rounded-lg border flex items-center justify-center" :class="opt.is_available ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'" title="Toggle habis/tersedia" @click="toggleVariantOptionAvailable(opt)"><Eye v-if="opt.is_available" class="w-3.5 h-3.5" /><EyeOff v-else class="w-3.5 h-3.5" /></button>
                </div>
                <button class="w-14 h-6 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteVariantOption(opt.id)"><Trash2 class="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showVariantManagerModal=false">Tutup</button></div></template>
    </UiModal>

    <!-- MODAL ADD VARIAN GROUP -->
    <UiModal v-model:open="showAddVariantGroupModal" title="Tambah Group Varian" max-width="max-w-md">
      <div class="space-y-4">
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Group *</label><input v-model="variantGroupForm.name" placeholder="Ukuran, Level Pedas..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Tipe</label><select v-model="variantGroupForm.type" class="h-11 w-full rounded-xl border px-3 text-[13px] font-bold"><option value="single">Single (pilih 1)</option><option value="multiple">Multiple</option></select></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Wajib?</label><select v-model="variantGroupForm.is_required" class="h-11 w-full rounded-xl border px-3 text-[13px] font-bold"><option :value="true">Wajib pilih</option><option :value="false">Opsional</option></select></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Min Pilih</label><input v-model.number="variantGroupForm.min_select" type="number" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Max Pilih</label><input v-model.number="variantGroupForm.max_select" type="number" placeholder="∞" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddVariantGroupModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold" @click="handleCreateVariantGroup">Tambah Group</button></div></template>
    </UiModal>

    <!-- MODAL ADD/EDIT VARIAN OPTION - FOTO FIX -->
    <UiModal v-model:open="showAddVariantOptionModal" :title="editingVariantOptionId ? 'Edit Opsi Varian' : 'Tambah Opsi Varian'" max-width="max-w-md">
      <div class="space-y-4">
        <div class="flex gap-3 items-start">
          <div class="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="variantOptionForm.previewUrl || variantOptionForm.image_url" :src="variantOptionForm.previewUrl || variantOptionForm.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-6 h-6 text-amber-400" /></div>
          <div class="flex-1 min-w-0 space-y-2">
            <button type="button" class="w-full h-10 rounded-xl border bg-white text-[12px] font-bold" @click="()=>{ cropperTarget='variantOption'; cropperVariantOptionTarget={ groupId: variantOptionForm.groupId, optionId: editingVariantOptionId, mode: editingVariantOptionId ? 'edit' : 'add' }; variantOptionFileRef?.click() }">{{ variantOptionForm.previewUrl || variantOptionForm.image_url ? 'Ganti Foto & Crop 1:1' : 'Upload Foto & Crop 1:1' }}</button>
            <input ref="variantOptionFileRef" type="file" accept="image/*" class="hidden" @change="(e)=>handleFileChange(e,'variantOption')" />
            <p class="text-[10px] text-slate-400 leading-tight">Foto 600x600, crop otomatis 1:1. Bisa dinonaktifkan jika habis.</p>
          </div>
        </div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Label *</label><input v-model="variantOptionForm.label" placeholder="Regular, Besar, Pedas Lv 3..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Harga ± (Rp)</label><input v-model.number="variantOptionForm.price_delta" type="number" placeholder="+3000 / -2000 / 0" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
          <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Urutan</label><input v-model.number="variantOptionForm.sort_order" type="number" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-11 text-[12px] font-bold"><input type="checkbox" v-model="variantOptionForm.is_default" class="w-4 h-4 rounded"> Default</label>
          <label class="flex items-center gap-2 bg-slate-50 border rounded-xl px-3 h-11 text-[12px] font-bold"><input type="checkbox" v-model="variantOptionForm.is_available" class="w-4 h-4 rounded"> Tersedia <span v-if="!variantOptionForm.is_available" class="text-[10px] text-rose-500">(Habis)</span></label>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddVariantOptionModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold" @click="handleSaveVariantOption">{{ editingVariantOptionId ? 'Simpan' : 'Tambah' }}</button></div></template>
    </UiModal>

    <!-- TAMBAHAN MANAGER MODAL -->
    <UiModal v-model:open="showAddonManagerModal" :title="`Kelola Tambahan — ${addonManagerMenu?.name||''}`" max-width="max-w-xl">
      <div class="space-y-4 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-[11px] text-amber-800">Tambahan per-menu: Keju, Sambal, Kerupuk. Bisa pakai dari master. Foto 400, toggle habis/tersedia.</div>
        <div v-if="addonManagerLoading" class="py-8 text-center"><RefreshCw class="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        <div v-else>
          <div class="flex items-center justify-between mb-3"><p class="text-[11px] font-black uppercase">Group Tambahan</p><button class="h-8 px-3 rounded-full bg-slate-900 text-white text-[11px] font-bold" @click="showAddAddonGroupModal=true">+ Group</button></div>
          <div v-if="addonManagerGroups.length===0" class="py-6 text-center border border-dashed rounded-2xl"><Sparkles class="w-8 h-8 mx-auto text-slate-300 mb-2" /><p class="text-xs font-bold">Belum ada tambahan</p></div>
          <div v-for="tg in addonManagerGroups" :key="tg.id" class="bg-amber-50/30 border border-amber-100 rounded-2xl p-3 space-y-3 mb-3">
            <div class="flex items-center justify-between"><p class="text-[12px] font-black">{{ tg.name }}</p><div class="flex gap-1"><button class="h-7 px-2.5 rounded-full bg-white border text-[11px] font-bold" @click="openAddAddonOption(tg.id)">+ Opsi</button><button class="w-7 h-7 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteAddonGroup(tg.id)"><Trash2 class="w-3.5 h-3.5" /></button></div></div>
            <div v-if="tg.options.length===0" class="py-3 text-center text-[11px] text-slate-400 border border-dashed rounded-xl bg-white">Belum ada opsi.</div>
            <div v-for="opt in tg.options" :key="opt.id" class="bg-white border rounded-xl p-2.5 flex gap-2.5 items-start">
              <div class="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden border flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-4 h-4 text-slate-300" /></div>
              <div class="flex-1 min-w-0"><p class="text-[12px] font-black truncate">{{ opt.label }}</p><p class="text-[11px] font-bold text-emerald-600">+Rp {{ Number(opt.price_delta).toLocaleString('id-ID') }}</p><span class="px-1.5 py-0.5 rounded-full text-[8px] font-bold" :class="opt.is_available ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'">{{ opt.is_available ? 'Tersedia' : 'Habis' }}</span></div>
              <div class="flex flex-col gap-1 shrink-0"><div class="flex gap-1"><button class="w-7 h-7 rounded-lg border bg-white flex items-center justify-center" @click="openEditAddonOption(tg.id,opt)"><Edit class="w-3.5 h-3.5" /></button><button class="w-7 h-7 rounded-lg border flex items-center justify-center" :class="opt.is_available ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'" @click="toggleAddonOptionAvailable(opt)"><Eye v-if="opt.is_available" class="w-3.5 h-3.5" /><EyeOff v-else class="w-3.5 h-3.5" /></button></div><button class="w-14 h-6 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center" @click="handleDeleteAddonOption(opt.id)"><Trash2 class="w-3 h-3" /></button></div>
            </div>
          </div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddonManagerModal=false">Tutup</button></div></template>
    </UiModal>

    <UiModal v-model:open="showAddAddonGroupModal" title="Tambah Group Tambahan" max-width="max-w-md">
      <div class="space-y-4">
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Group *</label><input v-model="addonGroupForm.name" placeholder="Tambahan, Topping" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="grid grid-cols-2 gap-3"><div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Tipe</label><select v-model="addonGroupForm.type" class="h-11 w-full rounded-xl border px-3 text-[13px] font-bold"><option value="single">Single</option><option value="multiple">Multiple</option></select></div><div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Wajib?</label><select v-model="addonGroupForm.is_required" class="h-11 w-full rounded-xl border px-3 text-[13px] font-bold"><option :value="false">Opsional</option><option :value="true">Wajib</option></select></div></div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddAddonGroupModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold" @click="handleCreateAddonGroup">Tambah</button></div></template>
    </UiModal>

    <UiModal v-model:open="showAddAddonOptionModal" :title="editingAddonOptionId ? 'Edit Tambahan' : 'Tambah Tambahan'" max-width="max-w-md">
      <div class="space-y-4">
        <div class="flex gap-3 items-start">
          <div class="w-20 h-20 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="addonOptionForm.previewUrl || addonOptionForm.image_url" :src="addonOptionForm.previewUrl || addonOptionForm.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-6 h-6 text-amber-400" /></div>
          <div class="flex-1 min-w-0 space-y-2">
            <button type="button" class="w-full h-10 rounded-xl border bg-white text-[12px] font-bold active:scale-[0.98]" @click="openAddonOptionFilePicker">{{ addonOptionForm.previewUrl || addonOptionForm.image_url ? 'Ganti Foto' : 'Upload Foto 400' }}</button>
            <input ref="addonOptionFileRef" type="file" accept="image/*" class="hidden" @change="(e)=>handleFileChange(e,'addonOption')" />
            <p class="text-[10px] text-slate-400">Foto 400, toggle habis/tersedia.</p>
          </div>
        </div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Label *</label><input v-model="addonOptionForm.label" placeholder="Keju, Sambal..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="grid grid-cols-2 gap-3"><div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Harga +Rp</label><input v-model.number="addonOptionForm.price_delta" type="number" placeholder="3000" class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div><div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Tersedia</label><select v-model="addonOptionForm.is_available" class="h-11 w-full rounded-xl border px-3 text-[13px] font-bold"><option :value="true">Tersedia</option><option :value="false">Habis</option></select></div></div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddAddonOptionModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold" @click="handleSaveAddonOption">{{ editingAddonOptionId ? 'Simpan' : 'Tambah' }}</button></div></template>
    </UiModal>

    <UiModal v-model:open="showCategoryModal" title="Kategori" max-width="max-w-md">
      <div class="space-y-4">
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-[11px] text-indigo-700">Icon 1:1 400, COS auto-delete.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Kategori *</label><input v-model="categoryForm.name" placeholder="Makanan..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase flex items-center gap-2">Icon Foto <span class="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[8px] border">1:1 • 400</span></label>
          <div class="flex items-center gap-3"><div class="w-12 h-12 rounded-full border-2 border-dashed border-indigo-200 bg-indigo-50/50 overflow-hidden flex items-center justify-center shrink-0"><img v-if="categoryPreviewUrl" :src="categoryPreviewUrl" class="w-full h-full object-cover" /><Tag v-else class="w-5 h-5 text-indigo-300" /></div><button type="button" class="h-9 px-3 rounded-xl bg-slate-900 text-white text-[11px] font-bold active:scale-[0.98]" @click="openCategoryFilePicker">{{ categoryPreviewUrl ? 'Ganti & Crop' : 'Upload & Crop' }}</button><input ref="catFileInputRef" type="file" accept="image/*" class="hidden" @change="(e)=>handleFileChange(e,'category')" /></div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showCategoryModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-slate-900 text-white text-[13px] font-bold disabled:opacity-50" :disabled="saveCategoryLoading" @click="handleSaveCategory">{{ saveCategoryLoading ? '...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <UiModal v-model:open="showAddonMasterModal" title="Tambahan Master" max-width="max-w-lg">
      <div class="space-y-4 max-h-[65vh] overflow-y-auto overflow-x-hidden pr-1">
        <div class="bg-amber-50 border border-amber-100 rounded-xl p-2.5 text-[11px] text-amber-800">Shared banyak menu: Keju, Sambal. Opsi foto 400.</div>
        <div class="space-y-1.5"><label class="text-[10px] font-bold uppercase text-slate-600">Nama Tambahan *</label><input v-model="addonMasterForm.name" placeholder="Keju, Sambal..." class="h-11 w-full rounded-xl border px-4 text-[13px] font-bold"></div>
        <div class="space-y-2">
          <div class="flex items-center justify-between"><p class="text-[11px] font-black uppercase">Opsi dengan Foto 400</p><button class="h-7 px-3 rounded-full bg-primary text-white text-[11px] font-bold" @click="addonMasterOptions.push({ label:'', price_delta:3000, image_url:'', previewUrl:'' })">+ Opsi</button></div>
          <div v-for="(opt,idx) in addonMasterOptions" :key="idx" class="bg-white border rounded-xl p-2.5 flex gap-2 items-center">
            <div class="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 overflow-hidden flex items-center justify-center shrink-0"><img v-if="opt.previewUrl || opt.image_url" :src="opt.previewUrl || opt.image_url" class="w-full h-full object-cover" /><Camera v-else class="w-5 h-5 text-amber-300" /></div>
            <div class="flex-1 min-w-0 space-y-1.5">
              <input v-model="opt.label" placeholder="Keju" class="w-full h-8 rounded-lg border px-2.5 text-[12px] font-bold focus:border-primary focus:outline-none">
              <div class="flex gap-1.5"><input v-model.number="opt.price_delta" type="number" placeholder="3000" class="flex-1 min-w-0 h-8 rounded-lg border px-2 text-[11px] font-bold"><button type="button" class="shrink-0 h-8 px-2.5 rounded-lg bg-amber-50 border text-[10px] font-bold text-amber-700 active:scale-[0.98]" @click="()=>{ cropperAddonMasterIdx=idx; cropperTarget='addonMasterOption'; const input=document.createElement('input'); input.type='file'; input.accept='image/*'; input.onchange=(ev:any)=>{ const f=ev.target?.files?.[0]; if (!f) return; if (cropperSrc) URL.revokeObjectURL(cropperSrc); cropperSrc=URL.createObjectURL(f); cropperOpen=true }; input.click() }">Foto</button></div>
            </div>
            <button class="w-8 h-8 rounded-full bg-rose-50 border border-rose-100 text-rose-500 flex items-center justify-center shrink-0" @click="addonMasterOptions.splice(idx,1)"><Trash2 class="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>
      <template #footer><div class="flex gap-3 pt-4 border-t mt-4"><button class="flex-1 h-11 rounded-xl border text-[13px] font-bold" @click="showAddonMasterModal=false">Batal</button><button class="flex-1 h-11 rounded-xl bg-primary text-white text-[13px] font-bold disabled:opacity-50" :disabled="addonMasterSaving" @click="handleSaveAddonMaster">{{ addonMasterSaving ? '...' : 'Simpan' }}</button></div></template>
    </UiModal>

    <CommonImageCropper v-if="cropperOpen" :src="cropperSrc" :type="cropperTarget==='category' ? 'logo' : cropperTarget==='addonMasterOption' ? 'logo' : cropperTarget==='addonOption' ? 'logo' : cropperTarget==='variantOption' ? 'logo' : 'product'" @cropped="onCropped" @cancel="onCropCancel" />
  </div>
</template>
