<script setup lang="ts">
  import type { ComputeResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const currentFargate = computed(() => {
    return setting.value && setting.value.type === 'fargate' ? setting.value as ComputeResource : null
  })

  // Fargate設定のローカル状態
  const desiredCount = ref(currentFargate.value?.fargate?.desiredCount || 2)
  const minCapacity = ref(currentFargate.value?.fargate?.minCapacity || 1)
  const maxCapacity = ref(currentFargate.value?.fargate?.maxCapacity || 10)
  const cpu = ref(currentFargate.value?.fargate?.cpu || 256)
  const memory = ref(currentFargate.value?.fargate?.memory || 512)
  const ecrRepository = ref(currentFargate.value?.fargate?.ecrRepository || '')
  const ecrEndpoint = ref(currentFargate.value?.fargate?.ecrEndpoint || '')
  
  const autoscalingEnabled = ref(currentFargate.value?.fargate?.autoscaling?.enabled || false)
  const targetCpuUtilization = ref(currentFargate.value?.fargate?.autoscaling?.targetCpuUtilization || 70)
  const scaleUpCooldown = ref(currentFargate.value?.fargate?.autoscaling?.scaleUpCooldown || 300)
  const scaleDownCooldown = ref(currentFargate.value?.fargate?.autoscaling?.scaleDownCooldown || 300)
  
  // タスクグループ管理
  const taskGroups = ref(currentFargate.value?.fargate?.taskGroups || [])

  // 利用可能な機能リスト（サンプル）
  const availableFeatures = computed(() => [
    { title: 'Webサーバー', value: 'web-server' },
    { title: 'APIサーバー', value: 'api-server' },
    { title: 'バックグラウンド処理', value: 'background-worker' },
    { title: 'データ処理', value: 'data-processor' },
    { title: 'キューワーカー', value: 'queue-worker' },
    { title: 'ログ収集', value: 'log-collector' },
    { title: 'メトリクス収集', value: 'metrics-collector' },
    { title: 'キャッシュサーバー', value: 'cache-server' }
  ])

  // CPUとメモリの選択肢
  const cpuOptions = [
    { title: '0.25 vCPU', value: 256 },
    { title: '0.5 vCPU', value: 512 },
    { title: '1 vCPU', value: 1024 },
    { title: '2 vCPU', value: 2048 },
    { title: '4 vCPU', value: 4096 }
  ]

  const memoryOptions = computed(() => {
    const cpuValue = cpu.value
    const options = []
    
    if (cpuValue === 256) {
      options.push({ title: '512 MB', value: 512 }, { title: '1 GB', value: 1024 }, { title: '2 GB', value: 2048 })
    } else if (cpuValue === 512) {
      for (let i = 1; i <= 4; i++) {
        options.push({ title: `${i} GB`, value: i * 1024 })
      }
    } else if (cpuValue === 1024) {
      for (let i = 2; i <= 8; i++) {
        options.push({ title: `${i} GB`, value: i * 1024 })
      }
    } else if (cpuValue === 2048) {
      for (let i = 4; i <= 16; i++) {
        options.push({ title: `${i} GB`, value: i * 1024 })
      }
    } else if (cpuValue === 4096) {
      for (let i = 8; i <= 30; i++) {
        options.push({ title: `${i} GB`, value: i * 1024 })
      }
    }
    
    return options
  })

  // 利用可能なECRリポジトリ（サービス一覧から）
  const availableEcrRepositories = computed(() => {
    return services.value
      .filter(service => service.type === 'ecr')
      .map(service => ({
        title: service.name,
        value: service.id
      }))
  })

  // 利用可能なVPCエンドポイント（ECR用）
  const availableEcrEndpoints = computed(() => {
    if (!currentFargate.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentFargate.value!.vpcId)
    if (!currentVpc) return []
    
    return currentVpc.networks
      .filter(network => 
        network.type === 'endpoint' && 
        network.serviceEndpoint && 
        ['ecr.api', 'ecr.dkr', 'com.amazonaws.vpce-endpoint-service.ecr'].some(service => 
          network.serviceEndpoint!.includes(service)
        )
      )
      .map(endpoint => ({
        title: `${endpoint.name} (${endpoint.serviceEndpoint})`,
        value: endpoint.id
      }))
  })

  // ECR依存関係の検証
  const ecrDependencyStatus = computed(() => {
    if (!currentFargate.value) return { isValid: false, message: '' }
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentFargate.value!.vpcId)
    if (!currentVpc) return { isValid: false, message: 'VPCが見つかりません' }
    
    // ECRリポジトリが存在するかチェック
    const hasEcrRepository = services.value.some(service => service.type === 'ecr')
    
    // プライベートサブネットにFargateがある場合、ECRエンドポイントが必要
    const isInPrivateSubnet = currentFargate.value.subnetIds.some(subnetId => {
      const subnet = currentVpc.subnets.find(s => s.id === subnetId)
      return subnet && subnet.type === 'private_subnet'
    })
    
    if (!hasEcrRepository) {
      return { 
        isValid: false, 
        message: 'ECRリポジトリが作成されていません。Fargateの動作にはECRが必要です。' 
      }
    }
    
    if (isInPrivateSubnet) {
      const hasEcrEndpoint = availableEcrEndpoints.value.length > 0
      const isEcrEndpointSelected = !!ecrEndpoint.value
      
      if (!hasEcrEndpoint) {
        return { 
          isValid: false, 
          message: 'プライベートサブネット内のFargateがECRにアクセスするにはVPCエンドポイント（ECR）が必要です。' 
        }
      }
      
      if (!isEcrEndpointSelected) {
        return { 
          isValid: false, 
          message: 'ECRエンドポイントを選択してください。' 
        }
      }
    }
    
    return { isValid: true, message: 'ECR依存関係は正常です。' }
  })

  // 新しいタスクグループを追加
  const addTaskGroup = () => {
    const newTaskGroup = {
      id: crypto.randomUUID(),
      name: `TaskGroup-${taskGroups.value.length + 1}`,
      features: [],
      containers: [{
        id: crypto.randomUUID(),
        name: 'main-container',
        imageUri: '',
        port: 80,
        environmentVariables: {},
        cpu: 128,
        memory: 256
      }],
      taskCount: 1
    }
    taskGroups.value.push(newTaskGroup)
  }

  // タスクグループを削除
  const removeTaskGroup = (groupId: string) => {
    const index = taskGroups.value.findIndex(group => group.id === groupId)
    if (index > -1) {
      taskGroups.value.splice(index, 1)
    }
  }

  // 設定を更新する関数
  const updateFargateSettings = () => {
    if (!currentFargate.value) return
    
    if (!currentFargate.value.fargate) {
      currentFargate.value.fargate = {}
    }
    
    currentFargate.value.fargate.desiredCount = desiredCount.value
    currentFargate.value.fargate.minCapacity = minCapacity.value
    currentFargate.value.fargate.maxCapacity = maxCapacity.value
    currentFargate.value.fargate.cpu = cpu.value
    currentFargate.value.fargate.memory = memory.value
    currentFargate.value.fargate.ecrRepository = ecrRepository.value
    currentFargate.value.fargate.ecrEndpoint = ecrEndpoint.value
    currentFargate.value.fargate.taskGroups = taskGroups.value
    
    currentFargate.value.fargate.autoscaling = {
      enabled: autoscalingEnabled.value,
      targetCpuUtilization: targetCpuUtilization.value,
      scaleUpCooldown: scaleUpCooldown.value,
      scaleDownCooldown: scaleDownCooldown.value
    }
  }

  // CPUが変更された時にメモリを適切な値に調整
  watch(cpu, (newCpu) => {
    const validMemoryOptions = memoryOptions.value
    if (!validMemoryOptions.some(option => option.value === memory.value)) {
      memory.value = validMemoryOptions[0]?.value || 512
    }
  })

  // リソース変更時にローカル状態をリセット
  watch(currentFargate, (newFargate) => {
    if (newFargate && newFargate.fargate) {
      desiredCount.value = newFargate.fargate.desiredCount || 2
      minCapacity.value = newFargate.fargate.minCapacity || 1
      maxCapacity.value = newFargate.fargate.maxCapacity || 10
      cpu.value = newFargate.fargate.cpu || 256
      memory.value = newFargate.fargate.memory || 512
      ecrRepository.value = newFargate.fargate.ecrRepository || ''
      ecrEndpoint.value = newFargate.fargate.ecrEndpoint || ''
      taskGroups.value = newFargate.fargate.taskGroups || []
      autoscalingEnabled.value = newFargate.fargate.autoscaling?.enabled || false
      targetCpuUtilization.value = newFargate.fargate.autoscaling?.targetCpuUtilization || 70
      scaleUpCooldown.value = newFargate.fargate.autoscaling?.scaleUpCooldown || 300
      scaleDownCooldown.value = newFargate.fargate.autoscaling?.scaleDownCooldown || 300
    } else {
      desiredCount.value = 2
      minCapacity.value = 1
      maxCapacity.value = 10
      cpu.value = 256
      memory.value = 512
      ecrRepository.value = ''
      ecrEndpoint.value = ''
      taskGroups.value = []
      autoscalingEnabled.value = false
      targetCpuUtilization.value = 70
      scaleUpCooldown.value = 300
      scaleDownCooldown.value = 300
    }
  }, { immediate: true })

  // 設定変更を監視
  watch([
    desiredCount, minCapacity, maxCapacity, cpu, memory, ecrRepository, ecrEndpoint,
    autoscalingEnabled, targetCpuUtilization, scaleUpCooldown, scaleDownCooldown, taskGroups
  ], updateFargateSettings, { deep: true })
