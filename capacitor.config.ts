import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.audinote.app',
  appName: 'Audinote',
  webDir: 'dist-mobile',
  ios: {
    scheme: 'audinote',
    contentInset: 'automatic',
  },
  plugins: {
    Preferences: {
      group: 'com.audinote.prefs',
    },
  },
}

export default config
