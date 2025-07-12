<template>
  <div class="header">
    <div class="left">
      <v-btn to="/">保存して終了</v-btn>
    </div>
    
    <div class="center">
      <h1>資金: ${{ props.money }}</h1>
    </div>
    
    <div class="right">
      <!-- ユーザー情報とログアウト -->
      <div v-if="authStore.isAuthenticated" class="user-section">
        <div class="user-info">
          <v-avatar size="32" class="mr-2">
            <v-img 
              v-if="authStore.user?.picture" 
              :src="authStore.user.picture" 
              :alt="authStore.userName"
            />
            <v-icon v-else>mdi-account-circle</v-icon>
          </v-avatar>
          <div class="user-details">
            <div class="user-name">{{ authStore.userName }}</div>
            <div class="user-email">{{ authStore.userEmail }}</div>
          </div>
        </div>
        
        <v-menu>
          <template #activator="{ props }">
            <v-btn
              icon
              variant="text"
              v-bind="props"
              :loading="authStore.isLoading"
            >
              <v-icon>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          
          <v-list>
            <v-list-item @click="handleLogout">
              <template #prepend>
                <v-icon>mdi-logout</v-icon>
              </template>
              <v-list-item-title>ログアウト</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      
      <!-- 未認証時の表示 -->
      <div v-else class="auth-section">
        <v-btn
          variant="outlined"
          color="primary"
          to="/login"
        >
          ログイン
        </v-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{
  money: number
}>()

const authStore = useAuthStore()

// ログアウト処理
const handleLogout = async () => {
  try {
    await authStore.logout()
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<style scoped>
.header {
  width: 100vw;
  height: 60px;
  background-color: #ffffff;
  border-bottom: 1px solid #e0e0e0;
  z-index: 100;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
}

.center h1 {
  font-size: 1.2rem;
  font-weight: 500;
  color: #424242;
  margin: 0;
}

.user-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background-color: #f8f9fa;
  border-radius: 20px;
  border: 1px solid #e9ecef;
}

.user-details {
  display: flex;
  flex-direction: column;
  margin-left: 8px;
}

.user-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #212529;
  line-height: 1.2;
}

.user-email {
  font-size: 0.75rem;
  color: #6c757d;
  line-height: 1.2;
}

.auth-section {
  display: flex;
  align-items: center;
}

/* レスポンシブ対応 */
@media (max-width: 768px) {
  .header {
    padding: 0 16px;
  }
  
  .user-details {
    display: none;
  }
  
  .center h1 {
    font-size: 1rem;
  }
}
</style>
