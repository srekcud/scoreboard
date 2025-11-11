// web/src/store.ts
import { defineStore } from 'pinia'
import { io, Socket } from 'socket.io-client'

export type Side = 'red' | 'blue'
export type Cat = 'C1' | 'C2'

export type AppState = {
    wsVersion: string
    matchId: string
    leftScore: number
    rightScore: number
    timer: { initialMs: number, remainingMs: number, running: boolean, lastStartTs: number }
    senshu: Side | null
    penalties: { left: { C1: number, C2: number }, right: { C1: number, C2: number } }
    penaltyVisibility: { C1: boolean, C2: boolean }
    rules: { pointGap: number, targetScore: number | null, penaltyLimit: number }
    ended: { over: boolean, winner: Side | null, reason: 'gap' | 'target' | 'time' | 'penalty' }
}

export const useStore = defineStore('s', {
    state: () => ({
        socket: null as Socket | null,
        sessionId: '',
        role: 'display' as 'display' | 'control' | 'config',
        controller: false,
        state: null as AppState | null,
        pinOk: false,
        _lastPin: '' as string | undefined,
        _isConnecting: false, // ✅ Prévenir les connexions multiples
    }),

    actions: {
        connect(role: 'display' | 'control' | 'config', pin?: string) {
            // ✅ CORRECTION 1: Empêcher les connexions multiples simultanées
            if (this._isConnecting) {
                console.warn('Connection already in progress, skipping...')
                return Promise.resolve()
            }

            // ✅ CORRECTION 2: Si déjà connecté avec le même rôle, ne pas reconnecter
            if (this.socket?.connected && this.role === role) {
                console.log('Already connected with same role')
                return Promise.resolve()
            }

            this.role = role
            this._lastPin = pin ?? this._lastPin
            this._isConnecting = true

            // ✅ CORRECTION 3: Créer le socket UNE SEULE FOIS
            if (!this.socket) {
                this.socket = io('/scoreboard', {
                    path: '/socket.io/',
                    reconnection: true,
                    reconnectionDelay: 1000,
                    reconnectionAttempts: 5
                })

                // ✅ CORRECTION 4: Utiliser .off() avant .on() pour éviter les listeners dupliqués
                this.socket.off('state:full')
                this.socket.on('state:full', (st: AppState) => {
                    this.state = st
                })

                this.socket.off('connect')
                this.socket.on('connect', () => {
                    console.log('Socket connected, authenticating...')
                    this.socket!.emit('auth:login', {
                        role: this.role,
                        pin: this._lastPin
                    }, (res: any) => {
                        if (!res?.error) {
                            this.sessionId = res.sessionId
                            this.controller = !!res.controller
                            this.pinOk = true
                            console.log('Authenticated successfully')
                        } else {
                            console.error('Auth error:', res.error)
                        }
                    })
                })

                // ✅ CORRECTION 5: Gérer la déconnexion proprement
                this.socket.off('disconnect')
                this.socket.on('disconnect', (reason) => {
                    console.log('Socket disconnected:', reason)
                    this._isConnecting = false
                })

                // ✅ CORRECTION 6: Gérer les erreurs de connexion
                this.socket.off('connect_error')
                this.socket.on('connect_error', (error) => {
                    console.error('Connection error:', error)
                    this._isConnecting = false
                })
            }

            return new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this._isConnecting = false
                    reject(new Error('Connection timeout'))
                }, 5000)

                this.socket!.emit('auth:login', {
                    role,
                    pin: this._lastPin
                }, (res: any) => {
                    clearTimeout(timeout)
                    this._isConnecting = false

                    if (res?.error) {
                        reject(res.error)
                        return
                    }

                    this.sessionId = res.sessionId
                    this.controller = !!res.controller
                    this.pinOk = true
                    resolve()
                })
            })
        },

        // ✅ CORRECTION 7: Ajouter une méthode de nettoyage
        disconnect() {
            if (this.socket) {
                this.socket.off('state:full')
                this.socket.off('connect')
                this.socket.off('disconnect')
                this.socket.off('connect_error')
                this.socket.disconnect()
                this.socket = null
            }
            this._isConnecting = false
            this.controller = false
            this.pinOk = false
        },

        claimControl() {
            return new Promise<void>((resolve, reject) => {
                if (!this.socket?.connected) {
                    reject(new Error('Socket not connected'))
                    return
                }

                this.socket.emit('control:lock:claim', {}, (res: any) => {
                    if (res?.error) {
                        reject(res.error)
                        return
                    }
                    this.controller = true
                    resolve()
                })
            })
        },

        releaseControl() {
            if (this.socket?.connected) {
                this.socket.emit('control:lock:release', {})
            }
        },

        // ✅ CORRECTION 8: Vérifier la connexion avant chaque emit
        hb() {
            if (this.socket?.connected) {
                this.socket.emit('hb:ping', { t: Date.now() })
            }
        },

        setTimer(ms: number) {
            if (this.socket?.connected) {
                this.socket.emit('timer:set', { initialMs: ms })
            }
        },

        start() {
            if (this.socket?.connected) {
                this.socket.emit('timer:start', {})
            }
        },

        stop() {
            if (this.socket?.connected) {
                this.socket.emit('timer:stop', {})
            }
        },

        reset() {
            if (this.socket?.connected) {
                this.socket.emit('timer:reset', {})
            }
        },

        addScore(side: Side, delta: 1 | 2 | 3 | -1) {
            if (this.socket?.connected) {
                this.socket.emit('score:add', { side, delta })
            }
        },

        addPenalty(side: Side, cat: Cat, delta: 1 | -1) {
            if (this.socket?.connected) {
                this.socket.emit('penalty:add', { side, cat, delta })
            }
        },

        setSenshu(side: Side | null) {
            if (this.socket?.connected) {
                this.socket.emit('senshu:set', { side })
            }
        },

        setRules(pointGap?: number, targetScore?: number | null, penaltyLimit?: number) {
            if (this.socket?.connected) {
                this.socket.emit('rules:set', { pointGap, targetScore, penaltyLimit })
            }
        },

        setPenaltyVisibility(cat: Cat, visible: boolean) {
            if (this.socket?.connected) {
                this.socket.emit('penaltyVisibility:set', { cat, visible })
            }
        },

        saveConfig(payload: any) {
            if (this.socket?.connected) {
                this.socket.emit('config:save', payload)
            }
        }
    }
})