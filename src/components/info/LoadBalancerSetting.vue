<script setup lang="ts">
  import type { ComputeResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()

  const currentLoadBalancer = computed(() => {
    return setting.value && ['alb', 'nlb'].includes(setting.value.type) ? setting.value as ComputeResource : null
  })

  // LoadBalancer設定のローカル状態
  const targetResources = ref<string[]>(currentLoadBalancer.value?.loadBalancer?.targetResources || [])
  const selectedSubnets = ref<string[]>(currentLoadBalancer.value?.subnetIds || [])

  // 利用可能なターゲットリソースを取得
  const availableTargetResources = computed(() => {
    if (!currentLoadBalancer.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentLoadBalancer.value!.vpcId)
    if (!currentVpc) return []
    
    const targets: Array<{ id: string, name: string, type: string, category: string }> = []
    
    // EC2インスタンス
    currentVpc.computes.forEach(compute => {
      if (compute.type === 'ec2' && compute.id !== currentLoadBalancer.value!.id) {
        const subnets = compute.subnetIds.map(subnetId => {
          const subnet = currentVpc.subnets.find(s => s.id === subnetId)
          return subnet ? subnet.name : subnetId
        }).join(', ')
        
        targets.push({
          id: compute.id,
          name: compute.name,
          type: 'EC2',
          category: `Subnets: ${subnets}`
        })
      }
    })
    
    // ECSタスク
    currentVpc.computes.forEach(compute => {
      if (['ecs', 'fargate'].includes(compute.type) && compute.id !== currentLoadBalancer.value!.id) {
        const subnets = compute.subnetIds.map(subnetId => {
          const subnet = currentVpc.subnets.find(s => s.id === subnetId)
          return subnet ? subnet.name : subnetId
        }).join(', ')
        
        targets.push({
          id: compute.id,
          name: compute.name,
          type: compute.type.toUpperCase(),
          category: `Subnets: ${subnets}`
        })
      }
    })
    
    return targets
  })

  // 利用可能なサブネットを取得
  const availableSubnets = computed(() => {
    if (!currentLoadBalancer.value) return []
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentLoadBalancer.value!.vpcId)
    if (!currentVpc) return []
    
    return currentVpc.subnets.map(subnet => {
      const az = currentVpc.availabilityZones.find(az => az.id === subnet.azId)
      return {
        id: subnet.id,
        name: subnet.name,
        type: subnet.type === 'public_subnet' ? 'Public' : 'Private',
        azName: az ? `AZ-${az.azName.toUpperCase()}` : '',
        title: `${subnet.name} (${subnet.type === 'public_subnet' ? 'Public' : 'Private'}, ${az ? `AZ-${az.azName.toUpperCase()}` : ''})`
      }
    })
  })

  // 設定を更新する関数
  const updateLoadBalancerSettings = () => {
    if (!currentLoadBalancer.value) return
    
    if (!currentLoadBalancer.value.loadBalancer) {
      currentLoadBalancer.value.loadBalancer = {}
    }
    
    currentLoadBalancer.value.loadBalancer.targetResources = [...targetResources.value]
    currentLoadBalancer.value.subnetIds = [...selectedSubnets.value]
  }

  // ターゲットリソースを追加
  const addTargetResource = (resourceId: string) => {
    if (!targetResources.value.includes(resourceId)) {
      targetResources.value.push(resourceId)
    }
  }

  // ターゲットリソースを削除
  const removeTargetResource = (resourceId: string) => {
    const index = targetResources.value.indexOf(resourceId)
    if (index > -1) {
      targetResources.value.splice(index, 1)
    }
  }


  // サブネット情報を取得する関数
  const getSubnetName = (subnetId: string) => {
    if (!currentLoadBalancer.value) return subnetId
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentLoadBalancer.value!.vpcId)
    if (!currentVpc) return subnetId
    
    const subnet = currentVpc.subnets.find(s => s.id === subnetId)
    return subnet ? subnet.name : subnetId
  }

  const getSubnetType = (subnetId: string) => {
    if (!currentLoadBalancer.value) return ''
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentLoadBalancer.value!.vpcId)
    if (!currentVpc) return ''
    
    const subnet = currentVpc.subnets.find(s => s.id === subnetId)
    return subnet ? (subnet.type === 'public_subnet' ? 'Public' : 'Private') : ''
  }

  const getSubnetAz = (subnetId: string) => {
    if (!currentLoadBalancer.value) return ''
    
    const currentVpc = vpcList.value.find(vpc => vpc.vpcId === currentLoadBalancer.value!.vpcId)
    if (!currentVpc) return ''
    
    const subnet = currentVpc.subnets.find(s => s.id === subnetId)
    if (!subnet) return ''
    
    const az = currentVpc.availabilityZones.find(az => az.id === subnet.azId)
    return az ? `AZ-${az.azName.toUpperCase()}` : ''
  }

  // 選択済みリソースの詳細情報を取得
  const getSelectedResourceDetails = computed(() => {
    return targetResources.value.map(id => {
      return availableTargetResources.value.find(resource => resource.id === id)
    }).filter((resource): resource is { id: string, name: string, type: string, category: string } => resource !== undefined)
  })

  // リソース変更時にローカル状態をリセット
  watch(currentLoadBalancer, (newLoadBalancer) => {
    if (newLoadBalancer) {
      targetResources.value = [...(newLoadBalancer.loadBalancer?.targetResources || [])]
      selectedSubnets.value = [...(newLoadBalancer.subnetIds || [])]
    } else {
      targetResources.value = []
      selectedSubnets.value = []
    }
  }, { immediate: true })

  // 設定変更を監視
  watch([targetResources, selectedSubnets], updateLoadBalancerSettings, { deep: true })
