<template>
  <svg 
    ref="svgRef"
    :width="svgWidth" 
    :height="svgHeight" 
    :viewBox="viewBoxString"
    @mousemove="handleMouseMove" 
    @mousedown="handleCanvasMouseDown"
    @mouseup="handleCanvasMouseUp" 
    @mouseleave="handleCanvasMouseUp"
    @wheel.prevent="handleWheel"
    @contextmenu.prevent
    @keydown.delete="deleteSelectedLine"
    @keydown.backspace="deleteSelectedLine"
    tabindex="0"
    style="border: 1px solid #ccc; user-select: none; cursor: grab; background-color: white;"
  >
    <defs>
      <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
        <polygon points="0 0, 10 3.5, 0 7" fill="black" />
      </marker>
    </defs>
    
    <!-- 確定した線 -->
    <g>
      <path 
        v-for="line in lines" 
        :key="line.id" 
        :d="getLinePath(line)" 
        :stroke="selectedLineId === line.id ? 'red' : 'black'"
        :stroke-width="selectedLineId === line.id ? 3 : 2"
        fill="none" 
        marker-end="url(#arrowhead)"
        @click.stop="selectLine(line.id)"
        style="cursor: pointer;"
      />
    </g>

    <!-- 描画中の一時的な線 -->
    <path
      v-if="drawingLineState"
      :d="getTemporaryLinePath()"
      stroke="dodgerblue"
      stroke-width="2"
      stroke-dasharray="5,5"
      fill="none"
      style="pointer-events: none;"
    />

    <!-- 図形 -->
    <g>
      <Shape
        v-for="shape in shapes"
        :key="shape.id"
        :shape-data="shape"
        :is-hovered="hoveredShapeId === shape.id"
        :is-selected="drawingLineState?.from.shapeId === shape.id"
        @shape-mousedown="handleShapeMouseDown"
        @anchor-mousedown="handleAnchorMouseDown"
        @anchor-mouseup="handleAnchorMouseUp"
        @mouseenter="hoveredShapeId = $event"
        @mouseleave="hoveredShapeId = null"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, computed, shallowRef, onMounted, onBeforeUnmount } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import Shape from './Shape.vue';
import { ICONS } from '@/icons';

const svgRef = ref(null);

// --- SVGサイズとViewBox ---
const svgWidth = ref(window.innerWidth);
const svgHeight = ref(window.innerHeight);
const viewBox = ref({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });

// --- データ定義 ---
const shapes = ref([
  { 
    id: 'shape1', type: 'rect',
    x: 150, y: 150, width: 150, height: 80, text: 'Rect Shape 1',
    anchors: [ {x: 0.5, y: 0}, {x: 0.5, y: 1}, {x: 0, y: 0.5}, {x: 1, y: 0.5} ] 
  },
  { 
    id: 'shape2', type: 'rect',
    x: 500, y: 300, width: 150, height: 80, text: 'Rect Shape 2',
    anchors: [ {x: 0.5, y: 0}, {x: 0.5, y: 1}, {x: 0, y: 0.5}, {x: 1, y: 0.5} ] 
  },
  {
    id: 'svgComp1', type: 'svg-component',
    x: 400, y: 500, width: 80, height: 80,
    component: shallowRef(ICONS.lambda.component),
    color: '#ED7100',
    anchors: [ {x: 0.5, y: 0}, {x: 0.5, y: 1}, {x: 0, y: 0.5}, {x: 1, y: 0.5} ] 
  },
]);

const lines = ref([
  { id: 'line1', from: { shapeId: 'shape1', anchorIndex: 3 }, to: { shapeId: 'shape2', anchorIndex: 2 } },
]);

// --- 状態管理 ---
const draggingState = ref(null);
const drawingLineState = ref(null);
const selectedLineId = ref(null);
const hoveredShapeId = ref(null);

// --- computed ---
const viewBoxString = computed(() => `${viewBox.value.x} ${viewBox.value.y} ${viewBox.value.width} ${viewBox.value.height}`);
const zoomLevel = computed(() => svgWidth.value / viewBox.value.width);

// --- ヘルパー関数 ---
const getSVGCoordinates = (event) => {
  if (!svgRef.value) return { x: 0, y: 0 };
  const pt = svgRef.value.createSVGPoint();
  pt.x = event.clientX; pt.y = event.clientY;
  const screenCTM = svgRef.value.getScreenCTM();
  return screenCTM ? pt.matrixTransform(screenCTM.inverse()) : pt;
};

const getAnchorAbsolutePosition = (shapeId, anchorIndex) => {
  const shape = shapes.value.find(s => s.id === shapeId);
  if (!shape) return null;
  const anchor = shape.anchors[anchorIndex];
  return {
    x: shape.x + shape.width * anchor.x,
    y: shape.y + shape.height * anchor.y,
  };
};

