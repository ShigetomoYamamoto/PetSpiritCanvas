<script setup lang="ts">
import { useCanvasStore } from '../stores/canvas'

const store = useCanvasStore()
</script>

<template>
  <div class="layer-panel">
    <h3 class="panel-title">レイヤー</h3>
    <div v-if="store.petLayers.length === 0" class="empty-hint">
      ペット画像を追加してください
    </div>
    <TransitionGroup name="layer-list" tag="ul" class="layer-list">
      <li
        v-for="layer in [...store.petLayers].reverse()"
        :key="layer.id"
        class="layer-item"
        :class="{ selected: store.selectedLayerId === layer.id }"
        @click="store.selectLayer(layer.id)"
      >
        <div class="layer-thumb">
          <img
            v-if="layer.removedUrl"
            :src="layer.removedUrl"
            alt=""
            class="thumb-img"
          />
          <img
            v-else-if="layer.originalUrl"
            :src="layer.originalUrl"
            alt=""
            class="thumb-img"
          />
          <span v-else>🐾</span>
        </div>
        <div class="layer-info">
          <span class="layer-name">{{ layer.name }}</span>
          <span class="layer-status" :class="layer.status">
            <template v-if="layer.status === 'processing'">⏳ 処理中…</template>
            <template v-else-if="layer.status === 'done'">✅ 完了</template>
            <template v-else-if="layer.status === 'error'">❌ エラー</template>
            <template v-else>待機中</template>
          </span>
        </div>
        <div class="layer-actions" @click.stop>
          <button
            class="icon-btn"
            title="表示切替"
            @click="store.updateLayerTransform(layer.id, { visible: !layer.visible })"
          >{{ layer.visible ? '👁' : '🙈' }}</button>
          <button class="icon-btn" title="削除" @click="store.removeLayer(layer.id)">🗑</button>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.layer-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
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
.layer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.layer-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  transition: all 0.15s;
}
.layer-item:hover {
  background: rgba(167, 139, 250, 0.1);
}
.layer-item.selected {
  background: rgba(124, 58, 237, 0.2);
  border-color: #7c3aed;
}
.layer-thumb {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}
.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.layer-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.layer-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e5e7eb;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.layer-status {
  font-size: 0.65rem;
  color: #9ca3af;
}
.layer-status.done { color: #6ee7b7; }
.layer-status.error { color: #f87171; }
.layer-status.processing { color: #fbbf24; }
.layer-actions {
  display: flex;
  gap: 2px;
}
.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
  border-radius: 4px;
  opacity: 0.7;
  transition: opacity 0.15s;
}
.icon-btn:hover { opacity: 1; }

.layer-list-enter-active,
.layer-list-leave-active {
  transition: all 0.2s;
}
.layer-list-enter-from,
.layer-list-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
