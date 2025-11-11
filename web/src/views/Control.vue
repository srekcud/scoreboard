<!-- web/src/views/Control.vue -->
<template>
  <div class="w-screen h-screen bg-[#0b0f16] text-white p-4 flex flex-col gap-3">
    <div class="flex items-center justify-between">
      <div class="text-sm text-gray-400">Match: {{ s.state?.matchId.slice(0,8) }}</div>
      <button class="px-3 py-2 rounded bg-[#1f2937]" @click="$router.push('/config')">Config</button>
    </div>

    <div v-if="!pinOk" class="flex-1 flex items-center justify-center gap-3">
      <input v-model="pin" type="password" placeholder="PIN" class="px-3 py-2 rounded bg-[#111827] border border-[#374151]" />
      <button class="px-4 py-2 rounded bg-blue-600" @click="login">Entrer</button>
    </div>

    <div v-else class="flex-1 flex flex-col gap-4">
      <!-- Pénalités -->
      <div>
        <h3 class="text-center text-lg font-bold">pénalités</h3>

        <template v-if="s.state?.penaltyVisibility.C1">
          <div class="mt-3 grid grid-cols-3 items-center">
            <div class="flex justify-center gap-2">
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#0d1a33'}" @click="pen('blue','C1',+1)">+</button>
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#0d1a33'}" @click="pen('blue','C1',-1)">−</button>
            </div>
            <div class="text-center text-[#bbbbbb] font-bold">C1</div>
            <div class="flex justify-center gap-2">
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#531111'}" @click="pen('red','C1',+1)">+</button>
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#531111'}" @click="pen('red','C1',-1)">−</button>
            </div>
          </div>
        </template>

        <template v-if="s.state?.penaltyVisibility.C2">
          <div class="mt-3 grid grid-cols-3 items-center">
            <div class="flex justify-center gap-2">
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#0d1a33'}" @click="pen('blue','C2',+1)">+</button>
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#0d1a33'}" @click="pen('blue','C2',-1)">−</button>
            </div>
            <div class="text-center text-[#bbbbbb] font-bold">C2</div>
            <div class="flex justify-center gap-2">
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#531111'}" @click="pen('red','C2',+1)">+</button>
              <button class="px-6 py-3 rounded" :disabled="s.state?.ended.over" :class="btnDis()" :style="{background:'#531111'}" @click="pen('red','C2',-1)">−</button>
            </div>
          </div>
        </template>
      </div>

      <!-- Senshu -->
      <div>
        <h3 class="text-center text-lg font-bold">Senshu</h3>
        <div class="mt-2 flex items-center justify-center gap-4">
          <button class="px-6 py-3 rounded" style="background:#0048b8" :disabled="s.state?.ended.over" :class="btnDis()" @click="s.setSenshu('blue')">Bleu</button>
          <button class="px-6 py-3 rounded" style="background:#1f2937" :disabled="s.state?.ended.over" :class="btnDis()" @click="s.setSenshu(null)">Aucune</button>
          <button class="px-6 py-3 rounded" style="background:#b80000" :disabled="s.state?.ended.over" :class="btnDis()" @click="s.setSenshu('red')">Rouge</button>
        </div>
      </div>

      <!-- Mini display -->
      <div class="rounded overflow-hidden border border-[#1f2937]" style="height:400px; max-height:400px;">
        <DisplayMini />
      </div>

      <!-- Scores -->
      <div class="grid grid-cols-2 gap-6">
        <div>
          <h3 class="text-center font-bold">Score Bleu</h3>
          <div class="mt-2 grid grid-cols-4 gap-2">
            <button v-for="b in btns" :key="'b'+b" class="h-16 rounded"
                    :disabled="s.state?.ended.over" :class="btnDis()"
                    :style="{background:'#0d1a33'}" @click="act('blue', b)">{{ label(b) }}</button>
          </div>
        </div>
        <div>
          <h3 class="text-center font-bold">Score Rouge</h3>
          <div class="mt-2 grid grid-cols-4 gap-2">
            <button v-for="b in btns" :key="'r'+b" class="h-16 rounded"
                    :disabled="s.state?.ended.over" :class="btnDis()"
                    :style="{background:'#531111'}" @click="act('red', b)">{{ label(b) }}</button>
          </div>
        </div>
      </div>

      <!-- Timer: ordre Reset, Start/Stop, +1s. Start/Stop = 80% -->
      <div class="mt-auto pt-2">
        <h3 class="text-center text-lg font-bold">Timer</h3>
        <div class="mt-2 flex gap-2 items-stretch">
          <button class="h-16 rounded bg-[#374151] flex items-center justify-center basis-[10%]" title="Reset" @click="s.reset()">
            <IconReset />
          </button>
          <button class="h-16 rounded bg-[#374151] text-xl font-bold basis-[80%]"
                  :disabled="s.state?.ended.over" :class="btnDis()" @click="toggle()">START/STOP</button>
          <button class="h-16 rounded bg-[#374151] text-xl font-bold basis-[10%]"
                  :disabled="s.state?.ended.over" :class="btnDis()" @click="add1s()">+1s</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useStore, type Side } from '../store'
import IconReset from '../components/IconReset.vue'
import DisplayMini from './DisplayMini.vue'

const s = useStore()
const pin = ref('')
const pinOk = computed(()=> s.pinOk)
const btns = [1,2,3,-1] as const

async function login(){
  await s.connect('control', pin.value)
  await s.claimControl()
}
function label(b:1|2|3|-1){ return b>0? `+${b}` : '−1' }
function act(side:Side, b:1|2|3|-1){ s.addScore(side, b) }
function pen(side:Side, cat:'C1'|'C2', d:1|-1){ s.addPenalty(side, cat, d) }
function toggle(){ s.state?.timer.running ? s.stop() : s.start() }
function add1s(){ s.socket?.emit('timer:add', { ms: 1000 }) }
function btnDis(){ return s.state?.ended.over ? 'opacity-40 cursor-not-allowed' : '' }

let hbInt: any
onMounted(async ()=>{
  if (hbInt) clearInterval(hbInt)
  hbInt = setInterval(()=> {
    if (s.socket?.connected) {
      s.hb()
    }
  },2000)

  if (s.pinOk && !s.controller) {
    try { await s.claimControl() } catch {}
  }
})
onUnmounted(()=> clearInterval(hbInt))
</script>
