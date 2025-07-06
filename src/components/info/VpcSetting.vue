<template>
  <div>
    <div class="title">
      <component :is="ICONS[setting.type].component" />
      <h1 class="text-truncate">{{ setting.name }}</h1>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { VpcService } from '@/types/service.ts'
  import { ICONS } from '@/icons.ts'

  const props = defineProps<{
    setting: VpcService
  }>()
</script>

<style lang="scss" scoped>
.title {
  display: flex;
  align-items: center;

  > svg {
    margin-right: 12px;
    height: 40px;
    width: 40px;
  }

  > h1 {
    max-width: 360px;
  }
}
</style>
