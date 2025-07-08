<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  import { computed } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const currentElasticIp = computed(() => {
    return setting.value as BaseResource
  })

  // アタッチ先のリソース情報を取得
  const attachedResource = computed(() => {
    if (!currentElasticIp.value?.isAttached || !currentElasticIp.value?.attachedResourceId) {
      return null
    }

    // VPCリソースから検索
    for (const vpc of vpcList.value) {
      const natGateway = vpc.networks.find(n => n.id === currentElasticIp.value.attachedResourceId)
      if (natGateway) {
        return {
          ...natGateway,
          resourceType: 'NAT Gateway',
          vpcName: vpc.vpc.name
        }
      }
    }

    return null
  })

  // アタッチが不整合状態かどうかを判定
  const isInconsistentAttachment = computed(() => {
    return currentElasticIp.value?.isAttached && !attachedResource.value
  })

  // アタッチを解除する関数
  const detachElasticIp = () => {
    if (!currentElasticIp.value) return
    
    const elasticIp = services.value.find(s => s.id === currentElasticIp.value.id)
    if (elasticIp) {
      elasticIp.isAttached = false
      elasticIp.attachedResourceId = undefined
    }
  }
</script>

<template>
  <div>
    <h2>Elastic IP</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentElasticIp?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentElasticIp?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentElasticIp?.type }}</span>
      </div>
      
      <div class="info-item">
        <label>アタッチ状態:</label>
        <span :class="{ 'status-attached': currentElasticIp?.isAttached, 'status-available': !currentElasticIp?.isAttached }">
          {{ currentElasticIp?.isAttached ? 'アタッチ済み' : '利用可能' }}
        </span>
      </div>
      
      <div class="info-item">
        <label>アタッチ先:</label>
        <div v-if="currentElasticIp?.isAttached && attachedResource" class="attached-resource">
          <span class="resource-type">{{ attachedResource.resourceType }}</span>
          <span class="resource-name">{{ attachedResource.name }}</span>
          <span class="vpc-info">VPC: {{ attachedResource.vpcName }}</span>
        </div>
        <div v-else-if="isInconsistentAttachment" class="inconsistent-attachment">
          <div class="warning-content">
            <v-icon size="small" color="#ff9800">warning</v-icon>
            <span>不整合: アタッチ済み状態ですが、対象リソースが見つかりません</span>
          </div>
          <v-btn 
            size="small" 
            color="warning" 
            variant="outlined"
            @click="detachElasticIp"
            class="detach-button"
          >
            アタッチを解除
          </v-btn>
        </div>
        <div v-else class="no-attachment">
          <span>なし（利用可能）</span>
        </div>
      </div>
      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>Elastic IPの設定変更は、アタッチ先のリソース（NAT Gateway等）の設定画面で行えます。</span>
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

.status-attached {
  color: #4caf50;
  font-weight: bold;
}

.status-available {
  color: #2196f3;
  font-weight: bold;
}

.attached-resource {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.resource-type {
  font-weight: bold;
  color: #1976d2;
}

.resource-name {
  color: #424242;
}

.vpc-info {
  font-size: 12px;
  color: #666;
}

.no-attachment {
  padding: 8px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-style: italic;
}

.no-attachment span {
  color: #888;
}

.inconsistent-attachment {
  padding: 12px;
  background-color: #fff3e0;
  border: 1px solid #ff9800;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.warning-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.warning-content span {
  color: #e65100;
  font-weight: 500;
}

.detach-button {
  align-self: flex-start;
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