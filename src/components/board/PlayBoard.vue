<template>
  <div class="svg-container" :class="{ 'fireworks-active': isFireworksActive }">
    <svg
      ref="svgRef"
      id="playboard-svg"
      class="playboard-canvas"
      :class="{ 'is-grabbing': isDragging }"
      @mousedown="startDrag"
      @mouseleave="endDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @wheel="onWheel"
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#333333" stroke-width="0.3"/>
        </pattern>
        <!-- 夜空のグラデーション -->
        <defs>
          <radialGradient id="nightSkyGradient" cx="50%" cy="30%">
            <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
            <stop offset="70%" style="stop-color:#0f0f1e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </radialGradient>
          <!-- 星の輝きエフェクト -->
          <filter id="starGlow">
            <feMorphology operator="dilate" radius="1"/>
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </defs>
      <!-- 花火モード時のみ夜空背景 -->
      <rect v-if="isFireworksActive" width="100%" height="100%" fill="url(#nightSkyGradient)" @click="clearSetting" style="cursor: default;" />
      <!-- 通常時は通常背景 -->
      <rect v-else width="100%" height="100%" fill="#f8f8f8" @click="clearSetting" style="cursor: default;" />
      <rect width="100%" height="100%" fill="url(#grid)" @click="clearSetting" style="cursor: default;" :style="{ opacity: isFireworksActive ? 0.1 : 0.2 }" />
      
      <!-- 星空レイヤー（花火モード時のみ表示） -->
      <g v-if="isFireworksActive" class="stars-layer">
        <!-- 大きな星 -->
        <circle cx="150" cy="80" r="2" fill="#FFFFFF" filter="url(#starGlow)" opacity="0.9">
          <animate attributeName="opacity" values="0.5;1;0.5" dur="3s" repeatCount="indefinite"/>
        </circle>
        <circle cx="400" cy="120" r="1.5" fill="#FFD700" filter="url(#starGlow)" opacity="0.8">
          <animate attributeName="opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="800" cy="90" r="2.5" fill="#E6E6FA" filter="url(#starGlow)" opacity="0.7">
          <animate attributeName="opacity" values="0.4;0.9;0.4" dur="4s" repeatCount="indefinite"/>
        </circle>
        <circle cx="1200" cy="110" r="1.8" fill="#FFFFFF" filter="url(#starGlow)" opacity="0.8">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- 中くらいの星 -->
        <circle cx="250" cy="150" r="1" fill="#FFFFFF" opacity="0.6"/>
        <circle cx="550" cy="170" r="1.2" fill="#FFD700" opacity="0.5">
          <animate attributeName="opacity" values="0.2;0.7;0.2" dur="6s" repeatCount="indefinite"/>
        </circle>
        <circle cx="920" cy="140" r="1" fill="#E6E6FA" opacity="0.7"/>
        <circle cx="1100" cy="180" r="1.3" fill="#FFFFFF" opacity="0.4">
          <animate attributeName="opacity" values="0.1;0.6;0.1" dur="5s" repeatCount="indefinite"/>
        </circle>
        
        <!-- 小さな星（散りばめ） -->
        <circle cx="320" cy="60" r="0.8" fill="#FFFFFF" opacity="0.4"/>
        <circle cx="480" cy="70" r="0.6" fill="#FFD700" opacity="0.3"/>
        <circle cx="680" cy="160" r="0.8" fill="#E6E6FA" opacity="0.5"/>
        <circle cx="780" cy="50" r="0.7" fill="#FFFFFF" opacity="0.3"/>
        <circle cx="1000" cy="200" r="0.9" fill="#FFD700" opacity="0.4"/>
        <circle cx="1300" cy="130" r="0.6" fill="#E6E6FA" opacity="0.3"/>
        <circle cx="1400" cy="70" r="0.8" fill="#FFFFFF" opacity="0.5"/>
        
        <!-- キラキラ星 -->
        <g transform="translate(600, 100)">
          <path d="M0,-8 L2,-2 L8,0 L2,2 L0,8 L-2,2 L-8,0 L-2,-2 Z" fill="#FFFFFF" opacity="0.6">
            <animateTransform attributeName="transform" type="rotate" values="0;360" dur="10s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite"/>
          </path>
        </g>
        
        <g transform="translate(1000, 60)">
          <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" fill="#FFD700" opacity="0.7">
            <animateTransform attributeName="transform" type="rotate" values="0;-360" dur="8s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" repeatCount="indefinite"/>
          </path>
        </g>
      </g>
      <g :transform="`translate(${offsetX} ${offsetY}) scale(${scale})`">
        <!-- 左側のグローバル・リージョナルサービスの表示 -->
        <g v-if="getLeftServices().length > 0" :transform="`translate(50, 50)`">
          <foreignObject 
            :width="getGlobalServicesDimensions().width"
            :height="getGlobalServicesDimensions().height"
            x="0" 
            y="0"
          >
            <div class="services-group global-services">
              <div class="services-group-header">
                <span class="services-group-title">グローバル・リージョナルサービス</span>
              </div>
              <div class="services-grid">
                <div 
                  v-for="service in getLeftServices()" 
                  :key="service.id"
                  class="service-item"
                >
                  <ServiceIcon
                    :icon="ICONS[service.type]?.component"
                    :label="service.name"
                    :selected="isSelected(service)"
                    :variant="'global'"
                    :style="getFireworksStyle(service.id)"
                    @click="(event) => toggleResourceSelection(service, event)"
                  />
                </div>
              </div>
            </div>
          </foreignObject>
        </g>
        
        <!-- 上部サービス（API Gateway、CloudFront等）の表示 -->
        <g v-if="getTopServices().length > 0" :transform="`translate(${50 + (getLeftServices().length > 0 ? getGlobalServicesDimensions().width + 50 : 0) + getTotalVpcWidth() / 2 - getTopServicesDimensions().width / 2}, 50)`">
          <foreignObject 
            :width="getTopServicesDimensions().width"
            :height="getTopServicesDimensions().height"
            x="0" 
            y="0"
          >
            <div class="services-group top-services">
              <div class="services-group-header">
                <span class="services-group-title">上位サービス</span>
              </div>
              <div class="services-grid horizontal">
                <div 
                  v-for="service in getTopServices()" 
                  :key="service.id"
                  class="service-item"
                >
                  <ServiceIcon
                    :icon="ICONS[service.type]?.component"
                    :label="service.name"
                    :selected="isSelected(service)"
                    :variant="'global'"
                    :style="getFireworksStyle(service.id)"
                    @click="(event) => toggleResourceSelection(service, event)"
                  />
                </div>
              </div>
            </div>
          </foreignObject>
        </g>

        <!-- VPCリストの表示 -->
        <g v-for="(vpc, index) in vpcList" :key="vpc.vpcId" :transform="`translate(${50 + (getLeftServices().length > 0 ? getGlobalServicesDimensions().width + 50 : 0) + vpcList.slice(0, index).reduce((sum, prevVpc) => sum + getVpcDimensions(prevVpc).width + 50, 0)}, ${50 + (getTopServices().length > 0 ? getTopServicesDimensions().height + 20 : 0)})`">
          <!-- VPC境界線のみ -->
          <rect
            fill="none"
            :stroke="'#8C4FFF'"
            stroke-width="1"
            :height="getVpcDimensions(vpc).height"
            :width="getVpcDimensions(vpc).width"
            x="0"
            y="0"
          />

          <!-- VPCアイコンとラベル (左上) -->
          <g>
            <foreignObject width="140" height="25" x="0" y="0">
              <div class="group-header" :style="getFireworksStyle(vpc.vpc.id)">
                <component :is="ICONS['vpc']?.component" class="group-icon" />
                <span class="group-label" style="color: #8C4FFF;">{{ vpc.vpc.name }}</span>
              </div>
            </foreignObject>
          </g>

          <!-- Internet Gateway (VPC境界線上部中央) -->
          <g v-for="igw in vpc.networks.filter(n => n.type === 'internet_gateway')" :key="igw.id" :transform="`translate(${getVpcDimensions(vpc).width / 2 - 50}, -20)`">
            <rect v-if="isSelected(igw)" x="-5" y="-5" width="110" height="60" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
            <foreignObject width="100" height="50" x="0" y="0" @click="toggleResourceSelection(igw, $event)" style="cursor: pointer;">
              <div class="icon-container gateway" :class="{ 'selected': isSelected(igw) }">
                <component :is="ICONS['internet_gateway']?.component" />
                <div class="icon-label">{{ igw.name }}</div>
              </div>
            </foreignObject>
          </g>

          <!-- VPC Endpoints (VPC境界線右側) -->
          <g v-for="(endpoint, endpointIndex) in vpc.networks.filter(n => n.type === 'endpoint')" :key="endpoint.id" :transform="`translate(${getVpcDimensions(vpc).width - 40}, ${(getVpcDimensions(vpc).height - (vpc.networks.filter(n => n.type === 'endpoint').length * 70 - 10)) / 2 + endpointIndex * 70})`">
            <rect v-if="isSelected(endpoint)" x="-5" y="-5" width="90" height="70" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
            <foreignObject width="80" height="60" x="0" y="0" @click="toggleResourceSelection(endpoint, $event)" style="cursor: pointer;">
              <div class="icon-container endpoint" :class="{ 'selected': isSelected(endpoint) }" :style="getFireworksStyle(endpoint.id)">
                <component :is="ICONS['endpoint']?.component" />
                <div class="icon-label small">{{ endpoint.name }}</div>
              </div>
            </foreignObject>
          </g>

          <!-- Availability Zones (横並び、境界線のみ) -->
          <g v-for="(az, azIndex) in vpc.availabilityZones" :key="az.id" :transform="`translate(${40 + vpc.availabilityZones.slice(0, azIndex).reduce((sum, prevAz) => sum + getAzDimensions(vpc, prevAz.id).width + 20, 0)}, 40)`">
            <!-- AZ境界線のみ -->
            <rect
              fill="none"
              :stroke="'#0073bb'"
              stroke-width="1"
              stroke-dasharray="6,3"
              :height="getAzDimensions(vpc, az.id).height"
              :width="getAzDimensions(vpc, az.id).width"
              x="0"
              y="0"
            />

            <!-- AZラベル (枠線上部中央) -->
            <text fill="#0073bb" font-size="12" font-weight="normal" :x="getAzDimensions(vpc, az.id).width / 2" y="12" text-anchor="middle">
              {{ az.name }}
            </text>

            <!-- Subnets within AZ (縦並び、背景色のみ) -->
            <g v-for="(subnet, subnetIndex) in getSubnetsInAz(vpc, az.id)" :key="subnet.id" :transform="`translate(15, ${30 + getSubnetsInAz(vpc, az.id).slice(0, subnetIndex).reduce((acc: number, s: any) => acc + getSubnetDimensions(vpc, s.id).height + 20, 0)})`">
              <!-- Subnet背景色（花火モード時は透明） -->
              <rect
                :fill="isFireworksActive ? 'transparent' : (subnet.type === 'public_subnet' ? '#F2F6E8' : '#E6F6F7')"
                :height="getSubnetDimensions(vpc, subnet.id).height"
                :width="getSubnetDimensions(vpc, subnet.id).width"
                x="0"
                y="0"
              />

              <!-- Subnetアイコンとラベル (左上) -->
              <g>
                <foreignObject width="280" height="25" x="0" y="0">
                  <div class="group-header" :style="getFireworksStyle(subnet.id)">
                    <component :is="ICONS[subnet.type]?.component" class="group-icon" />
                    <span class="group-label" :style="{ color: subnet.type === 'public_subnet' ? '#7AA116' : '#00A4A6' }">{{ subnet.name }}</span>
                  </div>
                </foreignObject>
              </g>


              <!-- Resources in Subnet (中央配置) -->
              <g v-if="getResourcesInSubnet(vpc, subnet.id).length > 0">
                <g v-for="(resource, resourceIndex) in getResourcesInSubnet(vpc, subnet.id)"
                   :key="resource.id"
                   :transform="`translate(${
                     (() => {
                       const resources = getResourcesInSubnet(vpc, subnet.id);
                       const subnetWidth = getSubnetDimensions(vpc, subnet.id).width;
                       const resourceWidth = 100;
                       const currentRow = Math.floor(resourceIndex / 3);
                       const resourcesInCurrentRow = Math.min(3, resources.length - currentRow * 3);
                       const totalRowWidth = resourcesInCurrentRow * resourceWidth;
                       const startX = (subnetWidth - totalRowWidth) / 2;
                       return startX + (resourceIndex % 3) * resourceWidth;
                     })()
                   }, ${40 + Math.floor(resourceIndex / 3) * 65})`">
                  <rect v-if="isSelected(resource)" x="-5" y="-5" width="110" height="70" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
                  <foreignObject width="100" height="60" x="0" y="0" @click="toggleResourceSelection(resource, $event)" style="cursor: pointer;">
                    <div class="icon-container resource" :class="{ 'selected': isSelected(resource) }" :style="getFireworksStyle(resource.id)">
                      <component :is="ICONS[resource.type]?.component" />
                      <div class="icon-label">{{ resource.name }}</div>
                    </div>
                  </foreignObject>
                  
                  <!-- ElasticIP attached to this resource -->
                  <g v-for="(eip, eipIndex) in getElasticIPs().filter(e => e.isAttached && e.attachedResourceId === resource.id)" 
                     :key="eip.id" 
                     :transform="`translate(${100 + eipIndex * 45}, 5)`">
                    <rect v-if="isSelected(eip)" x="-5" y="-5" width="50" height="55" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
                    <foreignObject width="40" height="50" x="0" y="0" @click="toggleResourceSelection(eip, $event)" style="cursor: pointer;">
                      <div class="icon-container elastic-ip-attached" :class="{ 'selected': isSelected(eip) }" :style="getFireworksStyle(eip.id)">
                        <component :is="ICONS['elastic_ip']?.component" />
                        <div class="icon-label tiny">{{ eip.name }}</div>
                      </div>
                    </foreignObject>
                  </g>
                </g>
              </g>

              <!-- Fargate Groups in Subnet (下部エリア) -->
              <g v-if="getFargateResourcesInSubnet(vpc, subnet.id).length > 0">
                <g v-for="(fargateResource, fargateIndex) in getFargateResourcesInSubnet(vpc, subnet.id)"
                   :key="fargateResource.id"
                   :transform="`translate(10, ${getSubnetDimensions(vpc, subnet.id).height - 110})`">
                  
                  <!-- Fargate Group Background (サブネットスタイル) -->
                  <rect
                    :width="getSubnetDimensions(vpc, subnet.id).width - 20"
                    height="100"
                    fill="transparent"
                    stroke="rgba(237, 113, 0, 0.4)"
                    stroke-width="1"
                    stroke-dasharray="3,2"
                    rx="0"
                    x="0"
                    y="0"
                  />
                  
                  <!-- Fargate Service Icon and Label (左上、サブネットスタイル) -->
                  <foreignObject width="280" height="20" x="0" y="0">
                    <div class="fargate-group-header">
                      <component :is="ICONS['fargate']?.component" class="fargate-group-icon" />
                      <span class="fargate-group-label">{{ fargateResource.name }}</span>
                    </div>
                  </foreignObject>
                  
                  <!-- Fargate Tasks (Containers) -->
                  <g v-for="(task, taskIndex) in fargateResource.fargate?.tasks || []"
                     :key="task.id"
                     :transform="`translate(${15 + taskIndex * 75}, 25)`">
                    
                    <rect v-if="isSelected(fargateResource)" x="-3" y="-3" width="76" height="66" fill="none" stroke="#2196f3" stroke-width="2" rx="0" class="selected-highlight" />
                    
                    <foreignObject width="70" height="60" x="0" y="0" @click="toggleResourceSelection(fargateResource, $event)" style="cursor: pointer;">
                      <div class="icon-container fargate-task" :class="{ 'selected': isSelected(fargateResource) }" :style="getFireworksStyle(fargateResource.id)">
                        <component :is="ICONS['container']?.component" />
                        <div class="icon-label fargate-task-label">{{ task.name }}</div>
                        <div class="task-features" v-if="task.container.feature">
                          <span class="feature-tag">
                            {{ task.container.feature.slice(0, 4) }}
                          </span>
                        </div>
                      </div>
                    </foreignObject>
                  </g>
                  
                </g>
              </g>

            </g>

          </g>


          <!-- Network Resources (outside AZ, IGWとEndpoint以外) -->
          <g v-for="(network, networkIndex) in vpc.networks.filter(n => !['internet_gateway', 'endpoint'].includes(n.type) && n.type !== 'nat_gateway')"
             :key="network.id"
             :transform="`translate(${20 + networkIndex * 120}, ${getVpcDimensions(vpc).height - 80})`">
            <rect v-if="isSelected(network)" x="-5" y="-5" width="110" height="70" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
            <foreignObject width="100" height="60" x="0" y="0" @click="toggleResourceSelection(network, $event)" style="cursor: pointer;">
              <div class="icon-container network" :class="{ 'selected': isSelected(network) }" :style="getFireworksStyle(network.id)">
                <component :is="ICONS[network.type]?.component" />
                <div class="icon-label">{{ network.name }}</div>
              </div>
            </foreignObject>
          </g>

          <!-- Unassigned Resources Section -->
          <g v-if="getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0"
             :transform="`translate(${getVpcDimensions(vpc).width - 280}, ${getVpcDimensions(vpc).height - 80})`">
            <rect
              fill="#fff3cd"
              stroke="#ffc107"
              stroke-width="1"
              stroke-dasharray="4,2"
              height="70"
              rx="4"
              width="260"
              x="0"
              y="0"
            />
            <text fill="#856404" font-size="10" font-weight="bold" x="8" y="-4">
              未割り当てリソース
            </text>

            <!-- Unassigned Resources -->
            <g v-for="(resource, resourceIndex) in [...getUnassignedComputes(vpc), ...getUnassignedDatabases(vpc)]"
               :key="resource.id"
               :transform="`translate(${10 + (resourceIndex % 2) * 130}, ${15})`">
              <rect v-if="isSelected(resource)" x="-5" y="-5" width="130" height="60" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
              <foreignObject width="120" height="50" x="0" y="0" @click="toggleResourceSelection(resource, $event)" style="cursor: pointer;">
                <div class="icon-container unassigned" :class="{ 'selected': isSelected(resource) }" :style="getFireworksStyle(resource.id)">
                  <component :is="ICONS[resource.type]?.component" />
                  <div class="icon-label">{{ resource.name }}</div>
                </div>
              </foreignObject>
            </g>
          </g>
        </g>
        
        <!-- ストレージサービス（VPCグループの下中央） -->
        <g v-if="getStorageServices().length > 0" :transform="`translate(${50 + (getLeftServices().length > 0 ? getGlobalServicesDimensions().width + 50 : 0) + getTotalVpcWidth() / 2 - getStorageServicesDimensions().width / 2}, ${50 + (getTopServices().length > 0 ? getTopServicesDimensions().height + 20 : 0) + Math.max(...vpcList.map(vpc => getVpcDimensions(vpc).height)) + 50})`">
          <foreignObject 
            :width="getStorageServicesDimensions().width"
            :height="getStorageServicesDimensions().height"
            x="0" 
            y="0"
          >
            <div class="services-group storage-services">
              <div class="services-group-header">
                <span class="services-group-title">ストレージサービス</span>
              </div>
              <div class="services-grid horizontal">
                <div 
                  v-for="service in getStorageServices()" 
                  :key="service.id"
                  class="service-item"
                >
                  <ServiceIcon
                    :icon="ICONS[service.type]?.component"
                    :label="service.name"
                    :selected="isSelected(service)"
                    :variant="'global'"
                    :style="getFireworksStyle(service.id)"
                    @click="(event) => toggleResourceSelection(service, event)"
                  />
                </div>
              </div>
            </div>
          </foreignObject>
        </g>
        
        <!-- 未アタッチのElasticIP（右側に表示） -->
        <g v-if="getUnattachedElasticIPs().length > 0" :transform="`translate(${50 + (getLeftServices().length > 0 ? getGlobalServicesDimensions().width + 50 : 0) + getTotalVpcWidth() + 50}, ${50 + (getTopServices().length > 0 ? getTopServicesDimensions().height + 20 : 0)})`">
          <!-- 未アタッチElasticIP枠 -->
          <rect
            fill="none"
            stroke="#FF9800"
            stroke-width="1"
            stroke-dasharray="5,5"
            :height="getUnattachedElasticIPsDimensions().height"
            :width="getUnattachedElasticIPsDimensions().width"
            x="0"
            y="0"
          />
          
          <!-- 未アタッチElasticIPタイトル -->
          <foreignObject width="200" height="25" x="0" y="0">
            <div class="group-header">
              <span class="group-label" style="color: #FF9800; font-weight: bold;">未アタッチElastic IP</span>
            </div>
          </foreignObject>
          
          <!-- 未アタッチElasticIP一覧 -->
          <g v-for="(eip, eipIndex) in getUnattachedElasticIPs()" :key="eip.id" 
             :transform="`translate(${20}, ${30 + eipIndex * 80})`">
            <rect v-if="isSelected(eip)" x="-5" y="-5" width="110" height="70" fill="none" stroke="#2196f3" stroke-width="3" rx="4" class="selected-highlight" />
            <foreignObject width="100" height="60" x="0" y="0" @click="toggleResourceSelection(eip, $event)" style="cursor: pointer;">
              <div class="icon-container elastic-ip" :class="{ 'selected': isSelected(eip) }" :style="getFireworksStyle(eip.id)">
                <component :is="ICONS['elastic_ip']?.component" />
                <div class="icon-label">{{ eip.name }}</div>
              </div>
            </foreignObject>
          </g>
        </g>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useVpcList } from '@/composables/useVpcList'
  import { useServiceList } from '@/composables/useServiceList'
  import { useInfo } from '@/composables/useInfo'
  import { ICONS } from '@/icons'
  import ServiceIcon from './ServiceIcon.vue'

  // イベントエミッターの定義
  const emit = defineEmits<{
    'fireworks-active': [isActive: boolean]
  }>()

  // Window型の拡張
  declare global {
    interface Window {
      triggerIconFireworks?: () => void
      particlesJS?: any
    }
  }

  const { vpcList } = useVpcList()
  const { services } = useServiceList()
  const { setting } = useInfo()

  // 花火エフェクト用の状態
  const isFireworksActive = ref(false)

  // 選択中のリソースかどうかを判定
  const isSelected = (resource: any) => {
    return setting.value?.id === resource.id
  }

  // サービスの分類
  const getStorageServices = () => {
    return services.value.filter(s => ['s3', 'dynamo_db'].includes(s.type))
  }
  
  const getTopServices = () => {
    return services.value.filter(s => ['api_gateway', 'cloudfront', 'route53'].includes(s.type))
  }
  
  const getLeftServices = () => {
    return services.value.filter(s => !['s3', 'dynamo_db', 'api_gateway', 'cloudfront', 'route53', 'elastic_ip'].includes(s.type))
  }
  
  const getElasticIPs = () => {
    return services.value.filter(s => s.type === 'elastic_ip')
  }
  
  const getUnattachedElasticIPs = () => {
    return services.value.filter(s => s.type === 'elastic_ip' && (!s.isAttached || !s.attachedResourceId))
  }

  // グローバルサービスのレイアウト計算
  const getGlobalServicesDimensions = () => {
    const serviceCount = getLeftServices().length
    if (serviceCount === 0) return { width: 0, height: 0 }
    
    const itemsPerRow = Math.min(6, serviceCount) // 最大6個まで横並び
    const rows = Math.ceil(serviceCount / itemsPerRow)
    const width = Math.max(300, itemsPerRow * 120 + 40) // 最小幅300px
    const height = rows * 80 + 60 // タイトル込み
    
    return { width, height }
  }
  
  // VPCグループ全体の幅を計算
  const getTotalVpcWidth = () => {
    if (vpcList.value.length === 0) return 0
    return vpcList.value.reduce((sum, vpc) => sum + getVpcDimensions(vpc).width + 50, 0) - 50
  }
  
  // 上部サービス用のレイアウト計算
  const getTopServicesDimensions = () => {
    const serviceCount = getTopServices().length
    if (serviceCount === 0) return { width: 0, height: 0 }
    
    const width = Math.max(300, serviceCount * 120 + 60)
    const height = 120 // 100px → 120px に増加（アイコンが見切れないように）
    
    return { width, height }
  }
  
  // 下部ストレージサービス用のレイアウト計算
  const getStorageServicesDimensions = () => {
    const serviceCount = getStorageServices().length
    if (serviceCount === 0) return { width: 0, height: 0 }
    
    const width = Math.max(300, serviceCount * 120 + 60)
    const height = 120 // 100px → 120px に増加（アイコンが見切れないように）
    
    return { width, height }
  }
  
  // 未アタッチElasticIP用のレイアウト計算
  const getUnattachedElasticIPsDimensions = () => {
    const eipCount = getUnattachedElasticIPs().length
    if (eipCount === 0) return { width: 0, height: 0 }
    
    const width = 140
    const height = eipCount * 80 + 50
    
    return { width, height }
  }
  
  
  // サブネット内のElasticIP数を取得（NAT Gatewayとリソースにアタッチされたもの）
  const getElasticIPsInSubnet = (vpc: any, subnetId: string) => {
    const resources = getResourcesInSubnet(vpc, subnetId)
    const natGateway = vpc.networks.find((n: any) => n.type === 'nat_gateway' && n.subnetId === subnetId)
    
    return getElasticIPs().filter(eip => {
      if (!eip.isAttached || !eip.attachedResourceId) return false
      // リソースにアタッチされたElasticIP
      const attachedToResource = resources.some(r => r.id === eip.attachedResourceId)
      // NAT GatewayにアタッチされたElasticIP
      const attachedToNatGateway = natGateway && natGateway.id === eip.attachedResourceId
      
      return attachedToResource || attachedToNatGateway
    })
  }

  // settingを解除する関数
  const clearSetting = () => {
    setting.value = null
  }

  // リソースクリック処理（選択/解除を切り替え）
  const toggleResourceSelection = (resource: any, event: Event) => {
    event.stopPropagation() // 背景のクリックイベントを防ぐ
    if (isSelected(resource)) {
      setting.value = null // 既に選択されている場合は解除
    } else {
      setting.value = resource // 選択されていない場合は選択
    }
  }

  // 未割り当てリソースを取得する関数
  const getUnassignedComputes = (vpc: any) => {
    return vpc.computes.filter((compute: any) =>
      !compute.subnetIds || compute.subnetIds.length === 0 ||
      compute.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId))
    ).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  const getUnassignedDatabases = (vpc: any) => {
    return vpc.databases.filter((database: any) =>
      !database.subnetIds || database.subnetIds.length === 0 ||
      database.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId))
    ).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  // 動的サイズ計算（Draw.io風レイアウト）
  const getVpcDimensions = (vpc: any) => {
    const azMargin = 20
    const headerHeight = 80
    const footerHeight = getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0 ? 100 : 20
    const padding = 20

    // 各AZの実際の幅を計算
    const azWidths = vpc.availabilityZones.map((az: any) => getAzDimensions(vpc, az.id).width)
    const totalAzWidth = azWidths.reduce((sum: number, width: number) => sum + width, 0)
    const totalMargins = (vpc.availabilityZones.length + 1) * azMargin

    const maxAzHeight = vpc.availabilityZones.length > 0 ?
      Math.max(...vpc.availabilityZones.map((az: any) => getAzDimensions(vpc, az.id).height)) : 200

    return {
      width: Math.max(400, totalAzWidth + totalMargins) + padding * 2,
      height: headerHeight + maxAzHeight + footerHeight + padding * 2
    }
  }

  const getAzDimensions = (vpc: any, azId: string) => {
    const subnets = getSubnetsInAz(vpc, azId)
    const headerHeight = 40
    const padding = 30
    const minHeight = 200

    // AZ内の最大サブネット幅を取得
    const maxSubnetWidth = Math.max(...subnets.map((subnet: any) => getSubnetDimensions(vpc, subnet.id).width), 250)

    // 各サブネットの実際の高さを計算
    let totalSubnetHeight = 0
    subnets.forEach((subnet: any) => {
      totalSubnetHeight += getSubnetDimensions(vpc, subnet.id).height + 20 // 20pxのマージン
    })

    return {
      width: maxSubnetWidth + 30, // サブネット幅 + パディング
      height: Math.max(minHeight, headerHeight + totalSubnetHeight + padding)
    }
  }

  const getSubnetsInAz = (vpc: any, azId: string) => {
    return vpc.subnets.filter((s: any) => s.azId === azId).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  const getResourcesInSubnet = (vpc: any, subnetId: string) => {
    const computes = vpc.computes.filter((c: any) => c.subnetIds.includes(subnetId) && c.type !== 'fargate')
    const databases = vpc.databases.filter((d: any) => d.subnetIds.includes(subnetId))
    const natGateways = vpc.networks.filter((n: any) => n.type === 'nat_gateway' && n.subnetId === subnetId)
    return [...computes, ...databases, ...natGateways].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  // Fargateリソースを取得
  const getFargateResourcesInSubnet = (vpc: any, subnetId: string) => {
    return vpc.computes.filter((c: any) => c.type === 'fargate' && c.subnetIds.includes(subnetId))
  }



  const getSubnetDimensions = (vpc: any, subnetId: string) => {
    const resources = getResourcesInSubnet(vpc, subnetId)
    const resourceRows = Math.ceil(resources.length / 3) // 3列配置
    const padding = 20
    
    // Fargateタスクの分の高さを計算
    const fargateResources = getFargateResourcesInSubnet(vpc, subnetId)
    const fargateHeight = fargateResources.length > 0 ? 120 : 0 // Fargateグループ1つあたり120px
    
    const minHeight = Math.max(100, 60 + resourceRows * 65 + padding + fargateHeight)

    const subnet = vpc.subnets.find((s: any) => s.id === subnetId)
    
    if (subnet) {
      // リソース配置幅を計算（3列まで）
      const resourceCols = Math.min(3, resources.length)
      const resourceAreaWidth = resourceCols > 0 ? resourceCols * 100 : 0
      
      // このサブネット内のElasticIP数を取得
      const elasticIPsInThisSubnet = getElasticIPsInSubnet(vpc, subnetId)
      
      // NAT Gatewayの存在確認
      const hasNatGateway = subnet.type === 'public_subnet' && vpc.networks.some((n: any) => n.type === 'nat_gateway' && n.subnetId === subnetId)
      
      // NAT GatewayとElasticIPが必要な幅を計算
      let natGatewayAreaWidth = 0
      if (hasNatGateway) {
        const natGatewayElasticIPs = elasticIPsInThisSubnet.filter(eip => {
          const natGateway = vpc.networks.find((n: any) => n.type === 'nat_gateway' && n.subnetId === subnetId)
          return natGateway && eip.attachedResourceId === natGateway.id
        })
        // NAT Gateway(80px) + ElasticIPs(45px each) + 左マージン(40px) + 右余白(20px)
        natGatewayAreaWidth = 80 + (natGatewayElasticIPs.length * 45) + 40 + 20
      }
      
      // リソースにアタッチされたElasticIPの幅
      const resourceElasticIPs = elasticIPsInThisSubnet.filter(eip => {
        const resources = getResourcesInSubnet(vpc, subnetId)
        return resources.some(r => r.id === eip.attachedResourceId)
      })
      const resourceElasticIPWidth = resourceElasticIPs.length * 45
      
      // 基本幅：左右パディング(40px) + リソース配置エリア + NAT Gatewayエリア + リソース用ElasticIP
      const calculatedWidth = 40 + resourceAreaWidth + natGatewayAreaWidth + resourceElasticIPWidth
      
      // 最小幅を確保
      const baseWidth = Math.max(320, calculatedWidth)
      
      // 同じAZ内のすべてのサブネットの最大幅を取得
      const subnetsInSameAz = getSubnetsInAz(vpc, subnet.azId)
      const maxWidthInAz = Math.max(baseWidth, ...subnetsInSameAz.map((s: any) => {
        const subnetResources = getResourcesInSubnet(vpc, s.id)
        const subnetResourceCols = Math.min(3, subnetResources.length)
        const subnetResourceAreaWidth = subnetResourceCols > 0 ? subnetResourceCols * 100 : 0
        
        const subnetElasticIPs = getElasticIPsInSubnet(vpc, s.id)
        const subnetHasNatGateway = s.type === 'public_subnet' && vpc.networks.some((n: any) => n.type === 'nat_gateway' && n.subnetId === s.id)
        
        let subnetNatGatewayAreaWidth = 0
        if (subnetHasNatGateway) {
          const natGatewayElasticIPs = subnetElasticIPs.filter(eip => {
            const natGateway = vpc.networks.find((n: any) => n.type === 'nat_gateway' && n.subnetId === s.id)
            return natGateway && eip.attachedResourceId === natGateway.id
          })
          subnetNatGatewayAreaWidth = 80 + (natGatewayElasticIPs.length * 45) + 40 + 20
        }
        
        const subnetResourceElasticIPs = subnetElasticIPs.filter(eip => {
          const resources = getResourcesInSubnet(vpc, s.id)
          return resources.some(r => r.id === eip.attachedResourceId)
        })
        const subnetResourceElasticIPWidth = subnetResourceElasticIPs.length * 45
        
        const subnetCalculatedWidth = 40 + subnetResourceAreaWidth + subnetNatGatewayAreaWidth + subnetResourceElasticIPWidth
        return Math.max(320, subnetCalculatedWidth)
      }))
      
      // 同じVPC内のすべてのサブネットの最大高さに合わせる
      const allSubnets = vpc.subnets
      const maxHeightInVpc = Math.max(...allSubnets.map((s: any) => {
        const subnetResources = getResourcesInSubnet(vpc, s.id)
        const subnetResourceRows = Math.ceil(subnetResources.length / 3)
        const subnetFargateResources = getFargateResourcesInSubnet(vpc, s.id)
        const subnetFargateHeight = subnetFargateResources.length > 0 ? 120 : 0
        return Math.max(100, 60 + subnetResourceRows * 65 + padding + subnetFargateHeight)
      }))

      return {
        width: maxWidthInAz + 20, // 安全マージン
        height: maxHeightInVpc
      }
    }

    return {
      width: 340,
      height: minHeight
    }
  }

  // --- リアクティブな状態定義 ---
  const isDragging = ref(false) // ドラッグ中かどうかのフラグ
  const offsetX = ref(0) // X方向のオフセット
  const offsetY = ref(0) // Y方向のオフセット
  const lastMouseX = ref(0) // 最後に記録したマウスのX座標
  const lastMouseY = ref(0) // 最後に記録したマウスのY座標
  const scale = ref(1);

  /**
   * ドラッグ開始時の処理
   */
  const startDrag = (event: MouseEvent) => {
    // 左クリック以外では処理しない
    if (event.button !== 0) return
    event.preventDefault()
    isDragging.value = true
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
  }

  /**
   * ドラッグ中の処理
   */
  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return
    event.preventDefault()

    // マウスの移動量を計算
    const deltaX = event.clientX - lastMouseX.value
    const deltaY = event.clientY - lastMouseY.value

    // オフセットを更新
    offsetX.value += deltaX
    offsetY.value += deltaY

    // 現在のマウス位置を保存
    lastMouseX.value = event.clientX
    lastMouseY.value = event.clientY
  }

  /**
   * ドラッグ終了時の処理
   */
  const endDrag = () => {
    isDragging.value = false
  }

  const onWheel = (event: WheelEvent) => {
    // ページのスクロールを防止
    event.preventDefault();

    const zoomSpeed = 0.1;
    const oldScale = scale.value;

    // ホイールの上下方向でスケールを計算
    if (event.deltaY < 0) {
      // 上にスクロール: ズームイン
      scale.value *= (1 + zoomSpeed);
    } else {
      // 下にスクロール: ズームアウト
      scale.value /= (1 + zoomSpeed);
    }

    // ズーム中心をマウスカーソルに合わせるためのオフセット調整
    // 1. マウスのSVGキャンバス上での座標を取得
    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    // 2. 新しいオフセットを計算
    //    (ズーム前のマウス位置とズーム後のマウス位置の差)
    offsetX.value = mouseX - (mouseX - offsetX.value) * (scale.value / oldScale);
    offsetY.value = mouseY - (mouseY - offsetY.value) * (scale.value / oldScale);
  };

  // ESCキーで選択解除
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setting.value = null
    }
  }

  // SVGアイコン花火エフェクト関数
  const triggerIconFireworks = () => {
    console.log('triggerIconFireworks called!')
    isFireworksActive.value = true
    emit('fireworks-active', true) // 親コンポーネントに通知
    
    // 各アイコンの位置を取得して花火エフェクトを作成
    const svgElement = document.getElementById('playboard-svg')
    if (!svgElement) return
    
    const iconContainers = svgElement.querySelectorAll('.icon-container, .group-header')
    console.log('Found icons:', iconContainers.length)
    
    // アイコンの配列をランダムにシャッフル
    const shuffledContainers = Array.from(iconContainers).sort(() => Math.random() - 0.5)
    
    shuffledContainers.forEach((container, index) => {
      const rect = container.getBoundingClientRect()
      
      // アイコンの中心位置を画面座標で計算
      const iconX = (rect.left + rect.width / 2) / window.innerWidth
      const iconY = (rect.top + rect.height / 2) / window.innerHeight
      
      // 各アイコンから花火を発射（ランダムな遅延で発射）
      const randomDelay = Math.random() * 300 + 100 // 100-400msのランダム遅延
      setTimeout(() => {
        // SVGアイコンをキャプチャしてパーティクル化
        const svgIcon = container.querySelector('svg')
        if (svgIcon) {
          triggerSVGParticleExplosion(iconX, iconY, svgIcon)
        } else {
          // SVGがない場合は通常の花火
          triggerSimpleFirework(iconX, iconY)
        }
      }, index * 150 + randomDelay) // 基本間隔150ms + ランダム遅延
    })
    
    // 花火終了後にリセット
    setTimeout(() => {
      isFireworksActive.value = false
      emit('fireworks-active', false) // 親コンポーネントに通知
    }, 6000)
  }
  
  // SVGアイコンを美しい花火として爆発させる
  const triggerSVGParticleExplosion = (x: number, y: number, svgElement: SVGElement) => {
    console.log('Creating beautiful firework from SVG:', svgElement)
    
    // 破壊音効果（Web Audio APIを使用）
    playExplosionSound()
    
    // SVGを破壊エフェクトで演出
    const container = svgElement.closest('.icon-container, .group-header')
    if (container) {
      // 爆発アニメーションを適用
      (container as HTMLElement).classList.add('exploding')
      
      // アニメーション終了後にクラスを削除
      setTimeout(() => {
        (container as HTMLElement).classList.remove('exploding')
        // 元の状態に戻す
        ;(container as HTMLElement).style.transform = ''
        ;(container as HTMLElement).style.opacity = ''
        ;(container as HTMLElement).style.filter = ''
      }, 3000)
    }
    
    // SVGからリソースの実際の色を抽出
    const resourceColors = extractSVGColors(svgElement)
    console.log('Extracted resource colors:', resourceColors)
    
    // 色が抽出できない場合はデフォルト色を使用
    const selectedColors = resourceColors.length > 0 ? resourceColors : [getSVGColor(svgElement)]
    
    // SVGの各要素を解析してパーティクル化
    const svgPaths = svgElement.querySelectorAll('path, circle, rect, polygon, ellipse')
    
    console.log('Found SVG elements:', svgPaths.length, 'Using colors:', selectedColors)
    
    // 中心から放射状に美しい花火を作成
    createRadialFireworkBurst(x, y, selectedColors, svgPaths.length)
    
    // 各SVG要素を個別の美しい花火として爆発
    svgPaths.forEach((pathElement, pathIndex) => {
      // 各要素の実際の色を取得
      const elementColor = getElementColor(pathElement) || selectedColors[pathIndex % selectedColors.length]
      
      // 各要素を美しい発光パーティクルに分解
      setTimeout(() => {
        createBeautifulFireworkElement(x, y, elementColor, pathIndex)
      }, pathIndex * 100 + 200) // より間隔を空けて、初期バーストの後に
    })
  }
  
  
  // 超小さく美しい放射状グロー花火バーストを作成
  const createRadialFireworkBurst = (x: number, y: number, colors: string[], intensity: number) => {
    const numRays = Math.min(4, 3 + Math.floor(intensity / 4)) // さらに少ない光線数
    
    for (let ray = 0; ray < numRays; ray++) {
      const angle = (ray * 360) / numRays
      const baseColor = colors[ray % colors.length]
      
      setTimeout(() => {
        if (window.confetti) {
          // 強いグロー効果のための色設定
          const rayColors = [
            baseColor,
            adjustColorBrightness(baseColor, 0.8), // 非常に明るく
            '#FFFFFF', // 純白の中心光
            baseColor + 'CC' // 半透明
          ]
          
          window.confetti({
            particleCount: 3, // さらに小さく制御
            angle: angle,
            spread: 12, // 狭い範囲でのグロー効果
            origin: { x, y },
            colors: rayColors,
            gravity: 0.25,
            scalar: 0.5, // 少し大きくしたサイズ
            startVelocity: 20, // 控えめな速度
            ticks: 150, // グロー時間
            shapes: ['circle']
          })
        }
      }, ray * 70) // 70ms間隔でゆっくり光線を発射
    }
  }
  
  // 超小さく美しいグロー花火要素を作成
  const createBeautifulFireworkElement = (x: number, y: number, color: string, elementIndex: number) => {
    const particleCount = 8 // さらに小さく
    
    for (let i = 0; i < particleCount; i++) {
      setTimeout(() => {
        if (window.confetti) {
          // 強いグロー効果のためのグラデーション
          const glowColors = [
            color,
            adjustColorBrightness(color, 0.8), // 非常に明るく
            '#FFFFFF', // 純白の中心
            '#FFFACD', // クリーム色のグロー
            color + 'DD' // 半透明
          ]
          
          window.confetti({
            particleCount: 1, // 1個ずつ繊細に
            angle: Math.random() * 360,
            spread: 25 + elementIndex * 5, // さらに小さい拡散範囲
            origin: { 
              x: x + (Math.random() - 0.5) * 0.02, // より細かい位置調整
              y: y + (Math.random() - 0.5) * 0.02 
            },
            colors: glowColors,
            gravity: 0.12 + Math.random() * 0.08, // 軽やかに浮遊
            scalar: 0.4 + Math.random() * 0.3, // 少し大きくしたサイズ
            drift: (Math.random() - 0.5) * 0.6, // 軽い風の効果
            ticks: 150 + Math.random() * 100, // グロー時間
            shapes: ['circle'], // 円形でグロー効果を最大化
            startVelocity: 15 + Math.random() * 10 // 控えめな初速
          })
        }
      }, i * 30) // 30ms間隔でゆっくり発射
    }
  }
  
  
  // SVGから全ての色を抽出
  const extractSVGColors = (svgElement: SVGElement): string[] => {
    const colors: string[] = []
    const elements = svgElement.querySelectorAll('*[fill], *[stroke]')
    
    elements.forEach(element => {
      const fill = element.getAttribute('fill')
      const stroke = element.getAttribute('stroke')
      
      if (fill && fill !== 'none' && fill !== 'transparent' && fill !== 'currentColor') {
        colors.push(fill)
      }
      if (stroke && stroke !== 'none' && stroke !== 'transparent' && stroke !== 'currentColor') {
        colors.push(stroke)
      }
    })
    
    // 重複を除去
    return [...new Set(colors)]
  }
  
  // 個別要素の色を取得
  const getElementColor = (element: Element): string | null => {
    const fill = element.getAttribute('fill')
    const stroke = element.getAttribute('stroke')
    
    if (fill && fill !== 'none' && fill !== 'transparent' && fill !== 'currentColor') {
      return fill
    }
    if (stroke && stroke !== 'none' && stroke !== 'transparent' && stroke !== 'currentColor') {
      return stroke
    }
    
    return null
  }
  
  // 色の明度を調整（グロー効果強化版）
  const adjustColorBrightness = (color: string, amount: number): string => {
    // HEXカラーのグロー効果強化調整
    if (color.startsWith('#') && color.length === 7) {
      const num = parseInt(color.substring(1), 16)
      let r = (num >> 16) & 0xFF
      let g = (num >> 8) & 0xFF
      let b = num & 0xFF
      
      if (amount > 0) {
        // 明るくする場合：より白に近づける（グロー効果）
        const factor = amount * 1.5 // グロー効果を強化
        r = Math.min(255, Math.round(r + (255 - r) * factor))
        g = Math.min(255, Math.round(g + (255 - g) * factor))
        b = Math.min(255, Math.round(b + (255 - b) * factor))
      } else {
        // 暗くする場合：より深い色に
        const factor = Math.abs(amount)
        r = Math.max(0, Math.round(r * (1 - factor)))
        g = Math.max(0, Math.round(g * (1 - factor)))
        b = Math.max(0, Math.round(b * (1 - factor)))
      }
      
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
    }
    return color
  }
  
  // 破壊音効果を生成
  const playExplosionSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // 爆発音の生成（ホワイトノイズベース）
      const duration = 0.3
      const sampleRate = audioContext.sampleRate
      const frameCount = sampleRate * duration
      const audioBuffer = audioContext.createBuffer(1, frameCount, sampleRate)
      const output = audioBuffer.getChannelData(0)
      
      // ホワイトノイズと減衰エンベロープで爆発音を作成
      for (let i = 0; i < frameCount; i++) {
        const decay = Math.pow(1 - i / frameCount, 2) // 指数的減衰
        const noise = (Math.random() * 2 - 1) * decay * 0.3 // 音量調整
        output[i] = noise
      }
      
      const source = audioContext.createBufferSource()
      const gainNode = audioContext.createGain()
      
      source.buffer = audioBuffer
      source.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // 音量フェード
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
      
      source.start(audioContext.currentTime)
    } catch (error) {
      console.log('Audio context not available:', error)
    }
  }
  
  // 超小さくて美しいグロー花火エフェクト
  const triggerSimpleFirework = (x: number, y: number) => {
    if (window.confetti) {
      // デフォルトのAWS色を使用
      const defaultColors = ['#FF9900', '#569A31', '#3F48CC', '#8C4FFF']
      const baseColor = defaultColors[Math.floor(Math.random() * defaultColors.length)]
      
      // 強いグロー効果のための色設定
      const glowColors = [
        baseColor,
        adjustColorBrightness(baseColor, 0.8),
        '#FFFFFF',
        '#FFFACD',
        baseColor + 'DD'
      ]
      
      // 超小さい中心からの美しい放射状花火
      window.confetti({
        particleCount: 12, // さらに小さく控えめ
        spread: 45, // より狭い範囲
        origin: { x, y },
        colors: glowColors,
        gravity: 0.35,
        scalar: 0.5, // 少し大きくしたサイズ
        startVelocity: 20, // 控えめな速度
        ticks: 150, // グロー時間
        shapes: ['circle']
      })
      
      // 追加の小さな煌めき効果
      setTimeout(() => {
        window.confetti({
          particleCount: 5,
          spread: 25, // より狭い範囲
          origin: { x, y },
          colors: ['#FFFFFF', baseColor + 'EE'],
          gravity: 0.2,
          scalar: 0.4, // 少し大きくしたサイズ
          startVelocity: 12,
          ticks: 120,
          shapes: ['circle']
        })
      }, 80)
    }
  }
  
  // SVGから主要な色を抽出（後方互換性のため残す）
  const getSVGColor = (svgElement: SVGElement): string => {
    // SVGの fill や stroke 属性から色を取得
    const fills = svgElement.querySelectorAll('[fill]:not([fill="none"]):not([fill="transparent"])')
    if (fills.length > 0) {
      const fillColor = fills[0].getAttribute('fill')
      if (fillColor && fillColor !== 'currentColor' && fillColor !== 'inherit') {
        return fillColor
      }
    }
    
    // AWS サービス色をデフォルトとして使用
    const serviceColors: { [key: string]: string } = {
      'ec2': '#FF9900',
      'lambda': '#FF9900',
      's3': '#569A31', 
      'rds': '#3F48CC',
      'vpc': '#8C4FFF',
      'api_gateway': '#FF4B4B',
      'cloudfront': '#FF4B4B',
      'route53': '#FF4B4B',
      'alb': '#F58536',
      'nat_gateway': '#F58536',
      'endpoint': '#4B80CC',
      'subnet': '#7AA116',
      'az': '#0073bb'
    }
    
    // SVGのクラス名から色を推定
    for (const [service, color] of Object.entries(serviceColors)) {
      if (svgElement.outerHTML.toLowerCase().includes(service)) {
        return color
      }
    }
    
    return '#2196f3' // デフォルト色
  }

  // アイコンのアニメーションスタイルを取得（未使用だが互換性のため残す）
  const getFireworksStyle = (_resourceId: string) => {
    return {}
  }


  // ライフサイクルフックでキーイベントを管理
  onMounted(() => {
    document.addEventListener('keydown', onKeyDown)
    // 花火エフェクトをグローバルに公開（PlayBoardがマウントされた後）
    window.triggerIconFireworks = triggerIconFireworks
    console.log('PlayBoard mounted, triggerIconFireworks registered')
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    // グローバル関数をクリーンアップ
    if (window.triggerIconFireworks) {
      delete window.triggerIconFireworks
    }
  })

</script>

<style scoped>

svg {
  width: 100%;
  height: 100%;
  cursor: grab;
  user-select: none; /* ドラッグ中にテキストが選択されるのを防ぐ */
}

svg.is-grabbing {
  cursor: grabbing;
}

.info-box {
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-family: sans-serif;
  font-size: 14px;
}

.icon-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
}

.icon-container.gateway {
  width: 100px;
  height: 50px;
}

.icon-container.nat {
  width: 80px;
  height: 60px;
}

.icon-container.resource {
  width: 100px;
  height: 60px;
}

.icon-container.endpoint {
  width: 80px;
  height: 60px;
}

.icon-container.network {
  width: 100px;
  height: 60px;
}

.icon-container.unassigned {
  width: 120px;
  height: 50px;
}

.icon-container.small {
  width: 40px;
  height: 40px;
}

.icon-container.fargate-task {
  width: 70px;
  height: 60px;
  background-color: transparent;
  border: none;
  border-radius: 0;
}

.task-features {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 2px;
  max-width: 65px;
}

.feature-tag {
  background-color: transparent;
  color: #ed7100;
  font-size: 6px;
  padding: 1px 3px;
  border: none;
  border-radius: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 30px;
}

.multi-subnet-indicator {
  font-size: 8px;
  color: rgba(237, 113, 0, 0.7);
  font-style: italic;
  margin-left: 8px;
}

/* Fargate Group Styles (サブネットスタイルに合わせて) */
.fargate-group-header {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 6px;
  background-color: transparent;
  height: 20px;
}

.fargate-group-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.fargate-group-label {
  font-size: 10px;
  font-weight: 600;
  color: #ed7100;
  line-height: 1;
}

.fargate-subnet-indicator {
  font-size: 9px;
  color: rgba(237, 113, 0, 0.7);
  font-weight: normal;
  margin-left: 4px;
}

.fargate-task-label {
  font-size: 8px;
  font-weight: 500;
  color: #424242;
  line-height: 1.1;
  margin-top: 1px;
}

.icon-container svg {
  width: 32px;
  height: 32px;
  margin-bottom: 2px;
}

.icon-container.small svg {
  width: 24px;
  height: 24px;
}

.icon-container.nat svg {
  width: 32px;
  height: 32px;
}

.icon-container.resource svg {
  width: 48px;
  height: 48px;
}

.icon-container.endpoint svg {
  width: 32px;
  height: 32px;
}

.icon-container.network svg {
  width: 48px;
  height: 48px;
}

.icon-container.unassigned svg {
  width: 48px;
  height: 48px;
}

.icon-label {
  font-size: 10px;
  font-weight: normal;
  color: #333;
  text-align: center;
  line-height: 1.2;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-label.small {
  font-size: 9px;
}

.icon-label.tiny {
  font-size: 8px;
}

/* Fargate Group Styles */
.fargate-group-header {
  display: flex;
  align-items: center;
  height: 100%;
}

.fargate-group-label {
  font-size: 12px;
  font-weight: bold;
  color: #ed7100;
  background-color: transparent;
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
}

.icon-container.fargate-task {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  width: 100%;
  height: 100%;
}

.icon-container.fargate-task svg {
  width: 24px;
  height: 24px;
  margin-bottom: 2px;
}

.task-features {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-top: 2px;
  max-width: 100%;
}

.feature-tag {
  font-size: 6px;
  background-color: rgba(33, 150, 243, 0.1);
  color: #1976d2;
  padding: 1px 3px;
  border-radius: 2px;
  border: 1px solid rgba(33, 150, 243, 0.2);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

p {
  margin: 0;
}

svg.is-grabbing {
  cursor: grabbing;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  background-color: transparent;
  font-size: 12px;
  font-weight: normal;
}

.group-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.group-label {
  white-space: nowrap;
  overflow: visible;
  text-overflow: unset;
}

.selected-highlight {
  animation: highlight-pulse 2s ease-in-out infinite;
}

@keyframes highlight-pulse {
  0% {
    stroke-opacity: 0.8;
  }
  50% {
    stroke-opacity: 0.4;
  }
  100% {
    stroke-opacity: 0.8;
  }
}

/* New HTML/CSS-based components */
.services-group {
  width: 100%;
  height: 100%;
  border: 2px dashed;
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 12px;
  box-sizing: border-box;
}

.services-group.global-services {
  border-color: #FF6B35;
  background-color: rgba(255, 107, 53, 0.05);
}

.services-group.top-services {
  border-color: #4CAF50;
  background-color: rgba(76, 175, 80, 0.05);
  border-radius: 0;
}

.services-group.storage-services {
  border-color: #9C27B0;
  background-color: rgba(156, 39, 176, 0.05);
  border-radius: 0;
}

.services-group-header {
  margin-bottom: 12px;
}

.services-group-title {
  font-size: 12px;
  font-weight: bold;
  color: inherit;
}

.services-group.global-services .services-group-title {
  color: #FF6B35;
}

.services-group.top-services .services-group-title {
  color: #4CAF50;
}

.services-group.storage-services .services-group-title {
  color: #9C27B0;
}

.services-grid {
  display: grid;
  gap: 8px;
  width: 100%;
  height: calc(100% - 32px);
}

.services-grid:not(.horizontal) {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  max-height: 100%;
  overflow: hidden;
}

.services-grid.horizontal {
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  grid-template-rows: 1fr;
}

.service-item {
  min-height: 60px;
  min-width: 80px;
}

/* NAT Gateway specific styling */
.nat-gateway-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 152, 0, 0.1);
  border: 2px dashed rgba(255, 152, 0, 0.5);
  border-radius: 8px;
  padding: 4px;
  box-sizing: border-box;
}

.icon-container.selected {
  background-color: rgba(33, 150, 243, 0.1);
  border-radius: 4px;
}

.icon-container.global-service {
  width: 100px;
  height: 60px;
}

.icon-container.elastic-ip {
  width: 60px;
  height: 60px;
}

.icon-container.elastic-ip-attached {
  width: 40px;
  height: 50px;
}

.icon-container.elastic-ip-attached svg {
  width: 18px;
  height: 18px;
}

/* 爆発エフェクト用のトランジション */
.icon-container, .group-header {
  transition: all 0.1s ease-out;
}

/* 爆発時のキーフレームアニメーション */
@keyframes explode {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  50% {
    transform: scale(1.3);
    filter: brightness(3) blur(3px);
  }
  100% {
    transform: scale(0.1);
    opacity: 0;
    filter: brightness(5) blur(5px);
  }
}

.exploding {
  animation: explode 0.5s ease-out forwards;
}

/* 花火モード時の夜空スタイル */
.svg-container.fireworks-active .services-group-title {
  color: #FFFFFF !important;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
  font-weight: bold;
}

.svg-container.fireworks-active .group-label {
  color: #FFFFFF !important;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.6);
}

.svg-container.fireworks-active .icon-label {
  color: #FFFFFF !important;
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.8);
  font-weight: 500;
}

.svg-container.fireworks-active .services-group {
  border-color: rgba(255, 255, 255, 0.2) !important;
  background-color: transparent !important;
}

/* 星空レイヤー */
.stars-layer {
  pointer-events: none;
  z-index: 1;
}

/* SVGコンテナ全体 */
.svg-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f8f8f8;
}

/* 花火モード時の夜空背景 */
.svg-container.fireworks-active {
  background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #000000 100%);
}

/* 花火ボタンも夜空に合わせてグロー効果 */
.fireworks-button {
  background: linear-gradient(135deg, #ff6b35, #ff9800) !important;
  box-shadow: 0 0 20px rgba(255, 107, 53, 0.5), 0 4px 12px rgba(165, 165, 165, 0.3) !important;
  color: white !important;
  border: 1px solid rgba(255, 255, 255, 0.3);
}


</style>
