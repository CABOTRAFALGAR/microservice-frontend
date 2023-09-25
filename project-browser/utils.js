import { ref, readonly } from 'vue';
import { createProject, getProject } from '../../services/fetch';
import { DISPLAY_AS } from './constants';

export function useDisplay() {
  const displayAs = ref(DISPLAY_AS.ROWS);

  return {
    DISPLAY_AS: readonly(DISPLAY_AS),
    displayAs,
    setDisplay(name) {
      displayAs.value = name;
    },
    isDisplay(name) {
      return displayAs.value === name;
    }
  };
}

function withSortDirection(sortFn, reverse = false) {
  return (item1, item2) => {
    const result = sortFn(item1, item2);

    return result * (reverse ? -1 : 1);
  };
}

export function uriToID(uri) {
  if (!uri) {
    return null;
  }

  return uri.split('/').pop();
}

export function idToURI(id) {
  return `/api/projects/${ id }`;
}

export function isFolder(item) {
  return !item.uri || !item.id;
}

export function toPath(pathArray) {
  return '/' + pathArray.join('/');
}

export function getItemAtPath(root, path) {
  const remainingPath = [ ...path ];
  let currentNode = root;

  while (remainingPath.length) {
    const nodeName = remainingPath.shift();
    currentNode = currentNode.children.find(({ name }) => name === nodeName);

    if (!currentNode) {
      throw new Error(`There are no folders with name "${ nodeName }"`);
    }
  }

  return currentNode;
}

export function getItemsAtPath(root, path) {
  const currentNode = getItemAtPath(root, path);

  return currentNode.children;
}

export function addItemAtPath(root, path, item) {
  const currentNode = getItemAtPath(root, path);

  currentNode.children.push(item);
}

export function moveItemAtPathToTarget(root, path, source, target) {
  const currentNode = getItemAtPath(root, path);
  const sourceNodeIndex = currentNode.children.findIndex((item) => item.name === source.name && item.uri === source.uri);
  const [ movedNode ] = currentNode.children.splice(sourceNodeIndex, 1);
  target.children.push(movedNode);
}

export function getAllItemsIndexed(root, items = {}) {
  root.children.forEach((node) => {
    if (node.uri) {
      items[uriToID(node.uri)] = node;
    } else {
      getAllItemsIndexed(node, items);
    }
  });

  return items;
}

const SORT_BY = {
  NAME: 'name',
  MODIFIED: 'modified',
  // TODO: implement these if they will ever be used
  ID: 'id',
  SEASON: 'season'
};

const SORT_DIRECTION = {
  ASC: 'asc',
  DESC: 'desc'
};

const sortStrategies = {
  [SORT_BY.NAME](item1, item2) {
    if (!isFolder(item1) && isFolder(item2)) {
      return 1;
    } else if (isFolder(item1) && !isFolder(item2)) {
      return -1;
    } else {
      return item1.name.localeCompare(item2.name);
    }
  },
  [SORT_BY.MODIFIED](item1, item2) {
    if (!isFolder(item1) && isFolder(item2)) {
      return 1;
    } else if (isFolder(item1) && !isFolder(item2)) {
      return -1;
    } else {
      return new Date(item1.modified).getTime() - new Date(item2.modified).getTime();
    }
  }
};

export function useSorting() {
  const sortBy = ref(SORT_BY.NAME);
  const sortDirection = ref(SORT_DIRECTION.ASC);

  return {
    SORT_BY,
    SORT_DIRECTION,

    sortBy,
    sortDirection,

    toggleSort(by) {
      if (sortBy.value !== by) {
        sortBy.value = by;
        sortDirection.value = SORT_DIRECTION.ASC;
      } else {
        sortDirection.value = sortDirection.value === SORT_DIRECTION.ASC
          ? SORT_DIRECTION.DESC
          : SORT_DIRECTION.ASC;
      }
    },

    sort(items) {
      const sortFn = sortStrategies[sortBy.value];

      items.sort(withSortDirection(sortFn, sortDirection.value === SORT_DIRECTION.DESC));
    }
  };
}

export function useSelectItem() {
  const selected = ref(null);

  return {
    selected,

    selectNone() {
      selected.value = null;
    },

    selectItem(item) {
      selected.value = item;
    },

    isSelected(item) {
      return selected.value === item;
    }
  };
}


export function useMultiSelectItem() {
  const selectedItems = ref([]);

  return {
    selectedItems,

    selectNone() {
      selectedItems.value = [];
    },

    selectItem(item) {
      selectedItems.value = [];
      selectedItems.value.push(item);
    },

    addToSelection(item) {
      if (!selectedItems.value.includes(item)) {
        selectedItems.value.push(item);
      }
    },

    areaSelection(items, index) {
      const item = items.at(index);

      if (selectedItems.value.length === 0) {
        this.selectItem(item.$);
        return;
      }

      const lastSelected = selectedItems.value.at(-1);
      const lastIdx = items.findIndex((el) => el.$.id === lastSelected?.id);
      if (lastIdx === -1) {
        this.selectItem(item.$);
        return;
      }

      if (lastIdx < index) {
        for (let i = lastIdx + 1; i <= index; ++i){
          this.addToSelection(items.at(i).$);
        }
      } else {
        for (let i = lastIdx - 1; i >= index; --i){
          this.addToSelection(items.at(i).$);
        }
      }
    },

    unselectItem(item) {
      const idx = selectedItems.value.indexOf(item);
      selectedItems.value.splice(idx, 1);
    },

    isSelected(item) {
      return selectedItems.value.includes(item);
    },

    isClickOnSelectedItem(selected, item) {
      // We can't use this.selectedItem as this is executed asyncronously
      if (selected.length > 1) {
        if (selected.some((it) => it.id === item.id)) {
          // Restore all selected ONLY if clicked item was already selected
          return true;
        }
      }
      return false;
    }
  };
}

export function parseToDateString(timestamp) {
  if (typeof timestamp === 'number') {
    const dt = new Date(timestamp * 1000);
    return dt.toLocaleString();
  } else if (typeof timestamp === 'string') {
    const dt = new Date(timestamp);
    return dt.toLocaleString();
  }

  return '';
}

export function openProject(workspace, item) {
  const projects = workspace.storage.projects;
  const openCmd = projects.itemCommands.filter(Boolean).find(({ text }) => text === 'Open');

  if (openCmd?.fn) {
    openCmd.fn(item);
  } else {
    throw('Open command is not a function!');
  }
}

export async function copyProject(item) {
  const sourceItem = await getProject(item.id);

  return createProject({
    ...sourceItem,
    name: sourceItem.name + '_Copy',

    // remove references to original project
    id: undefined,
    path: undefined,
    uri: undefined,
    author: undefined
  });
}

export function findUniqueName(node, initialName) {
  if (!node.children) {
    throw new Error('Node is not a folder');
  }

  let newName = initialName;
  let index = 1;

  while(node.children.some((item) => item.name === newName)) {
    newName = `${ initialName }.${ index }`;
    index++;
  }

  return newName;
}

export const not = (fn) => (...args) => !fn(...args);
