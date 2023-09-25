<template>
  <FileBrowser
    :loading="!items"
    :count="count"
    :skipDisplayButton="true"
    v-model="search"
    @scrolledToBottom="debounceLoad"
  >
    <template #main>
      <TableView>
        <template #header>
          <TableHeader :headers="headers" />
        </template>
        <TableItem
          v-for="item in items"
          :key="item.id"
          :columns="item.columns"
          :openAction="false"
        />
      </TableView>
    </template>
  </FileBrowser>
</template>

<script>
import debounce from 'lodash.debounce';
import { withSpinner } from '../../../logic/state/ui';
import { getUploadHistory } from '../../../services/fetch';
import FileBrowser from '../components/FileBrowser.vue';
import TableHeader from '../components/TableHeader.vue';
import TableItem from '../components/TableItem.vue';
import TableView from '../components/TableView.vue';
import { parseToDateString } from '../utils';

export default {
  components: {
    FileBrowser,
    TableView,
    TableHeader,
    TableItem
  },
  data() {
    return {
      headers: [
        { name: this.$t('properties.uploadhistory.documentname'), sortBy: false },
        { name: this.$t('properties.uploadhistory.articlenumber'), sortBy: false },
        { name: this.$t('properties.uploadhistory.modelnumber'), sortBy: false },
        { name: this.$t('properties.uploadhistory.date'), sortBy: false }
      ],
      results: null,
      count: 0,
      offset: 0,
      search: null,
      hasNextPage: true,
      debounceSearch: null,
      debounceLoad: null
    };
  },
  computed: {
    items() {
      if (!this.results) {
        return [];
      }

      return this.results.map((item) => ({
        $: item,
        key: item.id,
        columns: [
          { name: this.$t('properties.uploadhistory.documentname'), value: item.metadata.documentName },
          { name: this.$t('properties.uploadhistory.articlenumber'), value: item.metadata.article },
          { name: this.$t('properties.uploadhistory.modelnumber'), value: item.metadata.model },
          { name: this.$t('properties.uploadhistory.date'), value: parseToDateString(item.timestamp) }
        ]
      }));
    }
  },
  watch: {
    search() {
      this.debounceSearch();
    }
  },
  methods: {
    async loadUploadHistory() {
      const data = await getUploadHistory({
        offset: this.offset,
        search: this.search
      });

      this.count = data.count;
      this.hasNextPage = data.hasNextPage;

      if (!this.results) {
        this.results = [];
      }

      this.results.push(...data.results);

      if (data.hasNextPage) {
        this.offset += data.results.length;
      }
    }
  },
  async mounted() {
    this.debounceSearch = debounce(() => {
      this.offset = 0;
      this.results = null;

      this.loadUploadHistory();
    }, 1000);

    this.debounceLoad = debounce(() => {
      if (!this.hasNextPage) {
        return;
      }

      this.loadUploadHistory();
    }, 250);

    await withSpinner(async () => {
      await this.loadUploadHistory();
    });
  }
};
</script>
