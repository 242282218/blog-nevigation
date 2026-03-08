<template>
  <a
    :href="tool.url"
    target="_blank"
    rel="noopener noreferrer"
    class="tool-card"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  >
    <div class="tool-card-glow" :style="glowStyle"></div>
    <div class="tool-card-content">
      <div class="tool-card-header">
        <SvgIcons :name="displayIcon" />
        <h3 class="tool-title">{{ tool.title }}</h3>
      </div>
      <p class="tool-desc">{{ tool.description }}</p>
      <div v-if="tool.tags && tool.tags.length" class="tool-meta">
        <span
          v-for="tag in tool.tags"
          :key="tag"
          class="tool-tag"
        >
          {{ tag }}
        </span>
      </div>
    </div>
    <span class="tool-external">
      <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </span>
  </a>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import SvgIcons from './SvgIcons.vue'

interface Tool {
  icon: string
  title: string
  description: string
  url: string
  tags?: string[]
}

const props = defineProps<{
  tool: Tool
}>()

const mouseX = ref(50)
const mouseY = ref(50)
const isHovering = ref(false)

const displayIcon = computed(() => {
  if (props.tool.icon === 'auto') {
    return 'link'
  }
  return props.tool.icon
})

const glowStyle = computed(() => ({
  '--mouse-x': `${mouseX.value}%`,
  '--mouse-y': `${mouseY.value}%`,
  opacity: isHovering.value ? 1 : 0
}))

const handleMouseMove = (e: MouseEvent) => {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  mouseX.value = ((e.clientX - rect.left) / rect.width) * 100
  mouseY.value = ((e.clientY - rect.top) / rect.height) * 100
  isHovering.value = true
}

const handleMouseLeave = () => {
  isHovering.value = false
}
</script>

<style scoped>
.tool-card {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-3);
  padding: var(--dt-space-6);
  background: var(--dt-glass-bg);
  backdrop-filter: var(--dt-glass-blur-card);
  -webkit-backdrop-filter: var(--dt-glass-blur-card);
  border: 1px solid var(--dt-glass-border);
  border-radius: var(--dt-radius-card);
  text-decoration: none;
  transition: all var(--dt-motion-transition-normal);
  cursor: pointer;
  position: relative;
  overflow: hidden;
  --mouse-x: 50%;
  --mouse-y: 50%;
}

.tool-card-glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    var(--dt-glow-card-size) circle at var(--mouse-x) var(--mouse-y),
    var(--dt-glow-mouse-color),
    transparent 50%
  );
  pointer-events: none;
  transition: opacity var(--dt-motion-transition-normal);
  z-index: 0;
}

.tool-card-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-3);
}

.tool-card:hover {
  border-color: var(--dt-color-border-brand);
  box-shadow:
    var(--dt-shadow-card-hover),
    0 0 60px var(--dt-glow-mouse-color),
    0 0 0 1px var(--dt-glow-mouse-color);
  transform: translateY(calc(-1 * var(--dt-card-lift-hover)));
}

.dark .tool-card:hover {
  box-shadow:
    var(--dt-shadow-card-hover),
    0 0 60px var(--dt-glow-mouse-color),
    0 0 0 1px var(--dt-glow-mouse-color);
}

.tool-card:active {
  transform: translateY(calc(-1 * var(--dt-card-lift-active))) scale(0.98);
  transition-duration: var(--dt-motion-duration-fast);
}

.tool-card-header {
  display: flex;
  align-items: center;
  gap: var(--dt-space-3);
}

.tool-icon {
  font-size: var(--dt-font-size-2xl);
  flex-shrink: 0;
  filter: drop-shadow(0 0 8px var(--dt-glow-mouse-color));
}

.tool-title {
  font-size: var(--dt-font-size-lg);
  font-weight: var(--dt-font-weight-semibold);
  color: var(--dt-color-text-1);
  margin: 0;
}

.tool-desc {
  font-size: var(--dt-font-size-sm);
  color: var(--dt-color-text-3);
  line-height: var(--dt-font-lineheight-normal);
  margin: 0;
}

.tool-meta {
  display: flex;
  gap: var(--dt-space-2);
  flex-wrap: wrap;
  margin-top: auto;
}

.tool-tag {
  font-size: var(--dt-font-size-xs);
  padding: var(--dt-tag-padding);
  background: var(--dt-color-brand-soft);
  color: var(--dt-color-brand-1);
  border-radius: var(--dt-tag-radius);
  border: 1px solid var(--dt-color-brand-soft);
  transition: all var(--dt-motion-transition-normal);
}

.dark .tool-tag {
  background: var(--dt-color-brand-soft);
  color: var(--dt-color-blue-300);
  border-color: var(--dt-color-brand-soft);
}

.tool-card:hover .tool-tag {
  background: var(--dt-color-brand-soft);
  border-color: var(--dt-color-border-brand);
}

.tool-external {
  position: absolute;
  top: var(--dt-space-4);
  right: var(--dt-space-4);
  width: var(--dt-icon-external-size);
  height: var(--dt-icon-external-size);
  color: var(--dt-color-text-3);
  opacity: 0;
  transform: translate(calc(-1 * var(--dt-icon-external-offset)), var(--dt-icon-external-offset));
  transition: all var(--dt-motion-transition-normal);
  z-index: 1;
}

.external-icon {
  width: 100%;
  height: 100%;
}

.tool-card:hover .tool-external {
  opacity: 1;
  transform: translate(0, 0);
  color: var(--dt-color-brand-1);
}

.tool-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: var(--dt-indicator-width);
  height: var(--dt-indicator-height);
  background: linear-gradient(to bottom, var(--dt-color-brand-1), var(--dt-color-cyan-500));
  border-radius: 0 var(--dt-radius-sm) var(--dt-radius-sm) 0;
  transition: transform var(--dt-motion-transition-normal);
}

.tool-card:hover::before {
  transform: translateY(-50%) scaleY(1);
}

@media (hover: none) {
  .tool-card:hover {
    transform: none;
  }
  
  .tool-card:active {
    transform: scale(0.98);
    background: var(--dt-glass-bg-hover);
  }
  
  .tool-card::before {
    transform: translateY(-50%) scaleY(1);
    opacity: 0.5;
  }
  
  .tool-external {
    opacity: 0.7;
    transform: translate(0, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .tool-card,
  .tool-card-glow,
  .tool-external,
  .tool-tag,
  .tool-card::before {
    transition: none;
  }
  
  .tool-card:hover {
    transform: none;
  }
}
</style>
