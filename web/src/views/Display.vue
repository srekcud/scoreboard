<!-- web/src/views/Display.vue -->
<template>
  <div class="w-screen h-screen bg-black text-white relative overflow-hidden">
    <!-- Barres latérales -->
    <div class="absolute left-0 top-0 h-full w-20" style="background:#b80000"></div>
    <div class="absolute right-0 top-0 h-full w-20" style="background:#0048b8"></div>

    <!-- Bande scores -->
    <div class="relative w-full" style="height: 18rem;">
      <div v-if="state?.senshu==='red'" class="absolute top-0 bottom-0" :style="{ left: '120px', width: '80px', background:'#ffd400' }"></div>
      <div v-if="state?.senshu==='blue'" class="absolute top-0 bottom-0" :style="{ right: '120px', width: '80px', background:'#ffd400' }"></div>

      <div class="absolute inset-0 flex justify-between items-start px-24 pt-8">
        <div class="w-1/2 flex justify-center" :class="blinkClass('red')">
          <SevenSegDisplay :value="fmt2(state?.leftScore ?? 0)" :size="160" :gap="20" onColor="#ffd400" offColor="#1a1600" />
        </div>
        <div class="w-1/2 flex justify-center" :class="blinkClass('blue')">
          <SevenSegDisplay :value="fmt2(state?.rightScore ?? 0)" :size="160" :gap="20" onColor="#ffd400" offColor="#1a1600" />
        </div>
      </div>
    </div>

    <!-- Pénalités descendues davantage -->
    <div class="mt-24 flex flex-col items-stretch gap-10 px-12 font-mono">
      <template v-if="state?.penaltyVisibility.C1">
        <div class="flex items-center text-6xl leading-none">
          <div class="flex-1 text-right text-yellow-300">{{ marks(state?.penalties.left.C1 ?? 0) }}</div>
          <div class="mx-8 text-gray-300 font-bold shrink-0 text-3xl">CAT1.</div>
          <div class="flex-1 text-left text-yellow-300">{{ marks(state?.penalties.right.C1 ?? 0) }}</div>
        </div>
      </template>

      <template v-if="state?.penaltyVisibility.C2">
        <div class="flex items-center text-6xl leading-none">
          <div class="flex-1 text-right text-yellow-300">{{ marks(state?.penalties.left.C2 ?? 0) }}</div>
          <div class="mx-8 text-gray-300 font-bold shrink-0 text-3xl">CAT2.</div>
          <div class="flex-1 text-left text-yellow-300">{{ marks(state?.penalties.right.C2 ?? 0) }}</div>
        </div>
      </template>
    </div>

    <!-- Timer -->
    <div class="absolute left-0 right-0 bottom-8 flex justify-center">
      <SevenSegDisplay :value="fmtTimer(state?.timer.remainingMs ?? 0)" :size="160" :gap="22" onColor="#ff3b3b" offColor="#1a0000" colonColor="#ff3b3b" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useStore, type Side } from '../store'
import SevenSegDisplay from '../components/SevenSegDisplay.vue'

const s = useStore()
onMounted(()=> { s.connect('display') })
const state = computed(()=> s.state)

function fmt2(n:number){ return String(Math.max(0, Math.min(99, n))).padStart(2,'0') }
function fmtTimer(ms:number){
  const t = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(t/60); const sec = t%60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
}
function marks(n:number){ return '*'.repeat(Math.max(0, Math.min(9, n))) }
function blinkClass(side: Side){
  if (!state.value?.ended.over) return ''
  const winner = state.value.ended.winner
  if (!winner) return ''
  return winner === side ? 'blink' : ''
}
</script>

<style scoped>
@keyframes blink { 50% { opacity: 0.2; } }
.blink { animation: blink 0.8s steps(1) infinite; }
</style>
