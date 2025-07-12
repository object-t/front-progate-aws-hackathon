<script setup lang="ts">
  import type { NetworkResource } from '@/types/service.ts'
  import { computed, ref, watch, nextTick } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()
  const { services } = useServiceList()

  const currentNatGateway = computed(() => {
    return setting.value as NetworkResource
  })

  const vpc = computed(() => {
    if (!currentNatGateway.value) return null
    return vpcList.value.find(vpc => vpc.vpcId === currentNatGateway.value.vpcId)
  })

  const publicSubnets = computed(() => {
    if (!vpc.value) return []
    return vpc.value.subnets
      .filter(subnet => subnet.type === 'public_subnet')
      .map(subnet => {
        const az = vpc.value.availabilityZones.find(az => az.id === subnet.azId)
        return {
          title: `${subnet.name} (${az?.name || 'Unknown AZ'})`,
          value: subnet.id
        }
      })
  })

  const availableElasticIps = computed(() => {
    const elasticIps = services.value.filter(service => service.type === 'elastic_ip')
    return [
      { title: 'なし', value: '' },
      ...elasticIps
        .filter(eip => !eip.isAttached || eip.attachedResourceId === currentNatGateway.value?.id)
        .map(eip => ({ title: eip.name, value: eip.id }))
    ]
  })

  const selectedSubnetId = ref('')
  const selectedElasticIpId = ref('')
  const isInitializing = ref(false)

  // 初期値設定
  watch(currentNatGateway, (newNatGateway) => {
    isInitializing.value = true
    
    if (!newNatGateway) {
      selectedSubnetId.value = ''
      selectedElasticIpId.value = ''
    } else {
      selectedSubnetId.value = newNatGateway.subnetId || ''
      selectedElasticIpId.value = newNatGateway.elasticIpId || ''
    }
    
    // 次のtickで初期化フラグをリセット
    nextTick(() => {
      isInitializing.value = false
    })
  }, { immediate: true })

  // サブネット変更の監視
  watch(selectedSubnetId, (newSubnetId) => {
    if (!currentNatGateway.value) return
    
    if (newSubnetId) {
      currentNatGateway.value.subnetId = newSubnetId
    } else {
      delete currentNatGateway.value.subnetId
    }
  })

  // Elastic IP変更の監視（ユーザーによる変更のみ）
  watch(selectedElasticIpId, (newElasticIpId, oldElasticIpId) => {
    if (!currentNatGateway.value) return
    
    // 初期化時やリソース変更時は処理をスキップ
    if (oldElasticIpId === undefined || isInitializing.value) return

    console.log('User changed Elastic IP:', { oldElasticIpId, newElasticIpId, natGatewayId: currentNatGateway.value.id })

    // 古いElastic IPのアタッチ状態を解除
    if (oldElasticIpId && oldElasticIpId !== newElasticIpId) {
      const oldEip = services.value.find(s => s.id === oldElasticIpId)
      if (oldEip) {
        console.log('Detaching old EIP:', oldEip.name)
        oldEip.isAttached = false
        delete oldEip.attachedResourceId
      }
    }

    // NAT Gatewayの設定を更新
    if (newElasticIpId) {
      currentNatGateway.value.elasticIpId = newElasticIpId
      // 新しいElastic IPをアタッチ
      const newEip = services.value.find(s => s.id === newElasticIpId)
      if (newEip) {
        console.log('Attaching new EIP:', newEip.name, 'to NAT Gateway:', currentNatGateway.value.name)
        newEip.isAttached = true
        newEip.attachedResourceId = currentNatGateway.value.id
      }
    } else {
      delete currentNatGateway.value.elasticIpId
    }
    
    console.log('Updated NAT Gateway elasticIpId:', currentNatGateway.value.elasticIpId)
  })

  const assignedSubnet = computed(() => {
    if (!vpc.value || !selectedSubnetId.value) return null
    return vpc.value.subnets.find(s => s.id === selectedSubnetId.value)
  })

  const attachedElasticIp = computed(() => {
    if (!selectedElasticIpId.value) return null
    return services.value.find(s => s.id === selectedElasticIpId.value)
  })

  const isAssigned = computed(() => {
    return !!selectedSubnetId.value
  })
</script>

<template>
  <div>
    <h2>NAT Gateway Settings</h2>
    
    <div v-if="currentNatGateway && vpc">
      <!-- Subnet Assignment -->
      <div class="setting-group">
        <h3>Subnet Assignment</h3>
        <v-select
          v-model="selectedSubnetId"
          item-title="title"
          item-value="value"
          :items="[{ title: 'なし', value: '' }, ...publicSubnets]"
          label="Public Subnetを選択"
          variant="outlined"
        />
        <p class="helper-text">
          NAT GatewayはPublic Subnetに配置する必要があります
        </p>
      </div>

      <!-- Elastic IP Assignment -->
      <div class="setting-group">
        <h3>Elastic IP</h3>
        <v-select
          v-model="selectedElasticIpId"
          item-title="title"
          item-value="value"
          :items="availableElasticIps"
          label="Elastic IPを選択"
          variant="outlined"
          :disabled="!isAssigned"
        />
        <p class="helper-text">
          Elastic IPをアタッチすることで固定のパブリックIPアドレスが使用されます
        </p>
      </div>

      <!-- Status -->
      <div class="setting-group">
        <h3>Status</h3>
        <v-chip
          :color="isAssigned ? 'success' : 'warning'"
          variant="tonal"
        >
          {{ isAssigned ? 'Active' : 'Not Assigned' }}
        </v-chip>
        <p class="helper-text">
          {{ isAssigned 
            ? 'NAT Gatewayはアクティブでプライベートサブネットからのトラフィックを処理します' 
            : 'NAT Gatewayはサブネットに割り当てられていません'
          }}
        </p>
      </div>

      <!-- Current Configuration -->
      <div class="setting-group">
        <h3>Current Configuration</h3>
        <v-card variant="outlined">
          <v-card-text>
            <div class="config-item">
              <strong>NAT Gateway Name:</strong> {{ currentNatGateway.name }}
            </div>
            <div class="config-item">
              <strong>VPC:</strong> {{ vpc.vpc.name }}
            </div>
            <div class="config-item">
              <strong>Assigned Subnet:</strong> 
              {{ assignedSubnet?.name || 'Not assigned' }}
            </div>
            <div class="config-item">
              <strong>Availability Zone:</strong> 
              {{ assignedSubnet && vpc ? vpc.availabilityZones.find(az => az.id === assignedSubnet.azId)?.name : 'N/A' }}
            </div>
            <div class="config-item">
              <strong>Elastic IP:</strong> 
              {{ attachedElasticIp?.name || 'Not attached' }}
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Warning for unassigned -->
      <div v-if="!isAssigned" class="setting-group">
        <v-alert
          type="warning"
          variant="tonal"
        >
          <strong>警告:</strong> NAT Gatewayがサブネットに割り当てられていません。
          プライベートサブネットからのインターネット接続ができません。
        </v-alert>
      </div>
    </div>
    
    <div v-else>
      <p>NAT Gateway情報が選択されていません</p>
    </div>
  </div>
</template>

<style scoped>
.setting-group {
  margin-bottom: 24px;
}

.setting-group h3 {
  margin-bottom: 12px;
  color: #1976d2;
  font-size: 16px;
}

.helper-text {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
  line-height: 1.4;
}

.config-item {
  margin-bottom: 8px;
}

.config-item strong {
  color: #333;
  margin-right: 8px;
}
</style>