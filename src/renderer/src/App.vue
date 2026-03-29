<script setup lang="ts">
import MainLayout from './components/MainLayout.vue'
</script>

<template>
  <div class="app">
    <MainLayout />
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html,
body,
#app {
  width: 100%;
  height: 100%;
  background: #1e1e1e;
  color: #cccccc;
  overflow: hidden;
}

html.dark {
  color-scheme: dark;
}

.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
</style>
