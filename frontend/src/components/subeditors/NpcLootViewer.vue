<template>
  <div class="npc-loot-viewer">
    <!-- Header (always visible, click to collapse/expand) -->
    <div
      class="d-flex align-items-center justify-content-between"
      :class="{ 'mb-2': !collapsed }"
      @click="collapsed = !collapsed"
      style="cursor: pointer; user-select: none;"
    >
      <div>
        <i
          class="fa mr-1"
          :class="collapsed ? 'fa-chevron-right' : 'fa-chevron-down'"
          style="font-size: 10px; opacity: 0.5;"
        ></i>
        <i class="fa fa-gem text-warning mr-1"></i>
        <span class="font-weight-bold" style="color: #fcc721;">Loot</span>
        <small v-if="loaded && entries.length > 0" class="ml-1 text-muted">({{ entries.length }} drop{{ entries.length !== 1 ? 's' : '' }})</small>
      </div>
      <div>
        <button
          v-if="loottableId > 0"
          @click.stop="openFullEditor"
          class="btn btn-xs btn-outline-warning"
          title="Open the full-featured Loot Editor for this NPC"
        >
          <i class="fa fa-external-link mr-1"></i> Full Editor
        </button>
      </div>
    </div>

    <!-- Body (hidden when collapsed) -->
    <div v-if="!collapsed">
      <!-- No loottable assigned -->
      <div v-if="!loottableId || loottableId <= 0" class="text-center py-3">
        <i class="fa fa-gem fa-2x d-block mb-2" style="opacity: 0.2;"></i>
        <div class="text-muted small">No loot table assigned to this NPC.</div>
      </div>

      <!-- Loading -->
      <div v-else-if="loading" class="text-center py-3">
        <i class="fa fa-spinner fa-spin fa-2x text-warning"></i>
        <div class="mt-2 small text-muted">Loading loot data...</div>
      </div>

      <!-- Empty State -->
      <div v-else-if="loaded && entries.length === 0" class="text-center py-3">
        <i class="fa fa-gem fa-2x d-block mb-2" style="opacity: 0.2;"></i>
        <div class="text-muted small">Loottable #{{ loottableId }} has no loot drops.</div>
      </div>

      <!-- Loot Table -->
      <div v-else-if="loaded && entries.length > 0">
        <!-- Loottable name -->
        <div v-if="loottable" class="mb-2" style="font-size: 0.85em;">
          <i class="fa fa-table mr-1" style="opacity: 0.5;"></i>
          <span class="text-warning">{{ loottable.name || 'Loottable #' + loottable.id }}</span>
          <span class="text-muted ml-1" style="opacity: 0.5;">#{{ loottable.id }}</span>
        </div>

        <div style="max-height: 40vh; overflow-y: auto;">
          <table class="eq-table eq-highlight-rows w-100" style="font-size: 12px;">
            <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 50%;">Lootdrop</th>
                <th class="text-center" style="width: 20%;">Prob</th>
                <th class="text-center" style="width: 15%;">Multi</th>
                <th class="text-center" style="width: 15%;">Limit</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in entries" :key="i" class="loot-row">
                <td style="vertical-align: middle;">
                  <span class="text-warning font-weight-bold">
                    {{ entry.lootdrop ? (entry.lootdrop.name || 'Lootdrop #' + entry.lootdrop_id) : 'Lootdrop #' + entry.lootdrop_id }}
                  </span>
                  <div style="font-size: 0.8em; opacity: 0.5;">
                    drop #{{ entry.lootdrop_id }}
                  </div>
                </td>
                <td class="text-center" style="vertical-align: middle;">
                  <span :class="getProbBadgeClass(entry.probability)">{{ entry.probability }}%</span>
                </td>
                <td class="text-center" style="vertical-align: middle;">
                  <span style="opacity: 0.7;">{{ entry.multiplier > 1 ? '×' + entry.multiplier : '—' }}</span>
                </td>
                <td class="text-center" style="vertical-align: middle;">
                  <span style="opacity: 0.7;">{{ entry.droplimit > 0 ? entry.droplimit : '—' }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { SpireApi }           from "../../app/api/spire-api";
import { SpireQueryBuilder }  from "../../app/api/spire-query-builder";
import { LoottableApi }       from "../../app/api/api/loottable-api";
import { LoottableEntryApi }  from "../../app/api/api/loottable-entry-api";

export default {
  name: "NpcLootViewer",
  props: {
    loottableId: { type: Number, default: 0 },
  },
  data() {
    return {
      collapsed: true,
      loading: false,
      loaded: false,
      loottable: null,
      entries: [],
    };
  },
  watch: {
    loottableId() {
      this.reset();
      if (this.loottableId > 0) {
        this.loadLoot();
      }
    },
  },
  async created() {
    if (this.loottableId > 0) {
      this.loadLoot();
    }
  },
  methods: {
    reset() {
      this.loottable = null;
      this.entries = [];
      this.loaded = false;
    },

    openFullEditor() {
      const route = this.$router.resolve({ path: '/loot', query: { loottableId: this.loottableId } });
      window.open(route.href, '_blank');
    },

    getProbBadgeClass(prob) {
      if (prob >= 75) return "prob-high";
      if (prob >= 25) return "prob-med";
      return "prob-low";
    },

    async loadLoot() {
      this.loading = true;
      try {
        const ltApi = new LoottableApi(...SpireApi.cfg());
        const ltResult = await ltApi.getLoottable({ id: this.loottableId });
        this.loottable = ltResult.data;

        const lteApi = new LoottableEntryApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        builder.where("loottable_id", "=", this.loottableId);
        builder.includes(["Lootdrop"]);
        const entriesResult = await lteApi.listLoottableEntries(builder.get());
        this.entries = entriesResult.data || [];
      } catch (e) {
        console.error("Failed to load NPC loot viewer data", e);
        this.loottable = null;
        this.entries = [];
      }
      this.loaded = true;
      this.loading = false;
    },
  },
};
</script>

<style scoped>
.npc-loot-viewer {
  font-size: 13px;
}

.loot-row td {
  padding: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.prob-high {
  color: #81c784;
  font-weight: bold;
}

.prob-med {
  color: #ffd54f;
  font-weight: bold;
}

.prob-low {
  color: #ef9a9a;
  font-weight: bold;
}
</style>
