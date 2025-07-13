<script setup lang="ts">
  import type { ComputeResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'

  const { setting } = useInfo()

  const currentFargate = computed(() => {
    return setting.value && setting.value.type === 'fargate' ? setting.value as ComputeResource : null
  })

  // Fargate設定のローカル状態（簡素化版）
  const taskCount = ref(currentFargate.value?.fargate?.taskCount || 1)
  const containers = ref(currentFargate.value?.fargate?.containers || [])

  // 新しいコンテナを追加
  const addContainer = () => {
    const newContainer = {
      id: crypto.randomUUID(),
      name: `container-${containers.value.length + 1}`,
      port: 80
    }
    containers.value.push(newContainer)
  }

  // コンテナを削除
  const removeContainer = (containerId: string) => {
    const index = containers.value.findIndex(container => container.id === containerId)
    if (index > -1) {
      containers.value.splice(index, 1)
    }
  }

  // 設定を更新する関数
  const updateFargateSettings = () => {
    if (!currentFargate.value) return
    
    if (!currentFargate.value.fargate) {
      currentFargate.value.fargate = {}
    }
    
    currentFargate.value.fargate.taskCount = taskCount.value
    currentFargate.value.fargate.containers = containers.value
  }

  // リソース変更時にローカル状態をリセット
  watch(currentFargate, (newFargate) => {
    if (newFargate && newFargate.fargate) {
      taskCount.value = newFargate.fargate.taskCount || 1
      containers.value = newFargate.fargate.containers || []
    } else {
      taskCount.value = 1
      containers.value = []
    }
  }, { immediate: true })

  // 設定変更を監視
  watch([taskCount, containers], updateFargateSettings, { deep: true })
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
      
      <div class="task-settings-section">
        <h3>タスク設定</h3>
        
        <v-text-field
          v-model.number="taskCount"
          label="タスク数"
          type="number"
          variant="outlined"
          density="compact"
          :min="1"
          :max="10"
          suffix="個"
          class="task-count-field"
        />
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>実行するタスクの数を指定します。各タスクは設定されたコンテナを実行します。</span>
        </div>
      </div>
      
      <div class="containers-section">
        <h3>コンテナ設定</h3>
        
        <div class="containers-actions">
          <v-btn 
            @click="addContainer"
            color="primary"
            variant="outlined"
            prepend-icon="mdi-plus"
            size="small"
          >
            コンテナを追加
          </v-btn>
        </div>
        
        <div v-if="containers.length === 0" class="no-containers-message">
          <v-icon color="grey">mdi-information</v-icon>
          <span>コンテナが設定されていません。コンテナを追加してください。</span>
        </div>
        
        <div v-for="container in containers" :key="container.id" class="container-card">
          <div class="container-header">
            <v-text-field
              v-model="container.name"
              label="コンテナ名"
              variant="outlined"
              density="compact"
              class="container-name-field"
            />
            
            <v-btn
              @click="removeContainer(container.id)"
              color="error"
              icon="mdi-delete"
              variant="text"
              size="small"
            />
          </div>
          
          <div class="container-content">
            <v-text-field
              v-model.number="container.port"
              label="ポート番号"
              type="number"
              variant="outlined"
              density="compact"
              :min="1"
              :max="65535"
              placeholder="80"
              class="port-field"
            />
          </div>
        </div>
        
        <div class="config-description">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span>各コンテナはタスク内で実行されます。ポート番号はコンテナが公開するポートを指定します。</span>
        </div>
      </div>

      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>AWS Fargateはサーバーレスなコンテナ実行環境です。設定したタスク数分のコンテナが実行されます。</span>
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

.task-settings-section, .containers-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.task-settings-section h3, .containers-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.task-count-field {
  max-width: 200px;
  margin-bottom: 12px;
}

.containers-actions {
  margin-bottom: 16px;
}

.no-containers-message {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 4px;
  color: #666;
  font-size: 14px;
}

.container-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fff;
}

.container-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.container-name-field {
  flex: 1;
}

.container-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.port-field {
  max-width: 150px;
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
</style>