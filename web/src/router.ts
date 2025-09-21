import { createRouter, createWebHistory } from 'vue-router'
import Display from './views/Display.vue'
import Control from './views/Control.vue'
import Config from './views/Config.vue'
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/display' },
    { path: '/display', component: Display },
    { path: '/control', component: Control },
    { path: '/config', component: Config }
  ]
})