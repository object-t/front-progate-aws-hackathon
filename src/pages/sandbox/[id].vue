<template>
  <!-- ローディング画面 -->
  <div v-if="isLoading" class="loading-container">
    <div class="loading-content">
      <v-progress-circular
        indeterminate
        size="64"
        color="primary"
      ></v-progress-circular>
      <h2 class="loading-title">構成図を読み込み中...</h2>
      <p class="loading-text">{{ loadingMessage }}</p>
    </div>
  </div>

  <!-- エラー画面 -->
  <div v-else-if="error" class="error-container">
    <div class="error-content">
      <v-icon size="64" color="error">alert_circle</v-icon>
      <h2 class="error-title">エラーが発生しました</h2>
      <p class="error-text">{{ error }}</p>
      
      <!-- 診断情報表示 -->
      <v-expansion-panels class="mt-4" variant="accordion">
        <v-expansion-panel title="診断情報を表示">
          <v-expansion-panel-text>
            <div class="diagnostic-info">
              <h4>Route情報:</h4>
              <pre>{{ {
                fullPath: $route.fullPath,
                path: $route.path,
                name: $route.name,
                params: $route.params,
                query: $route.query
              } }}</pre>
              
              <h4>DiagramID情報:</h4>
              <pre>{{ {
                diagramId: diagramId,
                type: typeof diagramId,
                length: diagramId?.length,
                isValid: !!diagramId && diagramId !== 'undefined' && diagramId !== 'null'
              } }}</pre>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
      
      <div class="mt-4">
        <v-btn color="primary" @click="retryLoad">再試行</v-btn>
        <v-btn variant="outlined" @click="goToHome" class="ml-2">ホームに戻る</v-btn>
        <v-btn variant="outlined" @click="goToDiagrams" class="ml-2">構成図一覧</v-btn>
      </div>
    </div>
  </div>

  <!-- サンドボックス画面 -->
  <div v-else>
    <!-- シンプルなヘッダー -->
    <div class="sandbox-header">
      <div class="header-content">
        <h1 class="header-title">サンドボックス: {{ diagramName }}</h1>
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
            @click="goToDiagrams"
          >
            <v-icon class="mr-1">arrow_back</v-icon>
            一覧に戻る
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

    <!-- ダイアログコンポーネント -->
    <CostExplorerDialog v-model="costDialogOpen" />
    <MensCoachDialog v-model="mensCoachDialogOpen" />
    <FeatureValidationDialog v-model="featureValidationDialogOpen" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource } from '@/types/service.ts'
  import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useServiceList, stopServiceWatcher, restartServiceWatcher } from '@/composables/useServiceList'
  import { useVpcList } from '@/composables/useVpcList'
  import { useSandbox } from '@/composables/useSandbox'
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
  
  // route.paramsのデバッグと検証
  console.log('🔍 Route情報デバッグ:', {
    fullPath: route.fullPath,
    path: route.path,
    name: route.name,
    params: route.params,
    paramsKeys: Object.keys(route.params),
    paramsId: route.params.id,
    paramsIdType: typeof route.params.id
  })
  
  const rawId = route.params.id
  const diagramId = Array.isArray(rawId) ? rawId[0] : rawId
  
  console.log('📋 DiagramID解析結果:', {
    rawId,
    diagramId,
    isValid: !!diagramId && diagramId !== 'undefined' && diagramId !== 'null'
  })
  
  // IDが取得できない場合のエラーハンドリング
  if (!diagramId || diagramId === 'undefined' || diagramId === 'null') {
    console.error('❌ 重大エラー: サンドボックスIDが取得できません', {
      route: route.fullPath,
      params: route.params,
      expectedParam: 'id'
    })
  }
  
  const { services } = useServiceList()
  const { vpcList, updateComputeSubnet } = useVpcList()
  const { getSandbox, saveSandbox } = useSandbox()

  // 構成図状態
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const loadingMessage = ref('構成図IDを確認中...')
  const diagramName = ref('無題の構成図')

  // UI状態
  const hidden = ref(true)
  const setting = ref<BaseResource | null>(null)
  const costDialogOpen = ref(false)
  const mensCoachDialogOpen = ref(false)
  const featureValidationDialogOpen = ref(false)
  const isFireworksActive = ref(false)
  
  // confettiをwindowオブジェクトに登録
  window.confetti = confetti

  // サンドボックス専用localStorage管理
  let sandboxWatcher: (() => void) | null = null
  
  const setupSandboxStorage = () => {
    console.log('🔧 setupSandboxStorage開始 - ID検証:', diagramId)
    
    if (!diagramId || diagramId === 'undefined' || diagramId === 'null') {
      console.error('❌ setupSandboxStorage: 無効なID', diagramId)
      throw new Error(`サンドボックス設定エラー: 無効なID "${diagramId}"`)
    }
    
    // 専用のlocalStorageキーでサンドボックスデータを管理
    const servicesKey = `${diagramId}-services`
    const vpcKey = `${diagramId}-vpc`
    
    console.log('📦 localStorage キー生成:', { servicesKey, vpcKey })
    
    // 初期データを読み込み
    const loadSandboxData = () => {
      try {
        console.log('🔄 サンドボックス専用データを読み込み中...', { servicesKey, vpcKey })
        
        // まず完全にクリア
        console.log('🧹 既存データを完全クリア中...')
        services.value.length = 0  // 完全クリア
        vpcList.value.length = 0   // 完全クリア
        
        // 少し待ってから読み込み
        setTimeout(() => {
          const servicesData = localStorage.getItem(servicesKey)
          const vpcData = localStorage.getItem(vpcKey)
          
          console.log('📊 localStorage確認:', {
            servicesExists: !!servicesData,
            vpcExists: !!vpcData,
            servicesLength: servicesData ? JSON.parse(servicesData).length : 0,
            vpcLength: vpcData ? JSON.parse(vpcData).length : 0
          })
          
          if (servicesData) {
            const parsedServices = JSON.parse(servicesData)
            // 完全に新しい配列で置き換え
            services.value.splice(0, services.value.length, ...parsedServices)
            console.log('✅ Services復元:', parsedServices.length, '個')
          } else {
            console.log('🆕 Services: 新規サンドボックス（空状態）')
          }
          
          if (vpcData) {
            const parsedVpc = JSON.parse(vpcData)
            // 完全に新しい配列で置き換え
            vpcList.value.splice(0, vpcList.value.length, ...parsedVpc)
            console.log('✅ VPC復元:', parsedVpc.length, '個')
          } else {
            console.log('🆕 VPC: 新規サンドボックス（空状態）')
          }
          
          console.log('📦 最終状態:', {
            services: services.value.length,
            vpc: vpcList.value.length
          })
        }, 50) // 短い待機で確実にクリア後に実行
        
      } catch (error) {
        console.error('❌ サンドボックスデータ読み込みエラー:', error)
        services.value.length = 0
        vpcList.value.length = 0
      }
    }
    
    // 専用のwatcherを設定
    const setupSandboxWatcher = () => {
      if (sandboxWatcher) {
        sandboxWatcher() // 既存のwatcherを停止
      }
      
      sandboxWatcher = watch(
        [services, vpcList],
        ([newServices, newVpc]) => {
          console.log('💾 サンドボックスデータ自動保存:', {
            services: newServices.length,
            vpc: newVpc.length,
            keys: [servicesKey, vpcKey]
          })
          
          localStorage.setItem(servicesKey, JSON.stringify(newServices))
          localStorage.setItem(vpcKey, JSON.stringify(newVpc))
          
          // メタデータも更新
          saveMetadata()
        },
        { deep: true }
      )
    }
    
    // データ読み込み後にwatcherを設定
    loadSandboxData()
    
    // データ読み込み完了を待ってからwatcherを設定
    setTimeout(() => {
      setupSandboxWatcher()
      console.log('🔧 サンドボックスwatcher設定完了')
    }, 150) // データ読み込み完了後にwatcher設定
  }
  
  // サンドボックスのメタデータ保存機能
  const saveMetadata = () => {
    if (!diagramId) return

    const metadataOnly = {
      id: diagramId,
      name: diagramName.value,
      type: 'sandbox' as const,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      services: [], // メタデータなので空
      vpc: [] // メタデータなので空
    }
    
    saveSandbox(metadataOnly)
  }

  // 構成図データを取得
  const loadDiagramData = async () => {
    try {
      isLoading.value = true
      error.value = null
      
      console.log('🔄 loadDiagramData開始 - ID検証:', {
        diagramId,
        type: typeof diagramId,
        length: diagramId?.length,
        isEmpty: !diagramId,
        isUndefined: diagramId === 'undefined',
        isNull: diagramId === 'null'
      })
      
      if (!diagramId || diagramId === 'undefined' || diagramId === 'null' || diagramId.trim() === '') {
        const errorMsg = `サンドボックスIDが無効です: "${diagramId}"`
        console.error('❌', errorMsg, {
          route: route.fullPath,
          params: route.params
        })
        throw new Error(errorMsg)
      }

      console.log('✅ ID検証通過 - サンドボックス初期化中...', diagramId)
      loadingMessage.value = 'サンドボックスを準備中...'

      // サンドボックスのメタデータを取得（名前など）
      const sandboxData = getSandbox(diagramId)
      if (sandboxData) {
        diagramName.value = sandboxData.name
        console.log('📋 既存サンドボックスを読み込みます:', sandboxData.name)
      } else {
        // 新規サンドボックスの場合
        diagramName.value = `新しいサンドボックス ${new Date().toLocaleString('ja-JP')}`
        console.log('🆕 新規サンドボックスを作成します:', diagramName.value)
      }
      
      // サンドボックス専用ストレージを設定
      setupSandboxStorage()
      
      console.log('✅ サンドボックス初期化が完了しました')
      loadingMessage.value = '画面を準備中...'
      
      // 少し待ってからローディングを終了
      setTimeout(() => {
        isLoading.value = false
        console.log('🎯 サンドボックス画面の準備が完了しました')
      }, 300)
    } catch (err: any) {
      console.error('❌ サンドボックス初期化エラー:', err)
      error.value = err.message || 'サンドボックスの初期化に失敗しました'
      isLoading.value = false
    }
  }

  // 再試行
  const retryLoad = () => {
    loadDiagramData()
  }

  // ホームに戻る
  const goToHome = () => {
    console.log('🏠 ホームページに移動します')
    router.push('/')
  }

  // 構成図一覧に戻る
  const goToDiagrams = () => {
    console.log('📋 構成図一覧ページに移動します')
    router.push('/diagrams')
  }

  // 構成図を保存
  const saveDiagram = () => {
    try {
      console.log('💾 saveDiagram開始 - ID検証:', diagramId)
      
      if (!diagramId || diagramId === 'undefined' || diagramId === 'null') {
        const errorMsg = `保存エラー: 無効なID "${diagramId}"`
        console.error('❌', errorMsg)
        throw new Error(errorMsg)
      }

      console.log('💾 構成図を手動保存します', diagramId)
      console.log('📊 保存するデータ:', {
        servicesCount: services.value.length,
        vpcCount: vpcList.value.length,
        storageKeys: [`${diagramId}-service-list-data`, `${diagramId}-vpc-list-data`]
      })
      
      // メタデータを保存
      saveMetadata()
      
      console.log('✅ 構成図を保存しました')
      // 成功メッセージを表示することも可能
    } catch (err: any) {
      console.error('❌ 構成図保存エラー:', err)
    }
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
  onMounted(async () => {
    console.log('🚀 サンドボックスページを初期化します:', diagramId)
    
    // 1. composablesのwatcherを停止して干渉を防ぐ
    stopServiceWatcher()
    stopVpcWatcher()
    console.log('🛑 composablesのwatcherを停止しました')
    
    // 2. composablesのデフォルトlocalStorageを完全削除
    localStorage.removeItem('service-list-data')
    localStorage.removeItem('vpc-list-data')
    console.log('🗑️ デフォルトlocalStorageを削除しました')
    
    // 3. composablesのグローバル状態を完全クリア
    console.log('🧹 composablesの状態をクリア中...', {
      beforeServices: services.value.length,
      beforeVpc: vpcList.value.length
    })
    
    // 強制的に空配列に置き換え
    services.value.length = 0
    vpcList.value.length = 0
    services.value.splice(0)
    vpcList.value.splice(0)
    
    console.log('✅ composables完全クリア完了:', {
      afterServices: services.value.length,
      afterVpc: vpcList.value.length
    })
    
    // 4. 少し待ってからサンドボックス初期化
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 5. サンドボックスの初期化
    await loadDiagramData()
    
    console.log('✅ サンドボックス画面の初期化が完了しました')
  })

  // ページ離脱時の処理
  onUnmounted(() => {
    console.log('🚪 サンドボックスページを離脱します:', diagramId)
    
    // サンドボックスwatcherを停止
    if (sandboxWatcher) {
      sandboxWatcher()
      sandboxWatcher = null
      console.log('🔧 サンドボックスwatcherを停止しました')
    }
    
    // 最終的なメタデータ保存
    saveMetadata()
    
    // composablesのデフォルトlocalStorageをクリア
    localStorage.removeItem('service-list-data')
    localStorage.removeItem('vpc-list-data')
    
    // composablesのwatcherを再開（他のページで正常動作するため）
    restartServiceWatcher()
    restartVpcWatcher()
    console.log('▶️ composablesのwatcherを再開しました')
    
    console.log('🧹 離脱時処理が完了しました')
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

// 診断情報用スタイル
.diagnostic-info {
  h4 {
    color: #1976d2;
    margin: 16px 0 8px 0;
    font-weight: bold;
  }
  
  pre {
    background: #f5f5f5;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
    font-size: 12px;
    line-height: 1.4;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }
}
</style>