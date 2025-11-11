<!-- web/src/views/DisplayMini.vue -->
<template>
  <div class="w-full h-full bg-black text-white relative overflow-hidden">
    <!-- ✅ INVERSÉ: Bleu à gauche, Rouge à droite -->
    <div class="absolute left-0 top-0 h-full" style="width:12px;background:#0048b8"></div>
    <div class="absolute right-0 top-0 h-full" style="width:12px;background:#b80000"></div>

    <div class="relative w-full" style="height: 7.5rem;">
      <!-- ✅ INVERSÉ: Senshu bleu à gauche, rouge à droite -->
      <div v-if="state?.senshu==='blue'" class="absolute top-0 bottom-0" :style="{ left: '12px', width: '14px', background:'#ffd400' }"></div>
      <div v-if="state?.senshu==='red'" class="absolute top-0 bottom-0" :style="{ right: '12px', width: '14px', background:'#ffd400' }"></div>

      <div class="absolute inset-0 flex justify-between items-start px-6 pt-3">
        <!-- ✅ INVERSÉ: Bleu (rightScore) à gauche, Rouge (leftScore) à droite -->
        <div class="w-1/2 flex justify-center" :class="blinkClass('blue')">
          <SevenSegDisplay :value="fmt2(state?.rightScore ?? 0)" :size="56" :gap="8" onColor="#ffd400" offColor="#1a1600" />
        </div>
        <div class="w-1/2 flex justify-center" :class="blinkClass('red')">
          <SevenSegDisplay :value="fmt2(state?.leftScore ?? 0)" :size="56" :gap="8" onColor="#ffd400" offColor="#1a1600" />
        </div>
      </div>
    </div>

    <!-- pénalités compactes, gros astérisques depuis le centre -->
    <div class="mt-3 flex flex-col items-stretch gap-2 px-4 font-mono">
      <template v-if="state?.penaltyVisibility.C1">
        <div class="flex items-center text-2xl leading-none">
          <!-- ✅ INVERSÉ: Bleu (right) à gauche, Rouge (left) à droite -->
          <div class="flex-1 text-right text-yellow-300">{{ marks(state?.penalties.right.C1 ?? 0) }}</div>
          <div class="mx-3 text-gray-300 font-bold shrink-0">CAT1.</div>
          <div class="flex-1 text-left text-yellow-300">{{ marks(state?.penalties.left.C1 ?? 0) }}</div>
        </div>
      </template>
      <template v-if="state?.penaltyVisibility.C2">
        <div class="flex items-center text-2xl leading-none">
          <!-- ✅ INVERSÉ: Bleu (right) à gauche, Rouge (left) à droite -->
          <div class="flex-1 text-right text-yellow-300">{{ marks(state?.penalties.right.C2 ?? 0) }}</div>
          <div class="mx-3 text-gray-300 font-bold shrink-0">CAT2.</div>
          <div class="flex-1 text-left text-yellow-300">{{ marks(state?.penalties.left.C2 ?? 0) }}</div>
        </div>
      </template>
    </div>

    <div class="absolute left-0 right-0 bottom-3 flex justify-center">
      <SevenSegDisplay :value="fmtTimer(state?.timer.remainingMs ?? 0)" :size="56" :gap="8" onColor="#ff3b3b" offColor="#1a0000" colonColor="#ff3b3b" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useStore, type Side } from '../store'
import SevenSegDisplay from '../components/SevenSegDisplay.vue'

const s = useStore()
const state = computed(() => s.state)

function fmt2(n: number) {
  return String(Math.max(0, Math.min(99, n))).padStart(2, '0')
}

function fmtTimer(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(t / 60)
  const sec = t % 60
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

function marks(n: number) {
  return '*'.repeat(Math.max(0, Math.min(9, n)))
}

function blinkClass(side: Side) {
  const st = state.value
  if (!st?.ended.over) return ''
  return st.ended.winner === side ? 'blink' : ''
}
</script>

<style scoped>
@keyframes blink {
  50% { opacity: 0.2; }
}
.blink {
  animation: blink 0.8s steps(1) infinite;
}
</style>