<script setup lang="ts">
  import type { Route53Resource } from '@/types/service.ts'
  import { isRoute53Resource } from '@/types/service.ts'
  import { computed, ref } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useServiceList } from '@/composables/useServiceList.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'

  const { setting } = useInfo()
  const { services } = useServiceList()
  const { vpcList } = useVpcList()

  const currentRoute53 = computed(() => {
    return setting.value && isRoute53Resource(setting.value) ? setting.value : null
  })

  // 選択可能なターゲットリソースを取得
  const availableTargetResources = computed(() => {
    const targets: Array<{ id: string, name: string, type: string, category: string }> = []
    
    // CloudFront
    services.value.forEach(service => {
      if (service.type === 'cloudfront') {
        targets.push({
          id: service.id,
          name: service.name,
          type: service.type,
          category: 'グローバルサービス'
        })
      }
    })

    // Elastic IP
    services.value.forEach(service => {
      if (service.type === 'elastic_ip') {
        targets.push({
          id: service.id,
          name: service.name,
          type: service.type,
          category: 'グローバルサービス'
        })
      }
    })

    // LoadBalancer (ALB, NLB)
    vpcList.value.forEach(vpc => {
      vpc.computes.forEach(compute => {
        if (['alb', 'nlb'].includes(compute.type)) {
          targets.push({
            id: compute.id,
            name: compute.name,
            type: compute.type,
            category: `VPC: ${vpc.vpc.name}`
          })
        }
      })
    })

    return targets
  })

  const domainName = ref(currentRoute53.value?.domainName || '')
  
  const aRecords = ref<Array<{ name: string, targetResourceId: string }>>(
    currentRoute53.value?.aRecords || []
  )

  const newRecordName = ref('')
  const newRecordTarget = ref('')

  // Aレコードを追加
  const addARecord = () => {
    if (newRecordName.value && newRecordTarget.value) {
      aRecords.value.push({
        name: newRecordName.value,
        targetResourceId: newRecordTarget.value
      })
      updateARecords()
      newRecordName.value = ''
      newRecordTarget.value = ''
    }
  }

  // Aレコードを削除
  const removeARecord = (index: number) => {
    aRecords.value.splice(index, 1)
    updateARecords()
  }

  // ドメイン名を更新
  const updateDomainName = () => {
    if (currentRoute53.value) {
      currentRoute53.value.domainName = domainName.value
    }
  }

  // Aレコードを更新
  const updateARecords = () => {
    if (currentRoute53.value) {
      currentRoute53.value.aRecords = [...aRecords.value]
    }
  }

  // ターゲットリソースの詳細情報を取得
  const getTargetResourceDetails = (targetResourceId: string) => {
    return availableTargetResources.value.find(resource => resource.id === targetResourceId)
  }
</script>

<template>
  <div>
    <h2>Route 53</h2>
    <div class="setting-section">
      <div class="info-item">
        <label>名前:</label>
        <span>{{ currentRoute53?.name }}</span>
      </div>
      
      <div class="info-item">
        <label>ID:</label>
        <span class="resource-id">{{ currentRoute53?.id }}</span>
      </div>
      
      <div class="info-item">
        <label>タイプ:</label>
        <span>{{ currentRoute53?.type }}</span>
      </div>
      
      <div class="info-item">
        <label>配信スコープ:</label>
        <span>グローバル（DNS）</span>
      </div>
      
      <div class="info-item">
        <label>ドメイン名:</label>
        <v-text-field
          v-model="domainName"
          label="ドメイン名 (例: example.com)"
          variant="outlined"
          density="compact"
          placeholder="example.com"
          @blur="updateDomainName"
          @keydown.enter="updateDomainName"
        />
      </div>
      
      <div class="records-section">
        <h3>Aレコード設定</h3>
        
        <!-- 既存のAレコード -->
        <div v-if="aRecords.length > 0" class="existing-records">
          <div v-for="(record, index) in aRecords" :key="index" class="record-item">
            <div class="record-info">
              <div class="record-name">{{ record.name }}</div>
              <div class="record-target">
                <template v-if="getTargetResourceDetails(record.targetResourceId)">
                  <span class="target-type">{{ getTargetResourceDetails(record.targetResourceId)?.type.toUpperCase() }}</span>
                  <span class="target-name">{{ getTargetResourceDetails(record.targetResourceId)?.name }}</span>
                  <span class="target-category">{{ getTargetResourceDetails(record.targetResourceId)?.category }}</span>
                </template>
                <template v-else>
                  <span class="target-missing">リソースが見つかりません</span>
                </template>
              </div>
            </div>
            <v-btn
              size="small"
              color="error"
              variant="text"
              @click="removeARecord(index)"
            >
              削除
            </v-btn>
          </div>
        </div>
        
        <div v-else class="no-records">
          <span>Aレコードが設定されていません</span>
        </div>
        
        <!-- 新しいAレコード追加 -->
        <div class="add-record-section">
          <h4>新しいAレコードを追加</h4>
          <div class="add-record-form">
            <v-text-field
              v-model="newRecordName"
              label="レコード名 (例: www, api, など)"
              variant="outlined"
              dense
              placeholder="www"
            />
            <v-select
              v-model="newRecordTarget"
              :items="availableTargetResources"
              item-title="name"
              item-value="id"
              label="宛先リソース"
              variant="outlined"
              dense
            >
              <template #item="{ props, item }">
                <v-list-item v-bind="props">
                  <template #prepend>
                    <span class="resource-type-badge">{{ item.raw.type.toUpperCase() }}</span>
                  </template>
                  <v-list-item-title>{{ item.raw.name }}</v-list-item-title>
                  <v-list-item-subtitle>{{ item.raw.category }}</v-list-item-subtitle>
                </v-list-item>
              </template>
            </v-select>
            <v-btn
              color="primary"
              :disabled="!newRecordName || !newRecordTarget"
              @click="addARecord"
            >
              追加
            </v-btn>
          </div>
        </div>
      </div>
      
      <div class="info-note">
        <v-icon size="small" color="#1976d2">info</v-icon>
        <span>Route 53のDNSサービスでAレコードを管理します。CloudFront、Elastic IP、ロードバランサー（ALB/NLB）を宛先として設定できます。中級者向けのため、CNAMEやMXレコードなどの設定は省略されています。</span>
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

.records-section {
  margin-top: 16px;
}

.records-section h3, .records-section h4 {
  font-size: 16px;
  font-weight: bold;
  color: #424242;
  margin-bottom: 12px;
}

.records-section h4 {
  font-size: 14px;
  margin-top: 24px;
}

.existing-records {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.record-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.record-name {
  font-weight: bold;
  color: #1976d2;
  font-size: 14px;
}

.record-target {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.target-type {
  font-weight: bold;
  color: #4caf50;
  font-size: 12px;
}

.target-name {
  color: #424242;
  font-weight: 500;
}

.target-category {
  font-size: 12px;
  color: #666;
}

.target-missing {
  color: #f44336;
  font-style: italic;
  font-size: 12px;
}

.no-records {
  padding: 16px;
  background-color: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  margin-bottom: 16px;
}

.no-records span {
  color: #888;
  font-style: italic;
}

.add-record-section {
  margin-top: 16px;
  padding: 16px;
  background-color: #fafafa;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.add-record-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.resource-type-badge {
  background-color: #e8f5e8;
  color: #4caf50;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  margin-right: 8px;
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