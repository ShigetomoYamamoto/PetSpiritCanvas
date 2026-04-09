import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type ProcessingStatus = 'idle' | 'processing' | 'done' | 'error'

export interface PetLayer {
  id: string
  name: string
  originalUrl: string
  removedUrl: string | null
  status: ProcessingStatus
  errorMessage: string | null
  visible: boolean
  x: number
  y: number
  scaleX: number
  scaleY: number
  rotation: number
  opacity: number
  width: number
  height: number
}

export const useCanvasStore = defineStore('canvas', () => {
  const backgroundUrl = ref<string | null>(null)
  const backgroundWidth = ref(0)
  const backgroundHeight = ref(0)
  const petLayers = ref<PetLayer[]>([])
  const selectedLayerId = ref<string | null>(null)
  const isExporting = ref(false)

  const selectedLayer = computed(() =>
    petLayers.value.find((l) => l.id === selectedLayerId.value) ?? null
  )

  const canAddPet = computed(() => petLayers.value.length < 3)

  function setBackground(url: string, width: number, height: number) {
    backgroundUrl.value = url
    backgroundWidth.value = width
    backgroundHeight.value = height
  }

  function addPetLayer(id: string, name: string, originalUrl: string, width: number, height: number) {
    const layer: PetLayer = {
      id,
      name,
      originalUrl,
      removedUrl: null,
      status: 'idle',
      errorMessage: null,
      visible: true,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      opacity: 0.85,
      width,
      height,
    }
    petLayers.value.push(layer)
    selectedLayerId.value = id
    return layer
  }

  function updateLayerStatus(id: string, status: ProcessingStatus, removedUrl?: string, error?: string) {
    const layer = petLayers.value.find((l) => l.id === id)
    if (!layer) return
    layer.status = status
    if (removedUrl) layer.removedUrl = removedUrl
    if (error) layer.errorMessage = error
  }

  function updateLayerTransform(
    id: string,
    updates: Partial<Pick<PetLayer, 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation' | 'opacity' | 'visible'>>
  ) {
    const layer = petLayers.value.find((l) => l.id === id)
    if (!layer) return
    Object.assign(layer, updates)
  }

  function selectLayer(id: string | null) {
    selectedLayerId.value = id
  }

  function removeLayer(id: string) {
    const idx = petLayers.value.findIndex((l) => l.id === id)
    if (idx >= 0) petLayers.value.splice(idx, 1)
    if (selectedLayerId.value === id) {
      selectedLayerId.value = petLayers.value[0]?.id ?? null
    }
  }

  function moveLayerUp(id: string) {
    const idx = petLayers.value.findIndex((l) => l.id === id)
    if (idx < petLayers.value.length - 1) {
      const tmp = petLayers.value[idx]
      petLayers.value[idx] = petLayers.value[idx + 1]
      petLayers.value[idx + 1] = tmp
    }
  }

  function moveLayerDown(id: string) {
    const idx = petLayers.value.findIndex((l) => l.id === id)
    if (idx > 0) {
      const tmp = petLayers.value[idx]
      petLayers.value[idx] = petLayers.value[idx - 1]
      petLayers.value[idx - 1] = tmp
    }
  }

  function setExporting(v: boolean) {
    isExporting.value = v
  }

  return {
    backgroundUrl,
    backgroundWidth,
    backgroundHeight,
    petLayers,
    selectedLayerId,
    selectedLayer,
    canAddPet,
    isExporting,
    setBackground,
    addPetLayer,
    updateLayerStatus,
    updateLayerTransform,
    selectLayer,
    removeLayer,
    moveLayerUp,
    moveLayerDown,
    setExporting,
  }
})
