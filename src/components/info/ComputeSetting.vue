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

  const currentResource = computed(() => {
    return setting.value as ComputeResource | DatabaseResource
  })

  const availableSubnets = computed(() => {
    if (!currentResource.value) return []
    const vpc = vpcList.value.find(vpc => vpc.vpcId === currentResource.value.vpcId)
    return vpc?.subnets.map(s => {
      const az = vpc.availabilityZones.find(az => az.id === s.azId)
      return {
        title: s.name,
        value: s.id,
      }
    }) || []
  })

  const selectedSubnetIds = ref<string[]>([])
  const selectedSubnetId = ref<string>('')

  watch(currentResource, newResource => {
    if (!newResource) return
    selectedSubnetIds.value = [...newResource.subnetIds]
    selectedSubnetId.value = newResource.subnetIds[0] || ''
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
</script>

<template>
  <div>
    <h2>Subnet</h2>
    <div>
      <v-select
        v-if="isMultiSubnet"
        v-model="selectedSubnetIds"
        item-title="title"
        item-value="value"
        :items="availableSubnets"
        label="Subnetを選択（複数選択可）"
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
      />
    </div>
  </div>
</template>

<style scoped>

</style>
