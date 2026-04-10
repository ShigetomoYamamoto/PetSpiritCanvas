<script setup lang="ts">
import { ref } from 'vue'
import Konva from 'konva'
import { useCanvasStore } from '../stores/canvas'
import { generateFilename } from '../utils/imageUtils'

const props = defineProps<{
  getStage: () => Konva.Stage | undefined
  getDisplayScale?: () => number
}>()

const store = useCanvasStore()
const exportStatus = ref<'idle' | 'exporting' | 'done' | 'error'>('idle')
const errorMsg = ref('')
const lastFilename = ref('')
const lastExportWasShare = ref(false)

/** ステージを PNG の File にレンダリング（書き出し中は Transformer を非表示） */
async function renderStageToPngFile(): Promise<File> {
  const stage = props.getStage()
  if (!stage) throw new Error('キャンバスがありません')
  store.setExporting(true)
  await new Promise(r => requestAnimationFrame(r))
  try {
    const scale = props.getDisplayScale?.() ?? 1
    const pixelRatio = scale > 0 ? 1 / scale : 1
    const dataUrl = stage.toDataURL({ pixelRatio, mimeType: 'image/png' })
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], generateFilename(), { type: 'image/png' })
  } finally {
    store.setExporting(false)
  }
}

async function handleExport() {
  if (!props.getStage()) return
  if (!store.backgroundUrl) {
    errorMsg.value = '風景画像をアップロードしてください'
    return
  }

  exportStatus.value = 'exporting'
  errorMsg.value = ''
  lastExportWasShare.value = false

  try {
    const file = await renderStageToPngFile()
    lastFilename.value = file.name

    const sharePayload: ShareData = {
      files: [file],
      title: 'Pet Spirit Canvas',
    }

    if (typeof navigator !== 'undefined' && navigator.canShare?.(sharePayload)) {
      await navigator.share(sharePayload)
      lastExportWasShare.value = true
    } else {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }

    exportStatus.value = 'done'
    setTimeout(() => (exportStatus.value = 'idle'), 4000)
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      exportStatus.value = 'idle'
      return
    }
    exportStatus.value = 'error'
    errorMsg.value = '書き出しに失敗しました。もう一度お試しください。'
  }
}

function handleXShare() {
  const text = 'うちの子の思い出画像を作りました✨'
  const hashtags = '%23ペット%20%23思い出%20%23PetSpiritCanvas'
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + '\n')}&hashtags=${hashtags}`
  window.open(url, '_blank', 'noopener,noreferrer')
}

async function handleWebShare() {
  if (!props.getStage() || !store.backgroundUrl) return
  errorMsg.value = ''
  try {
    const file = await renderStageToPngFile()
    await navigator.share({
      title: 'Pet Spirit Canvas',
      text: 'うちの子の思い出画像を作りました✨ #ペット #思い出',
      files: [file],
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return
    errorMsg.value = '共有に失敗しました。PNGダウンロードをお試しください。'
  }
}

const canShare = typeof navigator !== 'undefined' && 'share' in navigator
</script>

<template>
  <div class="export-bar">
    <button
      class="btn primary"
      :disabled="exportStatus === 'exporting' || !store.backgroundUrl"
      @click="handleExport"
    >
      <span v-if="exportStatus === 'exporting'">⏳ 書き出し中…</span>
      <span v-else-if="exportStatus === 'done'">✅ 完了!</span>
      <span v-else>⬇️ PNGダウンロード</span>
    </button>

    <button class="btn x-btn" @click="handleXShare" :disabled="!store.backgroundUrl">
      𝕏 Xに投稿する
    </button>

    <button
      v-if="canShare"
      class="btn share-btn"
      @click="handleWebShare"
      :disabled="!store.backgroundUrl"
    >
      📤 共有
    </button>

    <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    <p v-if="exportStatus === 'done'" class="success-msg">
      <template v-if="lastExportWasShare">
        共有シートが開きました。「写真に保存」やギャラリーへ保存を選べます。
      </template>
      <template v-else>
        「{{ lastFilename }}」をダウンロードしました。Xに投稿する場合は、ダウンロードした画像を手動で添付してください。
      </template>
    </p>
  </div>
</template>

<style scoped>
.export-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  max-width: 100%;
}
.btn {
  padding: 10px 20px;
  font-size: 0.85rem;
  font-weight: 700;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  max-width: 100%;
  touch-action: manipulation;
}
.btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.primary {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
  box-shadow: 0 2px 12px rgba(124, 58, 237, 0.4);
}
.primary:not(:disabled):hover {
  background: linear-gradient(135deg, #6d28d9, #9333ea);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.5);
}
.x-btn {
  background: #000;
  color: #fff;
  border: 1px solid #333;
}
.x-btn:not(:disabled):hover {
  background: #1a1a1a;
}
.share-btn {
  background: rgba(16, 185, 129, 0.2);
  color: #6ee7b7;
  border: 1px solid rgba(16, 185, 129, 0.4);
}
.share-btn:not(:disabled):hover {
  background: rgba(16, 185, 129, 0.3);
}
.error-msg {
  color: #f87171;
  font-size: 0.75rem;
  margin: 0;
  width: 100%;
}
.success-msg {
  color: #6ee7b7;
  font-size: 0.75rem;
  margin: 0;
  width: 100%;
}
</style>