</script>

<template>
  <div>
    <h2>{{ currentLoadBalancer?.type?.toUpperCase() }} 設定</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentLoadBalancer?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentLoadBalancer?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentLoadBalancer?.type?.toUpperCase() }}</span>
      </div>
      
      <div class="subnet-section">
        <h3>サブネット設定</h3>
        <div class="subnet-info">
          <!-- サブネット選択 -->
          <div class="subnet-selection">
            <v-select
              v-model="selectedSubnets"
              :items="availableSubnets"
              item-title="title"
              item-value="id"
              label="サブネットを選択"
              variant="outlined"
              density="compact"
              multiple
              chips
              closable-chips
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <span class="subnet-type-badge" :class="{ 
                      'subnet-type-badge-public': item.raw.type === 'Public',
                      'subnet-type-badge-private': item.raw.type === 'Private'
                    }">{{ item.raw.type }}</span>
                  </template>
                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.azName }}</v-list-item-subtitle>
                </v-list-item>
              </template>
              <template #chip="{ props, item }">
                <v-chip v-bind="props" :class="{ 
                  'subnet-chip-public': item.raw.type === 'Public',
                  'subnet-chip-private': item.raw.type === 'Private'
                }">
                  {{ item.raw.name }} ({{ item.raw.azName }})
                </v-chip>
              </template>
            </v-select>
          </div>
          
          <!-- 選択済みサブネット詳細 -->
          <div v-if="selectedSubnets.length > 0" class="selected-subnets">
            <h4>選択済みサブネット</h4>
            <div class="subnet-list">
              <div v-for="subnetId in selectedSubnets" :key="subnetId" class="subnet-item">
                <div class="subnet-details">
                  <span class="subnet-name">{{ getSubnetName(subnetId) }}</span>
                  <span class="subnet-type" :class="{ 
                    'subnet-type-public': getSubnetType(subnetId) === 'Public',
                    'subnet-type-private': getSubnetType(subnetId) === 'Private'
                  }">{{ getSubnetType(subnetId) }}</span>
                  <span class="subnet-az">{{ getSubnetAz(subnetId) }}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="no-subnets">
            <span>サブネットが選択されていません</span>
          </div>
          
          <div class="config-description">
            <v-icon size="small" color="#1976d2">info</v-icon>
            <span>{{ currentLoadBalancer?.type?.toUpperCase() }}は複数のサブネットに配置可能です。異なるAZのサブネットに配置することで高可用性を実現できます。</span>
          </div>
        </div>
      </div>
      
      <div class="targets-section">
        <h3>ターゲットリソース</h3>
        
        <!-- 選択済みのターゲットリソース -->
        <div v-if="getSelectedResourceDetails.length > 0" class="selected-targets">
          <div v-for="resource in getSelectedResourceDetails" :key="resource.id" class="target-item">
            <div class="target-info">
              <span class="target-type">{{ resource.type }}</span>
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
          <span>ターゲットリソースが設定されていません</span>
        </div>
        
        <!-- ターゲットリソース追加 -->
        <div class="add-target-section">
          <v-select
            :items="availableTargetResources.filter(r => !targetResources.includes(r.id))"
            item-title="name"
            item-value="id"
            label="ターゲットリソースを追加"
            variant="outlined"
            density="compact"
            @update:model-value="addTargetResource"
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <span class="resource-type-badge">{{ item.raw.type }}</span>
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
        <span>{{ currentLoadBalancer?.type?.toUpperCase() }}により、複数のターゲット（EC2インスタンス、ECSタスク等）に負荷を分散します。構成図学習用のため、基本的な設定のみを表示しています。</span>
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

.subnet-section, .targets-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.subnet-section h3, .targets-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.subnet-section h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.subnet-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.subnet-item {
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.subnet-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.subnet-name {
  font-weight: bold;
  color: #424242;
}

.subnet-type {
  font-size: 12px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  width: fit-content;
}

.subnet-type-public {
  background-color: #e8f5e8;
  color: #4caf50;
}

.subnet-type-private {
  background-color: #e3f2fd;
  color: #1976d2;
}

.subnet-az {
  font-size: 12px;
  color: #666;
}

.no-subnets {
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 16px;
}

.no-subnets span {
  color: #888;
  font-style: italic;
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

.subnet-selection {
  margin-bottom: 16px;
}

.selected-subnets h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.subnet-type-badge {
  font-size: 10px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 4px;
  margin-right: 8px;
}

.subnet-type-badge-public {
  background-color: #e8f5e8;
  color: #4caf50;
}

.subnet-type-badge-private {
  background-color: #e3f2fd;
  color: #1976d2;
}

.subnet-chip-public {
  background-color: #e8f5e8 !important;
  color: #4caf50 !important;
}

.subnet-chip-private {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
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