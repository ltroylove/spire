<template>
  <div>
    <eq-window-simple class="p-2">
      <div class="row">
        <div class="col-12">
          <div class="text-center mb-2 eq-header evolving-selector-title">Evolution Selector</div>
          <b-form-input
            v-model.trim="search"
            placeholder="Search by evolution id, item id, or item name"
          />
        </div>
      </div>

      <div class="text-center mt-2">
        <b-button size="sm" variant="outline-warning" @click="loadDetails">
          <i class="fa fa-refresh mr-1"/>Refresh
        </b-button>
      </div>
    </eq-window-simple>

    <app-loader :is-loading="loading" class="mt-3 mb-3"/>

    <eq-window-simple
      class="mt-3 p-0"
      v-if="!loading"
      style="overflow-y: auto; max-height: 75vh;"
    >
      <div v-if="filteredGroups.length === 0" class="text-center text-muted p-4">
        No evolution chains were found.
      </div>

      <table
        v-if="filteredGroups.length > 0"
        class="eq-table bordered eq-highlight-rows"
      >
        <thead>
        <tr>
          <th style="width: 60px; text-align: center;"></th>
          <th style="width: 90px; text-align: center;">Evo ID</th>
          <th style="width: 80px; text-align: center;">Levels</th>
          <th>Items</th>
        </tr>
        </thead>
        <tbody>
        <tr
          v-for="group in filteredGroups"
          :key="group.evoId"
          :class="Number(selectedEvoId) === group.evoId ? 'pulsate-highlight-white' : ''"
        >
          <td class="text-center">
            <b-button
              size="sm"
              variant="outline-warning"
              @click="selectEvo(group.evoId)"
            >
              <i class="fa fa-arrow-left"></i>
            </b-button>
          </td>
          <td class="text-center">{{ group.evoId }}</td>
          <td class="text-center">{{ group.details.length }}</td>
          <td>
            <div class="d-flex flex-wrap align-items-center">
              <div
                v-for="detail in group.details.slice(0, 3)"
                :key="`selector-${group.evoId}-${detail.id}`"
                class="mr-3 mb-1 d-inline-flex align-items-center"
              >
                <item-popover
                  v-if="getCachedItem(detail.item_id)"
                  :item="getCachedItem(detail.item_id)"
                  size="sm"
                />
                <span v-else>{{ itemName(detail.item_id) }}</span>
              </div>
              <span v-if="group.details.length > 3" class="text-muted small">
                +{{ group.details.length - 3 }} more
              </span>
            </div>
          </td>
        </tr>
        </tbody>
      </table>
    </eq-window-simple>
  </div>
</template>

<script>
import EqWindowSimple from "@/components/eq-ui/EQWindowSimple.vue";
import ItemPopover from "@/components/ItemPopover.vue";
import { ItemsEvolvingDetailApi } from "@/app/api";
import { SpireApi } from "@/app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Items } from "@/app/items";
import {
  getCachedItemName,
  groupEvolvingDetails,
  sortEvolvingDetails,
} from "@/app/items-evolving";

export default {
  name: "EvolvingChainSelector",
  components: {
    EqWindowSimple,
    ItemPopover,
  },
  props: {
    selectedEvoId: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  data() {
    return {
      loading: false,
      details: [],
      search: "",
    };
  },
  computed: {
    filteredGroups() {
      const search = this.search.toLowerCase();

      return groupEvolvingDetails(this.details).filter((group) => {
        if (!search) {
          return true;
        }

        const haystack = [
          `${group.evoId}`,
          ...group.details.map((detail) => `${detail.item_id}`),
          ...group.details.map((detail) => this.itemName(detail.item_id)),
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      });
    },
  },
  async created() {
    await this.loadDetails();
  },
  methods: {
    async loadDetails() {
      this.loading = true;

      try {
        const result = await (new ItemsEvolvingDetailApi(...SpireApi.cfg())).listItemsEvolvingDetails(
          (new SpireQueryBuilder())
            .orderBy(["item_evo_id", "item_evolve_level"])
            .limit(10000)
            .get()
        );

        this.details = sortEvolvingDetails(result.data || []);

        const ids = [...new Set(this.details.map((detail) => Number(detail.item_id)).filter((id) => id > 0))];
        if (ids.length > 0) {
          await Items.loadItemsBulk(ids);
        }
      } finally {
        this.loading = false;
      }
    },
    getCachedItem(itemId) {
      return Items.cacheExists(Number(itemId));
    },
    itemName(itemId) {
      return getCachedItemName(itemId);
    },
    selectEvo(evoId) {
      this.$emit("input", Number(evoId));
    },
  },
};
</script>

<style scoped>
.evolving-selector-title {
  font-size: 26px;
  line-height: 1.1;
}
</style>
