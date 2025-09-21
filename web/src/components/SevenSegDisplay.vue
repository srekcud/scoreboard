<template>
  <div class="flex items-center" :style="{ gap: gap + 'px' }">
    <template v-for="(ch,i) in chars" :key="i + ':' + value">
      <Colon v-if="ch===':'" :size="size" :onColor="colonColor || onColor" />
      <SevenSegDigit v-else :digit="ch" :size="size" :onColor="onColor" :offColor="offColor" />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SevenSegDigit from './SevenSegDigit.vue'
import Colon from './Colon.vue'

const props = withDefaults(defineProps<{
  value: string,
  size?: number,
  gap?: number,
  onColor?: string,
  offColor?: string,
  colonColor?: string
}>(), {
  size: 80,
  gap: 12,
  onColor: '#ffd400',
  offColor: '#1a1600',
  colonColor: undefined
})

const chars = computed(() => props.value.split(''))
</script>
