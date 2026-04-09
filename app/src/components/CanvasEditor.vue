<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import Konva from 'konva'
import { useCanvasStore } from '../stores/canvas'
import type { PetLayer } from '../stores/canvas'

const store = useCanvasStore()

const containerRef = ref<HTMLDivElement>()
const stageRef = ref<Konva.Stage>()
const layerRef = ref<Konva.Layer>()
const transformerRef = ref<Konva.Transformer>()

const bgImageRef = ref<Konva.Image>()
const petNodesMap = ref<Map<string, Konva.Image>>(new Map())

const CANVAS_MAX_W = 860
const CANVAS_MAX_H = 580

const canvasWidth = ref(CANVAS_MAX_W)
const canvasHeight = ref(CANVAS_MAX_H)

function calcCanvasSize(bgW: number, bgH: number) {
  if (bgW === 0 || bgH === 0) return { w: CANVAS_MAX_W, h: CANVAS_MAX_H }
  const ratio = bgW / bgH
  let w = CANVAS_MAX_W
  let h = Math.round(w / ratio)
  if (h > CANVAS_MAX_H) {
    h = CANVAS_MAX_H
    w = Math.round(h * ratio)
  }
  return { w, h }
}

function initStage() {
  if (!containerRef.value) return
  const stage = new Konva.Stage({
    container: containerRef.value,
    width: canvasWidth.value,
    height: canvasHeight.value,
  })
  const layer = new Konva.Layer()
  stage.add(layer)

  const tr = new Konva.Transformer({
    rotateEnabled: true,
    borderStroke: '#7c3aed',
    anchorStroke: '#7c3aed',
    anchorFill: '#fff',
    anchorSize: 10,
    borderStrokeWidth: 2,
  })
  layer.add(tr)

  stage.on('click tap', (e) => {
    if (e.target === stage || e.target instanceof Konva.Image && e.target === bgImageRef.value) {
      store.selectLayer(null)
      tr.nodes([])
      layer.batchDraw()
    }
  })

  stageRef.value = stage
  layerRef.value = layer
  transformerRef.value = tr
}

function loadBgImage(url: string) {
  if (!layerRef.value || !stageRef.value) return
  const img = new window.Image()
  img.onload = () => {
    const { w, h } = calcCanvasSize(img.width, img.height)
    canvasWidth.value = w
    canvasHeight.value = h
    stageRef.value!.width(w)
    stageRef.value!.height(h)

    if (bgImageRef.value) {
      bgImageRef.value.image(img)
      bgImageRef.value.width(w)
      bgImageRef.value.height(h)
    } else {
      const konvaImg = new Konva.Image({
        image: img,
        x: 0,
        y: 0,
        width: w,
        height: h,
        listening: false,
      })
      layerRef.value!.add(konvaImg)
      konvaImg.moveToBottom()
      bgImageRef.value = konvaImg
    }
    layerRef.value!.batchDraw()
  }
  img.src = url
}

function addPetNode(layer: PetLayer) {
  if (!layerRef.value || !layer.removedUrl) return
  if (petNodesMap.value.has(layer.id)) {
    updatePetNode(layer)
    return
  }
  const img = new window.Image()
  img.onload = () => {
    const maxW = canvasWidth.value * 0.4
    const scale = layer.width > maxW ? maxW / layer.width : 1
    const x = (canvasWidth.value - layer.width * scale) / 2
    const y = (canvasHeight.value - layer.height * scale) / 2

    store.updateLayerTransform(layer.id, {
      x,
      y,
      scaleX: scale,
      scaleY: scale,
    })

    const node = new Konva.Image({
      id: layer.id,
      image: img,
      x,
      y,
      width: layer.width,
      height: layer.height,
      scaleX: scale,
      scaleY: scale,
      rotation: layer.rotation,
      opacity: layer.opacity,
      visible: layer.visible,
      draggable: true,
    })

    node.on('click tap', () => {
      store.selectLayer(layer.id)
    })

    node.on('dragend', () => {
      store.updateLayerTransform(layer.id, {
        x: node.x(),
        y: node.y(),
      })
    })

    node.on('transformend', () => {
      store.updateLayerTransform(layer.id, {
        x: node.x(),
        y: node.y(),
        scaleX: node.scaleX(),
        scaleY: node.scaleY(),
        rotation: node.rotation(),
      })
    })

    layerRef.value!.add(node)
    petNodesMap.value.set(layer.id, node)
    bringTransformerToTop()
    layerRef.value!.batchDraw()
  }
  img.src = layer.removedUrl
}

