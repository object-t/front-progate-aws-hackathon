<template>
  <div 
    class="service-icon-container" 
    :class="[
      `service-icon-${variant}`,
      { 'service-icon-selected': selected },
      { 'service-icon-hoverable': !disabled }
    ]"
    @click="handleClick"
  >
    <div class="service-icon-wrapper">
      <div class="service-icon">
        <component :is="icon" />
      </div>
      <div class="service-label" :class="{ [`service-label-${labelSize}`]: labelSize }">
        {{ label }}
      </div>
    </div>
    
    <!-- Elastic IP indicators for attached resources -->
    <div v-if="attachedElasticIPs && attachedElasticIPs.length > 0" class="elastic-ip-indicators">
      <div 
        v-for="(eip, index) in attachedElasticIPs" 
        :key="eip.id"
        class="elastic-ip-indicator"
        @click.stop="$emit('elastic-ip-click', eip)"
      >
        <component :is="elasticIpIcon" />
        <span class="elastic-ip-label">{{ eip.name }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import type { BaseResource } from '@/types/service.ts'
  
  interface Props {
    icon: any
    label: string
    selected?: boolean
    disabled?: boolean
    variant?: 'default' | 'global' | 'network' | 'resource' | 'nat' | 'endpoint' | 'unassigned'
    labelSize?: 'default' | 'small' | 'tiny'
    attachedElasticIPs?: BaseResource[]
    elasticIpIcon?: any
  }

  interface Emits {
    (e: 'click', event: MouseEvent): void
    (e: 'elastic-ip-click', eip: BaseResource): void
  }

  const props = withDefaults(defineProps<Props>(), {
    selected: false,
    disabled: false,
    variant: 'default',
    labelSize: 'default'
  })

  const emit = defineEmits<Emits>()

  const handleClick = (event: MouseEvent) => {
    if (!props.disabled) {
      emit('click', event)
    }
  }
</script>

<style scoped>
.service-icon-container {
  display: flex;
  align-items: center;
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 60px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
}

.service-icon-hoverable {
  cursor: pointer;
}

.service-icon-hoverable:hover {
  background-color: rgba(33, 150, 243, 0.1);
  transform: translateY(-2px);
}

.service-icon-selected {
  background-color: rgba(33, 150, 243, 0.15) !important;
  border: 2px solid #2196f3 !important;
}

.service-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 4px;
}

.service-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
}

.service-icon svg {
  width: 100%;
  height: 100%;
  max-width: 40px;
  max-height: 40px;
}

.service-label {
  font-size: 10px;
  font-weight: 500;
  text-align: center;
  color: #424242;
  line-height: 1.2;
  word-wrap: break-word;
  hyphens: auto;
  max-width: 100%;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.service-label-small {
  font-size: 9px;
  -webkit-line-clamp: 1;
}

.service-label-tiny {
  font-size: 8px;
  -webkit-line-clamp: 1;
}

/* Variant styles */
.service-icon-global {
  padding: 8px;
}

.service-icon-network {
  padding: 6px;
}

.service-icon-resource {
  padding: 8px;
}

.service-icon-nat {
  padding: 6px;
  background-color: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.service-icon-endpoint {
  padding: 4px;
}

.service-icon-unassigned {
  padding: 6px;
  background-color: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
}

/* Elastic IP indicators */
.elastic-ip-indicators {
  position: absolute;
  right: -45px;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.elastic-ip-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 45px;
  background-color: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding: 2px;
}

.elastic-ip-indicator:hover {
  background-color: rgba(255, 152, 0, 0.2);
  transform: scale(1.05);
}

.elastic-ip-indicator svg {
  width: 20px;
  height: 20px;
}

.elastic-ip-label {
  font-size: 7px;
  color: #e65100;
  text-align: center;
  line-height: 1;
  word-break: break-all;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

/* Responsive adjustments */
@container (max-width: 80px) {
  .service-icon {
    width: 30px;
    height: 30px;
  }
  
  .service-icon svg {
    max-width: 30px;
    max-height: 30px;
  }
  
  .service-label {
    font-size: 8px;
  }
}

@container (max-width: 60px) {
  .service-icon {
    width: 24px;
    height: 24px;
  }
  
  .service-icon svg {
    max-width: 24px;
    max-height: 24px;
  }
  
  .service-label {
    font-size: 7px;
    -webkit-line-clamp: 1;
  }
}
</style>