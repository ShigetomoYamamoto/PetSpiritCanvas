<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore } from './stores/canvas'
import { resizeImageIfNeeded } from './utils/imageUtils'
import { removeBg } from './utils/backgroundRemoval'
import ImageUploader from './components/ImageUploader.vue'
import CanvasEditor from './components/CanvasEditor.vue'
import LayerPanel from './components/LayerPanel.vue'
import EditPanel from './components/EditPanel.vue'
import ExportBar from './components/ExportBar.vue'

const store = useCanvasStore()
const canvasEditorRef = ref<InstanceType<typeof CanvasEditor>>()
const errorMsg = ref('')
const petErrors = ref<Record<string, string>>({})

function showError(msg: string) {
  errorMsg.value = msg
  setTimeout(() => (errorMsg.value = ''), 5000)
}

async function onBackgroundUpload(file: File) {
  errorMsg.value = ''
  try {
    const { url, width, height } = await resizeImageIfNeeded(file)
    store.setBackground(url, width, height)
  } catch (e: unknown) {
    showError((e as Error).message)
  }
}

async function onPetUpload(file: File) {
  if (!store.canAddPet) {
    showError('ペット画像は最大3枚までです')
    return
  }
  errorMsg.value = ''
  const id = crypto.randomUUID()
  const name = file.name.replace(/\.[^.]+$/, '')

  try {
    const { url, width, height } = await resizeImageIfNeeded(file)
    store.addPetLayer(id, name, url, width, height)
    store.updateLayerStatus(id, 'processing')

    const removedUrl = await removeBg(url)
    store.updateLayerStatus(id, 'done', removedUrl)
  } catch (e: unknown) {
    const msg = (e as Error).message ?? '背景除去に失敗しました'
    store.updateLayerStatus(id, 'error', undefined, msg)
    petErrors.value[id] = msg
  }
}
</script>

<template>
  <div class="app">
    <!-- Header -->
    <header class="app-header">
      <div class="header-inner">
        <div class="logo">
          <span class="logo-icon">🐾</span>
          <div>
            <h1 class="app-title">Pet Spirit Canvas</h1>
            <p class="app-subtitle">ペット幻想合成画像メーカー</p>
          </div>
        </div>
        <p class="app-desc">
          風景画像にペットを幻想的に重ねた思い出画像を、ブラウザだけで簡単作成
        </p>
      </div>
    </header>

    <!-- Error Banner -->
    <Transition name="fade">
      <div v-if="errorMsg" class="error-banner">
        ⚠️ {{ errorMsg }}
      </div>
    </Transition>

    <!-- Main Layout -->
    <main class="main-layout">
      <!-- Left Sidebar -->
      <aside class="sidebar left-sidebar">
        <section class="sidebar-section">
          <h2 class="section-title">① 風景画像</h2>
          <ImageUploader
            label="風景画像をアップロード"
            sublabel="PNG / JPEG / WebP"
            :has-image="!!store.backgroundUrl"
            @upload="onBackgroundUpload"
            @error="showError"
          />
          <div v-if="store.backgroundUrl" class="bg-preview">
            <img :src="store.backgroundUrl" alt="背景" class="bg-thumb" />
            <button class="small-btn danger" @click="store.setBackground('', 0, 0)">削除</button>
          </div>
        </section>

        <section class="sidebar-section">
          <h2 class="section-title">② ペット画像</h2>
          <p class="section-hint">最大3枚 / 背景が自動除去されます</p>
          <ImageUploader
            label="ペット画像を追加"
            sublabel="PNG / JPEG / WebP"
            :disabled="!store.canAddPet"
            @upload="onPetUpload"
            @error="showError"
          />
          <div
            v-for="layer in store.petLayers"
            :key="layer.id"
            class="pet-status-row"
          >
            <span class="pet-status-name">{{ layer.name }}</span>
            <span class="pet-status-badge" :class="layer.status">
              <template v-if="layer.status === 'processing'">
                <span class="spinner" />
                背景除去中…
              </template>
              <template v-else-if="layer.status === 'done'">✅ 完了</template>
              <template v-else-if="layer.status === 'error'">❌ 失敗</template>
              <template v-else>待機</template>
            </span>
          </div>
        </section>

        <section class="sidebar-section">
          <LayerPanel />
        </section>
      </aside>

      <!-- Canvas Area -->
      <div class="canvas-area">
        <CanvasEditor ref="canvasEditorRef" />
        <div class="usage-steps" v-if="!store.backgroundUrl">
          <div class="step" v-for="(s, i) in ['風景画像をアップロード', 'ペット画像を追加（背景自動除去）', 'キャンバス上でドラッグ・調整', '完成したらPNGダウンロード']" :key="i">
            <span class="step-num">{{ i + 1 }}</span>
            <span class="step-text">{{ s }}</span>
          </div>
        </div>
      </div>

      <!-- Right Sidebar -->
      <aside class="sidebar right-sidebar">
        <section class="sidebar-section">
          <EditPanel />
        </section>
      </aside>
    </main>

    <!-- Export Bar -->
    <footer class="export-footer">
      <ExportBar :get-stage="() => canvasEditorRef?.getStage()" />
    </footer>
  </div>
</template>

<style>
*, *::before, *::after {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: #0f0f1a;
  color: #e2d9f3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
}
</style>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.app-header {
  background: linear-gradient(135deg, #1a0a2e 0%, #16213e 100%);
  border-bottom: 1px solid rgba(124, 58, 237, 0.3);
  padding: 16px 24px;
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.logo-icon {
  font-size: 2.2rem;
}
.app-title {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 800;
  background: linear-gradient(135deg, #a78bfa, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.app-subtitle {
  margin: 0;
  font-size: 0.72rem;
  color: #9ca3af;
}
.app-desc {
  margin: 0;
  font-size: 0.8rem;
  color: #9ca3af;
  flex: 1;
}

/* Error Banner */
.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border-bottom: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 10px 24px;
  font-size: 0.82rem;
  text-align: center;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* Main Layout */
.main-layout {
  flex: 1;
  display: flex;
  gap: 0;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  padding: 16px;
  gap: 16px;
  align-items: flex-start;
}

.sidebar {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.canvas-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.sidebar-section {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 700;
  color: #c4b5fd;
}
.section-hint {
  margin: 0;
  font-size: 0.7rem;
  color: #6b7280;
}

.bg-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}
.bg-thumb {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.small-btn {
  font-size: 0.7rem;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}
.small-btn:hover {
  background: rgba(239, 68, 68, 0.3);
}

.pet-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.72rem;
  padding: 4px 0;
}
.pet-status-name {
  color: #e5e7eb;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pet-status-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  color: #9ca3af;
}
.pet-status-badge.done { color: #6ee7b7; }
.pet-status-badge.error { color: #f87171; }
.pet-status-badge.processing { color: #fbbf24; }

.spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid rgba(251, 191, 36, 0.3);
  border-top-color: #fbbf24;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Usage Steps */
.usage-steps {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  padding: 16px;
}
.step {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 14px;
}
.step-num {
  width: 22px;
  height: 22px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.step-text {
  font-size: 0.75rem;
  color: #9ca3af;
}

/* Export Footer */
.export-footer {
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding: 16px 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

/* Responsive */
@media (max-width: 900px) {
  .main-layout {
    flex-direction: column;
    align-items: stretch;
  }
  .sidebar {
    width: 100%;
  }
  .left-sidebar, .right-sidebar {
    flex-direction: row;
    flex-wrap: wrap;
  }
  .left-sidebar .sidebar-section,
  .right-sidebar .sidebar-section {
    flex: 1;
    min-width: 200px;
  }
}
</style>
