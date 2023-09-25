<template>
  <tr
    class="file-list__item"
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
    <td class="file-list__icon">
      <slot name="icon" />
    </td>
    <td
      class="file-list__column"
      v-for="(column, index) in columns"
      :key="column.name + index"
    >
      <slot :name="column.name.toLowerCase()">
        {{ column.value }}
      </slot>
    </td>
    <td class="file-list__actions">
      <button
        class="btn"
        v-if="openAction"
        @click.prevent="$emit('open')"
      >
        Open
      </button>
      <button
        class="btn btn--icon"
        v-for="(action, index) in actions"
        :key="action.name + index"
        :title="action.name"
        @click.prevent="action.onClick"
      >
        <Icon :name="action.icon" />
      </button>
    </td>
  </tr>
</template>

<script>
import Icon from '../../Icon.vue';

export default {
  components: {
    Icon
  },
  props: {
    active: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: true
    },
    openAction: {
      type: Boolean,
      default: true
    },
    columns: {
      type: Array,
      default: () => []
    },
    actions: {
      type: Array,
      default: () => []
    }
  }
};
</script>

<style lang="scss">
.file-list {
  &__column {
    min-width: 5rem;
  }

  &__item {
    &:hover,
    &.active {
      .file-list__actions .btn {
        visibility: visible;
      }
    }
  }

  &__actions {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;

    .btn {
      flex: 1;
      max-width: 10rem;
      visibility: hidden;
    }

    .btn.btn--icon {
      flex: 0 0 2rem;
    }
  }
}
</style>