</script>

<template>
  <div>
    <h2>Fargate設定</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentFargate?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentFargate?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentFargate?.type?.toUpperCase() }}</span>
      </div>
      
      <div class="capacity-section">
        <h3>キャパシティ設定</h3>
        
        <div class="config-grid">
          <v-text-field
            v-model.number="desiredCount"
            label="希望するタスク数"
            type="number"
            variant="outlined"
            density="compact"
            :min="0"
            :max="1000"
            suffix="タスク"
          />
          
          <v-text-field
            v-model.number="minCapacity"
            label="最小キャパシティ"
            type="number"
            variant="outlined"
            density="compact"
            :min="0"
            :max="maxCapacity"
            suffix="タスク"
          />
          
          <v-text-field
            v-model.number="maxCapacity"
            label="最大キャパシティ"
            type="number"
            variant="outlined"
            density="compact"
            :min="minCapacity"
            :max="1000"
            suffix="タスク"
          />
        </div>
      </div>
      
      <div class="resources-section">
        <h3>リソース設定</h3>
        
        <div class="config-grid">
          <v-select
            v-model="cpu"
            :items="cpuOptions"
            label="CPU"
            variant="outlined"
            density="compact"
          />
          
          <v-select
            v-model="memory"
            :items="memoryOptions"
            label="メモリ"
            variant="outlined"
            density="compact"
          />
        </div>
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>CPUとメモリの組み合わせはAWS Fargateの制限に基づいて選択できます。</span>
        </div>
      </div>
      
      <div class="ecr-section">
        <h3>ECR設定</h3>
        
        <v-select
          v-model="ecrRepository"
          :items="availableEcrRepositories"
          label="ECRリポジトリ"
          variant="outlined"
          density="compact"
          clearable
        />
        
        <v-select
          v-model="ecrEndpoint"
          :items="availableEcrEndpoints"
          label="ECRエンドポイント"
          variant="outlined"
          density="compact"
          clearable
        />
        
        <!-- ECR依存関係の状態表示 -->
        <v-alert
          :type="ecrDependencyStatus.isValid ? 'success' : 'warning'"
          variant="tonal"
          class="mt-3"
        >
          <v-icon :color="ecrDependencyStatus.isValid ? 'success' : 'warning'">
            {{ ecrDependencyStatus.isValid ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          {{ ecrDependencyStatus.message }}
        </v-alert>
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>プライベートサブネット内のFargateがECRにアクセスするには、ECRエンドポイントが必要です。</span>
        </div>
      </div>
      
      <div class="autoscaling-section">
        <h3>オートスケーリング設定</h3>
        
        <div class="config-item">
          <v-switch
            v-model="autoscalingEnabled"
            label="オートスケーリングを有効にする"
            color="primary"
            density="compact"
          />
        </div>
        
        <div v-if="autoscalingEnabled" class="autoscaling-config">
          <div class="config-grid">
            <v-text-field
              v-model.number="targetCpuUtilization"
              label="ターゲットCPU使用率"
              type="number"
              variant="outlined"
              density="compact"
              :min="1"
              :max="100"
              suffix="%"
            />
            
            <div></div>
            
            <v-text-field
              v-model.number="scaleUpCooldown"
              label="スケールアップクールダウン"
              type="number"
              variant="outlined"
              density="compact"
              :min="0"
              :max="3600"
              suffix="秒"
            />
            
            <v-text-field
              v-model.number="scaleDownCooldown"
              label="スケールダウンクールダウン"
              type="number"
              variant="outlined"
              density="compact"
              :min="0"
              :max="3600"
              suffix="秒"
            />
          </div>
          
          <div class="config-description">
            <v-icon size="small" color="#1976d2">info</v-icon>
            <span>CPU使用率に基づいてタスク数を自動調整します。クールダウン期間により、急激なスケーリングを防ぎます。</span>
          </div>
        </div>
      </div>
      
      <div class="task-groups-section">
        <h3>タスクグループ管理</h3>
        
        <div class="task-groups-actions">
          <v-btn 
            @click="addTaskGroup"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
          >
            タスクグループを追加
          </v-btn>
        </div>
        
        <div v-if="taskGroups.length === 0" class="no-groups-message">
          <v-icon color="grey">mdi-information</v-icon>
          <span>タスクグループが設定されていません。機能を割り当てるにはタスクグループを追加してください。</span>
        </div>
        
        <div v-for="(group, index) in taskGroups" :key="group.id" class="task-group-card">
          <div class="task-group-header">
            <v-text-field
              v-model="group.name"
              label="グループ名"
              variant="outlined"
              density="compact"
              class="group-name-field"
            />
            
            <v-btn
              @click="removeTaskGroup(group.id)"
              color="error"
              icon="mdi-delete"
              variant="text"
              size="small"
            />
          </div>
          
          <div class="task-group-content">
            <div class="config-grid">
              <v-text-field
                v-model.number="group.taskCount"
                label="タスク数"
                type="number"
                variant="outlined"
                density="compact"
                :min="1"
                :max="100"
                suffix="タスク"
              />
              
              <v-select
                v-model="group.features"
                :items="availableFeatures"
                label="機能"
                variant="outlined"
                density="compact"
                multiple
                chips
                clearable
              />
            </div>
            
            <div class="containers-section">
              <h4>コンテナ設定</h4>
              <div v-for="container in group.containers" :key="container.id" class="container-config">
                <div class="config-grid">
                  <v-text-field
                    v-model="container.name"
                    label="コンテナ名"
                    variant="outlined"
                    density="compact"
                  />
                  
                  <v-text-field
                    v-model="container.imageUri"
                    label="イメージURI"
                    variant="outlined"
                    density="compact"
                    placeholder="123456789012.dkr.ecr.region.amazonaws.com/repo:tag"
                  />
                  
                  <v-text-field
                    v-model.number="container.port"
                    label="ポート"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :min="1"
                    :max="65535"
                  />
                  
                  <div></div>
                  
                  <v-text-field
                    v-model.number="container.cpu"
                    label="CPU割り当て"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :min="0"
                    :max="4096"
                    suffix="CPU units"
                  />
                  
                  <v-text-field
                    v-model.number="container.memory"
                    label="メモリ割り当て"
                    type="number"
                    variant="outlined"
                    density="compact"
                    :min="0"
                    :max="30720"
                    suffix="MB"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>タスクグループごとに機能を割り当て、それぞれ独立したコンテナを実行できます。複数のサブネットに分散配置され、高可用性を実現します。</span>
        </div>
      </div>

      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>AWS Fargateはサーバーレスなコンテナ実行環境です。ECRからコンテナイメージを取得し、指定されたリソースでタスクを実行します。オートスケーリングにより、負荷に応じて自動的にタスク数を調整できます。</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
  margin-top: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item label {
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

.capacity-section, .resources-section, .ecr-section, .autoscaling-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.capacity-section h3, .resources-section h3, .ecr-section h3, .autoscaling-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.config-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 12px;
}

.config-item {
  margin-bottom: 16px;
}

.autoscaling-config {
  margin-top: 16px;
}

.config-description {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  background-color: #e3f2fd;
  border-radius: 4px;
  margin-top: 12px;
}

.config-description span {
  font-size: 12px;
  color: #1976d2;
  line-height: 1.4;
}

.info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
  margin-top: 8px;
}

.info-note span {
  font-size: 13px;
  color: #1976d2;
  line-height: 1.4;
}

.task-groups-section, .capacity-section, .resources-section, .ecr-section, .autoscaling-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.task-groups-actions {
  margin-bottom: 16px;
}

.no-groups-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
}

.task-group-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
}

.task-group-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.group-name-field {
  flex: 1;
}

.task-group-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.containers-section h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.container-config {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
  margin-bottom: 8px;
}
</style>