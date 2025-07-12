<template>
  <div 
    class="subnet-container" 
    :class="[
      `subnet-${subnetType}`,
      { 'subnet-selected': selected }
    ]"
    :style="{ 
      width: `${width}px`, 
      height: `${height}px` 
    }"
  >
    <!-- Subnet Header -->
    <div class="subnet-header">
      <div class="subnet-icon">
        <component :is="subnetIcon" />
      </div>
      <div class="subnet-label" :style="{ color: subnetType === 'public' ? '#7AA116' : '#00A4A6' }">
        {{ label }}
      </div>
    </div>

    <!-- Subnet Content Area -->
    <div class="subnet-content">
      <!-- Resources Grid -->
      <div class="resources-grid" v-if="resources.length > 0">
        <div 
          v-for="(resource, index) in resources" 
          :key="resource.id"
          class="resource-slot"
        >
          <ServiceIcon
            :icon="getResourceIcon(resource)"
            :label="resource.name"
            :selected="isSelected(resource)"
            :variant="'resource'"
            :attached-elastic-i-ps="getAttachedElasticIPs(resource)"
            :elastic-ip-icon="elasticIpIcon"
            @click="(event) => $emit('resource-click', resource, event)"
            @elastic-ip-click="(eip) => $emit('elastic-ip-click', eip)"
          />
        </div>
      </div>

      <!-- NAT Gateway Area (for public subnets) -->
      <div v-if="subnetType === 'public' && natGateway" class="nat-gateway-area">
        <ServiceIcon
          :icon="natGatewayIcon"
          :label="natGateway.name"
          :selected="isSelected(natGateway)"
          :variant="'nat'"
          :attached-elastic-i-ps="getAttachedElasticIPs(natGateway)"
          :elastic-ip-icon="elasticIpIcon"
          @click="(event) => $emit('nat-gateway-click', natGateway, event)"
          @elastic-ip-click="(eip) => $emit('elastic-ip-click', eip)"
        />
      </div>

      <!-- Empty State -->
      <div v-if="resources.length === 0 && !natGateway" class="empty-subnet">
        <div class="empty-subnet-message">
          <span>リソースをドラッグしてください</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  import ServiceIcon from './ServiceIcon.vue'
  
  interface Props {
    label: string
    subnetType: 'public' | 'private'
    width: number
    height: number
    selected?: boolean
    resources: BaseResource[]
    natGateway?: BaseResource | null
    subnetIcon: any
    natGatewayIcon?: any
    elasticIpIcon?: any
    getResourceIcon: (resource: BaseResource) => any
    isSelected: (resource: BaseResource) => boolean
    getAttachedElasticIPs: (resource: BaseResource) => BaseResource[]
  }

  interface Emits {
    (e: 'resource-click', resource: BaseResource, event: MouseEvent): void
    (e: 'nat-gateway-click', natGateway: BaseResource, event: MouseEvent): void
    (e: 'elastic-ip-click', eip: BaseResource): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()
</script>

<style scoped>
.subnet-container {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s ease;
  container-type: inline-size;
}

.subnet-public {
  background-color: #F2F6E8;
  border: 2px solid rgba(122, 161, 22, 0.3);
}

.subnet-private {
  background-color: #E6F6F7;
  border: 2px solid rgba(0, 164, 166, 0.3);
}

.subnet-selected {
  border-color: #2196f3 !important;
  box-shadow: 0 0 0 2px rgba(33, 150, 243, 0.2);
}

.subnet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  min-height: 32px;
}

.subnet-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.subnet-icon svg {
  width: 100%;
  height: 100%;
}

.subnet-label {
  font-size: 12px;
  font-weight: 600;
  line-height: 1.2;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subnet-content {
  display: flex;
  padding: 12px;
  height: calc(100% - 32px);
  gap: 12px;
}

.resources-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  flex: 1;
  align-content: start;
  max-height: 100%;
  overflow: hidden;
}

.resource-slot {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60px;
  min-width: 80px;
}

.nat-gateway-area {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 80px;
  padding: 8px;
  background-color: rgba(255, 152, 0, 0.1);
  border: 1px dashed rgba(255, 152, 0, 0.5);
  border-radius: 6px;
}

.empty-subnet {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 80px;
}

.empty-subnet-message {
  padding: 16px;
  text-align: center;
  color: #666;
  font-size: 12px;
  font-style: italic;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.5);
}

/* Responsive grid adjustments */
@container (max-width: 300px) {
  .resources-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container (max-width: 200px) {
  .resources-grid {
    grid-template-columns: 1fr;
  }
  
  .subnet-content {
    flex-direction: column;
    gap: 8px;
  }
  
  .nat-gateway-area {
    min-width: auto;
  }
}

@container (max-width: 150px) {
  .subnet-header {
    padding: 4px 8px;
    min-height: 28px;
  }
  
  .subnet-icon {
    width: 16px;
    height: 16px;
  }
  
  .subnet-label {
    font-size: 10px;
  }
  
  .subnet-content {
    padding: 8px;
  }
}
</style>