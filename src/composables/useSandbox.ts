import { ref, computed } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { BaseResource } from '@/types/service'

export interface SandboxDiagram {
  id: string
  name: string
  type: 'sandbox'
  createdAt: string
  lastUpdated: string
  services: BaseResource[]
  vpc: any[]
}

const SANDBOX_INDEX_KEY = 'sandbox-index'
const SANDBOX_DATA_PREFIX = 'sandbox-data-'

// グローバル状態
const sandboxList = ref<SandboxDiagram[]>([])

// バックエンドAPI用のヘルパー関数
const callBackendAPI = async (endpoint: string, data: any) => {
  try {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const fullURL = `${baseURL}${endpoint}`
    
    console.log('📡 API呼び出し:', { url: fullURL, data })
    
    const response = await fetch(fullURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 認証ヘッダーなど必要に応じて追加
        // 'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`)
    }
    
    const result = await response.json()
    console.log('✅ API成功レスポンス:', result)
    return result
  } catch (error) {
    console.error('❌ バックエンドAPI呼び出しエラー:', error)
    throw error
  }
}

export const useSandbox = () => {
  
  // サンドボックスインデックス（ID一覧）を読み込み
  const loadSandboxIndex = (): string[] => {
    try {
      const stored = localStorage.getItem(SANDBOX_INDEX_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return Array.isArray(parsed) ? parsed : []
      }
    } catch (error) {
      console.error('❌ サンドボックスインデックスの読み込みエラー:', error)
    }
    return []
  }

  // サンドボックスインデックスを保存
  const saveSandboxIndex = (ids: string[]) => {
    try {
      localStorage.setItem(SANDBOX_INDEX_KEY, JSON.stringify(ids))
      console.log('✅ サンドボックスインデックスを保存しました')
    } catch (error) {
      console.error('❌ サンドボックスインデックスの保存エラー:', error)
    }
  }

  // 個別サンドボックスを読み込み
  const loadSandboxData = (id: string): SandboxDiagram | null => {
    try {
      const stored = localStorage.getItem(`${SANDBOX_DATA_PREFIX}${id}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed
      }
    } catch (error) {
      console.error(`❌ サンドボックス${id}の読み込みエラー:`, error)
    }
    return null
  }

  // 個別サンドボックスを保存
  const saveSandboxData = (sandbox: SandboxDiagram) => {
    try {
      localStorage.setItem(`${SANDBOX_DATA_PREFIX}${sandbox.id}`, JSON.stringify(sandbox))
      console.log('✅ サンドボックスデータを保存しました:', sandbox.id)
    } catch (error) {
      console.error(`❌ サンドボックス${sandbox.id}の保存エラー:`, error)
    }
  }

  // localStorageからサンドボックス一覧を読み込み
  const loadSandboxList = (): SandboxDiagram[] => {
    const ids = loadSandboxIndex()
    const diagrams: SandboxDiagram[] = []
    
    for (const id of ids) {
      const data = loadSandboxData(id)
      if (data) {
        diagrams.push(data)
      }
    }
    
    return diagrams
  }

  // 初期化
  const initializeSandbox = () => {
    sandboxList.value = loadSandboxList()
    console.log(`📋 ${sandboxList.value.length}個のサンドボックスを読み込みました`)
  }

  // 新規サンドボックス作成
  const createSandbox = async (name?: string, scenarioId?: string): Promise<SandboxDiagram> => {
    const now = new Date().toISOString()
    const game_name = name || `新しいサンドボックス ${new Date().toLocaleString('ja-JP')}`
    
    try {
      // バックエンドに送信するデータ（シナリオIDとgame_nameのみ）
      const backendPayload = {
        scenario_id: scenarioId || import.meta.env.VITE_DEFAULT_SANDBOX_SCENARIO_ID || 'sandbox-mode',
        game_name: game_name
      }
      
      console.log('🚀 バックエンドにサンドボックス作成要求を送信:', backendPayload)
      
      // バックエンドAPI呼び出し（環境変数で制御）
      let sandboxId: string
      
      if (import.meta.env.VITE_USE_BACKEND_API === 'true') {
        // 実際のバックエンドAPI呼び出し
        try {
          const backendResponse = await callBackendAPI('/api/sandbox/create', backendPayload)
          sandboxId = backendResponse.id || backendResponse.game_id
          console.log('✅ バックエンドからレスポンス受信:', backendResponse)
        } catch (apiError) {
          console.error('❌ バックエンドAPI呼び出し失敗、ローカルモードにフォールバック:', apiError)
          sandboxId = uuidv4()
        }
      } else {
        // ローカル開発モード
        console.log('🔧 ローカル開発モード - UUIDを生成')
        sandboxId = uuidv4()
      }
      
      const newSandbox: SandboxDiagram = {
        id: sandboxId,
        name: game_name,
        type: 'sandbox',
        createdAt: now,
        lastUpdated: now,
        services: [], // 空の状態で開始
        vpc: [] // 空の状態で開始
      }

      // ローカルストレージに保存
      saveSandboxData(newSandbox)
      
      // インデックスに追加
      const currentIds = loadSandboxIndex()
      const updatedIds = [...currentIds, newSandbox.id]
      saveSandboxIndex(updatedIds)

      console.log('✅ サンドボックス作成完了:', {
        id: newSandbox.id,
        name: newSandbox.name,
        backendPayload
      })
      
      return newSandbox
    } catch (error) {
      console.error('❌ サンドボックス作成エラー:', error)
      throw error
    }
  }

  // サンドボックスを取得
  const getSandbox = (id: string): SandboxDiagram | null => {
    const sandbox = loadSandboxData(id)
    
    if (sandbox) {
      console.log('📄 サンドボックスを取得しました:', id)
      return sandbox
    } else {
      console.warn('⚠️ サンドボックスが見つかりません:', id)
      return null
    }
  }

  // サンドボックスを保存/更新
  const saveSandbox = (sandboxData: Partial<SandboxDiagram> & { id: string }) => {
    const existing = loadSandboxData(sandboxData.id)
    
    if (existing) {
      // 既存のサンドボックスを更新
      const updatedSandbox = {
        ...existing,
        ...sandboxData,
        lastUpdated: new Date().toISOString()
      }
      saveSandboxData(updatedSandbox)
      console.log('💾 サンドボックスを更新しました:', sandboxData.id)
      return updatedSandbox
    } else {
      console.error('❌ 保存対象のサンドボックスが見つかりません:', sandboxData.id)
      return null
    }
  }

  // サンドボックスを削除
  const deleteSandbox = (id: string): boolean => {
    const existing = loadSandboxData(id)
    
    if (existing) {
      // 個別データを削除
      localStorage.removeItem(`${SANDBOX_DATA_PREFIX}${id}`)
      
      // インデックスから削除
      const currentIds = loadSandboxIndex()
      const filteredIds = currentIds.filter(sandboxId => sandboxId !== id)
      saveSandboxIndex(filteredIds)
      
      console.log('🗑️ サンドボックスを削除しました:', id)
      return true
    } else {
      console.warn('⚠️ 削除対象のサンドボックスが見つかりません:', id)
      return false
    }
  }

  // サンドボックス一覧を取得
  const getAllSandboxes = (): SandboxDiagram[] => {
    return loadSandboxList()
  }

  // サンドボックス名を更新
  const updateSandboxName = (id: string, name: string) => {
    return saveSandbox({ id, name })
  }

  // サンドボックスの構成データを更新
  const updateSandboxData = (id: string, services: BaseResource[], vpc: any[]) => {
    return saveSandbox({ 
      id, 
      services: [...services], 
      vpc: [...vpc] 
    })
  }

  // Computed properties
  const sandboxCount = computed(() => sandboxList.value.length)
  
  const recentSandboxes = computed(() => {
    return [...sandboxList.value]
      .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
      .slice(0, 5)
  })

  return {
    // State
    sandboxList: computed(() => sandboxList.value),
    sandboxCount,
    recentSandboxes,
    
    // Actions
    initializeSandbox,
    createSandbox,
    getSandbox,
    saveSandbox,
    deleteSandbox,
    getAllSandboxes,
    updateSandboxName,
    updateSandboxData
  }
}