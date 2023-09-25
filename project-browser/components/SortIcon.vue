<template>
  <span :title="$t(`projectbrowser.sort.${ order }`)">
    <template v-if="order === 'asc'">▲</template>
    <template v-else>▼</template>
  </span>
</template>

<script>
export default {
  props: [ 'order' ]
};
</script>
