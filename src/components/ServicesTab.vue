<template>
  <div class="tab">
    <div v-for="(icons, category) in iconsByCategory" :key="category" class="category-section">
      <p class="category">{{ category }}</p>
      <div class="icon-container">
        <div v-for="icon in icons">
          <component 
            :key="icon.name"
            :is="icon.component"
            width="80"
            height="80"
            class="icon-item"
          />
          <p class="label">{{ icon.name }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { ICONS } from '@/icons';

const iconsByCategory = computed(() => {
  const categorized: Record<string, Array<{name: string, component: any}>> = {};
  
  Object.entries(ICONS).forEach(([name, icon]) => {
    const category = icon.type || 'default';
    if (!categorized[category]) {
      categorized[category] = [];
    }
    categorized[category].push({ name, component: icon.component });
  });
  
  return categorized;
});
</script>

<style scoped>
.tab {
  width: 20vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.category-section {
  display: flex;
  flex-direction: column;
  height: max-content;
}

.icon-container {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
}

.category {
  font-size: 18px;
  font-weight: 900;
}

.label {
  font-size: 16px;
  text-align: center;
}

.icon-item {
  position: relative;
  display: block;
  margin: 0 12px;
  cursor: pointer;

  transition: transform 0.3s ease;
}

.icon-item:hover {
  transform: translateY(-4px);
}
</style>
