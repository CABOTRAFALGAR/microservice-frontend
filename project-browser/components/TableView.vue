<template>
  <table class="file-list__table">
    <slot name="header" />
    <tbody>
      <slot />
    </tbody>
  </table>
</template>

<style lang="scss">
.file-list__table {
  width: 100%;
  border-collapse: collapse;

  td {
    padding: .5rem;
  }

  tr {
    overflow: hidden;
    padding-left: 0;
    margin: var(--listview-item-margin);
    border: 1px solid var(--color-lines2);
    border-style: outset;
    border-radius: var(--listview-item-border-radius);

    &:hover {
      background-color: var(--table-tr-hover) !important;
    }

    &:nth-child(odd) {
      background-color: var(--table-tr-odd);
      border-left: 1px solid var(--table-tr-odd);
      border-right: 1px solid var(--table-tr-odd);
    }

    &:nth-child(even) {
      background-color: var(--table-tr-even);
      border-left: 1px solid var(--table-tr-even);
      border-right: 1px solid var(--table-tr-even);
    }

    &.active {
      color: var(--color-select-text2);
      background-color: var(--color-select-bg3) !important;
      border-color: var(--color-active-outline4);
      border-style: dotted;
    }
  }

  thead td {
    position: sticky;
    top: 0;
    z-index: 10;
    background-color: var(--table-tr-odd);
  }

  thead tr {
    border: none !important;
  }

  .Thumbnail {
    display: inline-block;
    width: 3em;
    height: 3em;
    vertical-align: middle;
    border-radius: var(--listview-item-border-radius);
    background-size: contain;
  }
}
</style>
