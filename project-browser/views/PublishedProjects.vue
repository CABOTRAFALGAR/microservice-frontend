<template>
  <FileBrowser
    :loading="!projects"
    :count="folder.length"
    v-model="search"
    @display="setDisplay"
  >
    <template #header-left>
      <div class="header-filter">
        <Dropdown :items="names" :selected="nameFilter" emptyValue="Model Name" @change="filterByName" />
        <Dropdown :items="ids" :selected="idFilter" emptyValue="Id" @change="filterById" />
      </div>
    </template>
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
          :draggable="item.draggable"
          :openAction="item.openAction"
          @open="item.onOpen"
          @focus="item.onFocus"
          @blur="item.onBlur"
        >
          <template #icon>
            <Thumbnail :item="item.$" />
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
            <Thumbnail :item="item.$" />
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
import {
  useDisplay, uriToID, parseToDateString,
  openProject, not, useSorting, useSelectItem
} from '../utils';
import { trackEvent } from '../../../services/analytics';
import { getProjects } from '../../../services/fetch';
import { isNullOrUndefined } from '../../../logic/util';
import Icon from '../../Icon.vue';
import Thumbnail from '../../Thumbnail.vue';
import FileBrowser from '../components/FileBrowser.vue';
import GridItem from '../components/GridItem.vue';
import GridView from '../components/GridView.vue';
import TableHeader from '../components/TableHeader.vue';
import TableItem from '../components/TableItem.vue';
import TableView from '../components/TableView.vue';
import Dropdown from '../../Dropdown.vue';
import { withSpinner } from '../../../logic/state/ui';

export default {
  components: {
    Icon,
    FileBrowser,
    GridItem,
    GridView,
    TableHeader,
    TableItem,
    TableView,
    Thumbnail,
    Dropdown
  },
  emits: [ 'close' ],
  inject: [ 'workspace' ],
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
      search: null,
      idFilter: null,
      nameFilter: null
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
          name: this.$t('properties.project.id')
          // TODO: implement sorting
          //onClick: () => this.toggleSort(this.SORT_BY.ID),
          //sortBy: this.SORT_BY.ID
        },
        {
          name: this.$t('properties.project.season')
          // TODO: implement sorting
          //onClick: () => this.toggleSort(this.SORT_BY.SEASON),
          //sortBy: this.SORT_BY.SEASON
        },
        {
          name: this.$t('properties.project.published')
        },
        {
          name: this.$t('properties.project.version')
        }
      ];
    },
    folder() {
      if (!this.projects) {
        return [];
      }

      let _projects = [ ...this.projects ]
        .filter(({ name }) => !this.search || name.toLowerCase().includes(this.search.toLowerCase()));

      if (this.idFilter) {
        _projects = _projects.filter(({id}) => this.idFilter === id);
      }
      if (this.nameFilter) {
        _projects = _projects.filter(({name}) => this.nameFilter === name);
      }
      this.sort(_projects);

      return _projects;
    },
    items() {
      return this.folder.map((item, index) => ({
        $: item,
        key: [ uriToID(item.uri), item.name, index ].filter(not(isNullOrUndefined)).join('::'),
        active: this.isSelected(item),
        draggable: false,
        columns: [
          { name: this.$t('properties.project.name'), value: item.name },
          { name: this.$t('properties.project.modified'), value: parseToDateString(item.modified) },
          { name: this.$t('properties.project.season'), value: item.season },
          // TODO fill data
          { name: this.$t('properties.project.published'), value: parseToDateString(item.published) },
          { name: this.$t('properties.project.version'), value: item.version}

        ],
        actions: [
          { name: this.$t('projectbrowser.action.copy'), onClick: () => this.copyProject(item), icon: 'copycontent' }
        ],
        onOpen: () => this.openProject(item),
        onFocus: () => this.selectItem(item),
        onBlur: () => this.selectNone()
      }));
    },
    ids() {
      if (!this.projects) {
        return [];
      }

      const groups = this.projects.reduce((dict, item) => {
        const key = item.id;
        dict[key] = dict[key] || [];
        dict[key].push(item);
        return dict;
      }, {});

      const keys = Object.keys(groups);
      return keys;
    },
    names() {
      if (!this.projects) {
        return [];
      }
      const groups = this.projects.reduce((dict, item) => {
        const key = item.name;
        dict[key] = dict[key] || [];
        dict[key].push(item);
        return dict;
      }, {});

      const keys = Object.keys(groups);
      return keys;
    }
  },
  methods: {
    async loadProjects() {
      this.projects = await getProjects();
    },

    openProject(item) {
      try {
        trackEvent('PublishedProject', 'openProject', item.id);
        openProject(this.workspace, item);
        this.$emit('close');
      } catch(e) {
        console.error(e.message);
      }
    },

    downloadProject(item) {
      trackEvent('PublishedProject', 'downloadProject', item.id);
      this.workspace.downloadFiles(item, { withExt: '.json' });
    },

    filterById(value) {
      this.idFilter = value;
      this.nameFilter = '';
    },

    filterByName(value) {
      this.idFilter = '';
      this.nameFilter = value;
    }
  },
  async mounted() {
    await withSpinner(async () => {
      await this.loadProjects();
    });
  }
};
</script>


<style lang="scss">

.header-filter {
  width: stretch;
  display: flex;
  flex-direction: row-reverse;
  background-color: var(--color-bg4);

  .Dropdown {
    width: auto;
  }
}

</style>
