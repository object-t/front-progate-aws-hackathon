<template>
  <div :class="`tab ${hidden ? 'close': 'open'}`">
    <v-icon class="icon" :icon="`chevron_${hidden ? 'left' : 'right'}`" @click="emits('set-hidden', !props.hidden)" />
    <div class="tab-content">
      <VpcSetting v-if="setting?.type === 'vpc'" :setting="setting" />
    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { VpcService } from '@/types/service.ts'
  import VpcSetting from './VpcSetting.vue'

  const props = defineProps<{
    hidden: boolean
    setting: VpcService | null
  }>()

  const emits = defineEmits<{
    'set-hidden': [value: boolean]
  }>()
</script>

<style scoped>
.icon {
  color: grey;
  font-size: 42px;
  cursor: pointer;
}

.tab {
  width: 500px;
  height: 100vh;
  border-bottom-left-radius: 12px;
  border-top-left-radius: 12px;
  box-shadow: 0 4px 12px #b8b8b828;
  transition: transform 0.3s ease;
}

.close {
  transform: translateX(432px);
}

.open {
  transform: translateX(0);
}

.tab-content {
  padding-left: 68px;
}
</style>
