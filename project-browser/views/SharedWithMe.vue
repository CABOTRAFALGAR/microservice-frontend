<template>
  <FileBrowser
    :loading="!projects"
    :count="folder.length"
    v-model="search"
    @display="setDisplay"
  >
    <template #main>
      <TableView v-if="isDisplay(DISPLAY_AS.ROWS)">
        <template #header>
          <TableHeader
            :sortBy="sortBy"
            :sortDirection="sortDirection"
            :headers="headers"
          />
        </template>
        <TableItem
          v-for="item in items"
          :key="item.key"
          :active="item.active"
          :columns="item.columns"
          :actions="item.actions"
          :draggable="item.draggable"
          :openAction="item.openAction"
          @open="item.onOpen"
          @focus="item.onFocus"
          @blur="item.onBlur"
        >
          <template #icon>
            <Thumbnail :item="item.$" :url="item.thumbnailUrl" />
          </template>
        </TableItem>
      </TableView>
      <GridView v-if="isDisplay(DISPLAY_AS.GRID)">
        <GridItem
          v-for="item in items"
          :key="item.key"
          :active="item.active"
          :actions="item.actions"
          :draggable="item.draggable"
          @focus="item.onFocus"
          @blur="item.onBlur"
        >
          <template #icon>
            <Thumbnail :item="item.$" :url="item.thumbnailUrl" />
          </template>
          <template #name>
            {{ item.$.name }}
          </template>
        </GridItem>
      </GridView>
    </template>
  </FileBrowser>
</template>

<script>
import { getProjects, removeSharedProject } from '../../../services/fetch';
import { trackEvent } from '../../../services/analytics';
import Icon from '../../Icon.vue';
import Thumbnail from '../../Thumbnail.vue';
import FileBrowser from '../components/FileBrowser.vue';
import GridItem from '../components/GridItem.vue';
import GridView from '../components/GridView.vue';
import TableHeader from '../components/TableHeader.vue';
import TableItem from '../components/TableItem.vue';
import TableView from '../components/TableView.vue';
import {
  useDisplay, useSorting, useSelectItem,
  parseToDateString, openProject, copyProject, uriToID, not
} from '../utils';
import { isNullOrUndefined } from '../../../logic/util';
import { withSpinner } from '../../../logic/state/ui';

export default {
  components: {
    FileBrowser,
    GridItem,
    GridView,
    Icon,
    TableHeader,
    TableItem,
    TableView,
    Thumbnail
  },
  emits: [ 'close' ],
  inject: [ 'workspace', 'globalState' ],
  setup() {
    return {
      ...useDisplay(),
      ...useSorting(),
      ...useSelectItem()
    };
  },
  data() {
    return {
      projects: null,
      search: null
    };
  },
  computed: {
    headers() {
      return [
        {
          name: this.$t('properties.project.name'),
          onClick: () => this.toggleSort(this.SORT_BY.NAME),
          sortBy: this.SORT_BY.NAME
        },
        {
          name: this.$t('properties.project.modified'),
          onClick: () => this.toggleSort(this.SORT_BY.MODIFIED),
          sortBy: this.SORT_BY.MODIFIED
        },
        {
          name: this.$t('properties.project.author')
        }
      ];
    },
    folder() {
      if (!this.projects) {
        return [];
      }

      const _projects = [ ...this.projects ]
        .filter(({ name }) => !this.search || name.toLowerCase().includes(this.search.toLowerCase()));

      this.sort(_projects);

      return _projects;
    },
    items() {
      return this.folder.map((item, index) => {
        const thumbnailUrl = item.thumbnailId ? `/api/media/${ item.thumbnailId }` : '/static/icons/item/object.png';

        return {
          $: item,
          thumbnailUrl,
          key: [ uriToID(item.uri), item.name, index ].filter(not(isNullOrUndefined)).join('::'),
          active: this.isSelected(item),
          draggable: false,
          columns: [
            { name: this.$t('properties.project.name'), value: item.name },
            { name: this.$t('properties.project.modified'), value: parseToDateString(item.modified) },
            { name: this.$t('properties.project.author'), value: item.author }
          ],
          actions: [
            { name: this.$t('projectbrowser.action.copy'), onClick: () => this.copyProject(item), icon: 'copycontent' },
            { name: this.$t('projectbrowser.action.remove'), onClick: () => this.removeSharedProject(item), icon: 'delfile' },
            { name: this.$t('projectbrowser.action.download'), onClick: () => this.downloadProject(item), icon: 'download' }
          ],
          onOpen: () => this.openProject(item),
          onFocus: () => this.selectItem(item),
          onBlur: () => this.selectNone()
        };
      });
    }
  },
  methods: {
    async loadProjects() {
      const projects = await getProjects();

      this.projects = projects.filter(({ author }) => author !== this.globalState.user.name);
    },

    async copyProject(item) {
      this.workspace.openAlert({
        title: this.$t('projectbrowser.alert.copyshared.title'),
        text: this.$t('projectbrowser.alert.copyshared.text'),
        buttonType: 'YesNo',
        fnYes: async () => {
          await withSpinner(async () => {
            await copyProject(item);
            trackEvent('SharedWithMe', 'copyProject', item.id);
          });
        }
      });
    },

    async removeSharedProject(item) {
      this.workspace.openAlert({
        title: this.$t('projectbrowser.alert.deleteshared.title'),
        text: this.$t('projectbrowser.alert.deleteshared.text'),
        buttonType: 'YesNo',
        fnYes: async () => {
          await withSpinner(async () => {
            await removeSharedProject(item.id);
            trackEvent('SharedWithMe', 'removeSharedProject', item.id);
            await this.loadProjects();
          });
        }
      });
    },

    openProject(item) {
      try {
        trackEvent('SharedWithMe', 'openProject', item.id);
        openProject(this.workspace, item);
        this.$emit('close');
      } catch(e) {
        console.error(e.message);
      }
    },

    downloadProject(item) {
      trackEvent('MyProjects', 'downloadProject', item.id);
      this.workspace.downloadFiles(item, { withExt: '.json' });
    }
  },
  async mounted() {
    await withSpinner(async () => {
      await this.loadProjects();
    });
  }
};
</script>
