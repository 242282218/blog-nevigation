const DEFAULT_GLOW_SELECTOR = '.mouse-glow, .VPFeature'

export interface MouseGlowOptions {
  selector?: string
}

export function initMouseGlow(options: MouseGlowOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const { selector = DEFAULT_GLOW_SELECTOR } = options

  const isTouchDevice = window.matchMedia('(hover: none)').matches
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (isTouchDevice || reducedMotion) {
    return () => {}
  }

  const elements = Array.from(document.querySelectorAll(selector)) as HTMLElement[]
  if (elements.length === 0) {
    return () => {}
  }

  const listeners: Array<{ element: HTMLElement; move: (e: MouseEvent) => void; leave: () => void }> = []

  elements.forEach((element) => {
    const move = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      element.style.setProperty('--mouse-x', `${x}%`)
      element.style.setProperty('--mouse-y', `${y}%`)
    }

    const leave = () => {
      element.style.setProperty('--mouse-x', '50%')
      element.style.setProperty('--mouse-y', '50%')
    }

    element.addEventListener('mousemove', move)
    element.addEventListener('mouseleave', leave)
    listeners.push({ element, move, leave })
  })

  return () => {
    listeners.forEach(({ element, move, leave }) => {
      element.removeEventListener('mousemove', move)
      element.removeEventListener('mouseleave', leave)
    })
  }
}

export default initMouseGlow
