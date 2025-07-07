<script setup lang="ts">
  import type { Subnet, AvailabilityZone, AzName } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()

  const currentSubnet = computed(() => {
    return setting.value as Subnet
  })

  const vpc = computed(() => {
    if (!currentSubnet.value) return null
    return vpcList.value.find(vpc => vpc.vpcId === currentSubnet.value.vpcId)
  })

  const availableAzs = computed(() => {
    if (!vpc.value) return []
    return vpc.value.availabilityZones.map(az => ({
      title: az.name,
      value: az.id
    }))
  })

  const selectedAzId = ref('')
  const selectedNatGatewayId = ref('')

  const availableNatGateways = computed(() => {
    if (!vpc.value) return []
    const natGateways = vpc.value.networks.filter(n => n.type === 'nat_gateway')
    return [
      { title: 'なし', value: '' },
      ...natGateways.map(nat => ({ title: nat.name, value: nat.id }))
    ]
  })

  // 初期値設定
  watch(currentSubnet, (newSubnet) => {
    if (!newSubnet || !vpc.value) return
    
    selectedAzId.value = newSubnet.azId
    
    // 現在のサブネットに割り当てられているNAT Gatewayを取得
    const assignedNat = vpc.value.networks.find(network => 
      network.type === 'nat_gateway' && network.subnetId === newSubnet.id
    )
    selectedNatGatewayId.value = assignedNat?.id || ''
  }, { immediate: true })

  // AZ変更の監視
  watch(selectedAzId, (newAzId) => {
    if (!currentSubnet.value || !newAzId) return
    updateSubnetAz(currentSubnet.value.id, newAzId)
  })

  // NAT Gateway割り当て変更の監視
  watch(selectedNatGatewayId, (newNatGatewayId) => {
    if (!currentSubnet.value || !vpc.value) return
    updateNatGatewayAssignment(currentSubnet.value.id, newNatGatewayId)
  })

  const updateSubnetAz = (subnetId: string, azId: string) => {
    if (!vpc.value) return
    
    const subnet = vpc.value.subnets.find(s => s.id === subnetId)
    if (subnet) {
      subnet.azId = azId
    }
  }

  const updateNatGatewayAssignment = (subnetId: string, natGatewayId: string) => {
    if (!vpc.value) return
    
    const subnet = vpc.value.subnets.find(s => s.id === subnetId)
    if (!subnet || subnet.type !== 'public_subnet') return

    // 既存の割り当てを解除
    vpc.value.networks.forEach(network => {
      if (network.type === 'nat_gateway' && network.subnetId === subnetId) {
        delete network.subnetId
      }
    })

    // 新しい割り当て
    if (natGatewayId) {
      const natGateway = vpc.value.networks.find(n => n.id === natGatewayId)
      if (natGateway) {
        natGateway.subnetId = subnetId
      }
    }
  }

  const isPublicSubnet = computed(() => {
    return currentSubnet.value?.type === 'public_subnet'
  })
</script>

<template>
  <div>
    <h2>Subnet Settings</h2>
    
    <div v-if="currentSubnet && vpc">
      <!-- Availability Zone Selection -->
      <div class="setting-group">
        <h3>Availability Zone</h3>
        <v-select
          v-model="selectedAzId"
          item-title="title"
          item-value="value"
          :items="availableAzs"
          label="AZを選択"
          variant="outlined"
        />
      </div>

      <!-- NAT Gateway Assignment (Public Subnetのみ) -->
      <div v-if="isPublicSubnet" class="setting-group">
        <h3>NAT Gateway</h3>
        <v-select
          v-model="selectedNatGatewayId"
          item-title="title"
          item-value="value"
          :items="availableNatGateways"
          label="NAT Gatewayを選択"
          variant="outlined"
        />
        <p class="helper-text">
          NAT Gatewayを割り当てると、プライベートサブネットからインターネットへのアウトバウンド通信が可能になります
        </p>
      </div>

      <!-- Subnet Type Display -->
      <div class="setting-group">
        <h3>Subnet Type</h3>
        <v-chip
          :color="isPublicSubnet ? 'success' : 'warning'"
          variant="tonal"
        >
          {{ isPublicSubnet ? 'Public Subnet' : 'Private Subnet' }}
        </v-chip>
        <p class="helper-text">
          {{ isPublicSubnet 
            ? 'インターネットゲートウェイ経由でインターネットにアクセス可能' 
            : 'NAT Gateway経由でのみインターネットにアクセス可能' 
          }}
        </p>
      </div>

      <!-- Current AZ Display -->
      <div class="setting-group">
        <h3>Current Configuration</h3>
        <v-card variant="outlined">
          <v-card-text>
            <div class="config-item">
              <strong>Subnet Name:</strong> {{ currentSubnet.name }}
            </div>
            <div class="config-item">
              <strong>Subnet Type:</strong> {{ currentSubnet.type.replace('_', ' ').toUpperCase() }}
            </div>
            <div class="config-item">
              <strong>VPC:</strong> {{ vpc.vpc.name }}
            </div>
            <div class="config-item">
              <strong>Availability Zone:</strong> 
              {{ vpc.availabilityZones.find(az => az.id === selectedAzId)?.name || 'Not selected' }}
            </div>
          </v-card-text>
        </v-card>
      </div>
    </div>
    
    <div v-else>
      <p>サブネット情報が選択されていません</p>
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