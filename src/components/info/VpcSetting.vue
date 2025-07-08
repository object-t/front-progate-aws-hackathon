<template>
  <div>
    <h2>VPC</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>VPC名:</label>
        <span>{{ props.setting.name }}</span>
      </div>
      
      <div class="info-item">
        <label>VPC ID:</label>
        <span class="resource-id">{{ props.setting.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ props.setting.type }}</span>
      </div>

      <div class="info-item">
        <label>Availability Zones:</label>
        <div class="az-list">
          <div 
            v-for="az in vpcResource?.availabilityZones" 
            :key="az.id" 
            class="az-item"
          >
            <component :is="ICONS['az']?.component" class="az-icon" />
            <span class="az-name">{{ az.name }}</span>
            <span class="az-code">({{ az.azName }})</span>
          </div>
          <div v-if="!vpcResource?.availabilityZones || vpcResource.availabilityZones.length === 0" class="no-items">
            AZが設定されていません
          </div>
        </div>
      </div>

      <div class="info-item">
        <label>サブネット数:</label>
        <div class="subnet-summary">
          <div class="subnet-count">
            <span class="count-label">パブリック:</span>
            <span class="count-value">{{ publicSubnetCount }}</span>
          </div>
          <div class="subnet-count">
            <span class="count-label">プライベート:</span>
            <span class="count-value">{{ privateSubnetCount }}</span>
          </div>
          <div class="subnet-count">
            <span class="count-label">合計:</span>
            <span class="count-value total">{{ totalSubnetCount }}</span>
          </div>
        </div>
      </div>

      <div class="info-item">
        <label>ネットワークリソース:</label>
        <div class="network-list">
          <div 
            v-for="network in vpcResource?.networks" 
            :key="network.id"
            class="network-item"
          >
            <component :is="ICONS[network.type]?.component" class="network-icon" />
            <span class="network-name">{{ network.name }}</span>
            <span class="network-type">({{ getNetworkTypeLabel(network.type) }})</span>
          </div>
          <div v-if="!vpcResource?.networks || vpcResource.networks.length === 0" class="no-items">
            ネットワークリソースがありません
          </div>
        </div>
      </div>

      <div class="info-item">
        <label>リソース数:</label>
        <div class="resource-summary">
          <div class="resource-count">
            <span class="count-label">コンピュート:</span>
            <span class="count-value">{{ vpcResource?.computes.length || 0 }}</span>
          </div>
          <div class="resource-count">
            <span class="count-label">データベース:</span>
            <span class="count-value">{{ vpcResource?.databases.length || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { Vpc } from '@/types/service.ts'
  import { computed } from 'vue'
  import { useVpcList } from '@/composables/useVpcList.ts'
  import { ICONS } from '@/icons.ts'

  const props = defineProps<{
    setting: Vpc
  }>()

  const { vpcList } = useVpcList()

  // 対応するVPCリソースを取得
  const vpcResource = computed(() => {
    return vpcList.value.find(vpc => vpc.vpcId === props.setting.id)
  })

  // サブネット数の計算
  const publicSubnetCount = computed(() => {
    return vpcResource.value?.subnets.filter(s => s.type === 'public_subnet').length || 0
  })

  const privateSubnetCount = computed(() => {
    return vpcResource.value?.subnets.filter(s => s.type === 'private_subnet').length || 0
  })

  const totalSubnetCount = computed(() => {
    return vpcResource.value?.subnets.length || 0
  })

  // ネットワークタイプのラベル変換
  const getNetworkTypeLabel = (type: string): string => {
    const typeMap: Record<string, string> = {
      'internet_gateway': 'インターネットゲートウェイ',
      'nat_gateway': 'NATゲートウェイ',
      'endpoint': 'VPCエンドポイント'
    }
    return typeMap[type] || type
  }
</script>

<style lang="scss" scoped>
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

.az-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.az-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #2196f3;
}

.az-icon {
  width: 20px;
  height: 20px;
}

.az-name {
  font-weight: 500;
  color: #1976d2;
}

.az-code {
  font-size: 12px;
  color: #666;
}

.subnet-summary, .resource-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.subnet-count, .resource-count {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.count-label {
  font-size: 12px;
  color: #666;
}

.count-value {
  font-weight: bold;
  color: #424242;
}

.count-value.total {
  color: #1976d2;
}

.network-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.network-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.network-icon {
  width: 20px;
  height: 20px;
}

.network-name {
  font-weight: 500;
  color: #424242;
}

.network-type {
  font-size: 12px;
  color: #666;
}

.no-items {
  padding: 8px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-style: italic;
  color: #888;
  text-align: center;
}
</style>
