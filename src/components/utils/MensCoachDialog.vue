<template>
  <v-dialog v-model="dialogModel" max-width="900px" persistent>
    <v-card>
      <v-card-title class="dialog-title">
        <v-icon class="mr-2">psychology</v-icon>
        メンズコーチからのレビュー
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="pa-6">
        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4">構成図を分析中...</p>
          <p class="text-caption">レビューには30秒ほどかかります</p>
        </div>
        
        <div v-else-if="reviewData" class="review-content">
          <!-- AIアドバイス -->
          <div class="ai-advice">
            <h3 class="mb-3">AIからのアドバイス</h3>
            <div class="advice-content-box">
              <pre class="advice-text-content">{{ reviewData.review_text }}</pre>
            </div>
          </div>
        </div>
        
        <div v-else class="no-data">
          <v-icon size="64" color="grey">file_document_outline</v-icon>
          <p class="mt-4">レビューデータがありません</p>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="getReview">
          <v-icon class="mr-1">refresh</v-icon>
          再レビュー
        </v-btn>
        <v-btn @click="closeDialog">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { useServiceList } from '@/composables/useServiceList'
  import { useVpcList } from '@/composables/useVpcList'

  interface Props {
    modelValue: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
  }

  interface ReviewData {
    overall_score: number
    review_text: string
    suggestions: Array<{
      title: string
      description: string
    }>
    security_issues: Array<{
      title: string
      description: string
      severity: 'high' | 'medium' | 'low'
    }>
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const loading = ref(false)
  const reviewData = ref<ReviewData | null>(null)

  const dialogModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const fetchReviewData = async () => {
    loading.value = true
    
    try {
      // 現在の構成データを作成
      const structData = {
        vpc: vpcList.value,
        services: services.value
      }
      
      console.log('🤖 AI APIに構成データを送信中:', structData)
      
      // 認証ストアからトークンを取得
      const { useAuthStore } = await import('@/stores/auth')
      const authStore = useAuthStore()
      const token = await authStore.getAccessToken()
      
      if (!token) {
        throw new Error('認証トークンが取得できませんでした')
      }
      
      // AI APIにPOSTリクエスト
      const response = await fetch('https://naoapi.thirdlf03.com/play/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({struct: structData})
      })
      
      console.log(`📊 AI APIレスポンス: ${response.status}`)
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API エラー: ${response.status} - ${errorText}`)
      }
      
      const apiResponse = await response.json()
      console.log('🤖 AI APIからのレスポンス:', apiResponse)
      
      reviewData.value = {
        overall_score: 0, // 使用しない
        review_text: apiResponse.advice || 'アドバイスを取得できませんでした',
        suggestions: [], // 使用しない
        security_issues: [] // 使用しない
      }
      
    } catch (error) {
      console.error('❌ AI APIエラー:', error)
      
      // エラー時はシンプルなエラーメッセージを表示
      console.log('📋 フォールバック: エラーメッセージを表示します')
      reviewData.value = {
        overall_score: 0,
        review_text: 'AI APIへの接続に失敗しました。しばらく時間をおいて再試行してください。',
        suggestions: [],
        security_issues: []
      }
    } finally {
      loading.value = false
    }
  }

  const getReview = () => {
    fetchReviewData()
  }

  const closeDialog = () => {
    dialogModel.value = false
  }

  // ダイアログが開かれた時にレビューデータを取得
  watch(() => props.modelValue, (newValue) => {
    if (newValue) {
      fetchReviewData()
    }
  })
</script>

<style scoped>
.dialog-title {
  background-color: #9c27b0;
  color: white;
  font-weight: bold;
}

.loading-container {
  text-align: center;
  padding: 60px;
}

.ai-advice {
  background-color: #fafafa;
  padding: 16px;
  border-radius: 8px;
}

.advice-content-box {
  background-color: #f8f9fa;
  border-left: 4px solid #9c27b0;
  padding: 20px;
  border-radius: 0 8px 8px 0;
}

.advice-text-content {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.no-data {
  text-align: center;
  padding: 60px;
  color: #666;
}

h3 {
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}
</style>