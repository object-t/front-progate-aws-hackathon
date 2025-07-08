<template>
  <div class="svg-container">
    <svg
      ref="svgRef"
      :class="{ 'is-grabbing': isDragging }"
      @mousedown="startDrag"
      @mouseleave="endDrag"
      @mousemove="onDrag"
      @mouseup="endDrag"
      @wheel="onWheel"
    >
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <g :transform="`translate(${offsetX} ${offsetY}) scale(${scale})`">
        <!-- VPCリストの表示 -->
        <g v-for="(vpc, index) in vpcList" :key="vpc.vpcId" :transform="`translate(${50 + index * (getVpcDimensions(vpc).width + 50)}, 50)`">
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
              <div class="group-header">
                <component :is="ICONS['vpc']?.component" class="group-icon" />
                <span class="group-label" style="color: #8C4FFF;">{{ vpc.vpc.name }}</span>
              </div>
            </foreignObject>
          </g>

          <!-- Internet Gateway (VPC境界線上部中央) -->
          <g v-if="vpc.networks.some(n => n.type === 'internet_gateway')" :transform="`translate(${getVpcDimensions(vpc).width / 2 - 35}, -20)`">
            <foreignObject width="70" height="50" x="0" y="0">
              <div class="icon-container gateway">
                <component :is="ICONS['internet_gateway']?.component" />
                <div class="icon-label">IGW</div>
              </div>
            </foreignObject>
          </g>

          <!-- VPC Endpoints (VPC境界線右側) -->
          <g v-for="(endpoint, endpointIndex) in vpc.networks.filter(n => n.type === 'endpoint')" :key="endpoint.id" :transform="`translate(${getVpcDimensions(vpc).width - 40}, ${100 + endpointIndex * 70})`">
            <foreignObject width="80" height="60" x="0" y="0">
              <div class="icon-container endpoint">
                <component :is="ICONS['endpoint']?.component" />
                <div class="icon-label small">{{ endpoint.serviceEndpoint || 'Endpoint' }}</div>
              </div>
            </foreignObject>
          </g>

          <!-- Availability Zones (横並び、境界線のみ) -->
          <g v-for="(az, azIndex) in vpc.availabilityZones" :key="az.id" :transform="`translate(${40 + azIndex * 300}, 40)`">
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
              <!-- Subnet背景色 -->
              <rect
                :fill="subnet.type === 'public_subnet' ? '#F2F6E8' : '#E6F6F7'"
                :height="getSubnetDimensions(vpc, subnet.id).height"
                :width="getSubnetDimensions(vpc, subnet.id).width"
                x="0"
                y="0"
              />

              <!-- Subnetアイコンとラベル (左上) -->
              <g>
                <foreignObject width="180" height="25" x="0" y="0">
                  <div class="group-header">
                    <component :is="ICONS[subnet.type]?.component" class="group-icon" />
                    <span class="group-label" :style="{ color: subnet.type === 'public_subnet' ? '#7AA116' : '#00A4A6' }">{{ subnet.name }}</span>
                  </div>
                </foreignObject>
              </g>

              <!-- NAT Gateway for public subnets -->
              <g v-if="subnet.type === 'public_subnet' && vpc.networks.some(n => n.type === 'nat_gateway' && n.subnetId === subnet.id)" :transform="`translate(180, ${(getSubnetDimensions(vpc, subnet.id).height - 60) / 2})`">
                <foreignObject width="80" height="60" x="0" y="0">
                  <div class="icon-container nat">
                    <component :is="ICONS['nat_gateway']?.component" />
                    <div class="icon-label">{{ vpc.networks.find(n => n.type === 'nat_gateway' && n.subnetId === subnet.id)?.name || 'NAT Gateway' }}</div>
                  </div>
                </foreignObject>
              </g>

              <!-- Resources in Subnet (中央配置) -->
              <g v-if="getResourcesInSubnet(vpc, subnet.id).length > 0">
                <g v-for="(resource, resourceIndex) in getResourcesInSubnet(vpc, subnet.id)"
                   :key="resource.id"
                   :transform="`translate(${getSubnetDimensions(vpc, subnet.id).width / 2 - 50 + (resourceIndex % 2 - 0.5) * 100}, ${(getSubnetDimensions(vpc, subnet.id).height - (Math.ceil(getResourcesInSubnet(vpc, subnet.id).length / 2) * 65 - 5)) / 2 + Math.floor(resourceIndex / 2) * 65})`">
                  <foreignObject width="100" height="60" x="0" y="0">
                    <div class="icon-container resource">
                      <component :is="ICONS[resource.type]?.component" />
                      <div class="icon-label">{{ resource.name }}</div>
                    </div>
                  </foreignObject>
                </g>
              </g>
            </g>
          </g>

          <!-- Network Resources (outside AZ, IGWとEndpoint以外) -->
          <g v-for="(network, networkIndex) in vpc.networks.filter(n => !['internet_gateway', 'nat_gateway', 'endpoint'].includes(n.type))"
             :key="network.id"
             :transform="`translate(${20 + networkIndex * 120}, ${getVpcDimensions(vpc).height - 80})`">
            <foreignObject width="100" height="60" x="0" y="0">
              <div class="icon-container network">
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
              <foreignObject width="120" height="50" x="0" y="0">
                <div class="icon-container unassigned">
                  <component :is="ICONS[resource.type]?.component" />
                  <div class="icon-label">{{ resource.name }}</div>
                </div>
              </foreignObject>
            </g>
          </g>
        </g>
      </g>
    </svg>
    <div class="info-box">
      <p>ドラッグしてキャンバスを移動できます</p>
      <p>座標: ({{ -Math.round(offsetX) }}, {{ -Math.round(offsetY) }})</p>
      <p>VPC数: {{ vpcList.length }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref } from 'vue'
  import { useVpcList } from '@/composables/useVpcList'
  import { ICONS } from '@/icons'

  const { vpcList } = useVpcList()

  // 未割り当てリソースを取得する関数
  const getUnassignedComputes = (vpc: any) => {
    return vpc.computes.filter((compute: any) =>
      !compute.subnetIds || compute.subnetIds.length === 0 ||
      compute.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId))
    )
  }

  const getUnassignedDatabases = (vpc: any) => {
    return vpc.databases.filter((database: any) =>
      !database.subnetIds || database.subnetIds.length === 0 ||
      database.subnetIds.every((subnetId: string) => !vpc.subnets.some((subnet: any) => subnet.id === subnetId))
    )
  }

  // 動的サイズ計算（Draw.io風レイアウト）
  const getVpcDimensions = (vpc: any) => {
    const azWidth = 300
    const azMargin = 20
    const headerHeight = 80
    const footerHeight = getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0 ? 100 : 20
    const maxAzHeight = vpc.availabilityZones.length > 0 ?
      Math.max(...vpc.availabilityZones.map((az: any) => getAzDimensions(vpc, az.id).height)) : 200
    const padding = 20

    return {
      width: Math.max(400, Math.max(1, vpc.availabilityZones.length) * azWidth + (Math.max(1, vpc.availabilityZones.length) + 1) * azMargin) + padding * 2,
      height: headerHeight + maxAzHeight + footerHeight + padding * 2
    }
  }

  const getAzDimensions = (vpc: any, azId: string) => {
    const subnets = getSubnetsInAz(vpc, azId)
    const headerHeight = 40
    const padding = 30
    const minHeight = 200

    // 各サブネットの実際の高さを計算
    let totalSubnetHeight = 0
    subnets.forEach((subnet: any) => {
      totalSubnetHeight += getSubnetDimensions(vpc, subnet.id).height + 20 // 20pxのマージン
    })

    return {
      width: 280,
      height: Math.max(minHeight, headerHeight + totalSubnetHeight + padding)
    }
  }

  const getSubnetsInAz = (vpc: any, azId: string) => {
    return vpc.subnets.filter((s: any) => s.azId === azId).sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  }

  const getResourcesInSubnet = (vpc: any, subnetId: string) => {
    const computes = vpc.computes.filter((c: any) => c.subnetIds.includes(subnetId))
    const databases = vpc.databases.filter((d: any) => d.subnetIds.includes(subnetId))
    return [...computes, ...databases]
  }

  const getSubnetDimensions = (vpc: any, subnetId: string) => {
    const resources = getResourcesInSubnet(vpc, subnetId)
    const resourceRows = Math.ceil(resources.length / 2) // 2列配置に変更
    const padding = 20
    const minHeight = Math.max(100, 60 + resourceRows * 65 + padding) // リソースの高さに合わせて調整

    // 同じAZ内のすべてのサブネットの最大高さに合わせる
    const subnet = vpc.subnets.find((s: any) => s.id === subnetId)
    if (subnet) {
      const subnetsInSameAz = getSubnetsInAz(vpc, subnet.azId)
      const maxHeightInAz = Math.max(...subnetsInSameAz.map((s: any) => {
        const subnetResources = getResourcesInSubnet(vpc, s.id)
        const subnetResourceRows = Math.ceil(subnetResources.length / 2)
        return Math.max(100, 60 + subnetResourceRows * 65 + padding)
      }))

      return {
        width: 250,
        height: maxHeightInAz
      }
    }

    return {
      width: 250,
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

</script>

<style scoped>
.svg-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden; /* コンテナからはみ出さないように */
  background-color: #f8f8f8;
}

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
  width: 70px;
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
  word-wrap: break-word;
  hyphens: auto;
}

.icon-label.small {
  font-size: 9px;
}

.icon-label.tiny {
  font-size: 8px;
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
  overflow: hidden;
  text-overflow: ellipsis;
}

</style>
