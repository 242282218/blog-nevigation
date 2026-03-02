const DEFAULT_SCROLL_SELECTOR =
  '.scroll-animate, .scroll-animate-left, .scroll-animate-right, .scroll-animate-scale, .scroll-animate-fade'

export interface ScrollAnimationOptions {
  selector?: string
  threshold?: number
  rootMargin?: string
  visibleClass?: string
}

export function initScrollAnimation(options: ScrollAnimationOptions = {}): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const {
    selector = DEFAULT_SCROLL_SELECTOR,
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    visibleClass = 'is-visible'
  } = options

  const targets = Array.from(document.querySelectorAll(selector))
  if (targets.length === 0) {
    return () => {}
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add(visibleClass))
    return () => {}
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add(visibleClass)
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold, rootMargin }
  )

  targets.forEach((el) => observer.observe(el))

  return () => {
    observer.disconnect()
  }
}

export default initScrollAnimation
