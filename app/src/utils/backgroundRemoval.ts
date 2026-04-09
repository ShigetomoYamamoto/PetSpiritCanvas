// 背景除去前のリサイズ上限 – 小さいほど推論が速い
const MAX_BG_DIM = 512

function resizeToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > MAX_BG_DIM || height > MAX_BG_DIM) {
        const ratio = Math.min(MAX_BG_DIM / width, MAX_BG_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob)
          else reject(new Error('canvas.toBlob failed'))
        },
        'image/png',
      )
    }
    img.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    img.src = dataUrl
  })
}

export async function removeBg(dataUrl: string): Promise<string> {
  // ① 512px 以下に縮小してから推論（モバイルで大幅高速化）
  const blob = await resizeToBlob(dataUrl)

  // ② dynamic import でページ初期ロードをブロックしない
  const { removeBackground } = await import('@imgly/background-removal')

  const resultBlob = await removeBackground(blob, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  })

  // ③ FileReader の代わりに ObjectURL（メモリ効率が良く高速）
  return URL.createObjectURL(resultBlob)
}
