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
          <!-- 総合評価 -->
          <div class="overall-rating mb-6">
            <h3 class="mb-3">総合評価</h3>
            <div class="rating-container">
              <div class="rating-score">
                <span class="score">{{ reviewData.overall_score }}</span>
                <span class="score-max">/10</span>
              </div>
              <div class="rating-stars">
                <v-icon 
                  v-for="i in 5" 
                  :key="i"
                  :color="i <= Math.ceil(reviewData.overall_score / 2) ? '#ffc107' : '#e0e0e0'"
                  size="24"
                >
                  star
                </v-icon>
              </div>
            </div>
          </div>

          <!-- レビューテキスト -->
          <div class="review-text mb-6">
            <h3 class="mb-3">詳細レビュー</h3>
            <div class="review-content-box">
              <pre class="review-text-content">{{ reviewData.review_text }}</pre>
            </div>
          </div>

          <!-- 改善提案 -->
          <div v-if="reviewData.suggestions && reviewData.suggestions.length > 0" class="suggestions mb-6">
            <h3 class="mb-3">改善提案</h3>
            <v-list>
              <v-list-item
                v-for="(suggestion, index) in reviewData.suggestions"
                :key="index"
                class="suggestion-item"
              >
                <template #prepend>
                  <v-icon color="warning">lightbulb</v-icon>
                </template>
                <v-list-item-title>{{ suggestion.title }}</v-list-item-title>
                <v-list-item-subtitle>{{ suggestion.description }}</v-list-item-subtitle>
              </v-list-item>
            </v-list>
          </div>

          <!-- セキュリティチェック -->
          <div v-if="reviewData.security_issues && reviewData.security_issues.length > 0" class="security-issues">
            <h3 class="mb-3">セキュリティチェック</h3>
            <v-alert
              v-for="(issue, index) in reviewData.security_issues"
              :key="index"
              :type="issue.severity === 'high' ? 'error' : issue.severity === 'medium' ? 'warning' : 'info'"
              variant="tonal"
              class="mb-3"
            >
              <template #title>{{ issue.title }}</template>
              {{ issue.description }}
            </v-alert>
          </div>
        </div>
        
        <div v-else class="no-data">
          <v-icon size="64" color="grey">description</v-icon>
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

  // モックレビューデータを生成する関数
  const generateMockReviewData = (): ReviewData => {
    const hasVpc = vpcList.value.length > 0
    const hasEc2 = services.value.some(s => s.type === 'ec2') || 
                   vpcList.value.some(vpc => vpc.computes.some(c => c.type === 'ec2'))
    const hasRds = vpcList.value.some(vpc => vpc.databases.some(d => d.type === 'rds'))
    const hasLoadBalancer = vpcList.value.some(vpc => vpc.networks.some(n => ['alb', 'nlb'].includes(n.type)))
    const hasNatGateway = vpcList.value.some(vpc => vpc.networks.some(n => n.type === 'nat_gateway'))
    const hasMultiAz = vpcList.value.some(vpc => vpc.availabilityZones.length > 1)

    let score = 6 // ベーススコア
    const suggestions = []
    const securityIssues = []

    // 構成に基づいてスコアと提案を調整
    if (hasVpc) {
      score += 1
    } else {
      suggestions.push({
        title: "VPCの使用を検討",
        description: "セキュリティとネットワーク分離のためにVPCを使用することを強く推奨します"
      })
    }

    if (hasMultiAz) {
      score += 1
    } else {
      suggestions.push({
        title: "マルチAZ構成の検討",
        description: "可用性向上のため、複数のAvailability Zoneにリソースを分散配置することを推奨します"
      })
    }

    if (hasLoadBalancer) {
      score += 1
    } else if (hasEc2) {
      suggestions.push({
        title: "ロードバランサーの追加",
        description: "EC2インスタンスの可用性とスケーラビリティ向上のためLoad Balancerの使用を検討してください"
      })
    }

    if (hasNatGateway) {
      score += 0.5
    } else if (hasVpc) {
      securityIssues.push({
        title: "NAT Gatewayが未設定",
        description: "プライベートサブネットからのアウトバウンド通信にNAT Gatewayの設定を推奨します",
        severity: "medium"
      })
    }

    if (hasRds) {
      score += 0.5
    }

    // セキュリティチェック
    if (!hasVpc) {
      securityIssues.push({
        title: "VPCが未設定",
        description: "セキュリティとネットワーク分離のためVPCの使用が必要です",
        severity: "high"
      })
    }

    const reviewTexts = [
      `この構成は${hasVpc ? 'VPCを適切に活用しており、' : 'VPCが未設定で、'}AWS のベストプラクティスに${score >= 7 ? '概ね' : '部分的に'}準拠しています。

${hasMultiAz ? 'マルチAZ構成により可用性が確保されている点は優秀です。' : '単一AZ構成となっており、可用性の観点で改善の余地があります。'}

${hasLoadBalancer ? 'Load Balancerの使用により、トラフィック分散と可用性が向上しています。' : 'Load Balancerが未設定のため、単一障害点のリスクがあります。'}

${hasRds ? 'RDSによりデータベース管理が適切に分離されています。' : 'データベース層の設計についても検討が必要です。'}

セキュリティの観点から、${securityIssues.length === 0 ? '大きな問題は見つかりませんでした。' : `${securityIssues.length}件の改善項目があります。`}

コスト最適化の観点では、リソースサイズとタイプの見直しにより更なる効率化が可能です。`,

      `全体的な構成として、${score >= 8 ? '非常に優れた' : score >= 6 ? '良好な' : '改善が必要な'}設計となっています。

アーキテクチャの観点から：
- ${hasVpc ? '✓ VPCによるネットワーク分離が実装済み' : '✗ VPCが未設定（要改善）'}
- ${hasMultiAz ? '✓ マルチAZ構成で高可用性を実現' : '✗ 単一AZ構成（可用性リスク）'}
- ${hasLoadBalancer ? '✓ Load Balancerによる負荷分散' : '✗ Load Balancer未設定'}
- ${hasNatGateway ? '✓ NAT Gatewayによるセキュアなアウトバウンド通信' : '✗ NAT Gateway未設定'}

運用面では、監視とログ収集の仕組みを追加することで、より堅牢なシステムになります。`,
    ]

    return {
      overall_score: Math.min(10, Math.max(1, score)),
      review_text: reviewTexts[Math.floor(Math.random() * reviewTexts.length)],
      suggestions,
      security_issues: securityIssues
    }
  }

  const fetchReviewData = async () => {
    loading.value = true
    
    // モックAPIコール（実際のバックエンド通信をシミュレート）
    await new Promise(resolve => setTimeout(resolve, 2500))
    
    reviewData.value = generateMockReviewData()
    loading.value = false
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

.overall-rating {
  text-align: center;
  background: linear-gradient(135deg, #9c27b0, #e1bee7);
  color: white;
  padding: 24px;
  border-radius: 12px;
}

.rating-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.rating-score {
  font-size: 48px;
  font-weight: bold;
}

.score {
  color: white;
}

.score-max {
  font-size: 24px;
  opacity: 0.8;
}

.rating-stars {
  display: flex;
  gap: 4px;
}

.review-content-box {
  background-color: #f8f9fa;
  border-left: 4px solid #9c27b0;
  padding: 20px;
  border-radius: 0 8px 8px 0;
}

.review-text-content {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.suggestion-item {
  background-color: #fff3e0;
  margin-bottom: 8px;
  border-radius: 8px;
  border-left: 4px solid #ff9800;
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

.suggestions, .security-issues {
  background-color: #fafafa;
  padding: 16px;
  border-radius: 8px;
}
</style>