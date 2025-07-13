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

<script setup lang="ts">
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

      const response = await fetch(`https://naoapi.thirdlf03.com/play/game`, {
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
          money.value = gameData.funds
          
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

  // フォールバックコスト計算関数
  const calculateFallbackCosts = (): number => {
    let totalCost = 0
    
    // グローバルサービスのコスト
    services.value.forEach(service => {
      switch (service.type) {
        case 'ec2':
          totalCost += 20.50
          break
        case 'lambda':
          totalCost += 0.05
          break
        case 's3':
          totalCost += 5.23
          break
        case 'rds':
          totalCost += 45.80
          break
        case 'alb':
        case 'nlb':
          totalCost += 16.20
          break
        case 'nat_gateway':
          totalCost += 32.40
          break
        case 'api_gateway':
          totalCost += 3.50
          break
        case 'cloudfront':
          totalCost += 8.75
          break
        case 'elastic_ip':
          totalCost += 3.65
          break
        default:
          totalCost += 5.00 // デフォルトコスト
      }
    })

    // VPCサービスのコスト
    vpcList.value.forEach(vpc => {
      vpc.computes.forEach(compute => {
        switch (compute.type) {
          case 'ec2':
            totalCost += 20.50
            break
          case 'fargate':
            totalCost += 15.30
            break
          case 'lambda':
            totalCost += 0.05
            break
          case 'ecs':
            totalCost += 12.00
            break
          default:
            totalCost += 5.00
        }
      })

      vpc.databases.forEach(database => {
        switch (database.type) {
          case 'rds':
            totalCost += 45.80
            break
          case 'elasticache':
            totalCost += 25.00
            break
          default:
            totalCost += 10.00
        }
      })

      vpc.networks.forEach(network => {
        switch (network.type) {
          case 'nat_gateway':
            totalCost += 32.40
            break
          case 'alb':
          case 'nlb':
            totalCost += 16.20
            break
          case 'internet_gateway':
            totalCost += 0 // 無料
            break
          case 'endpoint':
            totalCost += 7.50
            break
          default:
            totalCost += 2.00
        }
      })
    })
    
    console.log('📊 フォールバックコスト計算結果:', totalCost)
    return totalCost
  }

  // 機能要件検証関数（シンプル版）
  const checkFeatureRequirements = async (): Promise<{ allSatisfied: boolean, failedFeatures: string[] }> => {
    try {
      console.log('🔍 機能要件検証開始（シンプル版）')
      
      // 基本的なリソース存在チェック
      const hasRoute53 = services.value.some(s => s.type === 'route53')
      const hasS3 = services.value.some(s => s.type === 's3')
      const hasCompute = vpcList.value.some(vpc => vpc.computes.length > 0) || 
                        services.value.some(s => s.type === 'lambda')
      const hasDatabase = vpcList.value.some(vpc => vpc.databases.length > 0) ||
                         services.value.some(s => s.type === 'dynamo_db')
      
      const failedFeatures: string[] = []
      
      if (!hasRoute53) {
        failedFeatures.push('Route53リソースが必要です')
      }
      
      if (!hasS3) {
        failedFeatures.push('S3リソースが必要です')
      }
      
      if (!hasCompute) {
        failedFeatures.push('コンピュートリソース（EC2、Lambda、Fargate等）が必要です')
      }
      
      if (!hasDatabase) {
        failedFeatures.push('データベースリソース（RDS、DynamoDB等）が必要です')
      }
      
      const allSatisfied = failedFeatures.length === 0
      
      console.log('🔍 機能要件検証結果:', {
        allSatisfied,
        hasRoute53,
        hasS3,
        hasCompute,
        hasDatabase,
        failedFeatures
      })
      
      return { allSatisfied, failedFeatures }
    } catch (error) {
      console.error('❌ 機能要件検証エラー:', error)
      return { allSatisfied: true, failedFeatures: [] } // エラー時は通す
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
      console.log('💾 ゲーム状態保存API呼び出し:', { gameId, structData })
      
      // 認証トークンを取得
      const token = await authStore.getAccessToken()
      if (!token) {
        throw new Error('認証トークンが取得できませんでした')
      }
      
      // 1. まずゲーム状態を保存（PUT）
      const saveResponse = await fetch(`https://naoapi.thirdlf03.com/play/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(
          {
          struct: structData
        })
      })
      
      console.log(`💾 ゲーム状態保存APIレスポンス: ${saveResponse.status}`)
      
      if (!saveResponse.ok) {
        const errorText = await saveResponse.text()
        console.warn(`⚠️ ゲーム状態保存に失敗: ${saveResponse.status} - ${errorText}`)
        // 保存失敗でも月末レポートは続行
      } else {
        console.log('✅ ゲーム状態の保存が完了しました')
      }
      
      // 2. 月間収益を追加（+100）
      money.value += 100
      monthlyRevenue.value = 100
      console.log('💰 月間収益を追加:', money.value)
      
      // 3. コスト計算APIを呼び出し
      console.log('💰 コスト計算API呼び出し:', { gameId, structData })
      
      const costResponse = await fetch('https://naoapi.thirdlf03.com/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          struct: structData,
          requests: 1000
        })
      })
      
      console.log(`💰 コスト計算APIレスポンス: ${costResponse.status}`)
      
      let totalCosts = 0
      if (costResponse.ok) {
        const costData = await costResponse.json()
        console.log('💰 コスト計算データ:', costData)
        
        // コストの合計を計算
        if (costData.costs && typeof costData.costs === 'object') {
          totalCosts = Object.values(costData.costs).reduce((sum: number, cost: any) => sum + (typeof cost === 'number' ? cost : 0), 0)
        } else if (costData.total_cost) {
          totalCosts = costData.total_cost
        }
      } else {
        console.warn('⚠️ コスト計算API失敗、フォールバック計算を使用')
        // フォールバック: 既存のコスト計算ロジック
        totalCosts = calculateFallbackCosts()
      }
      
      monthlyCosts.value = totalCosts
      
      // 4. 月末レポートAPIにPOSTリクエスト
      console.log('📊 月末レポートAPI呼び出し:', { gameId, structData })
      
      const reportResponse = await fetch(`https://naoapi.thirdlf03.com/play/report/${gameId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({struct: structData})
      })
      
      console.log(`📊 月末レポートAPIレスポンス: ${reportResponse.status}`)
      
      if (reportResponse.ok) {
        const reportData = await reportResponse.json()
        console.log('📋 月末レポートデータ:', reportData)
        
        monthEndDetails.value = reportData.details || []
        monthEndAdvice.value = reportData.advice || '月末レポートが生成されました。'
        
      } else {
        console.warn('⚠️ 月末レポートAPI失敗、デフォルトデータを使用')
        monthEndDetails.value = [
          { type: 'info', message: '月末レポートを生成しました' }
        ]
        monthEndAdvice.value = '月末レポートが生成されました。'
      }
      
      // 5. 機能要件検証
      console.log('🔍 機能要件検証を実行中...')
      const featureValidation = await checkFeatureRequirements()
      console.log('🔍 機能要件検証完了:', featureValidation)
      
      // 6. 赤字チェックと機能要件チェックでゲームオーバー処理
      money.value -= totalCosts
      const netProfit = monthlyRevenue.value - monthlyCosts.value
      
      console.log('💰 月末収支:', {
        revenue: monthlyRevenue.value,
        costs: monthlyCosts.value,
        netProfit,
        currentMoney: money.value
      })
      
      let isGameOver = false
      let gameOverReason = ''
      
      // 赤字チェック
      if (money.value < 0 || netProfit < 0) {
        console.log('💥 赤字でゲームオーバー！')
        isGameOver = true
        gameOverReason = '💥 資金不足でゲームオーバーです！'
        
        monthEndDetails.value.unshift({
          type: 'error',
          message: gameOverReason
        })
      }
      
      // 機能要件未満足チェック
      if (!featureValidation.allSatisfied) {
        console.log('💥 機能要件未満足でゲームオーバー！')
        isGameOver = true
        gameOverReason = '💥 機能要件を満たしていないためゲームオーバーです！'
        
        monthEndDetails.value.unshift({
          type: 'error',
          message: gameOverReason
        })
        
        // 未満足の機能要件を詳細に表示
        for (const failedFeature of featureValidation.failedFeatures) {
          monthEndDetails.value.push({
            type: 'warning',
            message: `❌ ${failedFeature}`
          })
        }
      }
      
      // ゲームオーバー処理
      if (isGameOver) {
        console.log('💥 ゲームオーバー:', gameOverReason)
        
        // 花火エフェクトを実行してゲームオーバー
        setTimeout(() => {
          triggerFireworks()
          // 3秒後にホームに戻る
          setTimeout(() => {
            router.push('/play/home')
          }, 3000)
        }, 2000)
      }
      
    } catch (error) {
      console.error('❌ 月末処理APIエラー:', error)
      
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
  onMounted(() => {
    // ゲームデータを読み込み（非同期実行）
    loadGameData().then(() => {
      // ゲームデータの読み込みが完了してから他の処理を開始
      if (!error.value) {
        // 月末コールバックを設定
        gameTimeStore.setMonthEndCallback(showMonthEndDialog)
        
        // ゲーム開始
        gameTimeStore.startGame()
        console.log('ゲーム画面に入りました。時間カウント開始！')
      }
    }).catch((err) => {
      console.error('❌ ゲームデータ読み込みエラー:', err)
    })
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
