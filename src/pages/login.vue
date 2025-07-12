<template>
  <div class="login-container">
    <v-container class="fill-height">
      <v-row align="center" justify="center">
        <v-col cols="12" sm="8" md="6" lg="4">
          <v-card class="py-10 elevation-12 login-card">
            <v-card-title class="text-center pa-6">
              <div class="login-header">
                <h2 class="text-h4 font-weight-bold">ログイン</h2>
              </div>
            </v-card-title>

            <v-card-text class="pa-6">
              <div class="text-center mb-6">
                <p class="text-body-1 text-medium-emphasis">
                  Googleアカウントでログインしてください
                </p>
              </div>

              <!-- エラーメッセージ表示 -->
              <v-alert
                v-if="authStore.error"
                type="error"
                variant="tonal"
                class="mb-4"
                closable
                @click:close="authStore.clearError()"
              >
                {{ authStore.error }}
              </v-alert>

              <!-- ローディング状態の表示 -->
              <div v-if="authStore.isLoading" class="text-center mb-4">
                <v-progress-circular
                  indeterminate
                  color="primary"
                  size="24"
                  class="mr-2"
                />
                <span class="text-body-2">認証中...</span>
              </div>

              <!-- Googleログインボタン -->
              <v-btn
                block
                size="large"
                variant="outlined"
                color="primary"
                class="google-login-btn"
                :loading="authStore.isLoading"
                :disabled="authStore.isLoading"
                @click="handleGoogleLogin"
              >
                Googleでログイン
              </v-btn>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

// Googleログイン処理
const handleGoogleLogin = async () => {
  try {
    await authStore.loginWithGoogle()
    // ログイン成功後は自動的にリダイレクトされる
  } catch (error) {
    console.error('Login failed:', error)
  }
}

// コンポーネントマウント時に認証状態をチェック
onMounted(async () => {
  // 既にログイン済みの場合はメインページにリダイレクト
  const isAuthenticated = await authStore.checkAuthStatus()
  if (isAuthenticated) {
    router.push('/')
  }
})
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  border-radius: 16px !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.login-header {
  text-align: center;
}

.google-login-btn {
  border-radius: 12px !important;
  text-transform: none !important;
  font-weight: 500 !important;
  padding: 12px 24px !important;
  border: 2px solid rgb(var(--v-theme-primary)) !important;
  
  &:hover {
    background-color: rgba(var(--v-theme-primary), 0.08) !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(var(--v-theme-primary), 0.2) !important;
  }
  
  transition: all 0.3s ease !important;
}

a {
  color: rgb(var(--v-theme-primary)) !important;
  
  &:hover {
    text-decoration: underline !important;
  }
}

// レスポンシブ対応
@media (max-width: 600px) {
  .login-card {
    margin: 16px;
  }
  
  .login-header h2 {
    font-size: 1.8rem !important;
  }
}
</style>