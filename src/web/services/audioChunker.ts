export interface ChunkSplitOptions {
  chunkDurationSec: number
  overlapSec: number
}

async function decode(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioContextCtor: typeof AudioContext =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const audioCtx = new AudioContextCtor()
  try {
    return await audioCtx.decodeAudioData(arrayBuffer)
  } finally {
    await audioCtx.close()
  }
}

// 音声の長さ（秒）を取得する
export async function getAudioDuration(blob: Blob): Promise<number> {
  const buffer = await decode(blob)
  return buffer.duration
}

// 音声を指定の長さ・オーバーラップでWAVチャンクに分割する
export async function splitAudio(blob: Blob, options: ChunkSplitOptions): Promise<Blob[]> {
  const buffer = await decode(blob)
  const { sampleRate, numberOfChannels, length: totalSamples } = buffer
  // chunkDurationSec が0以下、またはoverlapSecがchunkDurationSecに近い/それ以上だと
  // 1ループあたりの前進量(chunkSamples - overlapSamples)がほぼ0になり、断片数が
  // 爆発的に増えて実質フリーズする。そのため常にchunkSamplesの半分以上は
  // 前進するようoverlapを制限する（オーバーラップは本来チャンク長の半分未満が前提）
  const chunkSamples = Math.max(sampleRate, Math.floor(options.chunkDurationSec * sampleRate))
  const overlapSamples = Math.max(0, Math.min(Math.floor(options.overlapSec * sampleRate), Math.floor(chunkSamples / 2)))

  const chunks: Blob[] = []
  let start = 0
  while (start < totalSamples) {
    const end = Math.min(start + chunkSamples, totalSamples)
    chunks.push(encodeWavSlice(buffer, start, end, numberOfChannels, sampleRate))
    if (end >= totalSamples) break
    start = end - overlapSamples
  }
  return chunks
}

// AudioBuffer の [start, end) 区間を 16bit PCM WAV としてエンコードする
function encodeWavSlice(
  buffer: AudioBuffer,
  start: number,
  end: number,
  numChannels: number,
  sampleRate: number
): Blob {
  const length = end - start
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const dataSize = length * blockAlign
  const headerSize = 44
  const arrayBuffer = new ArrayBuffer(headerSize + dataSize)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const channelData: Float32Array[] = []
  for (let ch = 0; ch < numChannels; ch++) {
    channelData.push(buffer.getChannelData(ch))
  }

  let offset = headerSize
  for (let i = start; i < end; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channelData[ch][i]))
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
      offset += 2
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
