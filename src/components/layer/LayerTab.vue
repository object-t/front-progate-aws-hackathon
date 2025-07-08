<template>
  <div class="layer-container">
    <p class="layer-label">グローバル・リージョナルサービス</p>
    <div class="action-icon">
      <v-dialog v-model="serviceDialog" class="dialog">
        <template #activator="{ props: activatorProps }">
          <v-icon v-bind="activatorProps">add</v-icon>
        </template>
        <v-card class="dialog-card">
          <v-card-title>追加するグローバル・リージョナルサービスを選択</v-card-title>
          <div class="service-item">
            <div
              v-for="(service, index) in GLOBAL_AND_REGIONAL_SERVICES"
              :key="index"
              @click="addService(service); serviceDialog = false"
            >
              <component
                :is="ICONS[`${service}`].component"
                height="80px"
                width="80px"
              />
              <p class="label">{{ toUpperCamelCase(service) }}</p>
            </div>
          </div>
        </v-card>
      </v-dialog>
    </div>
    <div class="service-container">
      <ServiceItem
        v-for="service in services"
        :key="service.id"
        :editing="editingServiceId === service.id"
        :service="service"
        @delete:resource="handleDeleteResource"
        @finish:edit="finishEdit"
        @set:setting="setSetting"
        @start:edit="startEdit"
        @update:name="updateServiceName"
      />
    </div>

    <v-divider class="mt-10" />

    <div class="layer-label">
      <p>VPCサービス</p>
      <div class="action-icon">
        <v-icon @click="newVpc">add</v-icon>
      </div>
    </div>

    <div v-for="vpc in vpcList" :key="vpc.vpcId">
      <div class="layer-label">
        <p class="text-truncate">{{ vpc.vpc.name }}</p>
        <div class="action-icon">
          <v-dialog class="dialog" :model-value="openDialogId === vpc.vpcId" @update:model-value="(value) => openDialogId = value ? vpc.vpcId : null">
            <template #activator="{ props: activatorProps }">
              <v-icon v-bind="activatorProps">add</v-icon>
            </template>
            <v-card class="dialog-card">
              <v-card-title>追加するVPCサービスを選択</v-card-title>
              <div class="service-item">
                <div
                  v-for="(service, index) in VPC_SERVICES"
                  :key="index"
                  @click="handleAddResource(vpc.vpcId, service)"
                >
                  <component
                    :is="ICONS[`${service}`].component"
                    height="80px"
                    width="80px"
                  />
                  <p class="label">{{ toUpperCamelCase(service) }}</p>
                </div>
              </div>
            </v-card>
          </v-dialog>

          <!-- AZ追加用ダイアログ -->
          <v-dialog class="dialog" :model-value="openAzDialogId === vpc.vpcId" @update:model-value="(value) => openAzDialogId = value ? vpc.vpcId : null">
            <v-card class="dialog-card">
              <v-card-title>追加するAvailability Zoneを選択</v-card-title>
              <div class="service-item">
                <div
                  v-for="azName in getAvailableAzNames().filter(name => !vpc.availabilityZones.some(az => az.azName === name))"
                  :key="azName"
                  @click="addAz(vpc.vpcId, azName)"
                >
                  <component
                    :is="ICONS['az']?.component"
                    height="80px"
                    width="80px"
                  />
                  <p class="label">{{ getAzDisplayName(azName) }}</p>
                </div>
                <div v-if="getAvailableAzNames().filter(name => !vpc.availabilityZones.some(az => az.azName === name)).length === 0" class="no-items">
                  <p>すべてのAZが追加済みです</p>
                </div>
              </div>
            </v-card>
          </v-dialog>

          <v-icon class="delete-button" @click="deleteVpc(vpc.vpcId)">delete</v-icon>
        </div>
      </div>
      <div class="service-container">
        <ServiceItem
          :editing="editingServiceId === vpc.vpc.id"
          :service="vpc.vpc"
          @delete:resource="() => deleteVpc(vpc.vpcId)"
          @finish:edit="finishEdit"
          @set:setting="setSetting"
          @start:edit="startEdit"
          @update:name="updateResourceName"
        />
        <!-- Network Resources (VPC直下) -->
        <div v-for="network in vpc.networks" :key="network.id">
          <ServiceItem
            :editing="editingServiceId === network.id"
            :service="network"
            @delete:resource="handleDeleteResource"
            @finish:edit="finishEdit"
            @set:setting="setSetting"
            @start:edit="startEdit"
            @update:name="updateResourceName"
          />
        </div>

        <!-- Availability Zones -->
        <div v-for="az in vpc.availabilityZones" :key="az.id">
          <div class="az-header">
            <ServiceItem
              :editing="editingServiceId === az.id"
              :service="az"
              @delete:resource="handleDeleteResource"
              @finish:edit="finishEdit"
              @set:setting="setSetting"
              @start:edit="startEdit"
              @update:name="updateResourceName"
            />
          </div>

          <!-- Subnets within AZ -->
          <div 
            v-for="subnet in getSubnetsInAz(vpc, az.id)" 
            :key="subnet.id" 
            class="subnet-container"
            draggable="true"
            @dragstart="onDragStart(subnet, $event)"
            @dragover="onDragOver($event)"
            @drop="onDrop(vpc.vpcId, az.id, subnet, $event)"
          >
            <ServiceItem
              :editing="editingServiceId === subnet.id"
              :service="subnet"
              @delete:resource="handleDeleteResource"
              @finish:edit="finishEdit"
              @set:setting="setSetting"
              @start:edit="startEdit"
              @update:name="updateResourceName"
            />

            <!-- Compute Resources in Subnet -->
            <ServiceItem
              v-for="compute in vpc.computes.filter(c => c.subnetIds.includes(subnet.id))"
              :key="`${compute.id}-${subnet.id}`"
              class="compute-item"
              :edit-id="`${compute.id}-${subnet.id}`"
              :editing="editingServiceId === `${compute.id}-${subnet.id}`"
              :service="compute"
              @delete:resource="handleDeleteResource"
              @finish:edit="finishEdit"
              @set:setting="setSetting"
              @start:edit="startEdit"
              @update:name="updateResourceName"
            />
            <ServiceItem
              v-for="database in vpc.databases.filter(c => c.subnetIds.includes(subnet.id))"
              :key="`${database.id}-${subnet.id}`"
              class="compute-item"
              :edit-id="`${database.id}-${subnet.id}`"
              :editing="editingServiceId === `${database.id}-${subnet.id}`"
              :service="database"
              @delete:resource="handleDeleteResource"
              @finish:edit="finishEdit"
              @set:setting="setSetting"
              @start:edit="startEdit"
              @update:name="updateResourceName"
            />
          </div>
        </div>

        <!-- 未割り当てリソース表示 -->
        <div v-if="getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0" class="unassigned-container">
          <div class="unassigned-header">
            <p>未割り当てリソース</p>
          </div>

          <!-- 未割り当てCompute Resources -->
          <ServiceItem
            v-for="compute in getUnassignedComputes(vpc)"
            :key="`unassigned-${compute.id}`"
            class="unassigned-item"
            :edit-id="compute.id"
            :editing="editingServiceId === compute.id"
            :service="compute"
            @delete:resource="handleDeleteResource"
            @finish:edit="finishEdit"
            @set:setting="setSetting"
            @start:edit="startEdit"
            @update:name="updateResourceName"
          />

          <!-- 未割り当てDatabase Resources -->
          <ServiceItem
            v-for="database in getUnassignedDatabases(vpc)"
            :key="`unassigned-${database.id}`"
            class="unassigned-item"
            :edit-id="database.id"
            :editing="editingServiceId === database.id"
            :service="database"
            @delete:resource="handleDeleteResource"
            @finish:edit="finishEdit"
            @set:setting="setSetting"
            @start:edit="startEdit"
            @update:name="updateResourceName"
          />
        </div>
      </div>

      <v-divider class="mt-10" />

    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { AzName, BaseResource } from '@/types/service.ts'
  import { ref } from 'vue'
  import { useServiceList } from '@/composables/useServiceList.ts'
  import { useVpcList } from '@/composables/useVpcList'
  import { ICONS } from '@/icons.ts'
  import { getAvailableAzNames, getAzDisplayName } from '@/types/service.ts'
  import ServiceItem from './ServiceItem.vue'

  const GLOBAL_AND_REGIONAL_SERVICES = ['s3', 'api_gateway', 'cloudfront', 'route53', 'elastic_ip', 'dynamo_db']
  const VPC_SERVICES = ['lambda', 'ec2', 'fargate', 'ecs', 'eks', 'internet_gateway', 'endpoint', 'nat_gateway', 'public_subnet', 'private_subnet', 'rds', 'elasticache', 'az']

  const emits = defineEmits<{
    'set-setting': [service: BaseResource]
  }>()

  const { vpcList, addResource, deleteVpc, newVpc, addAvailabilityZone, deleteAvailabilityZone, updateResourceName, deleteResource, updateSubnetOrder } = useVpcList()
  const { services, deleteService } = useServiceList()

  // 未割り当てリソースを取得する関数
  const getUnassignedComputes = (vpc: any) => {
    return vpc.computes.filter((compute: any) =>
      !compute.subnetIds
      || compute.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId)),
    )
  }

  const getUnassignedDatabases = (vpc: any) => {
    return vpc.databases.filter((database: any) =>
      !database.subnetIds
      || database.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId)),
    )
  }

  // サブネットを順序に従ってソート
  const getSubnetsInAz = (vpc: any, azId: string) => {
    return vpc.subnets.filter((s: any) => s.azId === azId).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  // ドラッグ&ドロップ関連
  const draggedSubnet = ref<any>(null)

  const onDragStart = (subnet: any, event: DragEvent) => {
    draggedSubnet.value = subnet
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/html', subnet.id)
    }
  }

  const onDragOver = (event: DragEvent) => {
    event.preventDefault()
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move'
    }
  }

  const onDrop = (vpcId: string, azId: string, targetSubnet: any, event: DragEvent) => {
    event.preventDefault()
    
    if (!draggedSubnet.value || draggedSubnet.value.id === targetSubnet.id) {
      return
    }

    const vpc = vpcList.value.find(v => v.vpcId === vpcId)
    if (!vpc) return

    const subnetsInAz = getSubnetsInAz(vpc, azId)
    const draggedIndex = subnetsInAz.findIndex(s => s.id === draggedSubnet.value.id)
    const targetIndex = subnetsInAz.findIndex(s => s.id === targetSubnet.id)

    if (draggedIndex === -1 || targetIndex === -1) return

    // 新しい順序を計算
    const newOrder = [...subnetsInAz]
    const [draggedItem] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedItem)

    // 順序を更新
    const newSubnetIds = newOrder.map(s => s.id)
    updateSubnetOrder(vpcId, azId, newSubnetIds)

    draggedSubnet.value = null
  }

  const serviceDialog = ref(false)
  const openDialogId = ref<string | null>(null)
  const openAzDialogId = ref<string | null>(null)
  const editingServiceId = ref<string | null>(null)

  const toUpperCamelCase = (str: string): string => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
  const addService = (service: string) => {
    const newService = {
      id: crypto.randomUUID(),
      name: service,
      type: service,
    } as any

    // Elastic IPの場合はアタッチ状態を初期化
    if (service === 'elastic_ip') {
      newService.isAttached = false
      newService.attachedResourceId = undefined
    }

    services.value.push(newService)
  }

  const updateServiceName = (id: string, name: string) => {
    if (name === '') {
      return
    }

    const service = services.value.find(s => s.id === id)
    if (service) {
      service.name = name
    }
  }

  const setSetting = (service: BaseResource): void => {
    emits('set-setting', service)
  }

  const startEdit = (editId: string) => {
    editingServiceId.value = editId
  }

  const finishEdit = () => {
    editingServiceId.value = null
  }

  // AZ関連の機能
  const addAz = (vpcId: string, azName: AzName) => {
    addAvailabilityZone(vpcId, azName)
    openAzDialogId.value = null
  }

  const handleAddResource = (vpcId: string, service: string) => {
    if (service === 'az') {
      // AZ追加の場合は専用ダイアログを開く
      openAzDialogId.value = vpcId
    } else {
      // 通常のリソース追加
      addResource(vpcId, service)
      openDialogId.value = null
    }
  }

  const handleDeleteResource = (resourceId: string) => {
    // まずVPCリソースとして削除を試行
    const vpcResult = deleteResource(resourceId)
    if (vpcResult.success) {
      return
    }

    // VPCリソースで見つからない場合はグローバルサービスとして削除を試行
    const serviceResult = deleteService(resourceId)
    if (!serviceResult.success) {
      alert(`削除できません: ${serviceResult.reason}`)
    }
  }
