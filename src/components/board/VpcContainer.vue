<template>
  <div 
    class="vpc-container" 
    :style="{ 
      width: `${width}px`, 
      height: `${height}px` 
    }"
  >
    <!-- VPC Header -->
    <div class="vpc-header">
      <div class="vpc-icon">
        <component :is="vpcIcon" />
      </div>
      <div class="vpc-label">{{ label }}</div>
    </div>

    <!-- Internet Gateway -->
    <div v-if="internetGateway" class="internet-gateway">
      <ServiceIcon
        :icon="internetGatewayIcon"
        :label="internetGateway.name"
        :selected="isSelected(internetGateway)"
        :variant="'network'"
        @click="(event) => $emit('igw-click', internetGateway, event)"
      />
    </div>

    <!-- VPC Endpoints -->
    <div v-if="endpoints.length > 0" class="vpc-endpoints">
      <div 
        v-for="endpoint in endpoints" 
        :key="endpoint.id"
        class="endpoint-item"
      >
        <ServiceIcon
          :icon="endpointIcon"
          :label="endpoint.name"
          :selected="isSelected(endpoint)"
          :variant="'endpoint'"
          :label-size="'small'"
          @click="(event) => $emit('endpoint-click', endpoint, event)"
        />
      </div>
    </div>

    <!-- Availability Zones -->
    <div class="availability-zones">
      <div 
        v-for="az in availabilityZones" 
        :key="az.id"
        class="az-container"
        :style="{ width: `${getAzWidth(az)}px` }"
      >
        <!-- AZ Header -->
        <div class="az-header">
          <span class="az-label">{{ az.name }}</span>
        </div>

        <!-- Subnets in AZ -->
        <div class="az-subnets">
          <SubnetContainer
            v-for="subnet in getSubnetsInAz(az.id)"
            :key="subnet.id"
            :label="subnet.name"
            :subnet-type="subnet.type === 'public_subnet' ? 'public' : 'private'"
            :width="getSubnetWidth(subnet)"
            :height="getSubnetHeight(subnet)"
            :selected="isSelected(subnet)"
            :resources="getResourcesInSubnet(subnet.id)"
            :nat-gateway="getNatGatewayInSubnet(subnet.id)"
            :subnet-icon="getSubnetIcon(subnet)"
            :nat-gateway-icon="natGatewayIcon"
            :elastic-ip-icon="elasticIpIcon"
            :get-resource-icon="getResourceIcon"
            :is-selected="isSelected"
            :get-attached-elastic-i-ps="getAttachedElasticIPs"
            @resource-click="(resource, event) => $emit('resource-click', resource, event)"
            @nat-gateway-click="(natGateway, event) => $emit('nat-gateway-click', natGateway, event)"
            @elastic-ip-click="(eip) => $emit('elastic-ip-click', eip)"
          />
        </div>
      </div>
    </div>

    <!-- Network Resources (bottom area) -->
    <div v-if="networkResources.length > 0" class="network-resources">
      <div 
        v-for="network in networkResources" 
        :key="network.id"
        class="network-item"
      >
        <ServiceIcon
          :icon="getResourceIcon(network)"
          :label="network.name"
          :selected="isSelected(network)"
          :variant="'network'"
          @click="(event) => $emit('network-click', network, event)"
        />
      </div>
    </div>

    <!-- Unassigned Resources -->
    <div v-if="unassignedResources.length > 0" class="unassigned-resources">
      <div class="unassigned-header">
        <span>未割り当てリソース</span>
      </div>
      <div class="unassigned-grid">
        <div 
          v-for="resource in unassignedResources" 
          :key="resource.id"
          class="unassigned-item"
        >
          <ServiceIcon
            :icon="getResourceIcon(resource)"
            :label="resource.name"
            :selected="isSelected(resource)"
            :variant="'unassigned'"
            @click="(event) => $emit('resource-click', resource, event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  import ServiceIcon from './ServiceIcon.vue'
  import SubnetContainer from './SubnetContainer.vue'
  
  interface Props {
    label: string
    width: number
    height: number
    availabilityZones: any[]
    internetGateway?: BaseResource | null
    endpoints: BaseResource[]
    networkResources: BaseResource[]
    unassignedResources: BaseResource[]
    vpcIcon: any
    internetGatewayIcon?: any
    endpointIcon?: any
    natGatewayIcon?: any
    elasticIpIcon?: any
    getSubnetsInAz: (azId: string) => any[]
    getResourcesInSubnet: (subnetId: string) => BaseResource[]
    getNatGatewayInSubnet: (subnetId: string) => BaseResource | null
    getSubnetIcon: (subnet: any) => any
    getResourceIcon: (resource: BaseResource) => any
    isSelected: (resource: BaseResource) => boolean
    getAttachedElasticIPs: (resource: BaseResource) => BaseResource[]
    getAzWidth: (az: any) => number
    getSubnetWidth: (subnet: any) => number
    getSubnetHeight: (subnet: any) => number
  }

  interface Emits {
    (e: 'igw-click', igw: BaseResource, event: MouseEvent): void
    (e: 'endpoint-click', endpoint: BaseResource, event: MouseEvent): void
    (e: 'resource-click', resource: BaseResource, event: MouseEvent): void
    (e: 'nat-gateway-click', natGateway: BaseResource, event: MouseEvent): void
    (e: 'network-click', network: BaseResource, event: MouseEvent): void
    (e: 'elastic-ip-click', eip: BaseResource): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
</script>

<style scoped>
.vpc-container {
  position: relative;
  border: 2px solid #8C4FFF;
  border-radius: 12px;
  background-color: rgba(140, 79, 255, 0.02);
  overflow: visible;
  container-type: inline-size;
}

.vpc-header {
  position: absolute;
  top: -1px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background-color: white;
  border: 2px solid #8C4FFF;
  border-radius: 8px;
  z-index: 10;
}

.vpc-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
}

