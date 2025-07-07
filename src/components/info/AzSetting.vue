<script setup lang="ts">
  import type { AvailabilityZone, AzName } from '@/types/service.ts'
  import { computed, ref, watch } from 'vue'
  import { useInfo } from '@/composables/useInfo.ts'
  import { useVpcList } from '@/composables/useVpcList.ts'
  import { getAvailableAzNames, getAzDisplayName } from '@/types/service.ts'

  const { setting } = useInfo()
  const { vpcList, deleteAvailabilityZone } = useVpcList()

  const currentAz = computed(() => {
    return setting.value as AvailabilityZone
  })

  const vpc = computed(() => {
    if (!currentAz.value) return null
    return vpcList.value.find(vpc => vpc.vpcId === currentAz.value.vpcId)
  })

  const subnetsInAz = computed(() => {
    if (!vpc.value || !currentAz.value) return []
    return vpc.value.subnets.filter(subnet => subnet.azId === currentAz.value.id)
  })

  const resourcesInAz = computed(() => {
    if (!vpc.value || !currentAz.value) return { computes: 0, databases: 0 }

    const subnetIds = subnetsInAz.value.map(s => s.id)
    const computes = vpc.value.computes.filter(c =>
      c.subnetIds.some(id => subnetIds.includes(id))
    ).length

    const databases = vpc.value.databases.filter(d =>
      d.subnetIds.some(id => subnetIds.includes(id))
    ).length

    return { computes, databases }
  })

  const canDelete = computed(() => {
    return subnetsInAz.value.length === 0
  })

  const handleDelete = () => {
    if (!currentAz.value || !vpc.value || !canDelete.value) return

    const success = deleteAvailabilityZone(vpc.value.vpcId, currentAz.value.id)
    if (success) {
      // 設定画面を閉じる
      const { hidden } = useInfo()
      hidden.value = true
    }
  }

  const azTypeInfo = computed(() => {
    if (!currentAz.value) return null

    const azMap: Record<AzName, { description: string; region: string }> = {
      a: { description: 'プライマリAZ - 最も一般的に使用', region: 'ap-northeast-1a' },
      c: { description: 'セカンダリAZ - 冗長性確保', region: 'ap-northeast-1c' },
      d: { description: 'ターシャリAZ - 高可用性構成', region: 'ap-northeast-1d' }
    }

    return azMap[currentAz.value.azName] || { description: '不明', region: '不明' }
  })
</script>

<template>
  <div>
    <h2>Availability Zone Settings</h2>

    <div v-if="currentAz && vpc">
      <!-- AZ Information -->
      <div class="setting-group">
        <h3>AZ Information</h3>
        <v-card variant="outlined">
          <v-card-text>
            <div class="config-item">
              <strong>AZ Name:</strong> {{ currentAz.name }}
            </div>
            <div class="config-item">
              <strong>Region:</strong> {{ azTypeInfo?.region }}
            </div>
            <div class="config-item">
              <strong>Description:</strong> {{ azTypeInfo?.description }}
            </div>
            <div class="config-item">
              <strong>VPC:</strong> {{ vpc.vpc.name }}
            </div>
          </v-card-text>
        </v-card>
      </div>

      <!-- Resources in AZ -->
      <div class="setting-group">
        <h3>Resources in this AZ</h3>
        <v-row>
          <v-col cols="6">
            <v-card>
              <v-card-text class="text-center">
                <div class="stat-number">{{ subnetsInAz.length }}</div>
                <div class="stat-label">Subnets</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="6">
            <v-card>
              <v-card-text class="text-center">
                <div class="stat-number">{{ resourcesInAz.computes + resourcesInAz.databases }}</div>
                <div class="stat-label">Resources</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <!-- Subnets List -->
      <div v-if="subnetsInAz.length > 0" class="setting-group">
        <h3>Subnets in this AZ</h3>
        <v-list>
          <v-list-item
            v-for="subnet in subnetsInAz"
            :key="subnet.id"
          >
            <template #prepend>
              <v-icon
                :color="subnet.type === 'public_subnet' ? 'success' : 'warning'"
                :icon="subnet.type === 'public_subnet' ? 'public' : 'lock'"
              />
            </template>
            <v-list-item-title>{{ subnet.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ subnet.type === 'public_subnet' ? 'Public Subnet' : 'Private Subnet' }}
            </v-list-item-subtitle>
          </v-list-item>
        </v-list>
      </div>

      <!-- Warning for Non-empty AZ -->
      <div v-if="!canDelete" class="setting-group">
        <v-alert
          type="warning"
          variant="tonal"
        >
          <strong>削除不可:</strong> このAZには {{ subnetsInAz.length }}個のサブネットが存在します。
          AZを削除する前に、すべてのサブネットを削除または移動してください。
        </v-alert>
      </div>

      <!-- Delete AZ -->
      <div class="setting-group">
        <h3>Danger Zone</h3>
        <v-card variant="outlined" class="border-error">
          <v-card-text>
            <h4 class="text-error">Delete Availability Zone</h4>
            <p class="text-caption mt-2">
              この操作は取り消せません。AZ内にリソースがある場合は削除できません。
            </p>
            <v-btn
              :disabled="!canDelete"
              color="error"
              variant="outlined"
              @click="handleDelete"
            >
              <v-icon>delete</v-icon>
              Delete AZ
            </v-btn>
          </v-card-text>
        </v-card>
      </div>
    </div>

    <div v-else>
      <p>AZ情報が選択されていません</p>
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

.config-item {
  margin-bottom: 8px;
}

.config-item strong {
  color: #333;
  margin-right: 8px;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #1976d2;
}

.stat-label {
  font-size: 0.875rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.border-error {
  border-color: rgb(var(--v-theme-error)) !important;
}
</style>
