import { onMounted, onUnmounted, nextTick } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import ToolCard from './components/ToolCard.vue'
import ToolGrid from './components/ToolGrid.vue'
import { initMouseGlow } from './composables/useMousePosition'
import { initScrollAnimation } from './composables/useScrollAnimation'
import './styles/design-tokens-unified.css'
import './styles/modern.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('ToolGrid', ToolGrid)
    app.component('ToolCard', ToolCard)
  },
  setup() {
    let stopScrollAnimation: (() => void) | null = null
    let stopMouseGlow: (() => void) | null = null

    onMounted(() => {
      nextTick(() => {
        stopScrollAnimation = initScrollAnimation()
        stopMouseGlow = initMouseGlow()
      })
    })

    onUnmounted(() => {
      stopScrollAnimation?.()
      stopMouseGlow?.()
      stopScrollAnimation = null
      stopMouseGlow = null
    })
  }
} satisfies Theme
