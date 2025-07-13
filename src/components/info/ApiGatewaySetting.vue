<script setup lang="ts">
  import type { ApiGatewayResource } from '@/types/service.ts'
  import { isApiGatewayResource } from '@/types/service.ts'
  import { computed, ref } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const currentApiGateway = computed(() => {
    return setting.value && isApiGatewayResource(setting.value) ? setting.value : null
  })

  // 選択可能な宛先リソースを取得
  const availableTargetResources = computed(() => {
    const targets: Array<{ id: string, name: string, type: string, category: string }> = []
    
    // Lambda、ALB、NLB、Fargate、ECSなどのCompute Resources
    vpcList.value.forEach(vpc => {
      vpc.computes.forEach(compute => {
        if (['lambda', 'alb', 'nlb', 'fargate', 'ecs'].includes(compute.type)) {
          targets.push({
            id: compute.id,
            name: compute.name,
            type: compute.type,
            category: `VPC: ${vpc.vpc.name}`
          })
        }
      })
    })

    // EC2インスタンス
    vpcList.value.forEach(vpc => {
      vpc.computes.forEach(compute => {
        if (compute.type === 'ec2') {
          targets.push({
            id: compute.id,
            name: compute.name,
            type: compute.type,
            category: `VPC: ${vpc.vpc.name}`
          })
        }
      })
    })

    return targets
  })

  const selectedTargets = ref<string[]>(currentApiGateway.value?.targetResources || [])

  // 宛先リソースを追加
  const addTargetResource = (resourceId: string) => {
    if (!selectedTargets.value.includes(resourceId)) {
      selectedTargets.value.push(resourceId)
      updateTargetResources()
    }
  }

  // 宛先リソースを削除
  const removeTargetResource = (resourceId: string) => {
    const index = selectedTargets.value.indexOf(resourceId)
    if (index > -1) {
      selectedTargets.value.splice(index, 1)
      updateTargetResources()
    }
  }

  // 宛先リソースを更新
  const updateTargetResources = () => {
    if (currentApiGateway.value) {
      currentApiGateway.value.targetResources = [...selectedTargets.value]
    }
  }

  // 選択済みリソースの詳細情報を取得
  const getSelectedResourceDetails = computed(() => {
    return selectedTargets.value.map(id => {
      return availableTargetResources.value.find(resource => resource.id === id)
    }).filter((resource): resource is { id: string, name: string, type: string, category: string } => resource !== undefined)
  })
</script>

<template>
  <div>
    <h2>API Gateway</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentApiGateway?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentApiGateway?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentApiGateway?.type }}</span>
      </div>
      
      <div class="info-item">
        <label>配信スコープ:</label>
        <span>リージョナル</span>
      </div>
      
      <div class="targets-section">
        <h3>宛先リソース</h3>
        
        <!-- 選択済みの宛先リソース -->
        <div v-if="getSelectedResourceDetails.length > 0" class="selected-targets">
          <div v-for="resource in getSelectedResourceDetails" :key="resource.id" class="target-item">
            <div class="target-info">
              <span class="target-type">{{ resource.type.toUpperCase() }}</span>
              <span class="target-name">{{ resource.name }}</span>
              <span class="target-category">{{ resource.category }}</span>
            </div>
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click="removeTargetResource(resource.id)"
            >
              削除
            </v-btn>
          </div>
        </div>
        
        <div v-else class="no-targets">
          <span>宛先リソースが設定されていません</span>
        </div>
        
        <!-- 宛先リソース追加 -->
        <div class="add-target-section">
          <v-select
            :items="availableTargetResources.filter(r => !selectedTargets.includes(r.id))"
            item-title="name"
            item-value="id"
            label="宛先リソースを追加"
            variant="outlined"
            dense
            @update:model-value="addTargetResource"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <span class="resource-type-badge">{{ item.raw.type.toUpperCase() }}</span>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ item.raw.category }}</v-list-item-subtitle>
              </v-list-item>
            </template>
          </v-select>
        </div>
      </div>
      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>API Gatewayは複数の宛先リソース（Lambda関数、ALB、NLB、EC2インスタンス等）にリクエストをルーティングできます。中級者向けのため、パス設定は省略されています。</span>
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

.targets-section {
  margin-top: 16px;
}

.targets-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.selected-targets {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.target-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.target-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-type {
  font-weight: bold;
  color: #1976d2;
  font-size: 12px;
}

.target-name {
  color: #424242;
  font-weight: 500;
}

.target-category {
  font-size: 12px;
  color: #666;
}

.no-targets {
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 16px;
}

.no-targets span {
  color: #888;
  font-style: italic;
}

.add-target-section {
  margin-top: 16px;
}

.resource-type-badge {
  background-color: #e3f2fd;
  color: #1976d2;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-right: 8px;
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