<script setup lang="ts">
  import type { CloudFrontResource } from '@/types/service.ts'
  import { isCloudFrontResource } from '@/types/service.ts'
  import { computed } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'

  const { setting } = useInfo()

  const currentCloudFront = computed(() => {
    return setting.value && isCloudFrontResource(setting.value) ? setting.value : null
  })
</script>

<template>
  <div>
    <h2>CloudFront</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentCloudFront?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentCloudFront?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentCloudFront?.type }}</span>
      </div>
      
      <div class="info-item">
        <label>配信対象:</label>
        <span>グローバル（全世界）</span>
      </div>
      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>CloudFrontはAWSのグローバルなコンテンツ配信ネットワーク（CDN）サービスです。オリジンサーバーからコンテンツをキャッシュし、エンドユーザーに高速配信します。</span>
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