.vpc-icon svg {
  width: 100%;
  height: 100%;
}

.vpc-label {
  font-size: 14px;
  font-weight: 600;
  color: #8C4FFF;
  white-space: nowrap;
}

.internet-gateway {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
}

.vpc-endpoints {
  position: absolute;
  right: -40px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 5;
}

.endpoint-item {
  width: 80px;
  height: 60px;
}

.availability-zones {
  display: flex;
  gap: 20px;
  padding: 40px 20px 20px 20px;
  height: calc(100% - 80px);
}

.az-container {
  display: flex;
  flex-direction: column;
  border: 1px dashed #0073bb;
  border-radius: 8px;
  background-color: rgba(0, 115, 187, 0.05);
  overflow: hidden;
}

.az-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  background-color: rgba(0, 115, 187, 0.1);
  border-bottom: 1px dashed #0073bb;
}

.az-label {
  font-size: 12px;
  font-weight: 600;
  color: #0073bb;
}

.az-subnets {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  flex: 1;
}

.network-resources {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  max-width: calc(100% - 280px);
}

.network-item {
  width: 100px;
  height: 60px;
}

.unassigned-resources {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 240px;
  background-color: #fff3cd;
  border: 1px dashed #ffc107;
  border-radius: 8px;
  padding: 12px;
}

.unassigned-header {
  font-size: 10px;
  font-weight: bold;
  color: #856404;
  margin-bottom: 8px;
  text-align: center;
}

.unassigned-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.unassigned-item {
  height: 50px;
}

/* Responsive adjustments */
@container (max-width: 600px) {
  .availability-zones {
    flex-direction: column;
    gap: 12px;
  }
  
  .az-container {
    width: 100% !important;
  }
  
  .unassigned-resources {
    position: relative;
    width: 100%;
    margin-top: 20px;
  }
  
  .network-resources {
    position: relative;
    max-width: 100%;
    margin-bottom: 20px;
  }
}

@container (max-width: 400px) {
  .vpc-header {
    left: 4px;
    padding: 2px 8px;
  }
  
  .vpc-icon {
    width: 16px;
    height: 16px;
  }
  
  .vpc-label {
    font-size: 12px;
  }
  
  .availability-zones {
    padding: 32px 12px 12px 12px;
  }
  
  .unassigned-grid {
    grid-template-columns: 1fr;
  }
}
</style>