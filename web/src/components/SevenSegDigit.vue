<template>
  <svg :width="size" :height="size*2" viewBox="0 0 100 200" class="select-none">
    <polygon v-for="(points, seg) in segs" :key="seg" :points="points" :fill="active.includes(seg as any) ? onColor : offColor" />
  </svg>
</template>
<script setup lang="ts">
import { computed } from 'vue'
const props = withDefaults(defineProps<{ digit: string, size?: number, onColor?: string, offColor?: string }>(), {
  size: 80,
  onColor: '#ffd400',
  offColor: '#1a1600'
})
const segs: Record<string,string> = {
  a: '10,10 90,10 76,24 24,24',
  g: '10,93 90,93 76,107 24,107',
  d: '10,190 90,190 76,176 24,176',
  f: '10,10 24,24 24,93 10,107',
  b: '90,10 90,107 76,93 76,24',
  e: '10,93 24,107 24,176 10,190',
  c: '76,93 90,107 90,190 76,176'
}
const map: Record<string,string[]> = {
  '0': ['a','b','c','d','e','f'],
  '1': ['b','c'],
  '2': ['a','b','g','e','d'],
  '3': ['a','b','g','c','d'],
  '4': ['f','g','b','c'],
  '5': ['a','f','g','c','d'],
  '6': ['a','f','e','d','c','g'],
  '7': ['a','b','c'],
  '8': ['a','b','c','d','e','f','g'],
  '9': ['a','b','c','d','f','g'],
  ' ': []
}
const active = computed(()=> map[props.digit] ?? [])
</script>