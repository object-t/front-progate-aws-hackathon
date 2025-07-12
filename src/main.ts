/**
 * main.ts
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// AWS Amplify設定
import { configureAmplify, validateAmplifyConfig } from '@/config/amplify'

// 環境変数チェック
import { checkEnvVars, showCurrentConfig } from '@/utils/env-check'

// Styles
import 'unfonts.css'

// 開発環境での環境変数チェック
if (import.meta.env.DEV) {
  console.log('🚀 開発モードで起動中...')
  showCurrentConfig()
  checkEnvVars()
}

// Amplify設定を初期化
configureAmplify()
validateAmplifyConfig()

const app = createApp(App)

// Piniaストアを追加
app.use(createPinia())

registerPlugins(app)

app.mount('#app')
