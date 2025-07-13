<template>
  <!-- ローディング画面 -->
  <div v-if="isLoading" class="loading-container">
    <div class="loading-content">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <h2 class="loading-title">ゲームデータを読み込み中...</h2>
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

  <!-- ゲーム画面 -->
  <div v-else>
    <Header
      v-if="!isFireworksActive"
      class="header"
      :money="money"
    />
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

    <!-- ダイアログコンポーネント -->
    <CostExplorerDialog v-model="costDialogOpen" />
    <MensCoachDialog v-model="mensCoachDialogOpen" />
    <FeatureValidationDialog v-model="featureValidationDialogOpen" />
    <MonthEndDialog 
      v-model="monthEndDialogOpen"
      :completed-month="completedMonthString"
      :monthly-revenue="monthlyRevenue"
      :monthly-costs="monthlyCosts"
      :details="monthEndDetails"
      :advice="monthEndAdvice"
      @continue="onMonthEndContinue"
    />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource } from '@/types/service.ts'
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useGameTimeStore } from '@/stores/gameTime'
  import { useAuthStore } from '@/stores/auth'
  import { useServiceList } from '@/composables/useServiceList'
  import { useVpcList } from '@/composables/useVpcList'
  import Header from '@/components/Header.vue'
  import InfoTab from '@/components/info/InfoTab.vue'
  import LayerTab from '@/components/layer/LayerTab.vue'
  import PlayBoard from '@/components/board/PlayBoard.vue'
  import CostExplorerDialog from '@/components/utils/CostExplorerDialog.vue'
  import MensCoachDialog from '@/components/utils/MensCoachDialog.vue'
  import FeatureValidationDialog from '@/components/utils/FeatureValidationDialog.vue'
  import MonthEndDialog from '@/components/game/MonthEndDialog.vue'
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
  const authStore = useAuthStore()
  const { setServices, services } = useServiceList()
  const { setVpcList, updateComputeSubnet, vpcList } = useVpcList()
  const gameTimeStore = useGameTimeStore()

  // ゲーム状態
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const loadingMessage = ref('ゲームIDを確認中...')

  // UI状態
  const hidden = ref(true)
  const money = ref(0)
  const setting = ref<BaseResource | null>(null)
  const costDialogOpen = ref(false)
  const mensCoachDialogOpen = ref(false)
  const featureValidationDialogOpen = ref(false)
  const isFireworksActive = ref(false)
  const monthEndDialogOpen = ref(false)

  // 月末結果データ
  const completedMonthString = ref('')
  const monthlyRevenue = ref(0)
  const monthlyCosts = ref(0)
  const monthEndDetails = ref<Array<{type: 'success' | 'warning' | 'info' | 'error', message: string}>>([])
  const monthEndAdvice = ref('')
  
  // confettiをwindowオブジェクトに登録
  window.confetti = confetti

  // ゲームデータを取得
  const loadGameData = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      const gameId = (route.params as any).id as string
      if (!gameId) {
        throw new Error('ゲームIDが指定されていません')
      }

      console.log('🔄 ゲームデータを取得中...', gameId)
      loadingMessage.value = '認証情報を確認中...'

      const token = await authStore.getAccessToken()
      if (!token) {
        console.error('❌ アクセストークンが取得できませんでした')
        router.push('/login')
        return
      }

      loadingMessage.value = 'ゲームデータを読み込み中...'

      const response = await fetch(`https://naoapi.thirdlf03.com/play/games`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      console.log(`📊 ゲームデータ取得レスポンス: ${response.status}`)

      if (response.ok) {
        const gameData = await response.json()
        console.log('📦 ゲームデータ:', gameData)

        if (gameData) {
          loadingMessage.value = 'ゲーム状態を確認中...'
          
          const struct = gameData.struct ?? {vpc: [], services: []}
          
          if (struct) {
            // 既存ゲームデータを復元
            loadingMessage.value = 'ゲーム構造を復元中...'
            
            // VPCデータをvpcListに保存
            if (struct.vpc) {
              console.log('🏗️ VPCデータを復元中:', struct.vpc)
              setVpcList(struct.vpc)
            } else {
              console.log('📝 VPCデータが空のため、初期化します')
              setVpcList([])
            }

            // サービスデータをservicesに保存
            if (struct.services) {
              console.log('⚙️ サービスデータを復元中:', struct.services)
              setServices(struct.services)
            } else {
              console.log('📝 サービスデータが空のため、初期化します')
              setServices([])
            }

            console.log('✅ ゲームデータの復元が完了しました')
          } else {
            // 新規ゲーム（structがnull）
            console.log('🆕 新規ゲームを開始します')
            loadingMessage.value = '新しいゲームを準備中...'
            
            // 空の状態で初期化
            setVpcList([])
            setServices([])
            
            console.log('✅ 新規ゲームの初期化が完了しました')
          }
          
          // ゲーム基本情報を設定
          if (gameData.funds !== undefined) {
            money.value = gameData.funds
          }
          
          loadingMessage.value = '画面を準備中...'
          
          // 少し待ってからローディングを終了
          setTimeout(() => {
            isLoading.value = false
          }, 500)
        } else {
          throw new Error('ゲームデータの形式が正しくありません')
        }
      } else if (response.status === 404) {
        throw new Error('指定されたゲームが見つかりません')
      } else {
        const errorText = await response.text()
        throw new Error(`ゲームデータ取得エラー: ${response.status} - ${errorText}`)
      }
    } catch (err: any) {
      console.error('❌ ゲームデータ取得エラー:', err)
      error.value = err.message || 'ゲームデータの読み込みに失敗しました'
      isLoading.value = false
    }
  }

  // 再試行
  const retryLoad = () => {
    loadGameData()
  }

  // ホームに戻る
  const goToHome = () => {
    router.push('/play/home')
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

  // 月末処理
  const showMonthEndDialog = async () => {
    const currentDate = gameTimeStore.currentGameDate
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth() + 1
    
    completedMonthString.value = `${year}年${month}月`
    
    try {
      // 現在の構成データを作成
      const structData = {
        vpc: vpcList.value,
        services: services.value
      }
      
      const gameId = (route.params as any).id as string
      console.log('📊 月末レポートAPI呼び出し:', { gameId, structData })
      
      // 認証トークンを取得
      const token = await authStore.getAccessToken()
      if (!token) {
        throw new Error('認証トークンが取得できませんでした')
      }
      
      // 月末レポートAPIにPOSTリクエスト
      const response = await fetch(`https://naoapi.thirdlf03.com/play/report/${gameId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(structData)
      })
      
      console.log(`📊 月末レポートAPIレスポンス: ${response.status}`)
      
      if (response.ok) {
        const reportData = await response.json()
        console.log('📋 月末レポートデータ:', reportData)
        
        // APIからのデータを設定
        monthlyRevenue.value = reportData.revenue || 0
        monthlyCosts.value = reportData.costs || 0
        monthEndDetails.value = reportData.details || []
        monthEndAdvice.value = reportData.advice || '月末レポートが生成されました。'
        
      } else {
        throw new Error(`月末レポートAPI エラー: ${response.status}`)
      }
      
    } catch (error) {
      console.error('❌ 月末レポートAPIエラー:', error)
      
      // エラー時はフォールバックデータを使用
      console.log('📋 フォールバック: サンプルデータを使用します')
      monthlyRevenue.value = Math.floor(Math.random() * 5000) + 1000
      monthlyCosts.value = Math.floor(Math.random() * 3000) + 500
      monthEndDetails.value = [
        { type: 'warning', message: 'API接続エラーのため、サンプルデータを表示しています' },
        { type: 'info', message: 'ネットワーク接続を確認してください' }
      ]
      
      const netProfit = monthlyRevenue.value - monthlyCosts.value
      if (netProfit >= 0) {
        monthEndAdvice.value = '順調な成長を続けています。新しいサービスの追加を検討してみましょう。'
      } else {
        monthEndAdvice.value = 'コストが収益を上回っています。不要なリソースの削減を検討してください。'
      }
    }
    
    monthEndDialogOpen.value = true
  }

  // 月末ダイアログが閉じられた時の処理
  const onMonthEndContinue = () => {
    gameTimeStore.resumeGame()
  }

  // ライフサイクル
  onMounted(async () => {
    // ゲームデータを読み込み
    await loadGameData()
    
    // ゲームデータの読み込みが完了してから他の処理を開始
    if (!error.value) {
      // 月末コールバックを設定
      gameTimeStore.setMonthEndCallback(showMonthEndDialog)
      
      // ゲーム開始
      gameTimeStore.startGame()
      console.log('ゲーム画面に入りました。時間カウント開始！')
    }
  })

  onUnmounted(() => {
    // ゲーム終了時はタイマーを停止
    gameTimeStore.stopGame()
    console.log('ゲーム画面から離れました。時間カウント停止。')
  })
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: row;
}

.frame {
  width: 100vw;
  height: 100vh;
  z-index: 0;
}

.header {
  position: fixed;
  z-index: 101;
  background: #f3f3f3;
}

.info-tab {
  position: fixed;
  right: -532px;
}

.layer-tab {
  position: fixed;
  left: 0;
  height: 100vh;
}

.info-tab, .layer-tab {
  padding-top: 60px;
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
