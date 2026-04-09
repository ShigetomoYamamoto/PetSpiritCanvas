<script setup lang="ts">
import { ref } from 'vue'
import { ACCEPTED_TYPES, MAX_FILE_SIZE_MB } from '../utils/imageUtils'

const props = defineProps<{
  label: string
  sublabel?: string
  accept?: string
  disabled?: boolean
  hasImage?: boolean
}>()

const emit = defineEmits<{
  (e: 'upload', file: File): void
  (e: 'error', msg: string): void
}>()

const isDragging = ref(false)
const inputRef = ref<HTMLInputElement>()

function handleFiles(files: FileList | null) {
  if (!files || files.length === 0) return
  const file = files[0]
  if (!ACCEPTED_TYPES.includes(file.type)) {
    emit('error', '非対応の形式です。PNG / JPEG / WebP をご利用ください。')
    return
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    emit('error', `ファイルサイズが大きすぎます（上限 ${MAX_FILE_SIZE_MB}MB）`)
    return
  }
  emit('upload', file)
}

function onDrop(e: DragEvent) {
  isDragging.value = false
  handleFiles(e.dataTransfer?.files ?? null)
}

function onClick() {
  if (props.disabled) return
  inputRef.value?.click()
}
</script>

<template>
  <div
    class="uploader"
    :class="{ dragging: isDragging, disabled, 'has-image': hasImage }"
    @dragover.prevent="isDragging = true"
    @dragleave="isDragging = false"
    @drop.prevent="onDrop"
    @click="onClick"
  >
    <input
      ref="inputRef"
      type="file"
      :accept="accept ?? 'image/png,image/jpeg,image/webp'"
      hidden
      @change="(e) => handleFiles((e.target as HTMLInputElement).files)"
    />
    <div class="uploader-inner">
      <span class="icon">{{ hasImage ? '✅' : '📁' }}</span>
      <span class="label">{{ label }}</span>
      <span v-if="sublabel" class="sublabel">{{ sublabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.uploader {
  border: 2px dashed #a78bfa;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  background: rgba(167, 139, 250, 0.05);
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.uploader:hover:not(.disabled) {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.08);
}
.uploader.dragging {
  border-color: #7c3aed;
  background: rgba(124, 58, 237, 0.15);
}
.uploader.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.uploader.has-image {
  border-color: #6ee7b7;
  background: rgba(110, 231, 183, 0.07);
}
.uploader-inner {
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
}
.icon {
  font-size: 1.8rem;
}
.label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #e2d9f3;
}
.sublabel {
  font-size: 0.72rem;
  color: #9ca3af;
}
</style>
