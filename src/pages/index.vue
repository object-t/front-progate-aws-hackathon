<template>
  <div class="home-container">
    <!-- ログアウトボタン -->
    <div class="logout-button-container">
      <v-btn
        @click="handleLogout"
        variant="outlined"
        color="error"
        prepend-icon="logout"
        :loading="isLoggingOut"
      >
        ログアウト
      </v-btn>
    </div>

    <v-container class="py-16">
      <!-- ヒーローセクション -->
      <v-row class="mb-12">
        <v-col cols="12" class="text-center">
          <h1 class="text-h3 font-weight-bold mb-4 text-primary">
            AWS アーキテクチャビルダー
          </h1>
          <p class="text-h6 text-medium-emphasis mb-8">
            ドラッグ&ドロップでAWSアーキテクチャ図を作成しよう
          </p>
        </v-col>
      </v-row>

      <!-- メインアクションボタン -->
      <v-row justify="center" class="mb-16">
        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="startGame"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="primary"
                class="mb-4"
              >
                play_circle
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                ゲームを開始
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                新しいアーキテクチャ図を作成する
              </p>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="viewDiagrams"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="secondary"
                class="mb-4"
              >
                folder
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                構成図一覧
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                保存された構成図を確認・編集
              </p>
            </v-card-text>
          </v-card>
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
const isLoggingOut = ref(false)

// APIエンドポイントを叩く関数
const callHealthEndpoint = async () => {
  try {
    console.log('🔄 APIエンドポイントを呼び出し中...')
    
    // 認証状態の再確認
    const isAuthenticated = await authStore.checkAuthStatus()
    if (!isAuthenticated) {
      console.error('❌ 認証が無効です。ログイン画面にリダイレクトします。')
      router.push('/login')
      return
    }

    const token = await authStore.getAccessToken()
    
    if (!token) {
      console.error('❌ アクセストークンが取得できませんでした')
      // トークン取得失敗時は再ログインを促す
      console.log('🔄 再認証を試行します...')
      await authStore.fetchCurrentUser()
      return
    }

    console.log('✅ アクセストークン取得成功')
    console.log('🔑 トークン情報:', {
      length: token.length,
      prefix: token.substring(0, 20) + '...',
      type: 'Bearer'
    })
    
    const headers = {
      'Authorization': `Bearer ${token}`
    }
    
    console.log('🌐 API呼び出し開始: https://naoapi.thirdlf03.com/health (直接アクセス)')
    console.log('📤 リクエストヘッダー:', headers)
    console.log('🔑 Authorizationヘッダー詳細:', {
      present: !!headers.Authorization,
      value: headers.Authorization ? `${headers.Authorization.substring(0, 30)}...` : 'なし'
    })

    const response = await fetch('https://naoapi.thirdlf03.com/health', {
      method: 'GET',
      headers,
    })

    console.log(`📊 レスポンスステータス: ${response.status}`)
    console.log(`📝 レスポンスヘッダー:`, Object.fromEntries(response.headers.entries()))

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API呼び出し成功:')
      console.log('📦 レスポンスデータ:', data)
    } else if (response.status === 401) {
      // 認証エラーの場合
      console.error('🔒 認証エラー: トークンが無効または期限切れです')
      console.log('🔄 再ログインが必要です')
      await authStore.logout()
      router.push('/login')
    } else if (response.status === 403) {
      // 認可エラーの場合
      console.error('🚫 認可エラー: このリソースへのアクセス権限がありません')
      const errorText = await response.text()
      console.error('📄 エラーレスポンス:', errorText)
    } else {
      // その他のエラー
      const errorText = await response.text()
      console.error('❌ API呼び出し失敗:')
      console.error('📄 エラーレスポンス:', errorText)
    }
  } catch (error) {
    console.error('❌ API呼び出しエラー:', error)
    console.error('🔍 エラー詳細:', {
      name: (error as Error).name,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    
    // ネットワークエラーまたは予期しないエラーの場合
    if ((error as Error).name === 'TypeError' && (error as Error).message.includes('fetch')) {
      console.error('🌐 ネットワークエラー: APIサーバーに接続できません')
    }
  }
}

// ページロード時にAPIを叩く
onMounted(() => {
  callHealthEndpoint()
})

// ゲーム開始
const startGame = () => {
  router.push('/play/home')
}

// 構成図一覧表示
const viewDiagrams = () => {
  router.push('/diagrams')
}

// ログアウト処理
const handleLogout = async () => {
  try {
    isLoggingOut.value = true
    await authStore.logout()
    router.push('/login')
  } catch (error) {
    console.error('Logout error:', error)
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<style lang="scss" scoped>
.home-container {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  position: relative;
}

.logout-button-container {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
}

.action-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 16px !important;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
  }
}

.feature-card {
  border-radius: 12px !important;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  }
}

// レスポンシブ対応
@media (max-width: 600px) {
  .home-container {
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