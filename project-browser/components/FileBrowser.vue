<template>
  <div class="file-browser">
    <div class="file-browser__header">
      <div class="file-browser__header__actions">
        <template v-if="!skipDisplayButton">
          <Icon name="icons" v-if="isDisplay(DISPLAY_AS.ROWS)" :title="$t('projectbrowser.gridview')" @click="handleDisplay(DISPLAY_AS.GRID)" />
          <Icon name="table" v-if="isDisplay(DISPLAY_AS.GRID)" :title="$t('projectbrowser.tableview')" @click="handleDisplay(DISPLAY_AS.ROWS)" />
        </template>
        <slot name="header-left" />
      </div>
      <div class="file-browser__header__filter">
        <input type="text" :placeholder="$t('projectbrowser.search')" @input="handleSearch" />
      </div>
    </div>
    <div class="file-browser__file-list" @scroll.prevent="handleScroll">
      <slot name="main" />
    </div>
    <div class="file-browser__footer">
      <div class="file-browser__footer__actions">
        <slot name="footer-actions" />
      </div>
      <div class="file-browser__footer__metadata">
        <div>
          <slot name="footer-left" />
        </div>
        <div>
          <template v-if="loading">{{ $t('projectbrowser.loading') }}</template>
          <template v-else>{{ $tc('projectbrowser.items', count, { count }) }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Icon from '../../Icon.vue';
import { useDisplay } from '../utils';

export default {
  components: {
    Icon
  },
  props: [ 'loading', 'count', 'modelValue', 'skipDisplayButton' ],
  emits: [ 'update:modelValue', 'display' ],
  setup() {
    return {
      ...useDisplay()
    };
  },
  methods: {
    handleSearch(event) {
      this.$emit('update:modelValue', event.currentTarget.value);
    },
    handleDisplay(displayAs) {
      this.setDisplay(displayAs);

      this.$emit('display', displayAs);
    },
    handleScroll(event) {
      const { scrollTop, clientHeight, scrollHeight } = event.target;

      const scrollDownThreshold = 60;
      if (Math.ceil(scrollTop + clientHeight + scrollDownThreshold) >= scrollHeight) {
        this.$emit('scrolledToBottom');
      }
    }
  }
};
</script>

<style lang="scss">
@import "../../../scss/mixins";

.file-browser {
  flex: 1;
  display: flex;
  flex-direction: column;

  &__header {
    flex: 0 0 2rem;
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    &__actions {
      display: flex;
      flex-direction: row;
      align-items: center;
      width: stretch;

      .icon {
        margin-left: .5rem;
      }
    }

    &__filter {
      display: flex;
      align-items: center;
      margin-right: .5rem;

      @include inputField;
    }
  }

  &__footer {
    &__actions {
      flex: 0 0 2rem;
      padding: 0 1rem;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;

      .btn {
        background: var(--color-bg3);
        margin-top: 5px;
        margin-right: 0px;

        &:hover {
          background: var(--color-active-bg3);
        }
      }
    }

    &__metadata {
      flex: 0 0 2rem;
      padding: 0 1rem;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
    }
  }

  &__file-list {
    flex: 1;
    background: var(--color-bg);
    overflow: auto;
  }
}
</style>
