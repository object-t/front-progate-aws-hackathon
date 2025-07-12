<template>
  <div class="header">
    <div class="left">
      <v-btn to="/">保存して終了</v-btn>
    </div>
    
    <div class="center">
      <div class="time-display">
        <h1>{{ gameTimeStore.formattedDate }}</h1>
        <div class="progress-container">
          <div 
            class="progress-bar"
            :style="{ width: gameTimeStore.monthProgress + '%' }"
          ></div>
        </div>
      </div>
    </div>
    
    <div class="right">
      <h1>資金: ${{ props.money }}</h1>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useAuthStore } from '@/stores/auth'
import { useGameTimeStore } from '@/stores/gameTime'

const props = defineProps<{
  money: number
}>()

const authStore = useAuthStore()
const gameTimeStore = useGameTimeStore()

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

.center {
  .time-display {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    
    h1 {
      font-size: 1.2rem;
      font-weight: 500;
      color: #424242;
      margin: 0;
    }
    
    .progress-container {
      width: 120px;
      height: 4px;
      background-color: #e0e0e0;
      border-radius: 2px;
      overflow: hidden;
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #4caf50, #8bc34a);
        border-radius: 2px;
        transition: width 0.3s ease;
      }
    }
  }
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
  
  .center {
    .time-display h1 {
      font-size: 1rem;
    }
    
    .progress-container {
      width: 100px;
    }
  }
}
</style>
