<template>
  <div class="play-home-container">
    <v-container class="py-16">
      <!-- ヘッダー -->
      <v-row class="mb-12">
        <v-col cols="12" class="text-center">
          <h1 class="text-h3 font-weight-bold mb-4 text-primary">
            ゲーム選択
          </h1>
          <p class="text-h6 text-medium-emphasis mb-8">
            新しいゲームを始めるか、保存されたゲームを再開してください
          </p>
        </v-col>
      </v-row>

      <!-- ローディング表示 -->
      <v-row v-if="isLoading" justify="center" class="mb-16">
        <v-col cols="12" class="text-center">
          <v-progress-circular
            indeterminate
            size="64"
            color="primary"
          ></v-progress-circular>
          <p class="mt-4 text-body-1">保存されたゲームを確認中...</p>
        </v-col>
      </v-row>

      <!-- ゲーム選択ボタン -->
      <v-row v-else justify="center" class="mb-16">
        <!-- 途中から再開ボタン -->
        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            :disabled="!hasSavedGame"
            @click="resumeGame"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                :color="hasSavedGame ? 'success' : 'grey'"
                class="mb-4"
              >
                play_circle
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                途中から再開
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                {{ hasSavedGame ? '保存されたゲームを続ける' : '保存されたゲームがありません' }}
              </p>
              <v-chip
                v-if="hasSavedGame && savedGameData"
                color="success"
                variant="outlined"
                class="mt-2"
              >
                進行度: {{ savedGameData.progress || '不明' }}
              </v-chip>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- 新規作成ボタン -->
        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="startNewGame"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="primary"
                class="mb-4"
              >
                add_circle
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                新規作成
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                新しいゲームを開始する
              </p>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- 保存されたゲーム情報 -->
      <v-row v-if="hasSavedGame && savedGameData" justify="center">
        <v-col cols="12" md="8">
          <v-card elevation="2">
            <v-card-title>
              <v-icon class="mr-2">information</v-icon>
              保存されたゲーム情報
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="6">
                  <strong>最終更新:</strong> {{ formatDate(savedGameData.lastUpdated) }}
                </v-col>
                <v-col cols="6">
                  <strong>ゲームID:</strong> {{ savedGameData.gameId || '不明' }}
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <!-- エラー表示 -->
      <v-row v-if="error" justify="center">
        <v-col cols="12" md="8">
          <v-alert
            type="error"
            variant="outlined"
            class="mb-4"
          >
            {{ error }}
          </v-alert>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const hasSavedGame = ref(false)
const savedGameData = ref<any>(null)
const error = ref<string | null>(null)

// 保存されたゲーム情報を取得
const checkSavedGame = async () => {
  try {
    isLoading.value = true
    error.value = null
    console.log('🔄 保存されたゲーム情報を確認中...')

    const token = await authStore.getAccessToken()
    if (!token) {
      console.error('❌ アクセストークンが取得できませんでした')
      router.push('/login')
      return
    }

    const response = await fetch('https://naoapi.thirdlf03.com/play/games', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log(`📊 保存ゲーム確認レスポンス: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('📦 保存ゲームデータ:', JSON.stringify(data, null, 2))
      
      if (data && data !== null) {
        hasSavedGame.value = true
        savedGameData.value = data
        console.log('✅ 保存されたゲームが見つかりました')
      } else {
        hasSavedGame.value = false
        console.log('ℹ️ 保存されたゲームはありません')
      }
    } else if (response.status === 404) {
      // 404は保存ゲームなしとして扱う
      hasSavedGame.value = false
      console.log('ℹ️ 保存されたゲームはありません (404)')
    } else {
      throw new Error(`API エラー: ${response.status}`)
    }
  } catch (err: any) {
    console.error('❌ 保存ゲーム確認エラー:', err)
    error.value = err.message || '保存されたゲーム情報の取得に失敗しました'
    hasSavedGame.value = false
  } finally {
    isLoading.value = false
  }
}

// ゲームを途中から再開
const resumeGame = () => {
  if (!hasSavedGame.value) return
  
  console.log('🎮 保存されたゲームを再開します')
  router.push(`/play/${savedGameData.value.game_id}`)
}

// 新しいゲームを開始
const startNewGame = () => {
  console.log('🎮 新しいゲーム作成画面に移動します')
  router.push('/play/create')
}

// 日付フォーマット
const formatDate = (dateString: string) => {
  if (!dateString) return '不明'
  try {
    return new Date(dateString).toLocaleString('ja-JP')
  } catch {
    return '不明'
  }
}

// ページロード時に保存ゲーム確認
onMounted(() => {
  checkSavedGame()
})
</script>

<style lang="scss" scoped>
.play-home-container {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.action-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px !important;
  
  &:hover:not(.v-card--disabled) {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  }
  
  &.v-card--disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

// レスポンシブ対応
@media (max-width: 600px) {
  .play-home-container {
    .v-container {
      padding: 16px;
    }
    
    .text-h3 {
      font-size: 2rem !important;
    }
    
    .text-h6 {
      font-size: 1.2rem !important;
    }
  }
}
</style>