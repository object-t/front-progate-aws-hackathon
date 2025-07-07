<script setup lang="ts">
  import type { ComputeResource, Subnet } from '@/types/service.ts'
  import { ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { vpcList } = useVpcList()

  const current = () => setting.value as ComputeResource
  const subnet = ref<string>(current().subnetId)

  watch(subnet, newSubnetId => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === current().vpcId)
    if (!vpc) {
      return
    }
    const compute = vpc.computes.find(c => c.id === current().id)
    if (!compute) {
      return
    }

    compute.subnetId = newSubnetId
  })
</script>

<template>
  <div>
    <h2>Subnet</h2>
    <v-select
      v-model="current().subnetId"
      item-title="title"
      item-value="value"
      :items="vpcList.find(vpc => vpc.vpcId === current().vpcId)?.subnets.map(s => ({ title: s.name, value: s.id }))"
      label="Subnetを選択"
    />
  </div>
</template>

<style scoped>

</style>
