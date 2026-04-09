<script setup lang="ts">
import { computed } from 'vue'
import { useCanvasStore } from '../stores/canvas'

const store = useCanvasStore()

const layer = computed(() => store.selectedLayer)

function update(key: string, value: number | boolean) {
  if (!layer.value) return
  store.updateLayerTransform(layer.value.id, { [key]: value })
}

const displayWidth = computed(() =>
  layer.value ? Math.round(layer.value.width * layer.value.scaleX) : 0
)

function setWidth(v: number) {
  if (!layer.value || layer.value.width === 0) return
  const ratio = v / layer.value.width
  update('scaleX', ratio)
  update('scaleY', ratio)
}
</script>

<template>
  <div class="edit-panel">
    <h3 class="panel-title">編集</h3>
    <div v-if="!layer" class="empty-hint">
      レイヤーを選択してください
    </div>
    <template v-else>
      <div class="control-group">
        <label class="ctrl-label">透明度</label>
        <div class="slider-row">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="layer.opacity"
            @input="(e) => update('opacity', parseFloat((e.target as HTMLInputElement).value))"
          />
          <span class="val">{{ Math.round(layer.opacity * 100) }}%</span>
        </div>
      </div>

      <div class="control-group">
        <label class="ctrl-label">サイズ (幅px)</label>
        <div class="slider-row">
          <input
            type="range"
            min="50"
            :max="Math.max(store.backgroundWidth, 800)"
            step="1"
            :value="displayWidth"
            @input="(e) => setWidth(parseFloat((e.target as HTMLInputElement).value))"
          />
          <span class="val">{{ displayWidth }}px</span>
        </div>
      </div>

      <div class="control-group">
        <label class="ctrl-label">回転</label>
        <div class="slider-row">
          <input
            type="range"
            min="-180"
            max="180"
            step="1"
            :value="layer.rotation"
            @input="(e) => update('rotation', parseFloat((e.target as HTMLInputElement).value))"
          />
          <span class="val">{{ layer.rotation }}°</span>
        </div>
      </div>

      <div class="control-group">
        <label class="ctrl-label">レイヤー順</label>
        <div class="btn-row">
          <button class="action-btn" @click="store.moveLayerUp(layer!.id)">▲ 前面へ</button>
          <button class="action-btn" @click="store.moveLayerDown(layer!.id)">▼ 背面へ</button>
        </div>
      </div>

      <div class="control-group">
        <button
          class="action-btn danger"
          @click="store.removeLayer(layer!.id)"
        >🗑 削除</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.edit-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #a78bfa;
  margin: 0;
}
.empty-hint {
  font-size: 0.75rem;
  color: #6b7280;
  padding: 8px;
  text-align: center;
}
.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ctrl-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slider-row input[type="range"] {
  flex: 1;
  accent-color: #7c3aed;
}
.val {
  font-size: 0.72rem;
  color: #e2d9f3;
  min-width: 42px;
  text-align: right;
}
.btn-row {
  display: flex;
  gap: 6px;
}
.action-btn {
  flex: 1;
  padding: 6px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(124, 58, 237, 0.2);
  border: 1px solid rgba(124, 58, 237, 0.4);
  color: #e2d9f3;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover {
  background: rgba(124, 58, 237, 0.35);
}
.action-btn.danger {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
}
.action-btn.danger:hover {
  background: rgba(239, 68, 68, 0.3);
}
</style>
