<!-- web/src/views/Config.vue -->
<template>
  <div class="w-screen h-screen bg-[#0b0f16] text-white p-6 flex flex-col">
    <div class="flex items-center justify-between">
      <button class="px-4 py-2 rounded bg-[#1f2937]" @click="$router.back()">Retour</button>
      <div class="font-extrabold text-xl">Configuration du match</div>
      <button class="px-4 py-2 rounded bg-blue-600" @click="save">Sauvegarder</button>
    </div>

    <div class="mt-8 max-w-3xl mx-auto w-full space-y-8">
      <section class="text-center">
        <div class="font-bold">Durée</div>
        <div class="mt-2 flex justify-center gap-2">
          <input v-model.number="mm" type="number" min="0" class="w-24 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" placeholder="MM" />
          <span class="self-center">:</span>
          <input v-model.number="ss" type="number" min="0" max="59" class="w-24 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" placeholder="SS" />
        </div>
      </section>

      <section class="text-center">
        <div class="font-bold">Écart de points (fin immédiate)</div>
        <div class="mt-2 flex justify-center">
          <input v-model.number="gap" type="number" min="1" max="99" class="w-32 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" />
        </div>
      </section>

      <section class="text-center">
        <div class="font-bold">Target score (optionnel)</div>
        <div class="mt-2 flex justify-center">
          <input v-model.number="target" type="number" min="1" max="99" class="w-32 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" placeholder="—" />
        </div>
      </section>

      <section class="text-center">
        <div class="font-bold">Limite de pénalités (total C1+C2)</div>
        <div class="mt-2 flex justify-center">
          <input v-model.number="penLimit" type="number" min="1" max="99" class="w-32 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" />
        </div>
      </section>

      <section class="text-center">
        <div class="font-bold">Visibilité initiale des pénalités</div>
        <div class="mt-2 flex justify-center gap-4">
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="vis.C1" /> <span>CAT1</span></label>
          <label class="inline-flex items-center gap-2"><input type="checkbox" v-model="vis.C2" /> <span>CAT2</span></label>
        </div>
      </section>

      <section class="text-center">
        <div class="font-bold">PIN arbitre</div>
        <div class="mt-2 flex justify-center">
          <input v-model="pin" type="password" class="w-40 px-3 py-2 rounded bg-[#111827] border border-[#374151] text-center" />
        </div>
      </section>
    </div>
  </div>
</template>
<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useStore } from '../store'

const s = useStore()
const router = useRouter()

const mm = ref(3)
const ss = ref(0)
const gap = ref(8)
const target = ref<number|null>(null)
const penLimit = ref(5)
// reactive pour éviter la perte de C2
const vis = reactive<{C1:boolean; C2:boolean}>({ C1: true, C2: true })
const pin = ref('0000')

onMounted(async ()=>{
  // s'authentifie en 'config' et prend le contrôle
  await s.connect('config')
  try { await s.claimControl() } catch {}
  if (s.state) {
    const ms = s.state.timer.initialMs || 0
    mm.value = Math.floor(ms/60000)
    ss.value = Math.floor((ms%60000)/1000)
    gap.value = s.state.rules.pointGap
    target.value = s.state.rules.targetScore
    penLimit.value = s.state.rules.penaltyLimit
    Object.assign(vis, s.state.penaltyVisibility)
  }
})

function save(){
  const durationMs = (Math.max(0, mm.value|0)*60 + Math.max(0, Math.min(59, ss.value|0))) * 1000
  s.saveConfig({
    durationMs,
    pointGap: gap.value,
    targetScore: target.value ?? null,
    penaltyVisibility: { C1: vis.C1, C2: vis.C2 }, // envoie un objet plain
    penaltyLimit: penLimit.value,
    pin: pin.value
  })
  router.push('/control')
}
</script>
