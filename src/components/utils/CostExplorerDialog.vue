<template>
  <v-dialog v-model="dialogModel" max-width="800px" persistent>
    <v-card>
      <v-card-title class="dialog-title">
        <v-icon class="mr-2">trending_up</v-icon>
        コスト確認
        <v-spacer />
        <v-btn icon @click="closeDialog">
          <v-icon>close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text class="pa-6">
        <div v-if="loading" class="loading-container">
          <v-progress-circular indeterminate color="primary" size="64" />
          <p class="mt-4">コスト情報を取得中...</p>
        </div>
        
        <div v-else>
          <!-- コスト概要 -->
          <div class="cost-summary mb-6">
            <h3 class="mb-3">月間推定コスト</h3>
            <div class="total-cost">
              <span class="currency">$</span>
              <span class="amount">{{ totalCost.toFixed(2) }}</span>
            </div>
          </div>
          
          <!-- コストグラフ -->
          <div class="cost-chart mb-6">
            <h3 class="mb-3">サービス別コスト内訳</h3>
            <div class="chart-container">
              <div 
                v-for="(cost, service) in costData" 
                :key="service"
                class="cost-bar"
              >
                <div class="service-label">{{ formatServiceName(service) }}</div>
                <div class="bar-container">
                  <div 
                    class="cost-value-bar"
                    :style="{ width: `${(cost / maxCost) * 100}%` }"
                  ></div>
                  <span class="cost-value">${{ cost.toFixed(2) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- コスト詳細テーブル -->
          <div class="cost-details">
            <h3 class="mb-3">詳細内訳</h3>
            <v-table>
              <thead>
                <tr>
                  <th>サービス</th>
                  <th>月間コスト</th>
                  <th>構成</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(cost, service) in costData" :key="service">
                  <td>
                    <div class="service-info">
                      <component 
                        :is="getServiceIcon(service)" 
                        class="service-icon" 
                      />
                      {{ formatServiceName(service) }}
                    </div>
                  </td>
                  <td class="cost-cell">${{ cost.toFixed(2) }}</td>
                  <td>{{ getServiceCount(service) }}個</td>
                </tr>
              </tbody>
            </v-table>
          </div>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer />
        <v-btn color="primary" @click="refreshCost">
          <v-icon class="mr-1">refresh</v-icon>
          更新
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
  import { ICONS } from '@/icons'

  interface Props {
    modelValue: boolean
  }

  interface Emits {
    (e: 'update:modelValue', value: boolean): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const loading = ref(false)
  const costData = ref<Record<string, number>>({})

  const dialogModel = computed({
    get: () => props.modelValue,
    set: (value) => emit('update:modelValue', value)
  })

  const totalCost = computed(() => {
    return Object.values(costData.value).reduce((sum, cost) => sum + cost, 0)
  })

  const maxCost = computed(() => {
    return Math.max(...Object.values(costData.value))
  })

  // モックデータを生成する関数
  const generateMockCostData = () => {
    const mockData: Record<string, number> = {}
    
    // グローバルサービスのコスト
    services.value.forEach(service => {
      switch (service.type) {
        case 'ec2':
          mockData[service.type] = (mockData[service.type] || 0) + 20.50
          break
        case 'lambda':
          mockData[service.type] = (mockData[service.type] || 0) + 0.05
          break
        case 's3':
          mockData[service.type] = (mockData[service.type] || 0) + 5.23
          break
        case 'rds':
          mockData[service.type] = (mockData[service.type] || 0) + 45.80
          break
        case 'alb':
          mockData[service.type] = (mockData[service.type] || 0) + 16.20
          break
        case 'nat_gateway':
          mockData[service.type] = (mockData[service.type] || 0) + 32.40
          break
        case 'api_gateway':
          mockData[service.type] = (mockData[service.type] || 0) + 3.50
          break
        case 'cloudfront':
          mockData[service.type] = (mockData[service.type] || 0) + 8.75
          break
        case 'elastic_ip':
          mockData[service.type] = (mockData[service.type] || 0) + 3.65
          break
        default:
          mockData[service.type] = (mockData[service.type] || 0) + Math.random() * 10
      }
    })

    // VPCサービスのコスト
    vpcList.value.forEach(vpc => {
      vpc.computes.forEach(compute => {
        switch (compute.type) {
          case 'ec2':
            mockData[compute.type] = (mockData[compute.type] || 0) + 20.50
            break
          case 'fargate':
            mockData[compute.type] = (mockData[compute.type] || 0) + 15.30
            break
          case 'lambda':
            mockData[compute.type] = (mockData[compute.type] || 0) + 0.05
            break
          default:
            mockData[compute.type] = (mockData[compute.type] || 0) + Math.random() * 10
        }
      })

      vpc.databases.forEach(database => {
        switch (database.type) {
          case 'rds':
            mockData[database.type] = (mockData[database.type] || 0) + 45.80
            break
          default:
            mockData[database.type] = (mockData[database.type] || 0) + Math.random() * 15
        }
      })

      vpc.networks.forEach(network => {
        switch (network.type) {
          case 'nat_gateway':
            mockData[network.type] = (mockData[network.type] || 0) + 32.40
            break
          case 'alb':
          case 'nlb':
            mockData[network.type] = (mockData[network.type] || 0) + 16.20
            break
          default:
            mockData[network.type] = (mockData[network.type] || 0) + Math.random() * 5
        }
      })
    })

    return mockData
  }

  const fetchCostData = async () => {
    loading.value = true
    
    // モックAPIコール
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    costData.value = generateMockCostData()
    loading.value = false
  }

  const refreshCost = () => {
    fetchCostData()
  }

  const formatServiceName = (service: string) => {
    const nameMap: Record<string, string> = {
      'ec2': 'EC2',
      'lambda': 'Lambda',
      's3': 'S3',
      'rds': 'RDS',
      'alb': 'Application Load Balancer',
      'nlb': 'Network Load Balancer',
      'nat_gateway': 'NAT Gateway',
      'api_gateway': 'API Gateway',
      'cloudfront': 'CloudFront',
      'elastic_ip': 'Elastic IP',
      'fargate': 'Fargate',
      'dynamo_db': 'DynamoDB',
      'elasticache': 'ElastiCache'
    }
    return nameMap[service] || service.toUpperCase()
  }

  const getServiceIcon = (service: string) => {
    return ICONS[service]?.component || ICONS['ec2']?.component
  }

  const getServiceCount = (service: string) => {
    let count = 0
    
    // グローバルサービスをカウント
    count += services.value.filter(s => s.type === service).length
    
    // VPCサービスをカウント
    vpcList.value.forEach(vpc => {
      count += vpc.computes.filter(c => c.type === service).length
      count += vpc.databases.filter(d => d.type === service).length
      count += vpc.networks.filter(n => n.type === service).length
    })
    
    return count
  }

  const closeDialog = () => {
    dialogModel.value = false
  }

  // ダイアログが開かれた時にコストデータを取得
  watch(() => props.modelValue, (newValue) => {
    if (newValue) {
      fetchCostData()
    }
  })
</script>

<style scoped>
.dialog-title {
  background-color: #1976d2;
  color: white;
  font-weight: bold;
}

.loading-container {
  text-align: center;
  padding: 60px;
}

.cost-summary {
  text-align: center;
  background: linear-gradient(135deg, #1976d2, #42a5f5);
  color: white;
  padding: 24px;
  border-radius: 12px;
}

.total-cost {
  font-size: 48px;
  font-weight: bold;
}

.currency {
  font-size: 32px;
  opacity: 0.8;
}

.amount {
  margin-left: 4px;
}

.chart-container {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
}

.cost-bar {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.service-label {
  min-width: 150px;
  font-weight: 500;
  color: #333;
}

.bar-container {
  flex: 1;
  position: relative;
  height: 32px;
  background-color: #e9ecef;
  border-radius: 16px;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.cost-value-bar {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(90deg, #4caf50, #8bc34a);
  border-radius: 16px;
  transition: width 0.8s ease;
}

.cost-value {
  position: relative;
  z-index: 1;
  font-weight: bold;
  color: #333;
  margin-left: auto;
}

.service-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.service-icon {
  width: 24px;
  height: 24px;
}

.cost-cell {
  font-weight: bold;
  color: #1976d2;
}

h3 {
  color: #333;
  font-weight: 600;
}
</style>