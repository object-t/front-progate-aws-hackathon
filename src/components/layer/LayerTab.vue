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
        :edit-input="editInput"
        :editing="editingServiceId === service.id"
        :service="service"
        @finish:edit="finishEdit"
        @start:edit="startEdit"
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
                  @click="addResource(vpc.vpcId, service); openDialogId = null"
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
          <v-icon class="delete-button" @click="deleteVpc(vpc.vpcId)">delete</v-icon>
        </div>
      </div>
      <div class="service-container">
        <ServiceItem
          :edit-input="editInput"
          :editing="editingServiceId === vpc.vpc.id"
          :service="vpc.vpc"
          @finish:edit="finishEdit"
          @start:edit="startEdit"
        />
        <div v-for="network in vpc.networks" :key="network.id">
          <ServiceItem
            :edit-input="editInput"
            :editing="editingServiceId === network.id"
            :service="network"
            @finish:edit="finishEdit"
            @start:edit="startEdit"
          />
        </div>
        <div v-for="subnet in vpc.subnets" :key="subnet.id">
          <ServiceItem
            :edit-input="editInput"
            :editing="editingServiceId === subnet.id"
            :service="subnet"
            @finish:edit="finishEdit"
            @start:edit="startEdit"
          />
          <ServiceItem
            v-for="compute in vpc.computes.filter(c => c.subnetId === subnet.id)"
            :key="compute.id"
            class="compute-item"
            :edit-input="editInput"
            :editing="editingServiceId === compute.id"
            :service="compute"
            @finish:edit="finishEdit"
            @start:edit="startEdit"
          />
          <ServiceItem
            v-for="compute in vpc.databases.filter(c => c.subnetId === subnet.id)"
            :key="compute.id"
            class="compute-item"
            :edit-input="editInput"
            :editing="editingServiceId === compute.id"
            :service="compute"
            @finish:edit="finishEdit"
            @start:edit="startEdit"
          />
        </div>
      </div>

      <v-divider class="mt-10" />

    </div>
  </div>
</template>

<script lang="ts" setup>
  import type { BaseResource, VpcResource } from '@/types/service.ts'
  import { nextTick, ref } from 'vue'
  import { ICONS } from '@/icons.ts'
  import { randomId } from '@/utils/random.ts'

  const GLOBAL_AND_REGIONAL_SERVICES = ['s3', 'api_gateway', 'cloudfront', 'route53', 'elastic_ip']
  const VPC_SERVICES = ['lambda', 'ec2', 'fargate', 'ecs', 'eks', 'internet_gateway', 'endpoint', 'nat_gateway', 'public_subnet', 'private_subnet']

  const emits = defineEmits<{
    'set-setting': [service: BaseResource]
  }>()

  const services = ref<BaseResource[]>([])
  const serviceDialog = ref(false)
  const vpcList = ref<VpcResource[]>([])
  const openDialogId = ref<string | null>(null)
  const editInput = ref<HTMLInputElement[]>([])
  const editingServiceId = ref<string | null>(null)

  const toUpperCamelCase = (str: string): string => str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
  const addService = (service: string) => services.value.push({
    id: crypto.randomUUID(),
    name: service,
    type: service,
  })

  const startEdit = (service: string) => {
    editingServiceId.value = service
    nextTick(() => {
      const input = editInput.value?.find(el => el)
      if (input) {
        input.focus()
        input.select()
      }
    })
  }

  const finishEdit = () => {
    editingServiceId.value = null
  }

  const addResource = (vpcId: string, service: string) => {
    const vpc = vpcList.value.find(vpc => vpc.vpcId === vpcId)
    if (!vpc) return

    const type = ICONS[`${service}`].type.toLowerCase()
    console.log(type)
    switch (type) {
      case 'compute': {
        vpc.computes.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId: vpcId,
          subnetId: vpc.subnets.find(s => s.isDefault)?.id ?? '',
        })
        break
      }
      case 'database': {
        vpc.databases.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId: vpcId,
          subnetId: vpc.subnets.find(s => s.isDefault)?.id ?? '',
        })
        break
      }
      case 'networking': {
        vpc.networks.push({
          id: crypto.randomUUID(),
          name: service,
          type: service,
          vpcId: vpcId,
        })
        break
      }
      case 'subnet': {
        vpc.subnets.push({
          id: crypto.randomUUID(),
          name: `${service}_${randomId()}`,
          type: service,
          vpcId: vpcId,
          isDefault: false,
        })
        break
      }
      default: {
        break
      }
    }
  }

  const deleteVpc = (vpcId: string) => {
    vpcList.value.splice(vpcList.value.findIndex(v => v.vpcId === vpcId), 1)
  }

  const newVpc = () => {
    const vpcId = crypto.randomUUID()
    const subnetId = crypto.randomUUID()

    vpcList.value.push({
      vpcId: vpcId,
      vpc: {
        id: vpcId,
        name: `vpc_${randomId()}`,
        type: 'vpc',
      },
      subnets: [
        {
          id: subnetId,
          name: `default_subnet_${randomId()}`,
          vpcId: vpcId,
          isDefault: true,
          type: 'private_subnet',
        },
      ],
      networks: [],
      computes: [],
      databases: [],
    })
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
  background-color: #f1f1f1;
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
</style>
