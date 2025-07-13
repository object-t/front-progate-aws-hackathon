<template>
  <div class="game-create-container">
    <v-container class="py-16">
      <!-- ヘッダー -->
      <v-row class="mb-12">
        <v-col cols="12" class="text-center">
          <h1 class="text-h3 font-weight-bold mb-4 text-primary">
            新しいゲームを作成
          </h1>
          <p class="text-h6 text-medium-emphasis mb-8">
            ゲーム名とシナリオを選択してください
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
          <p class="mt-4 text-body-1">シナリオ一覧を読み込み中...</p>
        </v-col>
      </v-row>

      <!-- ゲーム作成フォーム -->
      <v-row v-else justify="center">
        <v-col cols="12" md="8" lg="6">
          <v-card elevation="4">
            <v-card-title class="text-h5 pa-6">
              <v-icon class="mr-2">gamepad</v-icon>
              ゲーム設定
            </v-card-title>
            
            <v-card-text class="pa-6">
              <!-- ゲーム名入力 -->
              <div class="mb-6">
                <label class="form-label">ゲーム名</label>
                <input
                  v-model="gameName"
                  type="text"
                  class="form-input"
                  placeholder="例: マイAWSプロジェクト"
                />
                <div v-if="gameNameError" class="form-error">{{ gameNameError }}</div>
              </div>

              <!-- シナリオ選択 -->
              <div class="mb-6">
                <label class="form-label">シナリオを選択</label>
                <select
                  v-model="selectedScenario"
                  class="form-select"
                  :disabled="isLoading"
                >
                  <option value="">シナリオを選択してください</option>
                  <option
                    v-for="scenario in scenarios"
                    :key="scenario.scenario_id"
                    :value="scenario.scenario_id"
                  >
                    {{ scenario.name }}
                  </option>
                </select>
                <div v-if="scenarioError" class="form-error">{{ scenarioError }}</div>
              </div>
            </v-card-text>

            <v-card-actions class="pa-6">
              <v-btn
                variant="outlined"
                @click="goBack"
                class="mr-3"
              >
                <v-icon class="mr-1">arrow_left</v-icon>
                戻る
              </v-btn>
              
              <v-spacer></v-spacer>
              
              <v-btn
                color="primary"
                variant="elevated"
                :disabled="!isFormValid"
                :loading="isCreating"
                @click="createGame"
              >
                <v-icon class="mr-1">play_circle</v-icon>
                ゲーム開始
              </v-btn>
            </v-card-actions>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// State
const isLoading = ref(false)
const isCreating = ref(false)
const scenarios = ref<any[]>([])
const gameName = ref('')
const selectedScenario = ref<string | null>(null)
const error = ref<string | null>(null)

// バリデーションエラー
const gameNameError = computed(() => {
  if (!gameName.value) return 'ゲーム名は必須です'
  if (gameName.value.length < 2) return 'ゲーム名は2文字以上で入力してください'
  if (gameName.value.length > 50) return 'ゲーム名は50文字以内で入力してください'
  return null
})

const scenarioError = computed(() => {
  if (!selectedScenario.value) return 'シナリオの選択は必須です'
  return null
})

// Computed
const isFormValid = computed(() => {
  return !gameNameError.value && !scenarioError.value && 
         gameName.value && selectedScenario.value
})

// Methods
const fetchScenarios = async () => {
  try {
    isLoading.value = true
    error.value = null
    console.log('🔄 シナリオ一覧を取得中...')

    const token = await authStore.getAccessToken()
    if (!token) {
      console.error('❌ アクセストークンが取得できませんでした')
      router.push('/login')
      return
    }

    const response = await fetch('https://naoapi.thirdlf03.com/play/scenarioes', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    console.log(`📊 シナリオ取得レスポンス: ${response.status}`)

    if (response.ok) {
      const data = await response.json()
      console.log('📦 シナリオデータ:', data)
      scenarios.value = data || []
      console.log(`✅ ${scenarios.value.length}個のシナリオを取得しました`)
    } else {
      throw new Error(`シナリオ取得エラー: ${response.status}`)
    }
  } catch (err: any) {
    console.error('❌ シナリオ取得エラー:', err)
    error.value = err.message || 'シナリオ一覧の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

const createGame = async () => {
  if (!isFormValid.value) return

  try {
    isCreating.value = true
    console.log('🎮 新しいゲームを作成中...')

    const token = await authStore.getAccessToken()
    if (!token) {
      console.error('❌ アクセストークンが取得できませんでした')
      router.push('/login')
      return
    }

    const gameData = {
      scenario_id: selectedScenario.value,
      game_name: gameName.value
    }

    console.log('📤 ゲーム作成データ:', gameData)

    const response = await fetch('https://naoapi.thirdlf03.com/play/create', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(gameData)
    })

    console.log(`📊 ゲーム作成レスポンス: ${response.status}`)

    if (response.ok) {
      const result = await response.json()
      console.log('✅ ゲーム作成成功:', JSON.stringify(result, null, 2))
      
      // ゲーム画面に遷移 (IDを使用)
      const gameId = result.id || result.game_id || result.gameId
      if (gameId) {
        router.push(`/play/${gameId}`)
      } else {
        throw new Error('ゲームIDが取得できませんでした')
      }
    } else {
      const errorData = await response.text()
      throw new Error(`ゲーム作成エラー: ${response.status} - ${errorData}`)
    }
  } catch (err: any) {
    console.error('❌ ゲーム作成エラー:', err)
    error.value = err.message || 'ゲームの作成に失敗しました'
  } finally {
    isCreating.value = false
  }
}

const goBack = () => {
  router.push('/play/home')
}

// ページロード時にシナリオ取得
onMounted(() => {
  fetchScenarios()
})
</script>

<style lang="scss" scoped>
.game-create-container {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
}

// フォームスタイル
.form-label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-input,
.form-select {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: all 0.3s ease;
  background: white;
  
  &:focus {
    outline: none;
    border-color: #1976d2;
    box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
  }
  
  &:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }
}

.form-select {
  cursor: pointer;
}

.form-error {
  margin-top: 4px;
  color: #d32f2f;
  font-size: 14px;
}

// レスポンシブ対応
@media (max-width: 600px) {
  .game-create-container {
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