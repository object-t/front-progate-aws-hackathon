<script setup lang="ts">
  import type { NetworkResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList, updateNetworkSettings } = useVpcList()

  const currentEndpoint = computed(() => {
    return setting.value as NetworkResource
  })

  // AWS サービスエンドポイント一覧
  const awsServiceEndpoints = [
    { value: 's3', label: 'S3 (Simple Storage Service)' },
    { value: 'ec2', label: 'EC2 (Elastic Compute Cloud)' },
    { value: 'rds', label: 'RDS (Relational Database Service)' },
    { value: 'lambda', label: 'Lambda' },
    { value: 'sns', label: 'SNS (Simple Notification Service)' },
    { value: 'sqs', label: 'SQS (Simple Queue Service)' },
    { value: 'ssm', label: 'SSM (Systems Manager)' },
    { value: 'secretsmanager', label: 'Secrets Manager' },
    { value: 'kms', label: 'KMS (Key Management Service)' },
    { value: 'cloudwatch', label: 'CloudWatch' },
    { value: 'ecs', label: 'ECS (Elastic Container Service)' },
    { value: 'ecr', label: 'ECR (Elastic Container Registry)' },
    { value: 'dynamodb', label: 'DynamoDB' },
    { value: 'elasticloadbalancing', label: 'Elastic Load Balancing' },
    { value: 'autoscaling', label: 'Auto Scaling' },
    { value: 'cloudformation', label: 'CloudFormation' },
    { value: 'iam', label: 'IAM (Identity and Access Management)' },
    { value: 'sts', label: 'STS (Security Token Service)' }
  ]

  const selectedServiceEndpoint = ref<string>('')

  // 現在の設定を監視して初期値を設定
  watch(currentEndpoint, (newEndpoint) => {
    if (newEndpoint && newEndpoint.serviceEndpoint) {
      selectedServiceEndpoint.value = newEndpoint.serviceEndpoint
    } else {
      selectedServiceEndpoint.value = ''
    }
  }, { immediate: true })

  // サービスエンドポイントの変更を監視
  watch(selectedServiceEndpoint, (newServiceEndpoint) => {
    if (!currentEndpoint.value) return
    updateNetworkSettings(currentEndpoint.value.id, { serviceEndpoint: newServiceEndpoint })
  })

  // 選択されたサービスの詳細情報を取得
  const selectedServiceInfo = computed(() => {
    if (!selectedServiceEndpoint.value) return null
    return awsServiceEndpoints.find(service => service.value === selectedServiceEndpoint.value)
  })

  // エンドポイントタイプの判定（実際のAWSでは Gateway/Interface の区別がある）
  const endpointType = computed(() => {
    const gatewayServices = ['s3', 'dynamodb']
    return gatewayServices.includes(selectedServiceEndpoint.value) ? 'Gateway' : 'Interface'
  })
</script>

<template>
  <div>
    <h2>VPC Endpoint</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>エンドポイント名:</label>
        <span>{{ currentEndpoint?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>エンドポイント ID:</label>
        <span class="resource-id">{{ currentEndpoint?.id }}</span>
      </div>

      <div class="setting-item">
        <label for="service-endpoint">接続先AWSサービス:</label>
        <v-select
          id="service-endpoint"
          v-model="selectedServiceEndpoint"
          :items="awsServiceEndpoints"
          item-title="label"
          item-value="value"
          label="AWSサービスを選択"
          clearable
          variant="outlined"
          density="comfortable"
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props" :title="item.raw.label">
              <template #prepend>
                <v-icon size="small" color="primary">cloud</v-icon>
              </template>
            </v-list-item>
          </template>
        </v-select>
      </div>

      <div v-if="selectedServiceInfo" class="service-info">
        <div class="info-header">
          <v-icon color="primary">info</v-icon>
          <span class="info-title">選択されたサービス情報</span>
        </div>
        
        <div class="service-details">
          <div class="detail-item">
            <span class="detail-label">サービス:</span>
            <span class="detail-value">{{ selectedServiceInfo.label }}</span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">エンドポイントタイプ:</span>
            <span class="detail-value" :class="{ 'gateway-type': endpointType === 'Gateway', 'interface-type': endpointType === 'Interface' }">
              {{ endpointType }} Endpoint
            </span>
          </div>
          
          <div class="detail-item">
            <span class="detail-label">サービス名:</span>
            <span class="service-name">com.amazonaws.{{ currentEndpoint?.vpcId?.split('-')[0] || 'region' }}.{{ selectedServiceEndpoint }}</span>
          </div>
        </div>
      </div>

      <div v-if="!selectedServiceEndpoint" class="no-service-selected">
        <v-icon color="warning">warning</v-icon>
        <span>接続先AWSサービスが選択されていません。VPCエンドポイントを使用するには、接続先サービスを選択してください。</span>
      </div>

      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <div class="note-content">
          <p><strong>VPCエンドポイントについて:</strong></p>
          <ul>
            <li><strong>Gateway Endpoint:</strong> S3、DynamoDBなど。ルートテーブルを通じて接続</li>
            <li><strong>Interface Endpoint:</strong> その他のAWSサービス。ENI(ネットワークインターフェース)を使用</li>
            <li>プライベートサブネットからインターネットを経由せずにAWSサービスにアクセス可能</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 16px;
}

.info-item, .setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item label, .setting-item label {
  font-weight: bold;
  color: #424242;
  font-size: 14px;
}

.info-item span {
  color: #666;
  font-size: 14px;
}

.resource-id {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background-color: #e8e8e8;
  padding: 2px 6px;
  border-radius: 4px;
  word-break: break-all;
}

.service-info {
  background-color: #e3f2fd;
  border: 1px solid #2196f3;
  border-radius: 8px;
  padding: 16px;
}

.info-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.info-title {
  font-weight: bold;
  color: #1976d2;
}

.service-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid #bbdefb;
}

.detail-item:last-child {
  border-bottom: none;
}

.detail-label {
  font-weight: 500;
  color: #424242;
}

.detail-value {
  color: #666;
}

.gateway-type {
  color: #4caf50;
  font-weight: bold;
}

.interface-type {
  color: #ff9800;
  font-weight: bold;
}

.service-name {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  background-color: #fff;
  padding: 2px 6px;
  border-radius: 4px;
  color: #1976d2;
}

.no-service-selected {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 4px;
}

.no-service-selected span {
  color: #e65100;
  font-size: 14px;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #e8f5e8;
  border-radius: 4px;
  border-left: 3px solid #4caf50;
}

.note-content {
  color: #2e7d32;
  font-size: 13px;
  line-height: 1.4;
}

.note-content p {
  margin: 0 0 8px 0;
  font-weight: bold;
}

.note-content ul {
  margin: 0;
  padding-left: 16px;
}

.note-content li {
  margin-bottom: 4px;
}
</style>