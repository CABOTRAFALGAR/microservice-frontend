<template>
  <FileBrowser
    :loading="!projects"
    :count="folder.length"
    v-model="search"
    @display="setDisplay"
  >
    <template #header-left>
      <Icon name="newfolder" :title="$t('projectbrowser.newfolder')" @click="createFolder" />
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
          v-if="currentPath.length"
          :columns="headers"
          :openAction="false"
          @open="popFolder"
          @drop="handleDropOut">
          <template #icon>
            <div class="Thumbnail" style="background-image: url('/static/icons/item/parent.png');"></div>
          </template>
          <template #name>
            {{ toPath(parentPath) }}
          </template>
        </TableItem>
        <template v-for="item in items" :key="item.key">
          <TableItem
            :ref="item.key"
            :active="item.active"
            :columns="item.columns"
            :actions="item.actions"
            :draggable="item.draggable"
            :openAction="item.openAction"
            @open="item.onOpen"
            @drag="item.onDrag"
            @drop="item.onDrop"
            @click.stop="item.onClick"
          >
            <template #icon>
              <Thumbnail :item="item.$" :url="item.thumbnailUrl" />
            </template>
            <template #name>
              <EditLabel
                :ref="item.key + '::name'"
                :text="item.$.name"
                @changed="handleRename(item.$, $event)" />
            </template>
            <template #sharing>
              <span v-if="item.folder">-</span>
              <span v-else :title="item.$.users.join(', ')">{{ $tc('projectbrowser.sharing', item.$.users.length, { count: item.$.users.length }) }}</span>
            </template>
          </TableItem>
        </template>
      </TableView>
      <GridView v-if="isDisplay(DISPLAY_AS.GRID)">
        <div
          v-if="currentPath.length"
          class="file-list__card"
          @dblclick="popFolder"
          @drop.stop="handleDropOut"
          @dragover.stop.prevent
          @dragenter.stop.prevent
        >
          <div class="file-list__card__image">
            <div class="Thumbnail" style="background-image: url('/static/icons/item/parent.png');"></div>
          </div>
          <div class="file-list__card__title">
            {{ toPath(parentPath) }}
          </div>
        </div>
        <GridItem
          v-for="item in items"
          :ref="item.key"
          :key="item.key"
          :active="item.active"
          :actions="item.actions"
          :draggable="item.draggable"
          @open="item.onOpen"
          @drag="item.onDrag"
          @drop="item.onDrop"
          @click.stop="item.onClick"
        >
          <template #icon>
            <Thumbnail :item="item.$" :url="item.thumbnailUrl" />
          </template>
          <template #name>
            <EditLabel
              :ref="item.key + '::name'"
              :text="item.$.name"
              @changed="handleRename(item.$, $event)" />
          </template>
        </GridItem>
      </GridView>
    </template>
    <template #footer-actions v-if="operation === PROJECT_BROWSER_OPERATIONS.SAVE_AS">
      <input type="text" v-model="projectName" :placeholder="$t('projectbrowser.filename')">
      <button class="btn" @click="saveProjectAs">{{ $t('projectbrowser.save') }}</button>
    </template>
    <template #footer-left>
      {{ toPath(currentPath) }}
    </template>
  </FileBrowser>
</template>

<script>
import {
  getProject, getProjects, getProjectsIndex,
  softDeleteProject, softDeleteMultiProjects, updateProject, updateProjectsIndex
} from '../../../services/fetch';
import { removeLock } from '../../../services/lock';
import { loadRecents } from '../../../services/recents';
import { trackEvent } from '../../../services/analytics';
import { VirtualNode } from '../../../logic/VirtualStore';
import Icon from '../../Icon.vue';
import EditLabel from '../../EditLabel.vue';
import Thumbnail from '../../Thumbnail.vue';
import FileBrowser from '../components/FileBrowser.vue';
import GridItem from '../components/GridItem.vue';
import GridView from '../components/GridView.vue';
import TableHeader from '../components/TableHeader.vue';
import TableItem from '../components/TableItem.vue';
import TableView from '../components/TableView.vue';
import { PROJECT_BROWSER_OPERATIONS } from '../constants';
import {
  useDisplay, useSorting, useMultiSelectItem,
  isFolder, toPath, getItemAtPath, getItemsAtPath, addItemAtPath, moveItemAtPathToTarget,
  parseToDateString, openProject, getAllItemsIndexed, copyProject,
  uriToID, idToURI, findUniqueName, not
} from '../utils';
import { isNullOrUndefined } from '../../../logic/util';
import { withSpinner } from '../../../logic/state/ui';

