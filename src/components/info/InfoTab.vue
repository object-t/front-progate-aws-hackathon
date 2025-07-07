<template>
  <div :class="`tab ${hidden ? 'close': 'open'}`">
    <v-icon class="icon" :icon="`chevron_${hidden ? 'left' : 'right'}`" @click="hidden = !hidden" />
    <div v-if="setting" class="tab-content">
      <BaseSetting :setting="setting" />
      <v-divider class="my-7" />
      <VpcSetting v-if="setting?.type === 'vpc'" :setting="setting as Vpc" />
      <ComputeSetting v-if="isComputeResource(setting)" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource, ComputeResource, Vpc } from '@/types/service.ts'
  import BaseSetting from '@/components/info/BaseSetting.vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import ComputeSetting from './ComputeSetting.vue'
  import VpcSetting from './VpcSetting.vue'

  const { hidden, setting } = useInfo()

  const isComputeResource = (resource: BaseResource): resource is ComputeResource => {
    return 'subnetId' in resource
  }
</script>

<style scoped>
.icon {
  color: grey;
  font-size: 42px;
  cursor: pointer;
}

.tab {
  width: 600px;
  height: 100vh;
  border-bottom-left-radius: 12px;
  border-top-left-radius: 12px;
  box-shadow: 0 4px 12px #b8b8b828;
  transition: transform 0.3s ease;
}

.close {
  transform: translateX(0px);
}

.open {
  transform: translateX(-532px);
}

.tab-content {
  padding-left: 68px;
  padding-right: 24px;
}
</style>