// --- イベントハンドラ (マウス操作) ---
const handleShapeMouseDown = (shapeId, event) => {
  if (event.button !== 0) return; // 左クリックでのみ図形をドラッグ
  if (drawingLineState.value) return;
  
  const shape = shapes.value.find(s => s.id === shapeId);
  const startCoords = getSVGCoordinates(event);
  draggingState.value = {
    type: 'shape', shapeId,
    startX: startCoords.x, startY: startCoords.y,
    shapeStartX: shape.x, shapeStartY: shape.y,
  };
};

const handleCanvasMouseDown = (event) => {
  if (event.button === 0) { // 左クリック
    selectedLineId.value = null; // 背景クリックで選択解除
  } else if (event.button === 2) { // 右クリック (パン開始)
    const startCoords = getSVGCoordinates(event);
    draggingState.value = {
      type: 'canvas',
      startX: startCoords.x,
      startY: startCoords.y,
    };
    svgRef.value.style.cursor = 'grabbing';
  }
};

const handleMouseMove = (event) => {
  // 線描画中のカーソル追従
  if (drawingLineState.value) {
    drawingLineState.value.tempEndPoint = getSVGCoordinates(event);
  }

  // ドラッグ状態でない場合は何もしない
  if (!draggingState.value) return;

  const currentCoords = getSVGCoordinates(event);
  const dx = currentCoords.x - draggingState.value.startX;
  const dy = currentCoords.y - draggingState.value.startY;

  if (draggingState.value.type === 'shape') {
    const shape = shapes.value.find(s => s.id === draggingState.value.shapeId);
    if (shape) {
      shape.x = draggingState.value.shapeStartX + dx;
      shape.y = draggingState.value.shapeStartY + dy;
    }
  } else if (draggingState.value.type === 'canvas') {
    // 右ドラッグでのパン処理
    viewBox.value.x -= dx;
    viewBox.value.y -= dy;
  }
};

const handleCanvasMouseUp = (event) => {
  // パン操作の後処理
  if (draggingState.value?.type === 'canvas' && event.button === 2) {
    svgRef.value.style.cursor = 'grab';
  }
  
  // 線描画中に背景でマウスアップしたら描画キャンセル
  if (drawingLineState.value) {
    drawingLineState.value = null;
  }

  // 全てのドラッグ状態を解除
  draggingState.value = null;
};

const handleWheel = (event) => {
  const zoomFactor = 1.1;
  const mousePoint = getSVGCoordinates(event);
  const zoomDirection = event.deltaY < 0 ? 1 / zoomFactor : zoomFactor;
  
  const newWidth = viewBox.value.width * zoomDirection;
  const newHeight = viewBox.value.height * zoomDirection;

  viewBox.value.x = mousePoint.x - (mousePoint.x - viewBox.value.x) * zoomDirection;
  viewBox.value.y = mousePoint.y - (mousePoint.y - viewBox.value.y) * zoomDirection;
  viewBox.value.width = newWidth;
  viewBox.value.height = newHeight;
};

// --- イベントハンドラ (線関連) ---
const handleAnchorMouseDown = (shapeId, anchorIndex, event) => {
  if (event.button !== 0) return; // 左クリックでのみ線を描画
  const startPoint = getAnchorAbsolutePosition(shapeId, anchorIndex);
  drawingLineState.value = {
    from: { shapeId, anchorIndex },
    tempEndPoint: { ...startPoint },
  };
};

const handleAnchorMouseUp = (shapeId, anchorIndex, event) => {
  if (event.button !== 0 || !drawingLineState.value) return;
  if (drawingLineState.value.from.shapeId === shapeId) {
    drawingLineState.value = null;
    return;
  }
  
  const newLine = {
    id: uuidv4(),
    from: drawingLineState.value.from,
    to: { shapeId, anchorIndex },
  };
  lines.value.push(newLine);
  drawingLineState.value = null;
};

const selectLine = (lineId) => {
  selectedLineId.value = lineId;
};

const deleteSelectedLine = () => {
  if (selectedLineId.value) {
    lines.value = lines.value.filter(line => line.id !== selectedLineId.value);
    selectedLineId.value = null;
  }
};

// --- パス計算ロジック ---
const getLinePath = (line) => {
  const startPoint = getAnchorAbsolutePosition(line.from.shapeId, line.from.anchorIndex);
  const endPoint = getAnchorAbsolutePosition(line.to.shapeId, line.to.anchorIndex);
  if (!startPoint || !endPoint) return '';
  return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
};

const getTemporaryLinePath = () => {
  if (!drawingLineState.value) return '';
  const startPoint = getAnchorAbsolutePosition(drawingLineState.value.from.shapeId, drawingLineState.value.from.anchorIndex);
  const endPoint = drawingLineState.value.tempEndPoint;
  return `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`;
};

// --- ライフサイクルフック ---
const handleResize = () => {
  svgWidth.value = window.innerWidth;
  svgHeight.value = window.innerHeight;
  const currentZoom = zoomLevel.value;
  viewBox.value.width = window.innerWidth / currentZoom;
  viewBox.value.height = window.innerHeight / currentZoom;
};

onMounted(() => {
  window.addEventListener('resize', handleResize);
  handleResize();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});
</script>