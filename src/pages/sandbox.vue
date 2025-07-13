<template>
  <!-- ローディング画面 -->
  <div v-if="isLoading" class="loading-container">
    <div class="loading-content">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <h2 class="loading-title">サンドボックスを準備中...</h2>
      <p class="loading-text">{{ loadingMessage }}</p>
    </div>
  </div>

  <!-- エラー画面 -->
  <div v-else-if="error" class="error-container">
    <div class="error-content">
      <v-icon size="64" color="error">alert_circle</v-icon>
      <h2 class="error-title">エラーが発生しました</h2>
      <p class="error-text">{{ error }}</p>
      <v-btn color="primary" @click="retryLoad">再試行</v-btn>
      <v-btn variant="outlined" @click="goToHome">ホームに戻る</v-btn>
    </div>
  </div>

  <!-- サンドボックス画面 -->
  <div v-else>
    <!-- ヘッダーは非表示（Headerコンポーネントを使用しない） -->
    <div class="sandbox-header">
      <div class="header-content">
        <h1 class="header-title">サンドボックスモード</h1>
        <div class="header-actions">
          <v-btn
            variant="outlined"
            color="primary"
            @click="saveDiagram"
          >
            <v-icon class="mr-1">save</v-icon>
            保存
          </v-btn>
          <v-btn
            variant="outlined"
            @click="goToHome"
          >
            <v-icon class="mr-1">home</v-icon>
            ホーム
          </v-btn>
        </div>
      </div>
    </div>

    <div class="container">
      <LayerTab
        v-if="!isFireworksActive"
        class="layer-tab"
        @set-setting="setSetting"
      />
      <PlayBoard @fireworks-active="isFireworksActive = $event" />
      <div>
        <div>
          <InfoTab
            v-if="!isFireworksActive"
            class="info-tab"
            @set-hidden="setHidden"
            @update:compute-subnet="updateComputeSubnet"
          />
        </div>
        <div class="tools">
          <div
            class="validation-button"
            v-tooltip:start="'機能要件をチェックできます'"
            @click="openFeatureValidationDialog"
          >
            ✓
          </div>
          <div
            class="fireworks-button"
            v-tooltip:start="'構成図のリソースを花火のようにちらします'"
            @click="triggerFireworks"
          >
            🎆
          </div>
          <component
            :is="ICONS.bedrock.component"
            v-tooltip:start="'メンズコーチにレビューをもらえます'"
            @click="openMensCoachDialog"
          />
          <component
            :is="ICONS.cost_explorer.component"
            v-tooltip:start="'コストを確認できます'"
            @click="openCostDialog"
          />
        </div>
      </div>
    </div>

    <!-- ダイアログコンポーネント -->
    <CostExplorerDialog v-model="costDialogOpen" />
    <MensCoachDialog v-model="mensCoachDialogOpen" />
    <FeatureValidationDialog v-model="featureValidationDialogOpen" />
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource } from '@/types/service.ts'
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useServiceList } from '@/composables/useServiceList'
  import { useVpcList } from '@/composables/useVpcList'
  import InfoTab from '@/components/info/InfoTab.vue'
  import LayerTab from '@/components/layer/LayerTab.vue'
  import PlayBoard from '@/components/board/PlayBoard.vue'
  import CostExplorerDialog from '@/components/utils/CostExplorerDialog.vue'
  import MensCoachDialog from '@/components/utils/MensCoachDialog.vue'
  import FeatureValidationDialog from '@/components/utils/FeatureValidationDialog.vue'
  import { ICONS } from '@/icons'
  import confetti from 'canvas-confetti'

  // Window型の拡張
  declare global {
    interface Window {
      triggerIconFireworks?: () => void
      confetti?: any
    }
  }

  const route = useRoute()
  const router = useRouter()
  const { } = useServiceList()
  const { updateComputeSubnet } = useVpcList()

  // サンドボックス状態
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const loadingMessage = ref('サンドボックスを初期化中...')

  // UI状態
  const hidden = ref(true)
  const setting = ref<BaseResource | null>(null)
  const costDialogOpen = ref(false)
  const mensCoachDialogOpen = ref(false)
  const featureValidationDialogOpen = ref(false)
  const isFireworksActive = ref(false)
  
  // confettiをwindowオブジェクトに登録
  window.confetti = confetti

  // サンドボックスデータを初期化
  const initializeSandbox = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      loadingMessage.value = 'サンドボックス環境を準備中...'
      
      // 少し待ってから初期化完了
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('✅ サンドボックスの初期化が完了しました')
      loadingMessage.value = '画面を準備中...'
      
      // 少し待ってからローディングを終了
      setTimeout(() => {
        isLoading.value = false
      }, 500)
    } catch (err: any) {
      console.error('❌ サンドボックス初期化エラー:', err)
      error.value = err.message || 'サンドボックスの初期化に失敗しました'
      isLoading.value = false
    }
  }

  // 再試行
  const retryLoad = () => {
    initializeSandbox()
  }

  // ホームに戻る
  const goToHome = () => {
    router.push('/')
  }

  // 構成図を保存
  const saveDiagram = () => {
    console.log('💾 構成図を保存します')
    // TODO: 実際の保存処理を実装
  }

  const setHidden = (value: boolean) => hidden.value = value
  const setSetting = (service: BaseResource) => setting.value = service

  const openCostDialog = () => {
    costDialogOpen.value = true
  }

  const openMensCoachDialog = () => {
    mensCoachDialogOpen.value = true
  }

  const openFeatureValidationDialog = () => {
    featureValidationDialogOpen.value = true
  }

  const triggerFireworks = () => {
    console.log('Fireworks button clicked!')
    console.log('window.triggerIconFireworks:', window.triggerIconFireworks)
    // PlayBoardのアイコン花火エフェクトを呼び出し
    if (window.triggerIconFireworks) {
      console.log('Calling window.triggerIconFireworks()')
      window.triggerIconFireworks()
    } else {
      console.error('window.triggerIconFireworks is not available!')
    }
  }

  // ライフサイクル
  onMounted(() => {
    // サンドボックス初期化
    initializeSandbox()
    console.log('サンドボックス画面に入りました')
  })
