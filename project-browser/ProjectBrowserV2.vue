<template>
  <div class="project-browser">
    <div class="project-browser__header">
      <div class="project-browser__header__close" @click="close">
        <Icon name="close" size=".5rem" />
      </div>
      <div class="project-browser__header__title Logo"></div>
    </div>
    <div class="project-browser__main">
      <div class="project-browser__sidebar">
        <div class="project-browser__sidebar__views">
          <button
            class="btn"
            :class="{ 'btn--active': isView(VIEWS.MY_PROJECTS) }"
            name="view-myprojects"
            :disabled="isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="setView(VIEWS.MY_PROJECTS)"
          >
            {{ $t('projectbrowser.view.myprojects') }}
          </button>
          <button
            class="btn"
            :class="{ 'btn--active': isView(VIEWS.SHARED_WITH_ME) }"
            name="view-sharedprojects"
            :disabled="isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="setView(VIEWS.SHARED_WITH_ME)"
          >
            {{ $t('projectbrowser.view.sharedwithme') }}
          </button>
          <button
            class="btn"
            :class="{ 'btn--active': isView(VIEWS.DELETED_PROJECTS) }"
            name="view-deletedprojects"
            :disabled="isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="setView(VIEWS.DELETED_PROJECTS)"
          >
            {{ $t('projectbrowser.view.deletedprojects') }}
          </button>
          <button
            v-if="showPublishedProjects"
            class="btn"
            :class="{ 'btn--active': isView(VIEWS.PUBLISHED) }"
            name="view-publishedprojects"
            :disabled="isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="setView(VIEWS.PUBLISHED)">
            {{ $t('projectbrowser.view.published') }}
          </button>
          <button
            class="btn"
            :class="{ 'btn--active': isView(VIEWS.UPLOAD_HISTORY) }"
            name="view-uploadhistory"
            @click="setView(VIEWS.UPLOAD_HISTORY)">
            {{ $t('projectbrowser.view.uploadhistory') }}
          </button>
        </div>
        <div class="project-browser__sidebar__separator"></div>
        <div class="project-browser__sidebar__actions">
          <button
            class="btn"
            name="action-recover"
            :disabled="!hasBackup || isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="restoreProject">
            {{ $t('welcome.recover') }}
          </button>
          <button
            class="btn"
            name="action-newproject"
            :disabled="isOperation(PROJECT_BROWSER_OPERATIONS.SAVE_AS)"
            @click="createNewProject">
            {{ $t('welcome.new') }}
          </button>
        </div>
        <template v-if="recents && recents.length > 0">
          <div class="project-browser__sidebar__separator"></div>
          <div class="project-browser__sidebar__recents" name="recents">
            <h4 class="text-center">{{ $t('welcome.recent') }}</h4>
            <button class="btn btn--text" v-for="recent in recents" :key="recent.id" @click="loadProject(recent.id)">{{ recent.name }}</button>
            <button class="btn" @click="clearRecents">{{ $t('menu.file.clearrecents') }}</button>
          </div>
        </template>
        <div class="project-browser__sidebar__separator"></div>
        <div class="project-browser__sidebar__user">
          <h4 class="text-center">{{ $t('menu.loggedinas', { user }) }}</h4>
          <button
            class="btn btn--danger"
            name="action-logout"
            @click="logout">
            {{ $t('menu.logout') }}
          </button>
        </div>
      </div>
      <UploadHistory v-if="isView(VIEWS.UPLOAD_HISTORY)" />
      <MyProjects v-if="isView(VIEWS.MY_PROJECTS)" :operation="operation" @close="close" />
      <SharedWithMe v-else-if="isView(VIEWS.SHARED_WITH_ME)" />
      <DeletedProjects v-else-if="isView(VIEWS.DELETED_PROJECTS)" />
      <PublishedProjects v-else-if="isView(VIEWS.PUBLISHED)" />
    </div>
    <div class="project-browser__footer">
      <div @click="copyVersion">{{ workspace.version }}</div>
    </div>
  </div>
</template>

<script>
import { clearBrowserStorage, loadBackup } from '../../services/storage';
import { reportEvent, trackEvent } from '../../services/analytics';
import { logger } from '../../services/logger';
import { FEATURE_FLAGS } from '../../logic/constants';
import Icon from '../Icon.vue';
import MyProjects from './views/MyProjects.vue';
import SharedWithMe from './views/SharedWithMe.vue';
import DeletedProjects from './views/DeletedProjects.vue';
import PublishedProjects from './views/PublishedProjects.vue';
import UploadHistory from './views/UploadHistory.vue';
import { PROJECT_BROWSER_OPERATIONS } from './constants';
import { idToURI } from './utils';