function updatePetNode(layer: PetLayer) {
  const node = petNodesMap.value.get(layer.id)
  if (!node) return
  node.x(layer.x)
  node.y(layer.y)
  node.scaleX(layer.scaleX)
  node.scaleY(layer.scaleY)
  node.rotation(layer.rotation)
  node.opacity(layer.opacity)
  node.visible(layer.visible)
  layerRef.value?.batchDraw()
}

function removePetNode(id: string) {
  const node = petNodesMap.value.get(id)
  if (node) {
    node.destroy()
    petNodesMap.value.delete(id)
    transformerRef.value?.nodes([])
    layerRef.value?.batchDraw()
  }
}

function bringTransformerToTop() {
  transformerRef.value?.moveToTop()
}

function syncSelectedTransformer(id: string | null) {
  if (!transformerRef.value || !layerRef.value) return
  if (!id) {
    transformerRef.value.nodes([])
  } else {
    const node = petNodesMap.value.get(id)
    if (node) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformerRef.value.nodes([node as any])
      bringTransformerToTop()
    }
  }
  layerRef.value.batchDraw()
}

watch(() => store.backgroundUrl, (url) => {
  if (url) loadBgImage(url)
})

watch(
  () => store.petLayers.map(l => l.id),
  (newIds, oldIds) => {
    if (!oldIds) return
    const removed = oldIds.filter(id => !newIds.includes(id))
    removed.forEach(removePetNode)
  },
  { deep: true }
)

watch(
  () => store.petLayers,
  (layers) => {
    layers.forEach(layer => {
      if (layer.status === 'done' && layer.removedUrl) {
        addPetNode(layer)
      } else if (petNodesMap.value.has(layer.id)) {
        updatePetNode(layer)
      }
    })
    syncLayerOrder()
  },
  { deep: true }
)

watch(() => store.selectedLayerId, syncSelectedTransformer)

function syncLayerOrder() {
  if (!layerRef.value) return
  store.petLayers.forEach((layer, idx) => {
    const node = petNodesMap.value.get(layer.id)
    if (node) {
      node.zIndex(idx + 1)
    }
  })
  bringTransformerToTop()
  layerRef.value.batchDraw()
}

const exportImage = computed(() => store.isExporting)
watch(exportImage, async (exporting) => {
  if (exporting && stageRef.value) {
    await new Promise(r => setTimeout(r, 50))
  }
})

defineExpose({ getStage: () => stageRef.value })

onMounted(() => {
  initStage()
  if (store.backgroundUrl) loadBgImage(store.backgroundUrl)
})

onUnmounted(() => {
  stageRef.value?.destroy()
})
</script>

<template>
  <div class="canvas-wrapper">
    <div
      ref="containerRef"
      class="konva-container"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
    />
    <div v-if="!store.backgroundUrl" class="canvas-placeholder">
      <div class="placeholder-content">
        <span class="ph-icon">🌄</span>
        <span class="ph-text">風景画像をアップロードして開始</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
  background: #1a1a2e;
  display: inline-block;
  max-width: 100%;
}
.konva-container {
  display: block;
}
.canvas-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  pointer-events: none;
}
.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.ph-icon {
  font-size: 3rem;
  opacity: 0.5;
}
.ph-text {
  font-size: 0.9rem;
  color: #6b7280;
}
</style>
