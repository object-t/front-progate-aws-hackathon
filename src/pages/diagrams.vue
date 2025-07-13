<template>
  <div class="diagrams-container">
    <v-container class="py-16">
      <!-- ヘッダー -->
      <v-row class="mb-12">
        <v-col cols="12" class="text-center">
          <h1 class="text-h3 font-weight-bold mb-4 text-primary">
            構成図一覧
          </h1>
          <p class="text-h6 text-medium-emphasis mb-8">
            保存された構成図を確認・編集したり、新しい構成図を作成できます
          </p>
        </v-col>
      </v-row>

      <!-- 新規作成ボタン -->
      <v-row justify="center" class="mb-8">
        <v-col cols="12" sm="6" md="4" class="d-flex">
          <v-card
            class="flex-grow-1 action-card"
            elevation="4"
            hover
            @click="createNewDiagram"
          >
            <v-card-text class="text-center pa-8">
              <v-icon
                size="64"
                color="primary"
                class="mb-4"
              >
                add_circle
              </v-icon>
              <h3 class="text-h5 font-weight-bold mb-2">
                新規作成（サンドボックス）
              </h3>
              <p class="text-body-1 text-medium-emphasis">
                自由に構成図を作成・編集する
              </p>
            </v-card-text>
          </v-card>
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
          <p class="mt-4 text-body-1">構成図一覧を読み込み中...</p>
        </v-col>
      </v-row>

      <!-- 構成図一覧 -->
      <v-row v-else>
        <v-col cols="12">
          <v-card elevation="2">
            <v-card-title class="text-h5 pa-6">
              <v-icon class="mr-2">folder_open</v-icon>
              保存された構成図
            </v-card-title>
            
            <v-card-text class="pa-6">
              <div v-if="diagrams.length === 0" class="text-center py-8">
                <v-icon size="64" color="grey" class="mb-4">description</v-icon>
                <h3 class="text-h6 mb-2">構成図がありません</h3>
                <p class="text-body-1 text-medium-emphasis">
                  新しい構成図を作成して始めましょう
                </p>
              </div>
              
              <v-row v-else>
                <v-col
                  v-for="diagram in diagrams"
                  :key="diagram.id"
                  cols="12"
                  md="6"
                  lg="4"
                >
                  <v-card
                    class="diagram-card"
                    elevation="2"
                    hover
                    @click="openDiagram(diagram)"
                  >
                    <v-card-title class="text-h6">
                      {{ diagram.name }}
                    </v-card-title>
                    <v-card-text>
                      <p class="text-body-2 text-medium-emphasis mb-2">
                        最終更新: {{ formatDate(diagram.lastUpdated) }}
                      </p>
                      <v-chip
                        :color="getDiagramTypeColor(diagram.type)"
                        size="small"
                        variant="outlined"
                      >
                        {{ diagram.type === 'sandbox' ? 'サンドボックス' : 'ゲーム' }}
                      </v-chip>
                    </v-card-text>
                    <v-card-actions>
                      <v-btn
                        variant="outlined"
                        size="small"
                        @click.stop="editDiagram(diagram)"
                      >
                        <v-icon class="mr-1">edit</v-icon>
                        編集
                      </v-btn>
                      <v-spacer></v-spacer>
                      <v-btn
                        variant="outlined"
                        color="error"
                        size="small"
                        @click.stop="deleteDiagram(diagram)"
                      >
                        <v-icon class="mr-1">delete</v-icon>
                        削除
                      </v-btn>
                    </v-card-actions>
                  </v-card>
                </v-col>
              </v-row>
            </v-card-text>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSandbox } from '@/composables/useSandbox'

const router = useRouter()
const { getAllSandboxes, createSandbox, deleteSandbox } = useSandbox()

const isLoading = ref(false)
const diagrams = ref<any[]>([])
const error = ref<string | null>(null)

// 新規構成図作成（サンドボックスモード）
const createNewDiagram = async () => {
  console.log('🎮 新しいサンドボックス構成図を作成します')
  
  try {
    // ローディング開始
    isLoading.value = true
    error.value = null
    
    // サンドボックス作成（バックエンドにはシナリオIDとgame_nameのみ送信）
    const newSandbox = await createSandbox(
      undefined, // デフォルト名を使用
      'sandbox-mode' // サンドボックス専用のシナリオID
    )
    
    console.log('✅ サンドボックス作成成功:', {
      id: newSandbox.id,
      name: newSandbox.name,
      type: newSandbox.type,
      idType: typeof newSandbox.id,
      idLength: newSandbox.id?.length,
      isValidId: !!newSandbox.id && newSandbox.id !== 'undefined'
    })
    
    const targetRoute = `/sandbox/${newSandbox.id}`
    console.log('🚀 ページ遷移開始:', targetRoute)
    
    router.push(targetRoute)
  } catch (error) {
    console.error('❌ サンドボックス作成エラー:', error)
    error.value = error.message || 'サンドボックスの作成に失敗しました'
  } finally {
    isLoading.value = false
  }
}

// 構成図を開く
const openDiagram = (diagram: any) => {
  console.log('📄 構成図を開きます:', diagram.id)
  if (diagram.type === 'sandbox') {
    router.push(`/sandbox/${diagram.id}`)
  } else {
    router.push(`/play/${diagram.id}`)
  }
}

// 構成図を編集
const editDiagram = (diagram: any) => {
  console.log('✏️ 構成図を編集します:', diagram.id)
  openDiagram(diagram)
}

// 構成図を削除
const deleteDiagram = async (diagram: any) => {
  console.log('🗑️ 構成図を削除します:', diagram.id)
  
  if (confirm(`「${diagram.name}」を削除してもよろしいですか？`)) {
    const success = deleteSandbox(diagram.id)
    if (success) {
      // 一覧を再読み込み
      await loadDiagrams()
    } else {
      error.value = '構成図の削除に失敗しました'
    }
  }
}

// 構成図タイプの色を取得
const getDiagramTypeColor = (type: string) => {
  return type === 'sandbox' ? 'primary' : 'success'
}

// 日付フォーマット
const formatDate = (dateString: string) => {
  if (!dateString) return '不明'
  try {
    return new Date(dateString).toLocaleString('ja-JP')
  } catch {
    return '不明'
  }
}

// 構成図一覧を取得
const loadDiagrams = async () => {
  try {
    isLoading.value = true
    error.value = null
    
    console.log('🔄 構成図一覧を取得中...')
    
    // localStorageからサンドボックス一覧を取得
    const sandboxes = getAllSandboxes()
    diagrams.value = sandboxes
    
    console.log(`✅ ${diagrams.value.length}個の構成図を取得しました`)
  } catch (err: any) {
    console.error('❌ 構成図一覧取得エラー:', err)
    error.value = err.message || '構成図一覧の取得に失敗しました'
  } finally {
    isLoading.value = false
  }
}

// ページロード時に構成図一覧を取得
onMounted(() => {
  loadDiagrams()
})
</script>

<style lang="scss" scoped>
.diagrams-container {
  min-height: calc(100vh - 60px);
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
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

.diagram-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 12px !important;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1) !important;
  }
}

// レスポンシブ対応
@media (max-width: 600px) {
  .diagrams-container {
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