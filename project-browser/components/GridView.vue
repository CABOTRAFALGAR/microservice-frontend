<template>
  <div class="file-list__grid">
    <slot />
  </div>
</template>

<style lang="scss">
.file-list__grid {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  overflow: auto;
}
</style>