</script>

<style lang="scss" scoped>
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.loading-content {
  text-align: center;
}

.loading-title {
  margin-top: 20px;
  color: #333;
}

.loading-text {
  margin-top: 10px;
  color: #666;
}

.error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
}

.error-content {
  text-align: center;
  
  .error-title {
    margin: 20px 0 10px;
    color: #d32f2f;
  }
  
  .error-text {
    margin-bottom: 20px;
    color: #666;
  }
  
  .v-btn {
    margin: 0 8px;
  }
}

.sandbox-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 102;
  background: #f3f3f3;
  border-bottom: 1px solid #e0e0e0;
  height: 60px;
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 20px;
    
    .header-title {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1976d2;
      margin: 0;
    }
    
    .header-actions {
      display: flex;
      gap: 12px;
    }
  }
}

.container {
  display: flex;
  flex-direction: row;
  margin-top: 60px; /* ヘッダー分のマージン */
}

.info-tab {
  position: fixed;
  right: -532px;
}

.layer-tab {
  position: fixed;
  left: 0;
  height: calc(100vh - 60px); /* ヘッダー分を引く */
}

.info-tab, .layer-tab {
  background: #f3f3f3;
  z-index: 100;
  overflow-y: auto;
}

.tools {
  position: fixed;
  right: 12px;
  bottom: 12px;
  width: 42px;
  z-index: 101;

  > * {
    width: 42px;
    height: 42px;
    box-shadow: 0 4px 12px rgb(165, 165, 165);
    cursor: pointer;
    transition: transform 0.3s ease;
    margin: 4px 0;

    &:hover {
      transform: translateY(-4px);
    }
  }

  .validation-button {
    background: linear-gradient(135deg, #2e7d32, #66bb6a);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    font-weight: bold;
  }

  .fireworks-button {
    background: linear-gradient(135deg, #ff6b35, #ff9800);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: bold;
  }
}
</style>