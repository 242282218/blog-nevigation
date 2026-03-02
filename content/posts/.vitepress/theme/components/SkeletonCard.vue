<template>
  <div class="skeleton-card" :aria-hidden="true">
    <div class="skeleton-header">
      <div class="skeleton-icon"></div>
      <div class="skeleton-title"></div>
    </div>
    <div class="skeleton-content">
      <div class="skeleton-line"></div>
      <div class="skeleton-line short"></div>
    </div>
    <div class="skeleton-meta">
      <div class="skeleton-tag"></div>
      <div class="skeleton-tag"></div>
    </div>
  </div>
</template>

<style scoped>
.skeleton-card {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-3);
  padding: var(--dt-space-6);
  background: var(--dt-glass-bg);
  backdrop-filter: var(--dt-glass-blur-card);
  -webkit-backdrop-filter: var(--dt-glass-blur-card);
  border: 1px solid var(--dt-glass-border);
  border-radius: var(--dt-radius-card);
  position: relative;
  overflow: hidden;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: var(--dt-space-3);
}

.skeleton-icon {
  width: var(--dt-font-size-2xl);
  height: var(--dt-font-size-2xl);
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    90deg,
    var(--dt-color-bg-tertiary) 0%,
    var(--dt-color-gray-200) 50%,
    var(--dt-color-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer var(--dt-motion-duration-shimmer) infinite;
}

.skeleton-title {
  flex: 1;
  height: var(--dt-font-size-xl);
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    90deg,
    var(--dt-color-bg-tertiary) 0%,
    var(--dt-color-gray-200) 50%,
    var(--dt-color-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer var(--dt-motion-duration-shimmer) infinite;
  animation-delay: var(--dt-motion-delay-100);
}

.skeleton-content {
  display: flex;
  flex-direction: column;
  gap: var(--dt-space-2);
}

.skeleton-line {
  height: var(--dt-font-size-lg);
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    90deg,
    var(--dt-color-bg-tertiary) 0%,
    var(--dt-color-gray-200) 50%,
    var(--dt-color-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer var(--dt-motion-duration-shimmer) infinite;
  animation-delay: var(--dt-motion-delay-200);
}

.skeleton-line.short {
  width: var(--dt-space-16);
  height: var(--dt-space-6);
}

.skeleton-meta {
  display: flex;
  gap: var(--dt-space-2);
  margin-top: auto;
}

.skeleton-tag {
  width: var(--dt-space-12);
  height: var(--dt-space-6);
  border-radius: var(--dt-radius-sm);
  background: linear-gradient(
    90deg,
    var(--dt-color-bg-tertiary) 0%,
    var(--dt-color-gray-200) 50%,
    var(--dt-color-bg-tertiary) 100%
  );
  background-size: 200% 100%;
  animation: shimmer var(--dt-motion-duration-shimmer) infinite;
  animation-delay: var(--dt-motion-delay-300);
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-icon,
  .skeleton-title,
  .skeleton-line,
  .skeleton-tag {
    animation: none;
    background: var(--dt-color-bg-tertiary);
  }
}
</style>