const VIEWS = {
  MY_PROJECTS: 'MyProjects',
  SHARED_WITH_ME: 'SharedWithMe',
  DELETED_PROJECTS: 'DeletedProjects',
  PUBLISHED: 'PublishedProjects',
  UPLOAD_HISTORY: 'UploadHistory'
};

export default {
  name: 'ProjectBrowserV2',
  props: {
    operation: {
      type: String,
      default: PROJECT_BROWSER_OPERATIONS.BROWSE
    }
  },
  components: {
    Icon,
    MyProjects,
    SharedWithMe,
    DeletedProjects,
    PublishedProjects,
    UploadHistory
  },
  emits: [ 'close' ],
  inject: [ 'workspace', 'globalState' ],
  data() {
    return {
      PROJECT_BROWSER_OPERATIONS,
      saveProjectName: this.projectName,
      VIEWS,
      view: VIEWS.MY_PROJECTS,
      hasBackup: false,
      showPublishedProjects: FEATURE_FLAGS.USE_PUBLISHED_PROJECTS
    };
  },
  computed: {
    recents() {
      return this.workspace.recents.slice(0, 3);
    },
    user() {
      return this.globalState.user.name;
    }
  },
  methods: {
    isOperation(name) {
      return this.operation === name;
    },
    setView(name) {
      this.view = name;
    },
    isView(name) {
      return this.view === name;
    },
    close() {
      this.$emit('close');
    },
    clearRecents() {
      trackEvent('ProjectBrowserV2', 'clearRecents');
      this.workspace.RegisteredCommands.ClearRecents.do();
    },
    createNewProject() {
      trackEvent('ProjectBrowserV2', 'createProject');
      this.$emit('close');
      this.workspace.RegisteredCommands.FileNew.do();
    },
    restoreProject() {
      trackEvent('ProjectBrowserV2', 'restoreProjectFromBackup');
      this.$emit('close');
      this.workspace.RegisteredCommands.FileRevert.do();
    },
    async logout() {
      await clearBrowserStorage();
      reportEvent('logout');
      trackEvent('ProjectBrowserV2', 'logout');
      this.$router.push('/logout');
    },
    async copyVersion() {
      await navigator.clipboard.writeText(this.workspace.version);
      logger.message(this.$t('alerts.versioncopied'));
    },
    loadProject(id) {
      trackEvent('ProjectBrowserV2', 'openProject', id);
      this.$emit('close');
      this.workspace.loadProject(idToURI(id));
    }
  },
  mounted() {
    trackEvent('ProjectBrowserV2', 'openProjectBrowser');

    loadBackup().then((backup) => {
      if (backup) {
        this.hasBackup = true;
      }
    });
  }
};
</script>

<style lang="scss">
.project-browser {
  position: relative;
  height: 75vh;
  width: 75vw;
  display: flex;
  flex-direction: column;
  background: var(--color-behind2);
  border-radius: 13px;
  box-shadow: var(--popupwindow-box-shadow);
  overflow: auto;

  &__header {
    position: relative;
    flex: 0 0 2.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 1rem;
    background: var(--color-bg4);

    &__close {
      padding: 5px;
      position: absolute;
      left: 1rem;
    }
  }

  &__footer {
    flex: 0 0 2rem;
    display: flex;
    justify-content: center;
    align-items: center;
    line-height: 2;
    font-size: .75rem;
    background: var(--color-bg4);
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: row;
    overflow: auto;
  }

  &__sidebar {
    flex: 0 0 250px;
    display: flex;
    flex-direction: column;

    &__views,
    &__actions,
    &__recents,
    &__user {
      display: flex;
      flex-direction: column;
      padding: .5rem;

      .btn {
        margin-top: .25rem;
        margin-bottom: .25rem;
      }
    }

    &__views {
      .btn {
        &:not(:hover) {
          background-color: var(--color-behind2);
        }

        &--active {
          color: var(--button-bg);
          background-color: var(--color-text) !important;
        }
      }
    }

    &__actions {
      .btn {
        border: 1px solid var(--color-active-text);

        &:disabled {
          color: var(--color-active-bg);
          border: 1px solid var(--color-active-bg);
        }
      }
    }

    &__recents {
      .btn {
        border: 1px solid var(--color-active-text);

        &.btn--text {
          border: none;
        }
      }
    }

    &__separator {
      border: 1px solid grey;
      margin: 1rem 2rem;
    }
  }

  .btn {
    padding-top: 5px;
    padding-bottom: 5px;

    &.btn--icon {
      width: auto;
      margin: 0;
      padding-left: 0;
      padding-right: 0;
      background: none !important;
    }

    &.btn--danger {
      color: var(--color-danger-text);
      background: var(--color-danger-bg);

      &:hover {
        background: var(--color-danger-bg-hover);
      }
    }
  }

  .text-center {
    text-align: center;
  }
}
</style>
