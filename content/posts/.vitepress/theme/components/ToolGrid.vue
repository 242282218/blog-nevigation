<template>
  <div class="tool-grid-container">
    <h2 v-if="title" class="nav-category-title">
      <SvgIcons v-if="icon" :name="icon" class="nav-category-title-icon" />
      <span>{{ title }}</span>
    </h2>
    <div class="tool-grid" :class="{ 'is-loading': loading }">
      <template v-if="loading">
        <SkeletonCard 
          v-for="i in skeletonCount" 
          :key="`skeleton-${i}`"
        />
      </template>
      <template v-else>
        <ToolCard 
          v-for="tool in tools" 
          :key="tool.url" 
          :tool="tool"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ToolCard from './ToolCard.vue'
import SkeletonCard from './SkeletonCard.vue'
import SvgIcons from './SvgIcons.vue'

interface Tool {
  icon: string
  title: string
  description: string
  url: string
  tags?: string[]
}

const props = withDefaults(defineProps<{
  title?: string
  icon?: string
  tools: Tool[]
  loading?: boolean
  skeletonCount?: number
}>(), {
  loading: false,
  skeletonCount: 6
})

const skeletonCount = computed(() => props.skeletonCount)
</script>

<style scoped>
.tool-grid-container {
  margin-bottom: var(--dt-space-12);
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--dt-space-6);
  margin-top: var(--dt-space-6);
}

.tool-grid.is-loading {
  pointer-events: none;
  user-select: none;
}

@media (max-width: 768px) {
  .tool-grid {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .tool-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1025px) {
  .tool-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1440px) {
  .tool-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