export default {
  components: {
    EditLabel,
    FileBrowser,
    GridItem,
    GridView,
    Icon,
    TableHeader,
    TableItem,
    TableView,
    Thumbnail
  },
  props: {
    operation: {
      type: String,
      default: PROJECT_BROWSER_OPERATIONS.BROWSE
    }
  },
  emits: [ 'close' ],
  inject: [ 'workspace', 'globalState' ],
  setup() {
    return {
      ...useDisplay(),
      ...useSorting(),
      ...useMultiSelectItem()
    };
  },
  data() {
    return {
      PROJECT_BROWSER_OPERATIONS,
      index: null,
      projects: null,
      search: null,
      currentPath: [],
      projectName: this.workspace.name
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
          name: this.$t('properties.project.sharing')
        }
      ];
    },
    folder() {
      if (!this.index) {
        return [];
      }

      if (!this.index.children.length) {
        this.index.children = this.projects.map(({ name, id }) => ({
          name,
          uri: idToURI(id)
        }));
      } else {
        const indexed = getAllItemsIndexed(this.index);

        this.projects.forEach((project) => {
          if (!indexed[project.id]) {
            this.index.children.push({
              name: project.name,
              uri: idToURI(project.id)
            });
          }
        });
      }

      const items = getItemsAtPath(this.index, this.currentPath)
        .map((item) => {
          if (!item.uri) {
            return item;
          }

          return this.projects.find(({ id }) => id === uriToID(item.uri));
        })
        .filter(Boolean)
        .filter(({ name }) => !this.search || name.toLowerCase().includes(this.search.toLowerCase()));

      this.sort(items);

      return items;
    },
    items() {
      return this.folder.map((item, index) => {
        const folder = isFolder(item);
        let thumbnailUrl = '';
        if (item.thumbnailId) {
          thumbnailUrl = `/api/media/${ item.thumbnailId }`;
        } else {
          thumbnailUrl = folder ? '/static/icons/item/folder.png' : '/static/icons/item/object.png';
        }

        return {
          $: item,
          thumbnailUrl,
          folder,
          key: [ uriToID(item.uri), item.name, index ].filter(not(isNullOrUndefined)).join('::'),
          active: this.isSelected(item),
          draggable: true,
          openAction: !folder,
          columns: [
            { name: this.$t('properties.project.name'), value: item.name },
            { name: this.$t('properties.project.modified'), value: folder ? '-' : parseToDateString(item.modified) },
            { name: this.$t('properties.project.sharing'), value: folder ? '-' : item.users }
          ],
          actions: folder
            ? []
            : [
              { name: this.$t('projectbrowser.action.copy'), onClick: () => this.copyProject(item), icon: 'copycontent' },
              { name: this.$t('projectbrowser.action.remove'), onClick: () => this.recycleProject(item), icon: 'delfile' },
              { name: this.$t('projectbrowser.action.download'), onClick: () => this.downloadProject(item), icon: 'download' }
            ],
          onOpen: folder
            ? () => this.pushFolder(item.name)
            : () => this.openProject(item),
          onClick: (event) => this.handleItemClick(event, item, index),
          onDrag: (event) => this.handleDrag(event, index),
          onDrop: folder
            ? (event) => this.handleDropIn(event, item)
            : () => {}
        };
      });
    },
    parentPath() {
      const copy = [ ...this.currentPath ];

      copy.pop();

      return copy;
    }
  },
  methods: {
    toPath,

    async loadProjects() {
      const [ index, projects ] = await Promise.all([
        getProjectsIndex().then((r) => r.json()),
        getProjects(),
        this.workspace.storage.projects.refresh()
      ]);

      this.index = index;
      this.projects = projects.filter(({ author }) => author === this.globalState.user.name);
    },

    openProject(item) {
      try {
        trackEvent('MyProjects', 'openProject', item.id);
        openProject(this.workspace, item);
        this.$emit('close');
      } catch(e) {
        console.error(e.message);
      }
    },

    async copyProject(item) {
      await withSpinner(async () => {
        const copyItem = await copyProject(item);
        const copyNode = new VirtualNode(copyItem.name, copyItem.uri);

        addItemAtPath(this.index, this.currentPath, copyNode);

        await updateProjectsIndex(this.index);

        trackEvent('MyProjects', 'copyProject', item.id);

        await this.loadProjects();
      });
    },

    downloadProject(item) {
      trackEvent('MyProjects', 'downloadProject', item.id);
      this.workspace.downloadFiles(item, { withExt: '.json' });
    },

    recycleProject(item) {
      const toDelete = [...this.selectedItems];
      this.workspace.openAlert({
        title: this.$t('projectbrowser.alert.recycle.title'),
        text: this.$t('projectbrowser.alert.recycle.text'),
        buttonType: 'YesNo',
        fnYes: async () => {
          await withSpinner(async () => {
            trackEvent('MyProjects', 'recycleProject', item.id);

            if (this.isClickOnSelectedItem(toDelete, item)) {
              // Delete all selected ONLY if clicked item was already selected
              await softDeleteMultiProjects(toDelete.map((it) => it.id));
            } else {
              await softDeleteProject(item.id);
            }

            if (this.workspace.projectId === item.id) {
              await removeLock(this.workspace.uri);
              await this.workspace.RegisteredCommands.FileNew.do();
            }

            await Promise.all([
              this.loadProjects(),
              loadRecents()
            ]);

            this.checkDeletedEmptyFolder();
          });
        }
      });
    },

    async handleRename(item, value) {
      if (item.uri) {
        const id = uriToID(item.uri);
        const project = await getProject(id);

        project.name = value;
        withSpinner(async () => {
          await updateProject(project, id);
          await this.loadProjects();
        });

        trackEvent('MyProjects', 'renameProject', item.id);
      } else {
        item.name = value;

        if (item.children?.length) {
          withSpinner(async () => {
            await updateProjectsIndex(this.index);
            await this.loadProjects();
          });
        }
      }
    },

    async saveProjectAs() {
      await withSpinner(async () => {
        trackEvent('MyProjects', 'saveProjectAs');
        await this.workspace.saveProject(this.projectName, this.currentPath, { asNew: true });
        await this.loadProjects();
      });

      this.$emit('close');
    },

    handleItemClick(event, item, index) {
      if (event.ctrlKey || event.metaKey) {
        this.addToSelection(item);
      } else if (event.shiftKey) {
        this.areaSelection(this.items, index);
      } else {
        this.selectItem(item);
      }
    },

    handleItemDoubleClick(item) {
      if (isFolder(item)) {
        this.pushFolder(item.name);
      } else {
        this.openProject(item);
      }
    },

    handleDrag(event, index) {
      event.dataTransfer.setData('index', index);
    },

    async handleDropIn(event, target) {
      const index = event.dataTransfer.getData('index');
      const source = this.folder[index];

      // prevent adding item to itself
      if (source === target) {
        return;
      }

      await this.move(source, target);
    },

    async handleDropOut(event) {
      const index = event.dataTransfer.getData('index');
      const source = this.folder[index];
      const target = getItemAtPath(this.index, this.parentPath);

      await withSpinner(async () => {
        await this.move(source, target);
        await this.loadProjects();
      });

      this.checkDeletedEmptyFolder();
    },

    async move(source, target) {
      if (!source || !target) {
        return;
      }

      moveItemAtPathToTarget(this.index, this.currentPath, source, target);

      await updateProjectsIndex(this.index);
    },

    pushFolder(name) {
      this.currentPath.push(name);
    },

    popFolder() {
      this.currentPath.pop();
    },

    createFolder() {
      const target = getItemAtPath(this.index, this.currentPath);
      const name = findUniqueName(target, this.$t('projectbrowser.newfolder'));

      addItemAtPath(this.index, this.currentPath, { name, children: [] });

      trackEvent('MyProjects', 'createFolder');

      this.$nextTick(() => {
        const item = this.items.find((item) => item.$.name === name);

        item.onFocus();
        this.scrollToItemByKey(item.key);
        this.editItemNameByKey(item.key + '::name');
      });
    },

    checkDeletedEmptyFolder() {
      const parentChildren = getItemsAtPath(this.index, this.parentPath);

      // Gather the name of the current folder by looking at the last item of currentPath
      const thisFolder = this.currentPath[this.currentPath.length - 1];

      // Check if current folder is deleted looking into parent folder children
      if (thisFolder && !parentChildren.find((child) => child.name === thisFolder)) {
        this.popFolder();
      }
    },

    scrollToItemByKey(key) {
      const component = this.$refs[key][0];

      if (component) {
        component.$el.scrollIntoView({ block: 'center' });
      }
    },

    editItemNameByKey(key) {
      const editLabel = this.$refs[key][0];

      if (editLabel) {
        editLabel.startEditing();
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
