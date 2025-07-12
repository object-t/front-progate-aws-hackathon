<template>
  <v-dialog v-model="dialogModel" max-width="1000px" persistent>
    <v-card>
      <v-card-title class="dialog-title">
        <v-icon class="mr-2">checklist</v-icon>
        機能要件チェック
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="pa-6">
        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4">機能要件を検証中...</p>
        </div>
        
        <div v-else>
          <!-- 全体的な結果サマリー -->
          <div class="summary-section mb-6">
            <h3 class="mb-3">検証結果サマリー</h3>
            <div class="summary-cards">
              <div class="summary-card valid">
                <v-icon size="32" color="success">check_circle</v-icon>
                <div class="summary-text">
                  <div class="summary-number">{{ validCount }}</div>
                  <div class="summary-label">合格</div>
                </div>
              </div>
              <div class="summary-card invalid">
                <v-icon size="32" color="error">cancel</v-icon>
                <div class="summary-text">
                  <div class="summary-number">{{ invalidCount }}</div>
                  <div class="summary-label">不合格</div>
                </div>
              </div>
              <div class="summary-card total">
                <v-icon size="32" color="info">assignment</v-icon>
                <div class="summary-text">
                  <div class="summary-number">{{ totalCount }}</div>
                  <div class="summary-label">総機能数</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 機能要件一覧 -->
          <div class="features-section">
            <h3 class="mb-3">機能要件詳細</h3>
            <div 
              v-for="result in validationResults" 
              :key="result.featureId"
              class="feature-card"
              :class="{ 'feature-valid': result.isValid, 'feature-invalid': !result.isValid }"
            >
              <div class="feature-header">
                <div class="feature-status">
                  <v-icon 
                    :color="result.isValid ? 'success' : 'error'"
                    size="24"
                  >
                    {{ result.isValid ? 'check_circle' : 'cancel' }}
                  </v-icon>
                  <div class="feature-info">
                    <div class="feature-name">{{ getFeatureName(result.featureId) }}</div>
                    <div class="feature-id">ID: {{ result.featureId }}</div>
                  </div>
                </div>
                <v-chip 
                  :color="result.isValid ? 'success' : 'error'"
                  variant="tonal"
                  size="small"
                >
                  {{ result.isValid ? '合格' : '不合格' }}
                </v-chip>
              </div>

              <!-- 不合格の場合の詳細 -->
              <div v-if="!result.isValid" class="feature-details">
                <div v-if="result.missingRequirements.length > 0" class="missing-requirements">
                  <h4>不足している要件:</h4>
                  <v-chip-group>
                    <v-chip 
                      v-for="requirement in result.missingRequirements"
                      :key="requirement"
                      color="error"
                      variant="tonal"
                      size="small"
                    >
                      {{ requirement }}
                    </v-chip>
                  </v-chip-group>
                </div>

                <!-- 各要件の詳細状況 -->
                <div class="validation-details">
                  <div v-if="result.details.compute" class="detail-section">
                    <h5>Compute要件</h5>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.compute.hasComputeResource ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.compute.hasComputeResource ? 'check' : 'close' }}
                      </v-icon>
                      Computeリソース: {{ result.details.compute.hasComputeResource ? '存在' : '不足' }}
                    </div>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.compute.featureAttached ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.compute.featureAttached ? 'check' : 'close' }}
                      </v-icon>
                      機能付与: {{ result.details.compute.featureAttached ? '済み' : '未設定' }}
                    </div>
                    
                    <!-- Compute失敗の詳細 -->
                    <div v-if="!result.details.compute.hasComputeResource" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>EC2、Lambda、ECS、Fargate、ALB、NLBのいずれかのComputeリソースを作成してください。</span>
                    </div>
                    
                    <div v-else-if="!result.details.compute.featureAttached" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>Computeリソース（{{ result.details.compute.resourceType?.toUpperCase() }}）に「{{ getFeatureName(result.featureId) }}」機能を付与してください。</span>
                    </div>
                  </div>

                  <div v-if="result.details.database" class="detail-section">
                    <h5>Database要件</h5>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.database.hasDatabaseResource ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.database.hasDatabaseResource ? 'check' : 'close' }}
                      </v-icon>
                      Databaseリソース: {{ result.details.database.hasDatabaseResource ? '存在' : '不足' }}
                    </div>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.database.hasConnection ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.database.hasConnection ? 'check' : 'close' }}
                      </v-icon>
                      接続設定: {{ result.details.database.hasConnection ? '設定済み' : '未設定' }}
                      <span v-if="result.details.database.connectionType" class="connection-type">
                        ({{ result.details.database.connectionType }})
                      </span>
                    </div>
                    
                    <!-- Database失敗の詳細 -->
                    <div v-if="!result.details.database.hasDatabaseResource" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>RDSまたはDynamoDB（VPCエンドポイント経由）を作成してください。</span>
                    </div>
                    
                    <div v-else-if="!result.details.database.hasConnection" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <div>
                        <div v-if="result.details.database.connectionType === 'rds'">
                          RDSの接続許可設定で、「{{ getFeatureName(result.featureId) }}」機能が付与されたComputeリソースを許可してください。
                        </div>
                        <div v-else>
                          DynamoDB用のVPCエンドポイントを作成し、「{{ getFeatureName(result.featureId) }}」機能が付与されたComputeリソースと同じVPCに配置してください。
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="result.details.storage" class="detail-section">
                    <h5>Storage要件</h5>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.storage.hasS3Resource ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.storage.hasS3Resource ? 'check' : 'close' }}
                      </v-icon>
                      S3リソース: {{ result.details.storage.hasS3Resource ? '存在' : '不足' }}
                    </div>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.storage.hasAccessPath ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.storage.hasAccessPath ? 'check' : 'close' }}
                      </v-icon>
                      アクセス経路: {{ result.details.storage.hasAccessPath ? '確立済み' : '未確立' }}
                      <span v-if="result.details.storage.accessMethod" class="connection-type">
                        ({{ result.details.storage.accessMethod === 'vpc-endpoint' ? 'VPCエンドポイント' : 'NAT Gateway' }})
                      </span>
                    </div>
                    
                    <!-- Storage失敗の詳細 -->
                    <div v-if="!result.details.storage.hasS3Resource" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>S3リソースをグローバルサービスに作成してください。</span>
                    </div>
                    
                    <div v-else-if="!result.details.storage.hasAccessPath" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <div>
                        <div>S3への接続経路が確立されていません。以下のいずれかを設定してください：</div>
                        <div class="failure-options">
                          <div>1. <strong>推奨:</strong> S3用のVPCエンドポイントを作成し、「{{ getFeatureName(result.featureId) }}」機能が付与されたComputeリソースと同じVPCに配置</div>
                          <div>2. NAT Gatewayを作成してインターネット経由でのアクセスを許可</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-if="result.details.domain" class="detail-section">
                    <h5>Domain要件</h5>
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.domain.hasRoute53 ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.domain.hasRoute53 ? 'check' : 'close' }}
                      </v-icon>
                      Route53: {{ result.details.domain.hasRoute53 ? '設定済み' : '未設定' }}
                    </div>
                    
                    <div v-if="result.details.domain.hasRoute53" class="detail-status">
                      <v-icon 
                        :color="result.details.domain.domainConfigured ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.domain.domainConfigured ? 'check' : 'close' }}
                      </v-icon>
                      ドメイン設定: {{ result.details.domain.domainConfigured ? '一致' : '不一致' }}
                    </div>
                    
                    <div class="detail-status">
                      <v-icon 
                        :color="result.details.domain.hasRoutingPath ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.domain.hasRoutingPath ? 'check' : 'close' }}
                      </v-icon>
                      ルーティング: {{ result.details.domain.hasRoutingPath ? '確立済み' : '未確立' }}
                    </div>
                    
                    <div v-if="result.details.domain.hasRoutingPath" class="detail-status">
                      <v-icon 
                        :color="result.details.domain.computeRequirementsSatisfied ? 'success' : 'error'"
                        size="16"
                      >
                        {{ result.details.domain.computeRequirementsSatisfied ? 'check' : 'close' }}
                      </v-icon>
                      終端Compute要件: {{ result.details.domain.computeRequirementsSatisfied ? '満足' : '不満足' }}
                    </div>
                    
                    
                    <div v-if="result.details.domain.routingPath" class="routing-path">
                      ルート: {{ result.details.domain.routingPath.join(' → ') }}
                    </div>
                    
                    <div class="domain-requirement">
                      必要ドメイン: {{ result.details.domain.domainName }}
                    </div>
                    
                    <!-- 失敗の詳細情報 -->
                    <div v-if="!result.details.domain.hasRoute53" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>Route53リソースが存在しません。グローバルサービスにRoute53を作成してください。</span>
                    </div>
                    
                    <div v-else-if="!result.details.domain.domainConfigured" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <span>Route53のドメイン名が「{{ result.details.domain.domainName?.split('.').slice(-2).join('.') }}」に設定されていません。</span>
                    </div>
                    
                    <div v-else-if="!result.details.domain.hasRoutingPath" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <div>
                        <div>ルーティングパスが不完全です：</div>
                        <div v-if="result.details.domain.routingPath && result.details.domain.routingPath.length > 0" class="failure-steps">
                          <div v-for="(step, index) in result.details.domain.routingPath" :key="index" class="step-item">
                            <span class="step-number">{{ index + 1 }}</span>
                            <span class="step-name">{{ step }}</span>
                            <v-icon 
                              size="12" 
                              color="success"
                            >
                              check
                            </v-icon>
                          </div>
                          <div class="failure-message">
                            現在のルーティングパスは設定されていますが、最終的なComputeリソース（EC2/Lambda/Fargate/ECS）への接続が確立されていません。ターゲットリソースの設定を確認してください。
                          </div>
                        </div>
                        <div v-else class="failure-steps">
                          <div>以下を確認してください：</div>
                          <div class="failure-options">
                            <div>1. Route53のAレコード「{{ result.details.domain.domainName?.split('.')[0] }}」が設定されているか</div>
                            <div>2. Aレコードのターゲットが有効なリソース（CloudFront/API Gateway/ALB/NLB/Elastic IP）に設定されているか</div>
                            <div>3. ターゲットリソースから最終的なComputeリソースへの経路が確立されているか</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div v-else-if="result.details.domain.hasRoute53 && result.details.domain.domainConfigured && result.details.domain.hasRoutingPath && !result.details.domain.computeRequirementsSatisfied" class="failure-detail error">
                      <v-icon size="16" color="error">error</v-icon>
                      <div>
                        <div>ルーティングパスの終端にあるComputeリソースが機能を持っていません。</div>
                        <div v-if="result.details.domain.endpointComputeResourceIds && result.details.domain.endpointComputeResourceIds.length > 0" class="failure-options">
                          <div>終端Computeリソース: {{ result.details.domain.endpointComputeResourceIds.join(', ') }}</div>
                          <div>これらのComputeリソースのいずれかに任意のcompute機能（Webサイト、API等）を付与してください。</div>
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </div>

                <!-- 警告メッセージ -->
                <div v-if="result.warnings.length > 0" class="warnings">
                  <h4>警告:</h4>
                  <div v-for="warning in result.warnings" :key="warning" class="warning-item">
                    <v-icon size="16" color="warning">warning</v-icon>
                    {{ warning }}
                  </div>
                </div>
              </div>

              <!-- 合格の場合の設定情報 -->
              <div v-else class="success-details">
                <div class="success-message">
                  <v-icon color="success" size="16">check</v-icon>
                  すべての要件が満たされています
                </div>
              </div>
            </div>
          </div>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="runValidation">
          <v-icon class="mr-1">refresh</v-icon>
          再検証
        </v-btn>
        <v-btn @click="closeDialog">閉じる</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import type { FeatureRequirement, ValidationResult } from '@/types/service'
  import { useFeatureValidation } from '@/composables/useFeatureValidation'

  interface Props {
    modelValue: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const loading = ref(false)
  const validationResults = ref<ValidationResult[]>([])

  // モック機能要件データ
  const mockFeatures: FeatureRequirement[] = [
    {
      id: "corp-web-001",
      type: "compute",
      feature: "Webサイト",
      required: ["compute", "storage"]
    },
    {
      id: "corp-domain-001",
      type: "domain", 
      feature: "企業ドメイン",
      required: ["www.example.com"]
    },
    {
      id: "corp-db-001",
      type: "compute",
      feature: "ブログ",
      required: ["compute", "database", "storage"]
    }
  ]

  const { validateFeatureRequirements } = useFeatureValidation()

  const dialogModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const validCount = computed(() => {
    return validationResults.value.filter(r => r.isValid).length
  })

  const invalidCount = computed(() => {
    return validationResults.value.filter(r => !r.isValid).length
  })

  const totalCount = computed(() => {
    return validationResults.value.length
  })

  const getFeatureName = (featureId: string) => {
    const feature = mockFeatures.find(f => f.id === featureId)
    return feature?.feature || featureId
  }

  const runValidation = async () => {
    loading.value = true
    
    // モック検証処理
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    try {
      validationResults.value = await validateFeatureRequirements(mockFeatures)
    } catch (error) {
      console.error('検証中にエラーが発生しました:', error)
      validationResults.value = []
    }
    
    loading.value = false
  }

  const closeDialog = () => {
    dialogModel.value = false
  }

  // ダイアログが開かれた時に検証を実行
  watch(() => props.modelValue, (newValue) => {
    if (newValue) {
      runValidation()
    }
  })
</script>

<style scoped>
.dialog-title {
  background-color: #2e7d32;
  color: white;
  font-weight: bold;
}

.loading-container {
  text-align: center;
  padding: 60px;
}

.summary-section {
  background: linear-gradient(135deg, #2e7d32, #66bb6a);
  color: white;
  padding: 24px;
  border-radius: 12px;
}

.summary-cards {
  display: flex;
  gap: 20px;
  justify-content: space-around;
}

.summary-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  padding: 16px;
  border-radius: 8px;
  min-width: 100px;
}

.summary-text {
  text-align: center;
}

.summary-number {
  font-size: 24px;
  font-weight: bold;
}

.summary-label {
  font-size: 12px;
  opacity: 0.9;
}

.features-section h3 {
  color: #333;
  font-weight: 600;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.feature-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  margin-bottom: 16px;
  padding: 16px;
  transition: all 0.2s ease;
}

.feature-valid {
  border-color: #4caf50;
  background-color: #f1f8e9;
}

.feature-invalid {
  border-color: #f44336;
  background-color: #ffebee;
}

.feature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.feature-status {
  display: flex;
  align-items: center;
  gap: 12px;
}

.feature-info .feature-name {
  font-weight: bold;
  font-size: 16px;
  color: #333;
}

.feature-info .feature-id {
  font-size: 12px;
  color: #666;
  font-family: monospace;
}

.feature-details {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ddd;
}

.missing-requirements h4 {
  color: #d32f2f;
  font-size: 14px;
  margin-bottom: 8px;
}

.validation-details {
  margin-top: 16px;
}

.detail-section {
  margin-bottom: 12px;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
}

.detail-section h5 {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
  color: #333;
}

.detail-status {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
}

.connection-type {
  font-size: 11px;
  color: #666;
  background-color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
  margin-left: 8px;
}

.routing-path {
  font-size: 12px;
  color: #666;
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
}

.domain-requirement {
  font-size: 12px;
  color: #333;
  margin-top: 4px;
  padding: 4px 8px;
  background-color: #e3f2fd;
  border-radius: 4px;
  font-weight: 500;
}

.warnings {
  margin-top: 16px;
  padding: 12px;
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
  border-radius: 0 4px 4px 0;
}

.warnings h4 {
  color: #e65100;
  font-size: 14px;
  margin-bottom: 8px;
}

.warning-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 13px;
  color: #e65100;
}

.success-details {
  margin-top: 12px;
  padding: 12px;
  background-color: #e8f5e8;
  border-radius: 4px;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #2e7d32;
  font-weight: 500;
}

.failure-detail {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.4;
}

.failure-detail.error {
  background-color: #ffebee;
  border-left: 3px solid #f44336;
  color: #c62828;
}

.failure-steps {
  margin-top: 8px;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 4px;
}

.step-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background-color: #2196f3;
  color: white;
  border-radius: 50%;
  font-size: 11px;
  font-weight: bold;
}

.step-name {
  flex: 1;
  font-weight: 500;
}

.failure-message {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(244, 67, 54, 0.1);
  border-radius: 4px;
  font-weight: 500;
}

.failure-options {
  margin-top: 8px;
  padding-left: 16px;
}

.failure-options > div {
  margin-bottom: 6px;
  padding: 4px 0;
}
</style>