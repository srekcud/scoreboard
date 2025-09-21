<template>
  <svg :width="size/2" :height="size*2" :viewBox="`0 0 ${size/2} ${size*2}`">
    <circle :cx="size/4" :cy="size*0.7" :r="size*0.08" :fill="onColor" />
    <circle :cx="size/4" :cy="size*1.3" :r="size*0.08" :fill="onColor" />
  </svg>
</template>
<script setup lang="ts">
const props = withDefaults(defineProps<{ size?: number; onColor?: string }>(), {
  size: 80, onColor: '#ff3b3b'
})
</script>