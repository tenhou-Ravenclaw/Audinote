const MIME_TYPE_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']

function pickMimeType(): string {
  for (const type of MIME_TYPE_CANDIDATES) {
    if (window.MediaRecorder?.isTypeSupported?.(type)) return type
  }
  return ''
}

export class AudioRecorder {
  private stream: MediaStream | null = null
  private recorder: MediaRecorder | null = null
  private chunks: Blob[] = []

  static isSupported(): boolean {
    return typeof window !== 'undefined' && !!window.MediaRecorder && !!navigator.mediaDevices?.getUserMedia
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    this.recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.chunks = []
    this.recorder.ondataavailable = e => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.recorder.start()
  }

  stop(): Promise<{ blob: Blob; mimeType: string }> {
    return new Promise((resolve, reject) => {
      if (!this.recorder) {
        reject(new Error('録音が開始されていません'))
        return
      }
      const mimeType = this.recorder.mimeType || 'audio/webm'
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: mimeType })
        this.cleanup()
        resolve({ blob, mimeType })
      }
      this.recorder.stop()
    })
  }

  cancel(): void {
    this.recorder?.stop()
    this.cleanup()
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach(t => t.stop())
    this.stream = null
    this.recorder = null
  }
}
