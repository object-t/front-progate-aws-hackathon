<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  import { ICONS } from '@/icons.ts'

  const props = defineProps<{
    setting: BaseResource
  }>()
</script>

<template>
  <div class="title">
    <component :is="ICONS[setting.type].component" />
    <h1 class="text-truncate">{{ setting.name }}</h1>
  </div>
</template>

<style scoped>
.title {
  display: flex;
  align-items: center;

  > svg {
    margin-right: 12px;
    height: 40px;
    width: 40px;
  }

  > h1 {
    max-width: 460px;
  }
}
</style>
