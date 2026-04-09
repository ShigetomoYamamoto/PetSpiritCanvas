import { removeBackground } from '@imgly/background-removal'

export async function removeBg(dataUrl: string): Promise<string> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  const resultBlob = await removeBackground(blob, {
    model: 'isnet_quint8',
    output: { format: 'image/png' },
  })
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(resultBlob)
  })
}