</script>

<style lang="scss" scoped>
.layer-container {
  width: 400px;
  box-shadow: 0 4px 12px #b8b8b828;
  padding: 24px;
}

.layer-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 100%;
  margin-top: 24px;
  > p {
    max-width: calc(100% - 42px);
  }
}

.service-container {
  width: 100%;
  min-height: 24px;
  box-shadow: 4px 4px 12px rgba(184, 184, 184, 0.19);
}

.action-icon {
  display: flex;
  flex-direction: row-reverse;
  margin-bottom: 4px;
  > i.v-icon {
    box-shadow: 0 4px 12px #b8b8b847;
    border-radius: 4px;
    transition: opacity 0.3s ease;
    cursor: pointer;

    &:hover {
      opacity: 0.7;
    }
  }
}

.dialog {
  width: 800px;
}

.dialog-card {
  padding: 32px;
}

.service-item {
  width: 100%;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: start;
  align-items: center;

  > div {
    cursor: pointer;
    text-align: center;
    margin: 12px;
    transition: transform 0.3s ease, opacity 0.3s ease;

    &:hover {
      transform: translateY(-4px);
      opacity: 0.7;
    }
  }
}

.compute-item {
  padding-left: 32px;
}

.delete-button {
  font-size: 18px;
  padding: 12px;
  color: #c54949;
}

.az-header {
  background-color: #e3f2fd;
  border-left: 3px solid #2196f3;
  margin: 8px 0;
  padding: 4px 8px;
  border-radius: 4px;
}

.subnet-container {
  background-color: #f9f9f9;
  border-left: 2px solid #ddd;
  margin-left: 16px;
  padding: 4px 0;
  cursor: move;
  transition: all 0.2s ease;
}

.subnet-container:hover {
  background-color: #e8f4f8;
  border-left-color: #2196f3;
}

.subnet-container[draggable="true"] {
  user-select: none;
}

.no-items {
  text-align: center;
  padding: 20px;
  color: #666;
}

.unassigned-container {
  background-color: #fff3cd;
  border-left: 3px solid #ffc107;
  margin: 16px 0;
  padding: 8px;
  border-radius: 4px;
}

.unassigned-header {
  background-color: #ffc107;
  color: #212529;
  padding: 4px 8px;
  margin: -8px -8px 8px -8px;
  border-radius: 4px 4px 0 0;
  font-weight: bold;
  font-size: 12px;
}
</style>
