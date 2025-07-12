<script setup lang="ts">
  import type { ComputeResource, DatabaseResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'
  import { isMultiSubnetService } from '@/types/service.ts'

  const { setting } = useInfo()
  const { vpcList, updateComputeSubnets } = useVpcList()

  const isMultiSubnet = computed(() => {
    if (!setting.value) return false
    return isMultiSubnetService(setting.value.type)
  })

  const isLambda = computed(() => {
    return setting.value?.type === 'lambda'
  })

  const currentResource = computed(() => {
    return setting.value as ComputeResource
  })

  const availableSubnets = computed(() => {
    if (!currentResource.value) return []
    const vpc = vpcList.value.find(vpc => vpc.vpcId === currentResource.value.vpcId)
    return vpc?.subnets.map(s => ({
      title: s.name,
      value: s.id,
    })) || []
  })

  const selectedSubnetIds = ref<string[]>([])
  const selectedSubnetId = ref<string>('')
  const attachedFeatures = ref<string[]>([])
  const selectedFeature = ref<string>('') // Lambda用の単一機能選択

  // モック機能要件データ
  const availableFeatures = [
    { id: 'corp-web-001', name: 'Webサイト', description: 'ウェブサイトのホスティング機能' },
    { id: 'corp-db-001', name: 'ブログ', description: 'ブログシステムの機能' },
    { id: 'corp-api-001', name: 'API', description: 'REST API機能' },
    { id: 'corp-admin-001', name: '管理画面', description: '管理者向けの画面機能' }
  ]

  watch(currentResource, newResource => {
    if (!newResource) return
    selectedSubnetIds.value = [...newResource.subnetIds]
    selectedSubnetId.value = newResource.subnetIds[0] || ''
    attachedFeatures.value = [...(newResource.attachedFeatures || [])]
    
    // Lambdaの場合は最初の機能を単一選択に設定
    if (isLambda.value) {
      selectedFeature.value = newResource.attachedFeatures?.[0] || ''
    }
  }, { immediate: true })

  // マルチサブネット選択の変更を監視
  watch(selectedSubnetIds, newSubnetIds => {
    if (!currentResource.value || !isMultiSubnet.value) return
    updateComputeSubnets(currentResource.value.id, newSubnetIds)
  }, { deep: true })

  // シングルサブネット選択の変更を監視
  watch(selectedSubnetId, newSubnetId => {
    if (!currentResource.value || isMultiSubnet.value) return
    updateComputeSubnets(currentResource.value.id, newSubnetId ? [newSubnetId] : [])
  })

  // 機能付与の変更を監視（非Lambda）
  watch(attachedFeatures, newFeatures => {
    if (!currentResource.value || isLambda.value) return
    
    // computeリソースに機能を付与
    if (!currentResource.value.attachedFeatures) {
      currentResource.value.attachedFeatures = []
    }
    currentResource.value.attachedFeatures = [...newFeatures]
  }, { deep: true })

  // Lambda用の単一機能選択の変更を監視
  watch(selectedFeature, newFeature => {
    if (!currentResource.value || !isLambda.value) return
    
    if (!currentResource.value.attachedFeatures) {
      currentResource.value.attachedFeatures = []
    }
    currentResource.value.attachedFeatures = newFeature ? [newFeature] : []
  })

  const getFeatureName = (featureId: string) => {
    const feature = availableFeatures.find(f => f.id === featureId)
    return feature?.name || featureId
  }
</script>

<template>
  <div>
    <h2>{{ currentResource?.type?.toUpperCase() }} 設定</h2>
    
    <!-- 基本情報 -->
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentResource?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentResource?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentResource?.type?.toUpperCase() }}</span>
      </div>
    </div>

    <!-- サブネット設定 -->
    <div class="setting-section">
      <h3>サブネット設定</h3>
      <v-select
        v-if="isMultiSubnet"
        v-model="selectedSubnetIds"
        item-title="title"
        item-value="value"
        :items="availableSubnets"
        label="Subnetを選択（複数選択可）"
        variant="outlined"
        multiple
        chips
        closable-chips
      />
      <v-select
        v-else
        v-model="selectedSubnetId"
        item-title="title"
        item-value="value"
        :items="availableSubnets"
        label="Subnetを選択"
        variant="outlined"
      />
    </div>

    <!-- 機能付与設定 -->
    <div class="setting-section">
      <h3>機能付与設定</h3>
      <div class="feature-selection">
        <!-- Lambda用の単一機能選択 -->
        <v-select
          v-if="isLambda"
          v-model="selectedFeature"
          :items="availableFeatures"
          item-title="name"
          item-value="id"
          label="このLambdaに付与する機能を選択（1つまで）"
          variant="outlined"
          clearable
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
            </v-list-item>
          </template>
        </v-select>
        
        <!-- 非Lambda用の複数機能選択 -->
        <v-select
          v-else
          v-model="attachedFeatures"
          :items="availableFeatures"
          item-title="name"
          item-value="id"
          label="このリソースに付与する機能を選択"
          variant="outlined"
          multiple
          chips
          closable-chips
        >
          <template #item="{ props, item }">
            <v-list-item v-bind="props">
              <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
              <v-list-item-subtitle>{{ item.raw.description }}</v-list-item-subtitle>
            </v-list-item>
          </template>
          <template #chip="{ props, item }">
            <v-chip v-bind="props" color="primary" variant="tonal">
              {{ item.raw.name }}
            </v-chip>
          </template>
        </v-select>
        
        <!-- 付与済み機能の詳細表示 -->
        <div v-if="(isLambda && selectedFeature) || (!isLambda && attachedFeatures.length > 0)" class="attached-features">
          <h4>付与済み機能</h4>
          <div class="feature-list">
            <div 
              v-for="featureId in attachedFeatures" 
              :key="featureId"
              class="feature-item"
            >
              <div class="feature-info">
                <div class="feature-name">{{ getFeatureName(featureId) }}</div>
                <div class="feature-id">{{ featureId }}</div>
                <div class="feature-description">
                  {{ availableFeatures.find(f => f.id === featureId)?.description }}
                </div>
              </div>
              <v-icon color="success">check_circle</v-icon>
            </div>
          </div>
        </div>
        
        <div v-else class="no-features">
          <v-icon size="48" color="grey">inventory</v-icon>
          <p>機能が付与されていません</p>
          <p v-if="isLambda" class="text-caption">上記のセレクトボックスから機能を1つ選択してください</p>
          <p v-else class="text-caption">上記のセレクトボックスから機能を選択してください</p>
        </div>

        <div class="feature-note">
          <v-icon size="small" color="#1976d2">info</v-icon>
          <span v-if="isLambda">Lambdaは1つの機能のみ付与可能です。機能要件チェックで、この機能が適切に実装されているかを検証できます</span>
          <span v-else>機能要件チェックで、これらの機能が適切に実装されているかを検証できます</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.setting-section {
  margin-bottom: 24px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
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

h3 {
  color: #333;
  font-weight: 600;
  margin-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;
  padding-bottom: 8px;
}

.feature-selection {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.attached-features h4 {
  color: #333;
  font-weight: 600;
  margin-bottom: 12px;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
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
}

.feature-id {
  font-size: 11px;
  color: #666;
  font-family: monospace;
  margin-bottom: 4px;
}

.feature-description {
  font-size: 13px;
  color: #555;
}

.no-features {
  text-align: center;
  padding: 32px;
  color: #666;
}

.no-features p {
  margin-top: 8px;
  margin-bottom: 0;
}

.feature-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
}

.feature-note span {
  font-size: 13px;
  color: #1976d2;
  line-height: 1.4;
}
</style>
