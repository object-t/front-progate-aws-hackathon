<script setup lang="ts">
  import type { CloudFrontResource } from '@/types/service.ts'
  import { isCloudFrontResource } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'

  const { setting } = useInfo()
  const { services } = useServiceList()

  const currentCloudFront = computed(() => {
    return setting.value && isCloudFrontResource(setting.value) ? setting.value : null
  })

  // オリジン設定のローカル状態
  const origins = ref<string[]>([])

  // 利用可能なオリジンリソース（API Gateway等）
  const availableOriginResources = computed(() => {
    return services.value
      .filter(service => ['api_gateway'].includes(service.type))
      .map(service => ({
        id: service.id,
        name: service.name,
        type: service.type
      }))
  })

  // 設定を更新する関数
  const updateCloudFrontSettings = () => {
    if (!currentCloudFront.value) return
    currentCloudFront.value.origins = [...origins.value]
  }

  // リソース変更時にローカル状態をリセット
  watch(currentCloudFront, (newCloudFront) => {
    if (newCloudFront) {
      origins.value = [...(newCloudFront.origins || [])]
    } else {
      origins.value = []
    }
  }, { immediate: true })

  // 設定変更を監視
  watch(origins, updateCloudFrontSettings, { deep: true })
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

      <!-- オリジン設定 -->
      <div class="origin-section">
        <h3>オリジン設定</h3>
        <div class="origin-info">
          <v-select
            v-model="origins"
            :items="availableOriginResources"
            item-title="name"
            item-value="id"
            label="オリジンとして設定するリソースを選択"
            variant="outlined"
            density="compact"
            multiple
            chips
            closable-chips
          >
            <template #item="{ props, item }">
              <v-list-item v-bind="props">
                <template #prepend>
                  <span class="resource-type-badge">{{ item.raw.type }}</span>
                </template>
                <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                <v-list-item-subtitle>{{ item.raw.id }}</v-list-item-subtitle>
              </v-list-item>
            </template>
            <template #chip="{ props, item }">
              <v-chip v-bind="props" color="primary" variant="tonal">
                {{ item.raw.name }} ({{ item.raw.type.toUpperCase() }})
              </v-chip>
            </template>
          </v-select>
          
          <!-- 設定済みオリジンの詳細表示 -->
          <div v-if="origins.length > 0" class="configured-origins">
            <h4>設定済みオリジン</h4>
            <div class="origin-list">
              <div 
                v-for="originId in origins" 
                :key="originId"
                class="origin-item"
              >
                <div class="origin-info">
                  <div class="origin-name">
                    {{ availableOriginResources.find(r => r.id === originId)?.name }}
                  </div>
                  <div class="origin-type">
                    {{ availableOriginResources.find(r => r.id === originId)?.type.toUpperCase() }}
                  </div>
                  <div class="origin-id">
                    {{ originId }}
                  </div>
                </div>
                <v-icon color="success">check_circle</v-icon>
              </div>
            </div>
          </div>
          
          <div v-else class="no-origins">
            <v-icon size="48" color="grey">cloud</v-icon>
            <p>オリジンが設定されていません</p>
            <p class="text-caption">上記のセレクトボックスからオリジンを選択してください</p>
          </div>

          <div class="origin-note">
            <v-icon size="small" color="#1976d2">info</v-icon>
            <span>CloudFrontは設定されたオリジンに対してコンテンツ配信を行います。API Gatewayを設定することで動的コンテンツの配信も可能です。</span>
          </div>
        </div>
      </div>

      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>CloudFrontは全世界に分散したエッジロケーションからコンテンツを配信し、レイテンシを削減します。Route53からのルーティングを受け取り、設定されたオリジンに転送します。</span>
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

.origin-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.origin-section h3 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 16px;
}

.configured-origins h4 {
  font-size: 14px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
  margin-top: 16px;
}

.origin-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.origin-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #e8f5e8;
  border: 1px solid #4caf50;
  border-radius: 8px;
}

.origin-info {
  flex: 1;
}

.origin-name {
  font-weight: bold;
  color: #333;
  margin-bottom: 2px;
}

.origin-type {
  font-size: 12px;
  color: #666;
  background-color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
  display: inline-block;
  margin-bottom: 4px;
}

.origin-id {
  font-size: 11px;
  color: #666;
  font-family: monospace;
}

.no-origins {
  text-align: center;
  padding: 32px;
  color: #666;
}

.no-origins p {
  margin-top: 8px;
  margin-bottom: 0;
}

.origin-note, .info-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 4px;
  border-left: 3px solid #1976d2;
  margin-top: 8px;
}

.origin-note span, .info-note span {
  font-size: 13px;
  color: #1976d2;
  line-height: 1.4;
}


.resource-type-badge {
  font-size: 10px;
  background-color: #e0e0e0;
  padding: 2px 6px;
  border-radius: 3px;
  color: #666;
}
</style>