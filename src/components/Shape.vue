<template>
  <g 
    :transform="`translate(${shapeData.x}, ${shapeData.y})`"
    @mouseenter="emit('mouseenter', shapeData.id)"
    @mouseleave="emit('mouseleave', shapeData.id)"
  >
    <g @mousedown="onShapeMouseDown" style="cursor: move;">
      <!-- typeが 'rect' の場合 -->
      <g v-if="shapeData.type === 'rect'" :key="shapeData.id + '-rect'">
        <rect
          :width="shapeData.width"
          :height="shapeData.height"
          fill="lightblue"
          stroke="blue"
          stroke-width="2"
          rx="5"
        />
        <text
          :x="shapeData.width / 2"
          :y="shapeData.height / 2"
          text-anchor="middle"
          dominant-baseline="central"
          fill="black"
          style="pointer-events: none;"
        >
          {{ shapeData.text }}
        </text>
      </g>

      <!-- typeが 'image' の場合 -->
      <image
        v-else-if="shapeData.type === 'image'"
        :key="shapeData.id + '-image'"
        :href="shapeData.imageUrl"
        :width="shapeData.width"
        :height="shapeData.height"
      />
      
      <!-- typeが 'svg-component' の場合 -->
      <!-- ★修正点2: shapeData.component が存在する場合のみ描画する -->
      <g 
        v-else-if="shapeData.type === 'svg-component' && shapeData.component" 
        :key="shapeData.id + '-svg'"
        :style="{ color: shapeData.color }"
      >
        <component
          :is="shapeData.component"
          :width="shapeData.width"
          :height="shapeData.height"
          preserveAspectRatio="none"
        />
      </g>

    </g>

    <!-- アンカーポイント (共通ロジック) -->
    <g v-if="isHovered || isSelected">
      <circle
        v-for="(anchor, index) in shapeData.anchors"
        :key="index"
        :cx="shapeData.width * anchor.x"
        :cy="shapeData.height * anchor.y"
        r="6"
        fill="white"
        stroke="dodgerblue"
        stroke-width="2"
        style="cursor: crosshair;"
        @mousedown.stop="onAnchorMouseDown(index, $event)"
        @mouseup.stop="onAnchorMouseUp(index, $event)"
      />
    </g>
  </g>
</template>

<script setup>
const props = defineProps({
  shapeData: { type: Object, required: true },
  isHovered: { type: Boolean, default: false },
  isSelected: { type: Boolean, default: false },
});

const emit = defineEmits([
  'shape-mousedown',
  'anchor-mousedown',
  'anchor-mouseup',
  'mouseenter',
  'mouseleave'
]);

// 図形本体のドラッグ開始
const onShapeMouseDown = (event) => {
  // アンカーポイント上でのmousedownは伝播してこないので、ここでは図形本体のドラッグだけを考慮すればよい
  if (event.button !== 0) return;
  emit('shape-mousedown', props.shapeData.id, event);
};

// アンカーポイントから線を引き始める
const onAnchorMouseDown = (anchorIndex, event) => {
  if (event.button !== 0) return;
  emit('anchor-mousedown', props.shapeData.id, anchorIndex, event);
};

// アンカーポイントで線を接続する
const onAnchorMouseUp = (anchorIndex, event) => {
  if (event.button !== 0) return;
  emit('anchor-mouseup', props.shapeData.id, anchorIndex, event);
};
</script>