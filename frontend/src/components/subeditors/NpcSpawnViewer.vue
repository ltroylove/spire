<template>
  <div class="npc-spawn-viewer">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div>
        <i class="fa fa-map-marker text-warning mr-1"></i>
        <span class="font-weight-bold" style="color: #fcc721;">Spawn Locations</span>
        <small v-if="loaded" class="ml-1 text-muted">({{ spawnRows.length }})</small>
      </div>
      <div>
        <router-link
          :to="'/spawns/' + npcId"
          class="btn btn-xs btn-outline-warning"
          title="Open the full-featured Spawn Editor for this NPC"
        >
          <i class="fa fa-external-link mr-1"></i> Full Editor
        </router-link>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-3">
      <i class="fa fa-spinner fa-spin fa-2x text-warning"></i>
      <div class="mt-2 small text-muted">Loading spawn data...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="loaded && spawnRows.length === 0" class="text-center py-3">
      <i class="fa fa-map-marker fa-2x d-block mb-2" style="opacity: 0.2;"></i>
      <div class="text-muted small">No spawn locations for this NPC.</div>
      <router-link :to="'/spawns/' + npcId" class="btn btn-xs btn-outline-warning mt-2">
        <i class="fa fa-plus mr-1"></i> Add Spawn
      </router-link>
    </div>

    <!-- Spawn List (read-only compact view) -->
    <div v-else-if="loaded && spawnRows.length > 0" style="max-height: 40vh; overflow-y: auto;">
      <table class="eq-table eq-highlight-rows w-100" style="font-size: 12px;">
        <thead class="eq-table-floating-header">
          <tr>
            <th style="width: 35%;">Zone</th>
            <th class="text-center" style="width: 25%;">Coords</th>
            <th class="text-center" style="width: 20%;">Respawn</th>
            <th class="text-center" style="width: 20%;">Chance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in spawnRows" :key="row.spawn2Id" class="spawn-row">
            <td style="vertical-align: middle;">
              <span class="text-warning font-weight-bold">{{ row.zone }}</span>
              <div style="font-size: 0.8em; opacity: 0.5;">
                spawn2 #{{ row.spawn2Id }}
              </div>
            </td>
            <td class="text-center" style="vertical-align: middle; font-size: 0.9em;">
              <span style="opacity: 0.7;">{{ row.x.toFixed(1) }}, {{ row.y.toFixed(1) }}, {{ row.z.toFixed(1) }}</span>
            </td>
            <td class="text-center" style="vertical-align: middle;">
              <span class="respawn-badge">{{ formatTime(row.respawntime) }}</span>
            </td>
            <td class="text-center" style="vertical-align: middle;">
              <span :class="getChanceBadgeClass(row.chance)">{{ row.chance }}%</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { Spawn2Api, SpawnentryApi } from "../../app/api";
import { SpireApi } from "../../app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Zones } from "@/app/zones";

export default {
  name: "NpcSpawnViewer",
  props: {
    npcId: { type: Number, required: true },
  },
  data() {
    return {
      loading: false,
      loaded: false,
      spawnRows: [],
      zones: [],
    };
  },
  watch: {
    npcId() {
      this.spawnRows = [];
      this.loaded = false;
      this.loadSpawns();
    },
  },
  async created() {
    this.zones = await Zones.getZones() || [];
    this.loadSpawns();
  },
  methods: {
    formatTime(seconds) {
      if (!seconds || seconds <= 0) return "0s";
      const s = Math.abs(Number(seconds));
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      let parts = [];
      if (h > 0) parts.push(h + "h");
      if (m > 0) parts.push(m + "m");
      if (sec > 0) parts.push(sec + "s");
      return parts.join(" ") || "0s";
    },

    getChanceBadgeClass(chance) {
      if (chance >= 75) return "chance-high";
      if (chance >= 25) return "chance-med";
      return "chance-low";
    },

    async loadSpawns() {
      this.loading = true;
      this.spawnRows = [];

      try {
        const entryApi = new SpawnentryApi(...SpireApi.cfg());
        const entryBuilder = new SpireQueryBuilder();
        entryBuilder.where("npcID", "=", this.npcId);
        entryBuilder.limit(1000);
        const entryResult = await entryApi.listSpawnentries(entryBuilder.get());
        const entries = entryResult.data || [];

        if (entries.length === 0) {
          this.loaded = true;
          this.loading = false;
          return;
        }

        const entryByGroup = {};
        for (const e of entries) {
          const sgId = e.spawngroup_id || e.spawngroupID;
          if (!sgId) continue;
          entryByGroup[sgId] = e;
        }

        const spawngroupIds = Object.keys(entryByGroup).map(v => Number(v));
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawn2Builder = new SpireQueryBuilder();
        for (const sgId of spawngroupIds) {
          spawn2Builder.whereOr("spawngroupID", "=", sgId);
        }
        spawn2Builder.limit(1000);
        const spawn2Result = await spawn2Api.listSpawn2s(spawn2Builder.get());

        this.spawnRows = (spawn2Result.data || []).map((s2) => {
          const sgId = s2.spawngroup_id || s2.spawngroupID;
          const e = entryByGroup[sgId] || {};
          const zoneName = s2.zone || "unknown";

          return {
            spawn2Id: s2.id,
            zone: zoneName,
            x: Number(s2.x || 0),
            y: Number(s2.y || 0),
            z: Number(s2.z || 0),
            respawntime: Number(s2.respawntime || 0),
            chance: Number(e.chance != null ? e.chance : 100),
          };
        }).sort((a, b) => (a.zone || "").localeCompare(b.zone || ""));
      } catch (e) {
        console.error("Failed to load NPC spawn viewer data", e);
      }

      this.loaded = true;
      this.loading = false;
    },
  },
};
</script>

<style scoped>
.npc-spawn-viewer {
  font-size: 13px;
}

.spawn-row td {
  padding: 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.respawn-badge {
  color: #ccc;
  font-size: 0.9em;
}

.chance-high {
  color: #81c784;
  font-weight: bold;
}
.chance-med {
  color: #ffd54f;
  font-weight: bold;
}
.chance-low {
  color: #ef9a9a;
  font-weight: bold;
}
</style>
