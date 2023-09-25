<template>
  <div
    class="file-list__card"
    :class="{ active: active }"
    :draggable="draggable"
    tabindex="0"
    @focus="$emit('focus')"
    @blur="$emit('blur')"
    @dblclick="$emit('open')"
    @dragstart.stop="$emit('drag', $event)"
    @dragover.stop.prevent
    @dragenter.stop.prevent
  >
    <div class="file-list__card__image">
      <slot name="icon" />
    </div>
    <div class="file-list__card__title">
      <slot name="name" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    active: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: true
    },
    actions: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style lang="scss">
.file-list__card {
  flex: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid transparent;

  &.active {
    color: var(--color-select-text2);
    background-color: var(--color-select-bg3) !important;
    border-color: var(--color-active-outline4);
    border-style: dotted;
  }

  &__image {
    text-align: center;
  }

  &__title {
    text-align: center;
    max-width: var(--file-browser-thumbnail-size);
    line-height: 1.5em;
    max-height: 3em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
