<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import Konva from 'konva'
import { useCanvasStore } from '../stores/canvas'
import type { PetLayer } from '../stores/canvas'

const store = useCanvasStore()

const outerRef = ref<HTMLDivElement>()
const containerRef = ref<HTMLDivElement>()
const stageRef = ref<Konva.Stage>()
const layerRef = ref<Konva.Layer>()
const transformerRef = ref<Konva.Transformer>()

const bgImageRef = ref<Konva.Image>()
const petNodesMap = ref<Map<string, Konva.Image>>(new Map())

const CANVAS_MAX_W = 860
const CANVAS_MAX_H = 580

// 表示用（ステージの論理サイズ）
const canvasWidth = ref(CANVAS_MAX_W)
const canvasHeight = ref(CANVAS_MAX_H)
// コンテナに合わせた表示スケール
const displayScale = ref(1)

let resizeObserver: ResizeObserver | null = null

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

/**
 * コンテナ幅に応じてステージを CSS スケーリング
 * Konva の論理座標系は変えず、外側 div を transform: scale() するだけ
 * → ドラッグ・タップ座標の補正は Konva が処理する
 */
function updateDisplayScale() {
  if (!outerRef.value) return
  const available = outerRef.value.clientWidth
  if (available <= 0) return
  const ratio = Math.min(1, available / canvasWidth.value)
  displayScale.value = ratio
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
    if (e.target === stage || (e.target instanceof Konva.Image && e.target === bgImageRef.value)) {
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
    updateDisplayScale()
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
    const cx = canvasWidth.value / 2
    const cy = canvasHeight.value / 2

    store.updateLayerTransform(layer.id, { x: cx, y: cy, scaleX: scale, scaleY: scale })

    const node = new Konva.Image({
      id: layer.id,
      image: img,
      x: cx,
      y: cy,
      width: layer.width,
      height: layer.height,
      offsetX: layer.width / 2,
      offsetY: layer.height / 2,
      scaleX: scale,
      scaleY: scale,
      rotation: layer.rotation,
      opacity: layer.opacity,
      visible: layer.visible,
      draggable: true,
    })

    node.on('click tap', () => { store.selectLayer(layer.id) })

    node.on('dragend', () => {
      store.updateLayerTransform(layer.id, { x: node.x(), y: node.y() })
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
  node.offsetX(layer.width / 2)
  node.offsetY(layer.height / 2)
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

function syncLayerOrder() {
  if (!layerRef.value) return
  store.petLayers.forEach((layer, idx) => {
    const node = petNodesMap.value.get(layer.id)
    if (node) node.zIndex(idx + 1)
  })
  bringTransformerToTop()
  layerRef.value.batchDraw()
}

// 背景画像の変更
watch(() => store.backgroundUrl, (url) => {
  if (url) loadBgImage(url)
})

// レイヤー追加・削除
watch(
  () => store.petLayers.map(l => l.id),
  (newIds, oldIds) => {
    if (!oldIds) return
    oldIds.filter(id => !newIds.includes(id)).forEach(removePetNode)
  },
)

// 処理完了 (status: done) になったらキャンバスに追加
watch(
  () => store.petLayers.map(l => ({ id: l.id, status: l.status, removedUrl: l.removedUrl })),
  (layers) => {
    layers.forEach(l => {
      if (l.status === 'done' && l.removedUrl) addPetNode(store.petLayers.find(pl => pl.id === l.id)!)
    })
    syncLayerOrder()
  },
)

// 表示プロパティの変更（opacity, visible, transform）を反映
watch(
  () => store.petLayers.map(l => ({
    id: l.id, x: l.x, y: l.y, scaleX: l.scaleX, scaleY: l.scaleY,
    rotation: l.rotation, opacity: l.opacity, visible: l.visible,
  })),
  (layers) => {
    layers.forEach(l => {
      if (petNodesMap.value.has(l.id)) {
        updatePetNode(store.petLayers.find(pl => pl.id === l.id)!)
      }
    })
  },
)

watch(() => store.selectedLayerId, syncSelectedTransformer)

// 書き出し中は Transformer を描画しない（PNG に枠が写り込まない）
watch(
  () => store.isExporting,
  (exporting) => {
    const tr = transformerRef.value
    if (!tr || !layerRef.value) return
    tr.visible(!exporting)
    if (!exporting) syncSelectedTransformer(store.selectedLayerId)
    layerRef.value.batchDraw()
  },
)

defineExpose({
  getStage: () => stageRef.value,
  getDisplayScale: () => displayScale.value,
})

onMounted(() => {
  initStage()
  if (store.backgroundUrl) loadBgImage(store.backgroundUrl)

  resizeObserver = new ResizeObserver(() => updateDisplayScale())
  if (outerRef.value) resizeObserver.observe(outerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  stageRef.value?.destroy()
})
</script>

<template>
  <div ref="outerRef" class="canvas-outer">
    <div
      class="canvas-wrapper"
      :style="{
        width: canvasWidth + 'px',
        height: canvasHeight + 'px',
        transform: `scale(${displayScale})`,
        transformOrigin: 'top left',
      }"
    >
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
    <!-- scale 分だけ外側 div の高さを確保するスペーサー -->
    <div
      aria-hidden="true"
      :style="{
        height: Math.round(canvasHeight * displayScale) + 'px',
        pointerEvents: 'none',
      }"
    />
  </div>
</template>

<style scoped>
.canvas-outer {
  width: 100%;
  max-width: 100%;
  position: relative;
  overflow: hidden;
}

.canvas-wrapper {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 32px rgba(0, 0, 0, 0.4);
  background: #1a1a2e;
  position: absolute;
  top: 0;
  left: 0;
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
