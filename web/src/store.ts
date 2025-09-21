// web/src/store.ts
import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'

export type Side = 'red'|'blue'
export type Cat = 'C1'|'C2'

export type AppState = {
  wsVersion: string
  matchId: string
  leftScore: number
  rightScore: number
  timer: { initialMs: number, remainingMs: number, running: boolean, lastStartTs: number }
  senshu: Side | null
  penalties: { left: { C1: number, C2: number }, right: { C1: number, C2: number } }
  penaltyVisibility: { C1: boolean, C2: boolean }
  rules: { pointGap: number, targetScore: number|null, penaltyLimit: number }
  ended: { over: boolean, winner: Side | null, reason: 'gap'|'target'|'time'|'penalty' }
}

export const useStore = defineStore('s', {
  state: () => ({
    socket: null as Socket|null,
    sessionId: '',
    role: 'display' as 'display'|'control'|'config',
    controller: false,
    state: null as AppState|null,
    pinOk: false,
    _lastPin: '' as string|undefined,
  }),
  actions: {
    connect(role: 'display'|'control'|'config', pin?: string) {
      this.role = role
      this._lastPin = pin ?? this._lastPin
      if (!this.socket) {
        this.socket = io('/scoreboard', { path: '/socket.io/' })
        this.socket.on('state:full', (st: AppState)=> this.state = st)
        this.socket.on('connect', ()=>{
          this.socket!.emit('auth:login', { role: this.role, pin: this._lastPin }, (res: any)=>{
            if (!res?.error) { this.sessionId = res.sessionId; this.controller = !!res.controller; this.pinOk = true }
          })
        })
      }
      return new Promise<void>((resolve, reject)=>{
        this.socket!.emit('auth:login', { role, pin: this._lastPin }, (res: any)=>{
          if (res?.error) { reject(res.error); return }
          this.sessionId = res.sessionId; this.controller = !!res.controller; this.pinOk = true
          resolve()
        })
      })
    },
    claimControl(){
      return new Promise<void>((resolve,reject)=>{
        this.socket!.emit('control:lock:claim', {}, (res:any)=>{
          if (res?.error) { reject(res.error); return }
          this.controller = true; resolve()
        })
      })
    },
    releaseControl(){ this.socket?.emit('control:lock:release', {}) },
    hb(){ this.socket?.emit('hb:ping', { t: Date.now() }) },
    setTimer(ms:number){ this.socket?.emit('timer:set', { initialMs: ms }) },
    start(){ this.socket?.emit('timer:start', {}) },
    stop(){ this.socket?.emit('timer:stop', {}) },
    reset(){ this.socket?.emit('timer:reset', {}) },
    addScore(side:Side, delta:1|2|3|-1){ this.socket?.emit('score:add', { side, delta }) },
    addPenalty(side:Side, cat:Cat, delta:1|-1){ this.socket?.emit('penalty:add', { side, cat, delta }) },
    setSenshu(side:Side|null){ this.socket?.emit('senshu:set', { side }) },
    setRules(pointGap?:number, targetScore?:number|null, penaltyLimit?:number){ this.socket?.emit('rules:set', { pointGap, targetScore, penaltyLimit }) },
    setPenaltyVisibility(cat:Cat, visible:boolean){ this.socket?.emit('penaltyVisibility:set', { cat, visible }) },
    saveConfig(payload:any){ this.socket?.emit('config:save', payload) }
  }
})
