<script setup lang="ts">
  import type { ComputeResource, FargateTask } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()

  const currentFargate = computed(() => {
    return setting.value && setting.value.type === 'fargate' ? setting.value as ComputeResource : null
  })

  // Fargate設定のローカル状態
  const tasks = ref<FargateTask[]>(currentFargate.value?.fargate?.tasks || [])
  const selectedSubnets = ref<string[]>(currentFargate.value?.subnetIds || [])

  // 利用可能な機能リスト（中級者向け）
  const availableFeatures = [
    { id: 'corp-web-001', name: 'Webサイト', description: 'ウェブサイトのホスティング機能' },
    { id: 'corp-db-001', name: 'ブログ', description: 'ブログシステムの機能' },
    { id: 'corp-api-001', name: 'API', description: 'REST API機能' },
    { id: 'corp-admin-001', name: '管理画面', description: '管理者向けの画面機能' }
  ]

  // 同じVPC内の利用可能なサブネットを取得
  const availableSubnets = computed(() => {
    if (!currentFargate.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentFargate.value!.vpcId)
    if (!currentVpc || !currentVpc.availabilityZones || !currentVpc.subnets) return []
    
    return currentVpc.subnets.map(subnet => {
      const azResource = currentVpc.availabilityZones.find(az => az.id === subnet.azId)
      const azDisplayName = azResource ? `AZ-${azResource.azName.toUpperCase()}` : 'Unknown AZ'
      
      return {
        id: subnet.id,
        name: subnet.name,
        type: subnet.type === 'private_subnet' ? 'Private' : 'Public',
        azName: azDisplayName,
        title: `${subnet.name} (${subnet.type === 'private_subnet' ? 'Private' : 'Public'}, ${azDisplayName})`
      }
    })
  })

  // 新しいタスクを追加
  const addTask = () => {
    const newTask: FargateTask = {
      id: crypto.randomUUID(),
      name: `Task-${tasks.value.length + 1}`,
      container: {
        id: crypto.randomUUID(),
        attachedFeatures: []
      }
    }
    tasks.value.push(newTask)
  }

  // タスクを削除
  const removeTask = (taskId: string) => {
    const index = tasks.value.findIndex(task => task.id === taskId)
    if (index > -1) {
      tasks.value.splice(index, 1)
    }
  }

  // 設定を更新する関数
  const updateFargateSettings = () => {
    if (!currentFargate.value) return
    
    if (!currentFargate.value.fargate) {
      currentFargate.value.fargate = {}
    }
    
    currentFargate.value.fargate.tasks = tasks.value
    currentFargate.value.subnetIds = selectedSubnets.value
  }

  // リソース変更時にローカル状態をリセット
  watch(currentFargate, (newFargate) => {
    if (newFargate && newFargate.fargate) {
      tasks.value = newFargate.fargate.tasks || []
      selectedSubnets.value = newFargate.subnetIds || []
    } else {
      tasks.value = []
      selectedSubnets.value = []
    }
  }, { immediate: true })

  // 設定変更を監視
  watch([tasks, selectedSubnets], updateFargateSettings, { deep: true })

  // 機能名を取得
  const getFeatureName = (featureId: string) => {
    const feature = availableFeatures.find(f => f.id === featureId)
    return feature?.name || featureId
  }
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
      
      <div class="subnet-settings-section">
        <h3>サブネット配置</h3>
        
        <v-select
          v-model="selectedSubnets"
          :items="availableSubnets"
          item-title="title"
          item-value="id"
          label="配置するサブネット"
          variant="outlined"
          density="compact"
          multiple
          chips
          closable-chips
        />
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>Fargateを配置するサブネットを選択してください。複数選択で高可用性を実現できます。</span>
        </div>
      </div>
      
      <div class="tasks-section">
        <h3>タスク設定</h3>
        
        <div class="tasks-actions">
          <v-btn 
            @click="addTask"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
          >
            タスクを追加
          </v-btn>
          <div class="tasks-count">
            合計: {{ tasks.length }}個のタスク
          </div>
        </div>
        
        <div v-if="tasks.length === 0" class="no-tasks-message">
          <v-icon color="grey">mdi-information</v-icon>
          <span>タスクが設定されていません。タスクを追加してください。</span>
        </div>
        
        <div v-for="task in tasks" :key="task.id" class="task-card">
          <div class="task-header">
            <v-text-field
              v-model="task.name"
              label="タスク名"
              variant="outlined"
              density="compact"
              class="task-name-field"
            />
            
            <v-btn
              @click="removeTask(task.id)"
              color="error"
              icon="mdi-delete"
              variant="text"
              size="small"
            />
          </div>
          
          <div class="task-content">
            <h4>コンテナ設定</h4>
            
            <div class="container-config">
              <v-select
                v-model="task.container.attachedFeatures"
                :items="availableFeatures"
                item-title="name"
                item-value="id"
                label="このコンテナに付与する機能を選択（1つまで）"
                variant="outlined"
                density="compact"
                clearable
                multiple
                :max-selections="1"
              >
                <template #item="{ props, item }">
                  <v-list-item v-bind="props">
                    <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                    <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
                  </v-list-item>
                </template>
              </v-select>
              
              <!-- 付与済み機能の表示 -->
              <div v-if="task.container.attachedFeatures && task.container.attachedFeatures.length > 0" class="attached-feature">
                <div class="feature-item">
                  <div class="feature-info">
                    <div class="feature-name">{{ getFeatureName(task.container.attachedFeatures[0]) }}</div>
                    <div class="feature-id">{{ task.container.attachedFeatures[0] }}</div>
                    <div class="feature-description">
                      {{ availableFeatures.find(f => f.id === task.container.attachedFeatures[0])?.description }}
                    </div>
                  </div>
                  <v-icon color="success" size="small">check_circle</v-icon>
                </div>
              </div>
              
              <div v-else class="no-feature">
                <v-icon size="24" color="grey">inventory</v-icon>
                <p>機能が付与されていません</p>
              </div>
            </div>
          </div>
        </div>
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>各タスクは1つのコンテナを実行します。コンテナには1つの機能を付与できます。機能要件チェックで、この機能が適切に実装されているかを検証できます。</span>
        </div>
      </div>

      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>AWS Fargateはサーバーレスなコンテナ実行環境です。設定したタスクが選択されたサブネットで実行されます。</span>
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

.subnet-settings-section, .tasks-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.subnet-settings-section h3, .tasks-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.tasks-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.tasks-count {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.no-tasks-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
}

.task-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
}

.task-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.task-name-field {
  flex: 1;
}

.task-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-content h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 8px;
}

.container-config {
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 4px;
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

/* 機能表示スタイル */
.attached-feature {
  margin-top: 12px;
}

.feature-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 8px;
}

.feature-info {
  flex: 1;
}

.feature-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
  font-size: 14px;
}

.feature-id {
  font-size: 11px;
  color: #666;
  font-family: monospace;
  margin-bottom: 4px;
}

.feature-description {
  font-size: 12px;
  color: #555;
}

.no-feature {
  text-align: center;
  padding: 16px;
  color: #666;
  margin-top: 12px;
}

.no-feature p {
  margin-top: 4px;
  margin-bottom: 0;
  font-size: 12px;
}
</style>