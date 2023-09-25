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
          @click="item.onClick"
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
          @click="item.onClick"
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
import { isNullOrUndefined } from '../../../logic/util';
import { deleteProject, getDeletedProjects, restoreProject, restoreMultiProjects, deleteMultiProjects } from '../../../services/fetch';
import { trackEvent } from '../../../services/analytics';
import Icon from '../../Icon.vue';
import Thumbnail from '../../Thumbnail.vue';
import FileBrowser from '../components/FileBrowser.vue';
import GridItem from '../components/GridItem.vue';
import GridView from '../components/GridView.vue';
import TableHeader from '../components/TableHeader.vue';
import TableItem from '../components/TableItem.vue';
import TableView from '../components/TableView.vue';
import { useDisplay, useSorting, parseToDateString, useMultiSelectItem, uriToID, not } from '../utils';
import { withSpinner } from '../../../logic/state/ui';

export default {
  components: {
    Icon,
    Thumbnail,
    FileBrowser,
    GridItem,
    GridView,
    TableHeader,
    TableItem,
    TableView
  },
  inject: [ 'workspace' ],
  setup() {
    return {
      ...useDisplay(),
      ...useSorting(),
      ...useMultiSelectItem()
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
          openAction: false,
          columns: [
            { name: this.$t('properties.project.name'), value: item.name },
            { name: this.$t('properties.project.modified'), value: parseToDateString(item.modified) }
          ],
          actions: [
            { name: this.$t('projectbrowser.action.restore'), onClick: () => this.restoreProject(item), icon: 'restore' },
            { name: this.$t('projectbrowser.action.remove'), onClick: () => this.removeProject(item), icon: 'delfile' }
          ],
          onClick: (event) => this.handleItemClick(event, item, index)
        };
      });
    }
  },
  methods: {
    async loadProjects() {
      const [ projects ] = await Promise.all([
        getDeletedProjects(),
        this.workspace.storage.projects.refresh()
      ]);

      this.projects = projects;
    },

    restoreProject(item) {
      const toRestore = [...this.selectedItems];

      this.workspace.openAlert({
        title: this.$t('projectbrowser.alert.restore.title'),
        text: this.$t('projectbrowser.alert.restore.text'),
        buttonType: 'YesNo',
        fnYes: async () => {
          await withSpinner(async () => {

            if (this.isClickOnSelectedItem(toRestore, item)) {
              // Restore all selected ONLY if clicked item was already selected
              await restoreMultiProjects(toRestore.map((it) => it.id));
            } else {
              await restoreProject(item.id);
            }
            trackEvent('DeletedProjects', 'restoreProject', item.id);
            await this.loadProjects();
          });
        }
      });
    },

    removeProject(item) {
      const toDelete = [...this.selectedItems];

      this.workspace.openAlert({
        title: this.$t('projectbrowser.alert.delete.title'),
        text: this.$t('projectbrowser.alert.delete.text'),
        buttonType: 'YesNo',
        fnYes: async () => {
          await withSpinner(async () => {

            if (this.isClickOnSelectedItem(toDelete, item)) {
              // Delete all selected ONLY if clicked item was already selected
              await deleteMultiProjects(toDelete.map((it) => it.id));
            } else {
              await deleteProject(item.id);
            }

            trackEvent('DeletedProjects', 'deleteProject', item.id);
            await this.loadProjects();
          });
        }
      });
    },

    handleItemClick(event, item, index) {
      if (event.ctrlKey || event.metaKey) {
        this.addToSelection(item);
      } else if (event.shiftKey) {
        this.areaSelection(this.items, index);
      } else {
        this.selectItem(item);
      }
    }
  },
  async mounted() {
    await withSpinner(async () => {
      await this.loadProjects();
    });
  }
};
</script>
