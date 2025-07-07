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
      <g :transform="`translate(${offsetX} ${offsetY}) scale(${scale})`">
        <!-- VPCリストの表示 -->
        <g v-for="(vpc, index) in vpcList" :key="vpc.vpcId" :transform="`translate(${50 + index * 350}, 50)`">
          <!-- VPC背景（draw.ioスタイル） -->
          <rect
            fill="none"
            :stroke="'#ff9900'"
            stroke-width="3"
            stroke-dasharray="10,5"
            :height="80 + vpc.availabilityZones.length * 200 + (getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0 ? 120 : 0)"
            rx="10"
            width="320"
            x="0"
            y="0"
          />

          <!-- VPCラベル -->
          <rect
            fill="#ff9900"
            height="25"
            rx="3"
            width="80"
            x="10"
            y="-20"
          />
          <text fill="white" font-size="12" font-weight="bold" x="15" y="-5">
            VPC
          </text>
          <text fill="#ff9900" font-size="14" font-weight="bold" x="10" y="20">
            {{ vpc.vpc.name }}
          </text>

          <!-- Internet Gateway -->
          <g v-if="vpc.networks.some(n => n.type === 'internet_gateway')" :transform="`translate(260, -50)`">
            <foreignObject width="60" height="60" x="0" y="0">
              <div class="icon-container">
                <component :is="ICONS['internet_gateway']?.component" />
                <div class="icon-label">IGW</div>
              </div>
            </foreignObject>
          </g>

          <!-- Availability Zones -->
          <g v-for="(az, azIndex) in vpc.availabilityZones" :key="az.id" :transform="`translate(20, ${40 + azIndex * 200})`">
            <rect
              fill="none"
              :stroke="'#0073bb'"
              stroke-width="2"
              stroke-dasharray="5,3"
              height="180"
              rx="8"
              width="280"
              x="0"
              y="0"
            />
            <text fill="#0073bb" font-size="12" font-weight="bold" x="10" y="20">
              {{ az.name }}
            </text>

            <!-- Subnets within AZ -->
            <g v-for="(subnet, subnetIndex) in vpc.subnets.filter(s => s.azId === az.id)" :key="subnet.id" :transform="`translate(10, ${35 + subnetIndex * 80})`">
              <rect
                :fill="subnet.type === 'public_subnet' ? 'rgba(76,175,80,0.1)' : 'rgba(255,152,0,0.1)'"
                :stroke="subnet.type === 'public_subnet' ? '#4caf50' : '#ff9800'"
                stroke-width="2"
                height="70"
                rx="6"
                width="260"
                x="0"
                y="0"
              />

              <text :fill="subnet.type === 'public_subnet' ? '#4caf50' : '#ff9800'" font-size="11" font-weight="bold" x="5" y="15">
                {{ subnet.type === 'public_subnet' ? 'Public Subnet' : 'Private Subnet' }}
              </text>
              <text fill="#424242" font-size="10" x="5" y="30">
                {{ subnet.name }}
              </text>

              <!-- NAT Gateway for public subnets -->
              <g v-if="subnet.type === 'public_subnet' && vpc.networks.some(n => n.type === 'nat_gateway' && n.subnetId === subnet.id)" :transform="`translate(200, 40)`">
                <foreignObject width="50" height="50" x="0" y="0">
                  <div class="icon-container small">
                    <component :is="ICONS['nat_gateway']?.component" />
                    <div class="icon-label small">NAT</div>
                  </div>
                </foreignObject>
              </g>

              <!-- Compute Resources in Subnet -->
              <g v-for="(compute, computeIndex) in vpc.computes.filter(c => c.subnetIds.includes(subnet.id))"
                 :key="compute.id"
                 :transform="`translate(${10 + (computeIndex % 3) * 60}, ${25 + Math.floor(computeIndex / 3) * 40})`">
                <foreignObject width="50" height="50" x="0" y="0">
                  <div class="icon-container">
                    <component :is="ICONS[compute.type]?.component" />
                    <div class="icon-label">{{ compute.name.substring(0, 6) }}</div>
                  </div>
                </foreignObject>
              </g>

              <!-- Database Resources in Subnet -->
              <g v-for="(database, dbIndex) in vpc.databases.filter(d => d.subnetIds.includes(subnet.id))"
                 :key="database.id"
                 :transform="`translate(${10 + ((vpc.computes.filter(c => c.subnetIds.includes(subnet.id)).length + dbIndex) % 3) * 60}, ${25 + Math.floor((vpc.computes.filter(c => c.subnetIds.includes(subnet.id)).length + dbIndex) / 3) * 40})`">
                <foreignObject width="50" height="50" x="0" y="0">
                  <div class="icon-container">
                    <component :is="ICONS[database.type]?.component" />
                    <div class="icon-label">{{ database.name.substring(0, 6) }}</div>
                  </div>
                </foreignObject>
              </g>
            </g>
          </g>

          <!-- Network Resources (outside AZ) -->
          <g v-for="(network, networkIndex) in vpc.networks.filter(n => !['internet_gateway', 'nat_gateway'].includes(n.type))"
             :key="network.id"
             :transform="`translate(${20 + networkIndex * 70}, ${60 + vpc.availabilityZones.length * 200})`">
            <foreignObject width="60" height="60" x="0" y="0">
              <div class="icon-container">
                <component :is="ICONS[network.type]?.component" />
                <div class="icon-label">{{ network.name.substring(0, 8) }}</div>
              </div>
            </foreignObject>
          </g>

          <!-- Unassigned Resources Section -->
          <g v-if="getUnassignedComputes(vpc).length > 0 || getUnassignedDatabases(vpc).length > 0" 
             :transform="`translate(20, ${100 + vpc.availabilityZones.length * 200})`">
            <rect
              fill="rgba(255, 193, 7, 0.1)"
              stroke="#ffc107"
              stroke-width="2"
              stroke-dasharray="8,4"
              height="80"
              rx="6"
              width="280"
              x="0"
              y="0"
            />
            <text fill="#ffc107" font-size="12" font-weight="bold" x="10" y="20">
              未割り当てリソース
            </text>
            
            <!-- Unassigned Compute Resources -->
            <g v-for="(compute, computeIndex) in getUnassignedComputes(vpc)"
               :key="compute.id"
               :transform="`translate(${10 + (computeIndex % 4) * 60}, ${25})`">
              <foreignObject width="50" height="50" x="0" y="0">
                <div class="icon-container">
                  <component :is="ICONS[compute.type]?.component" />
                  <div class="icon-label">{{ compute.name.substring(0, 6) }}</div>
                </div>
              </foreignObject>
            </g>

            <!-- Unassigned Database Resources -->
            <g v-for="(database, dbIndex) in getUnassignedDatabases(vpc)"
               :key="database.id"
               :transform="`translate(${10 + ((getUnassignedComputes(vpc).length + dbIndex) % 4) * 60}, ${25})`">
              <foreignObject width="50" height="50" x="0" y="0">
                <div class="icon-container">
                  <component :is="ICONS[database.type]?.component" />
                  <div class="icon-label">{{ database.name.substring(0, 6) }}</div>
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

  const onWheel = (event) => {
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
  background-color: #f0f0f0;
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
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

.icon-label {
  font-size: 8px;
  font-weight: bold;
  color: #333;
  text-align: center;
  line-height: 1;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-label.small {
  font-size: 7px;
}

p {
  margin: 0;
}

svg.is-grabbing {
  cursor: grabbing;
}

</style>
