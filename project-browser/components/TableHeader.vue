<template>
  <thead>
    <tr>
      <td class="file-list__icon"></td>
      <td
        class="file-list__column"
        v-for="header in headers"
        :key="header.name"
        @click="handleClick(header)"
      >
        {{ header.name }}
        <SortIcon v-if="sortBy === header.sortBy" :order="sortDirection" />
      </td>
      <td></td>
    </tr>
  </thead>
</template>

<script>
import SortIcon from './SortIcon.vue';

export default {
  components: {
    SortIcon
  },
  props: [
    'headers',
    'sortBy',
    'sortDirection'
  ],
  methods: {
    handleClick(item) {
      if (item.onClick) {
        item.onClick();
      }
    }
  }
};
</script>
