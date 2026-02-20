<template>
  <div class="npc-spawn-editor" @click="onEditorClick">
    <!-- Header -->
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div>
        <i class="fa fa-map-marker text-warning mr-1"></i>
        <span class="font-weight-bold" style="color: #fcc721;">Spawn Locations</span>
        <small v-if="loaded" class="ml-1 text-muted">({{ spawnRows.length }})</small>
      </div>
      <div>
        <button
          class="btn btn-xs btn-outline-warning mr-1"
          @click="showCreate = !showCreate"
          title="Add a new spawn point for this NPC"
        >
          <i class="fa fa-plus mr-1"></i>{{ showCreate ? 'Cancel' : 'New Spawn' }}
        </button>
        <button class="btn btn-xs btn-dark" @click="loadSpawns" :disabled="loading" title="Refresh spawn data">
          <i class="fa fa-refresh" :class="{ 'fa-spin': loading }"></i>
        </button>
      </div>
    </div>

    <!-- Create Spawn Form -->
    <div v-if="showCreate" class="create-panel mb-3">
      <div class="create-panel-header">
        <i class="fa fa-plus-circle mr-1"></i> Create New Spawn Point
      </div>
      <div class="p-3">
        <!-- Zone search -->
        <div class="row mb-2">
          <div class="col-8">
            <label class="field-label">Zone</label>
            <div class="position-relative">
              <input
                v-model="createForm.zoneSearch"
                class="form-control form-control-sm"
                placeholder="Search zones..."
                @input="onZoneSearchInput"
                @focus="showZoneDropdown = true"
                @blur="delayCloseZoneDropdown"
                autocomplete="off"
              />
              <div v-if="showZoneDropdown && filteredZones.length > 0" class="zone-dropdown">
                <div
                  v-for="z in filteredZones"
                  :key="z.short_name + '-' + z.version"
                  class="zone-option"
                  @mousedown.prevent="selectZone(z)"
                >
                  <span class="text-warning">{{ z.short_name }}</span>
                  <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="col-4">
            <label class="field-label">Version</label>
            <input v-model.number="createForm.version" type="number" class="form-control form-control-sm" />
          </div>
        </div>

        <!-- Coordinates -->
        <div class="row mb-2">
          <div class="col-3">
            <label class="field-label">X</label>
            <input v-model.number="createForm.x" type="number" step="0.01" class="form-control form-control-sm" />
          </div>
          <div class="col-3">
            <label class="field-label">Y</label>
            <input v-model.number="createForm.y" type="number" step="0.01" class="form-control form-control-sm" />
          </div>
          <div class="col-3">
            <label class="field-label">Z</label>
            <input v-model.number="createForm.z" type="number" step="0.01" class="form-control form-control-sm" />
          </div>
          <div class="col-3">
            <label class="field-label">Heading</label>
            <input v-model.number="createForm.heading" type="number" step="0.01" class="form-control form-control-sm" />
          </div>
        </div>

        <!-- Timing & Config -->
        <div class="row mb-2">
          <div class="col-4">
            <label class="field-label">Respawn Time</label>
            <div class="input-group input-group-sm">
              <input v-model.number="createForm.respawntime" type="number" class="form-control" />
              <div class="input-group-append">
                <span class="input-group-text" style="font-size: 0.75em;">{{ formatTime(createForm.respawntime) }}</span>
              </div>
            </div>
          </div>
          <div class="col-4">
            <label class="field-label">Path Grid</label>
            <input v-model.number="createForm.pathgrid" type="number" class="form-control form-control-sm" />
          </div>
          <div class="col-4">
            <label class="field-label">Chance %</label>
            <input v-model.number="createForm.chance" type="number" min="0" max="100" class="form-control form-control-sm" />
          </div>
        </div>

        <!-- Spawngroup name & Submit -->
        <div class="row">
          <div class="col-8">
            <label class="field-label">Spawngroup Name <small class="text-muted">(optional)</small></label>
            <input v-model="createForm.spawngroupName" class="form-control form-control-sm" placeholder="Auto-generated if empty" />
          </div>
          <div class="col-4 d-flex align-items-end">
            <button class="btn btn-sm btn-outline-success w-100" @click="createSpawn" :disabled="saving">
              <i class="fa fa-plus mr-1"></i> Create
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Messages -->
    <div v-if="error" class="alert alert-danger py-1 px-2 mb-2 small">
      <i class="fa fa-exclamation-triangle mr-1"></i>{{ error }}
    </div>
    <div v-if="success" class="alert alert-success py-1 px-2 mb-2 small">
      <i class="fa fa-check mr-1"></i>{{ success }}
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-3">
      <i class="fa fa-spinner fa-spin fa-2x text-warning"></i>
      <div class="mt-2 small text-muted">Loading spawn data...</div>
    </div>

    <!-- Empty State -->
    <div v-else-if="loaded && spawnRows.length === 0" class="text-center py-4">
      <i class="fa fa-map-marker fa-3x d-block mb-2" style="opacity: 0.2;"></i>
      <div class="text-muted">No spawn locations for this NPC.</div>
      <button class="btn btn-xs btn-outline-warning mt-2" @click="showCreate = true">
        <i class="fa fa-plus mr-1"></i> Add First Spawn
      </button>
    </div>

    <!-- Spawn List -->
    <div v-else-if="loaded && spawnRows.length > 0" style="max-height: 60vh; overflow-y: auto;">
      <table class="eq-table eq-highlight-rows w-100" style="font-size: 12px;">
        <thead class="eq-table-floating-header">
          <tr>
            <th style="width: 30%;">Zone</th>
            <th class="text-center" style="width: 15%;">Coords</th>
            <th class="text-center" style="width: 15%;">Respawn</th>
            <th class="text-center" style="width: 10%;">Chance</th>
            <th class="text-center" style="width: 10%;">Grid</th>
            <th class="text-right" style="width: 20%;"></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in spawnRows">
            <!-- Main Row -->
            <tr :key="'main-' + row.spawn2Id" class="spawn-row">
              <td style="vertical-align: middle;">
                <div>
                  <span class="text-warning font-weight-bold">{{ row.zone }}</span>
                  <span v-if="row.zoneLongName" class="text-muted ml-1" style="font-size: 0.85em;">{{ row.zoneLongName }}</span>
                </div>
                <div style="font-size: 0.8em; opacity: 0.5;">
                  spawn2 #{{ row.spawn2Id }} &middot; SG #{{ row.spawngroupId }}
                </div>
              </td>
              <td class="text-center" style="vertical-align: middle; font-size: 0.9em;">
                <span style="opacity: 0.7;">{{ row.x.toFixed(1) }}, {{ row.y.toFixed(1) }}, {{ row.z.toFixed(1) }}</span>
              </td>
              <td class="text-center" style="vertical-align: middle;">
                <span class="respawn-badge">{{ formatTime(row.respawntime) }}</span>
                <div v-if="row.variance > 0" style="font-size: 0.75em; opacity: 0.5;">
                  &plusmn;{{ formatTime(row.variance) }}
                </div>
              </td>
              <td class="text-center" style="vertical-align: middle;">
                <span :class="getChanceBadgeClass(row.chance)">{{ row.chance }}%</span>
              </td>
              <td class="text-center" style="vertical-align: middle;">
                <span v-if="row.pathgrid > 0" class="text-info">{{ row.pathgrid }}</span>
                <span v-else class="text-muted">-</span>
              </td>
              <td class="text-right" style="vertical-align: middle;">
                <button
                  class="btn btn-xs btn-dark mr-1"
                  @click="toggleDetails(row)"
                  :title="row.showDetails ? 'Hide details' : 'Show details & edit'"
                >
                  <i :class="row.showDetails ? 'fa fa-chevron-up' : 'fa fa-pencil'"></i>
                </button>
                <button
                  class="btn btn-xs btn-dark"
                  @click="deleteSpawn(row)"
                  :disabled="saving"
                  title="Delete spawn point"
                >
                  <i class="fa fa-trash text-danger"></i>
                </button>
              </td>
            </tr>

            <!-- Detail/Edit Row -->
            <tr v-if="row.showDetails" :key="'detail-' + row.spawn2Id" class="detail-row">
              <td colspan="6" style="padding: 0;">
                <div class="detail-panel">
                  <!-- Spawn2 Fields -->
                  <div class="detail-section">
                    <div class="detail-section-title">
                      <i class="fa fa-map-pin mr-1"></i> Spawn Point (spawn2 #{{ row.spawn2Id }})
                    </div>
                    <div class="row mt-2">
                      <div class="col-4 mb-2">
                        <label class="field-label">Zone</label>
                        <div class="position-relative">
                          <input
                            v-model="row.zoneSearch"
                            class="form-control form-control-sm"
                            @input="onEditZoneSearchInput(row)"
                            @focus="row.showZoneDropdown = true"
                            @blur="delayCloseEditZoneDropdown(row)"
                            autocomplete="off"
                          />
                          <div v-if="row.showZoneDropdown && row.filteredZones && row.filteredZones.length > 0" class="zone-dropdown">
                            <div
                              v-for="z in row.filteredZones"
                              :key="z.short_name + '-' + z.version"
                              class="zone-option"
                              @mousedown.prevent="selectEditZone(row, z)"
                            >
                              <span class="text-warning">{{ z.short_name }}</span>
                              <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="col-2 mb-2">
                        <label class="field-label">Version</label>
                        <input v-model.number="row.version" type="number" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Respawn (sec)</label>
                        <div class="input-group input-group-sm">
                          <input v-model.number="row.respawntime" type="number" class="form-control" />
                          <div class="input-group-append">
                            <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(row.respawntime) }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Variance (sec)</label>
                        <div class="input-group input-group-sm">
                          <input v-model.number="row.variance" type="number" class="form-control" />
                          <div class="input-group-append">
                            <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(row.variance) }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-3 mb-2">
                        <label class="field-label">X</label>
                        <input v-model.number="row.x" type="number" step="0.01" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Y</label>
                        <input v-model.number="row.y" type="number" step="0.01" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Z</label>
                        <input v-model.number="row.z" type="number" step="0.01" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Heading</label>
                        <input v-model.number="row.heading" type="number" step="0.01" class="form-control form-control-sm" />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-3 mb-2">
                        <label class="field-label">Path Grid</label>
                        <input v-model.number="row.pathgrid" type="number" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Animation</label>
                        <select v-model.number="row.animation" class="form-control form-control-sm">
                          <option :value="0">Standing</option>
                          <option :value="64">Sitting</option>
                          <option :value="100">Crouching</option>
                          <option :value="110">Lying Down</option>
                          <option :value="105">Kneeling</option>
                        </select>
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Condition</label>
                        <input v-model.number="row.condition" type="number" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Cond Value</label>
                        <input v-model.number="row.cond_value" type="number" class="form-control form-control-sm" />
                      </div>
                    </div>
                    <div class="row">
                      <div class="col-3 mb-2">
                        <label class="field-label">Min Expansion</label>
                        <input v-model.number="row.min_expansion" type="number" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Max Expansion</label>
                        <input v-model.number="row.max_expansion" type="number" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Content Flags</label>
                        <input v-model="row.content_flags" class="form-control form-control-sm" />
                      </div>
                      <div class="col-3 mb-2">
                        <label class="field-label">Flags Disabled</label>
                        <input v-model="row.content_flags_disabled" class="form-control form-control-sm" />
                      </div>
                    </div>
                  </div>

                  <!-- Spawngroup Fields -->
                  <div class="detail-section mt-2">
                    <div class="detail-section-title d-flex align-items-center justify-content-between">
                      <div>
                        <i class="fa fa-users mr-1"></i> Spawngroup #{{ row.spawngroupId }}
                        <span v-if="row.spawngroup" class="text-muted ml-1">({{ row.spawngroup.name }})</span>
                      </div>
                    </div>

                    <div v-if="row.spawngroup" class="mt-2">
                      <div class="row">
                        <div class="col-6 mb-2">
                          <label class="field-label">Group Name</label>
                          <input v-model="row.spawngroup.name" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Spawn Limit</label>
                          <input v-model.number="row.spawngroup.spawn_limit" type="number" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Roam Dist</label>
                          <input v-model.number="row.spawngroup.dist" type="number" step="0.1" class="form-control form-control-sm" />
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-3 mb-2">
                          <label class="field-label">Delay</label>
                          <input v-model.number="row.spawngroup.delay" type="number" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Min Delay</label>
                          <input v-model.number="row.spawngroup.mindelay" type="number" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Despawn</label>
                          <select v-model.number="row.spawngroup.despawn" class="form-control form-control-sm">
                            <option :value="0">None</option>
                            <option :value="1">Despawn on Death</option>
                            <option :value="2">Depop on Death</option>
                            <option :value="3">Despawn Timer</option>
                          </select>
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Despawn Timer</label>
                          <input v-model.number="row.spawngroup.despawn_timer" type="number" class="form-control form-control-sm" />
                        </div>
                      </div>
                      <div class="row">
                        <div class="col-3 mb-2">
                          <label class="field-label">Min X</label>
                          <input v-model.number="row.spawngroup.min_x" type="number" step="0.1" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Max X</label>
                          <input v-model.number="row.spawngroup.max_x" type="number" step="0.1" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Min Y</label>
                          <input v-model.number="row.spawngroup.min_y" type="number" step="0.1" class="form-control form-control-sm" />
                        </div>
                        <div class="col-3 mb-2">
                          <label class="field-label">Max Y</label>
                          <input v-model.number="row.spawngroup.max_y" type="number" step="0.1" class="form-control form-control-sm" />
                        </div>
                      </div>
                    </div>

                    <!-- NPCs in this Spawngroup -->
                    <div v-if="row.spawnEntries && row.spawnEntries.length > 0" class="mt-2">
                      <div class="field-label mb-1" style="font-size: 0.8em; text-transform: uppercase; letter-spacing: 0.5px;">
                        NPCs in this Spawngroup
                      </div>
                      <table class="eq-table w-100" style="font-size: 11px;">
                        <thead>
                          <tr>
                            <th>NPC</th>
                            <th class="text-center" style="width: 70px;">Chance</th>
                            <th class="text-center" style="width: 50px;"></th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="entry in row.spawnEntries" :key="entry.npc_id">
                            <td style="vertical-align: middle;">
                              <span
                                v-if="entry.npc_id === npcId"
                                class="text-warning font-weight-bold"
                              >
                                {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                              </span>
                              <span v-else>
                                {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                              </span>
                              <small class="text-muted ml-1">#{{ entry.npc_id }}</small>
                            </td>
                            <td class="text-center" style="vertical-align: middle;">
                              <input
                                v-if="entry.npc_id === npcId"
                                v-model.number="row.chance"
                                type="number"
                                min="0"
                                max="100"
                                class="form-control form-control-sm text-center"
                                style="width: 60px; display: inline-block;"
                              />
                              <span v-else>{{ entry.chance }}%</span>
                            </td>
                            <td class="text-center" style="vertical-align: middle;">
                              <span v-if="entry.npc_id === npcId" class="text-warning" style="font-size: 0.9em;" title="Current NPC">
                                <i class="fa fa-star"></i>
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div class="mt-1 text-right">
                        <button
                          class="btn btn-xs btn-dark"
                          @click="balanceChances(row)"
                          title="Equally distribute chances among all NPCs in this spawngroup"
                        >
                          <i class="fa fa-balance-scale mr-1"></i> Balance
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Save / Cancel -->
                  <div class="d-flex justify-content-end mt-3">
                    <button class="btn btn-sm btn-dark mr-2" @click="row.showDetails = false">
                      Cancel
                    </button>
                    <button class="btn btn-sm btn-outline-success" @click="saveSpawn(row)" :disabled="saving">
                      <i class="fa fa-save mr-1"></i> Save Changes
                    </button>
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { Spawn2Api, SpawnentryApi, SpawngroupApi, NpcTypeApi } from "../../app/api";
import { SpireApi } from "../../app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Zones } from "@/app/zones";

export default {
  name: "NpcSpawnLocations",
  props: {
    npcId: { type: Number, required: true },
  },
  data() {
    return {
      loading: false,
      loaded: false,
      saving: false,
      showCreate: false,
      error: "",
      success: "",
      spawnRows: [],
      zones: [],
      showZoneDropdown: false,
      createForm: {
        zoneSearch: "",
        zone: "",
        version: 0,
        x: 0,
        y: 0,
        z: 0,
        heading: 0,
        respawntime: 1200,
        pathgrid: 0,
        chance: 100,
        spawngroupName: "",
      },
    };
  },
  computed: {
    filteredZones() {
      if (!this.createForm.zoneSearch || this.createForm.zoneSearch.length < 1) return [];
      const q = this.createForm.zoneSearch.toLowerCase();
      return this.zones
        .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 15);
    },
  },
  watch: {
    npcId() {
      this.resetState();
      this.loadSpawns();
    },
  },
  async created() {
    this.zones = await Zones.getZones() || [];
    this.loadSpawns();
  },
  methods: {
    resetState() {
      this.loading = false;
      this.loaded = false;
      this.spawnRows = [];
      this.error = "";
      this.success = "";
    },

    clearMessages() {
      this.error = "";
      this.success = "";
    },

    onEditorClick(e) {
      // Close zone dropdowns when clicking outside of them
      if (!e.target.closest('.zone-dropdown') && !e.target.closest('input[autocomplete="off"]')) {
        this.showZoneDropdown = false;
        for (const row of this.spawnRows) {
          if (row.showZoneDropdown) {
            this.$set(row, 'showZoneDropdown', false);
          }
        }
      }
    },

    delayCloseZoneDropdown() {
      setTimeout(() => { this.showZoneDropdown = false; }, 200);
    },

    delayCloseEditZoneDropdown(row) {
      setTimeout(() => { this.$set(row, 'showZoneDropdown', false); }, 200);
    },

    // Zone search for create form
    onZoneSearchInput() {
      this.showZoneDropdown = true;
      this.createForm.zone = this.createForm.zoneSearch;
    },

    selectZone(z) {
      this.createForm.zone = z.short_name;
      this.createForm.zoneSearch = z.short_name;
      this.showZoneDropdown = false;
    },

    // Zone search for edit row
    onEditZoneSearchInput(row) {
      row.showZoneDropdown = true;
      const q = (row.zoneSearch || "").toLowerCase();
      this.$set(row, 'filteredZones',
        this.zones
          .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
          .slice(0, 15)
      );
      row.zone = row.zoneSearch;
    },

    selectEditZone(row, z) {
      row.zone = z.short_name;
      row.zoneSearch = z.short_name;
      row.zoneLongName = z.long_name || "";
      row.showZoneDropdown = false;
      this.$set(row, 'filteredZones', []);
    },

    toggleDetails(row) {
      const newVal = !row.showDetails;
      this.$set(row, 'showDetails', newVal);

      if (newVal && !row.spawngroup) {
        this.loadSpawngroupDetails(row);
      }
    },

    normalizeChance(v) {
      const n = Number(v || 0);
      if (n < 0) return 0;
      if (n > 100) return 100;
      return n;
    },

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
      this.clearMessages();
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

        const rows = (spawn2Result.data || []).map((s2) => {
          const sgId = s2.spawngroup_id || s2.spawngroupID;
          const e = entryByGroup[sgId] || {};
          const zoneName = s2.zone || "unknown";
          const zoneData = this.zones.find(z => z.short_name === zoneName);

          return {
            showDetails: false,
            showZoneDropdown: false,
            filteredZones: [],
            spawn2Id: s2.id,
            spawngroupId: sgId,
            zone: zoneName,
            zoneSearch: zoneName,
            zoneLongName: zoneData ? zoneData.long_name : "",
            version: Number(s2.version || 0),
            x: Number(s2.x || 0),
            y: Number(s2.y || 0),
            z: Number(s2.z || 0),
            heading: Number(s2.heading || 0),
            respawntime: Number(s2.respawntime || 0),
            variance: Number(s2.variance || 0),
            pathgrid: Number(s2.pathgrid || 0),
            animation: Number(s2.animation || 0),
            condition: Number(s2._condition || 0),
            cond_value: Number(s2.cond_value || 1),
            min_expansion: Number(s2.min_expansion != null ? s2.min_expansion : -1),
            max_expansion: Number(s2.max_expansion != null ? s2.max_expansion : -1),
            content_flags: s2.content_flags || "",
            content_flags_disabled: s2.content_flags_disabled || "",
            chance: this.normalizeChance(e.chance != null ? e.chance : 100),
            spawngroup: null,
            spawnEntries: null,
          };
        }).sort((a, b) => (a.zone || "").localeCompare(b.zone || "") || (a.spawn2Id || 0) - (b.spawn2Id || 0));

        this.spawnRows = rows;
      } catch (e) {
        console.error("Failed to load NPC spawn editor data", e);
        this.error = "Failed to load spawn data.";
      }

      this.loaded = true;
      this.loading = false;
    },

    async loadSpawngroupDetails(row) {
      try {
        // Load spawngroup
        const sgApi = new SpawngroupApi(...SpireApi.cfg());
        const sgBuilder = new SpireQueryBuilder();
        sgBuilder.where("id", "=", row.spawngroupId);
        const sgResult = await sgApi.listSpawngroups(sgBuilder.get());
        const sg = (sgResult.data && sgResult.data[0]) || null;

        if (sg) {
          this.$set(row, 'spawngroup', {
            name: sg.name || "",
            spawn_limit: Number(sg.spawn_limit || 0),
            dist: Number(sg.dist || 0),
            delay: Number(sg.delay || 45000),
            mindelay: Number(sg.mindelay || 15000),
            despawn: Number(sg.despawn || 0),
            despawn_timer: Number(sg.despawn_timer || 100),
            wp_spawns: Number(sg.wp_spawns || 0),
            min_x: Number(sg.min_x || 0),
            max_x: Number(sg.max_x || 0),
            min_y: Number(sg.min_y || 0),
            max_y: Number(sg.max_y || 0),
          });
        }

        // Load all spawn entries for this group
        const entryApi = new SpawnentryApi(...SpireApi.cfg());
        const entryBuilder = new SpireQueryBuilder();
        entryBuilder.where("spawngroupID", "=", row.spawngroupId);
        entryBuilder.limit(100);
        const entryResult = await entryApi.listSpawnentries(entryBuilder.get());
        const allEntries = entryResult.data || [];

        // Resolve NPC names
        const entriesWithNames = [];
        for (const entry of allEntries) {
          const npcId = entry.npc_id || entry.npcID;
          let npcName = "";
          try {
            const npcApi = new NpcTypeApi(...SpireApi.cfg());
            const npcBuilder = new SpireQueryBuilder();
            npcBuilder.where("id", "=", npcId);
            npcBuilder.select(["id", "name"]);
            const npcResult = await npcApi.listNpcTypes(npcBuilder.get());
            if (npcResult.data && npcResult.data[0]) {
              npcName = (npcResult.data[0].name || "").replace(/_/g, " ");
            }
          } catch (err) {
            // ignore
          }
          entriesWithNames.push({
            npc_id: npcId,
            npcName: npcName,
            chance: Number(entry.chance || 0),
            spawngroup_id: entry.spawngroup_id || entry.spawngroupID,
          });
        }

        this.$set(row, 'spawnEntries', entriesWithNames);
      } catch (e) {
        console.error("Failed to load spawngroup details", e);
      }
    },

    async saveSpawn(row) {
      this.saving = true;
      this.clearMessages();

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());

        // Update spawn2
        await spawn2Api.updateSpawn2(row.spawn2Id, {
          id: row.spawn2Id,
          spawngroup_id: row.spawngroupId,
          zone: (row.zone || "").toLowerCase(),
          version: Number(row.version || 0),
          x: Number(row.x || 0),
          y: Number(row.y || 0),
          z: Number(row.z || 0),
          heading: Number(row.heading || 0),
          respawntime: Number(row.respawntime || 0),
          variance: Number(row.variance || 0),
          pathgrid: Number(row.pathgrid || 0),
          animation: Number(row.animation || 0),
          _condition: Number(row.condition || 0),
          cond_value: Number(row.cond_value || 1),
          min_expansion: Number(row.min_expansion != null ? row.min_expansion : -1),
          max_expansion: Number(row.max_expansion != null ? row.max_expansion : -1),
          content_flags: row.content_flags || "",
          content_flags_disabled: row.content_flags_disabled || "",
        });

        // Update spawnentry (chance for this NPC)
        await spawnentryApi.updateSpawnentry(row.spawngroupId, {
          spawngroup_id: row.spawngroupId,
          npc_id: this.npcId,
          chance: this.normalizeChance(row.chance),
        });

        // Update spawngroup if loaded
        if (row.spawngroup) {
          await spawngroupApi.updateSpawngroup(row.spawngroupId, {
            id: row.spawngroupId,
            name: row.spawngroup.name || "",
            spawn_limit: Number(row.spawngroup.spawn_limit || 0),
            dist: Number(row.spawngroup.dist || 0),
            delay: Number(row.spawngroup.delay || 45000),
            mindelay: Number(row.spawngroup.mindelay || 15000),
            despawn: Number(row.spawngroup.despawn || 0),
            despawn_timer: Number(row.spawngroup.despawn_timer || 100),
            wp_spawns: Number(row.spawngroup.wp_spawns || 0),
            min_x: Number(row.spawngroup.min_x || 0),
            max_x: Number(row.spawngroup.max_x || 0),
            min_y: Number(row.spawngroup.min_y || 0),
            max_y: Number(row.spawngroup.max_y || 0),
          });
        }

        row.showDetails = false;
        this.success = `Saved spawn2 #${row.spawn2Id} successfully.`;
      } catch (e) {
        console.error("Failed to save spawn", e);
        this.error = `Failed to save spawn2 #${row.spawn2Id}.`;
      }

      this.saving = false;
    },

    async createSpawn() {
      this.saving = true;
      this.clearMessages();

      try {
        const zone = (this.createForm.zone || "").trim().toLowerCase();
        if (!zone) {
          this.error = "Zone is required.";
          this.saving = false;
          return;
        }

        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        const sgName = this.createForm.spawngroupName && this.createForm.spawngroupName.trim().length > 0
          ? this.createForm.spawngroupName.trim()
          : `${zone}_${this.npcId}`;

        const sgCreate = await spawngroupApi.createSpawngroup({ name: sgName, id: 0 });
        const sg = (sgCreate.data && sgCreate.data[0]) ? sgCreate.data[0] : null;
        const spawngroupId = sg && (sg.id || sg.ID);
        if (!spawngroupId) {
          throw new Error("Unable to create spawngroup");
        }

        await spawn2Api.createSpawn2({
          spawngroup_id: spawngroupId,
          zone: zone,
          version: Number(this.createForm.version || 0),
          x: Number(this.createForm.x || 0),
          y: Number(this.createForm.y || 0),
          z: Number(this.createForm.z || 0),
          heading: Number(this.createForm.heading || 0),
          respawntime: Number(this.createForm.respawntime || 1200),
          pathgrid: Number(this.createForm.pathgrid || 0),
        });

        await spawnentryApi.createSpawnentry({
          spawngroup_id: spawngroupId,
          npc_id: this.npcId,
          chance: this.normalizeChance(this.createForm.chance),
        });

        this.success = `Created spawngroup #${spawngroupId} in ${zone}.`;
        this.showCreate = false;

        // Reset create form
        this.createForm = {
          zoneSearch: "",
          zone: "",
          version: 0,
          x: 0,
          y: 0,
          z: 0,
          heading: 0,
          respawntime: 1200,
          pathgrid: 0,
          chance: 100,
          spawngroupName: "",
        };

        await this.loadSpawns();
      } catch (e) {
        console.error("Failed to create spawn", e);
        this.error = "Failed to create spawn. Check values and try again.";
      }

      this.saving = false;
    },

    async deleteSpawn(row) {
      if (!confirm(`Delete spawn point #${row.spawn2Id} in ${row.zone}?`)) {
        return;
      }

      this.saving = true;
      this.clearMessages();

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        await spawn2Api.deleteSpawn2(row.spawn2Id);

        this.success = `Deleted spawn2 #${row.spawn2Id}.`;
        this.spawnRows = this.spawnRows.filter((r) => r.spawn2Id !== row.spawn2Id);
      } catch (e) {
        console.error("Failed to delete spawn", e);
        this.error = `Failed to delete spawn2 #${row.spawn2Id}.`;
      }

      this.saving = false;
    },

    async balanceChances(row) {
      if (!row.spawnEntries || row.spawnEntries.length === 0) return;

      const count = row.spawnEntries.length;
      const equalChance = Math.floor(100 / count);
      const remainder = 100 - (equalChance * count);

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        for (let i = 0; i < row.spawnEntries.length; i++) {
          const entry = row.spawnEntries[i];
          const chance = equalChance + (i < remainder ? 1 : 0);

          await spawnentryApi.updateSpawnentry(row.spawngroupId, {
            spawngroup_id: row.spawngroupId,
            npc_id: entry.npc_id,
            chance: chance,
          });

          entry.chance = chance;
          if (entry.npc_id === this.npcId) {
            row.chance = chance;
          }
        }

        this.success = `Balanced chances across ${count} NPCs (${equalChance}% each).`;
      } catch (e) {
        console.error("Failed to balance chances", e);
        this.error = "Failed to balance chances.";
      }
    },
  },
};
</script>

<style scoped>
.npc-spawn-editor {
  font-size: 13px;
}

/* Create Panel */
.create-panel {
  border: 1px solid rgba(138, 163, 255, 0.25);
  border-radius: 3px;
  overflow: hidden;
}

.create-panel-header {
  background: rgba(138, 163, 255, 0.1);
  padding: 6px 12px;
  font-size: 0.85em;
  font-weight: bold;
  color: #8aa3ff;
  border-bottom: 1px solid rgba(138, 163, 255, 0.15);
}

/* Field labels */
.field-label {
  display: block;
  font-size: 0.75em;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #8aa3ff;
  margin-bottom: 2px;
  font-weight: bold;
}

/* Respawn badge */
.respawn-badge {
  color: #ccc;
  font-size: 0.9em;
}

/* Chance colors */
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

/* Spawn row */
.spawn-row td {
  padding: 8px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

/* Detail row */
.detail-row td {
  border-bottom: 1px solid rgba(138, 163, 255, 0.15);
}

.detail-panel {
  background: rgba(0, 0, 0, 0.2);
  padding: 12px;
  border-top: 1px solid rgba(138, 163, 255, 0.1);
}

.detail-section {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 3px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.15);
}

.detail-section-title {
  font-size: 0.85em;
  font-weight: bold;
  color: #fcc721;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

/* Zone dropdown */
.zone-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(138, 163, 255, 0.3);
  border-top: none;
  border-radius: 0 0 3px 3px;
  background: #1a1a2e;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.zone-option {
  padding: 5px 10px;
  cursor: pointer;
  font-size: 0.85em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.zone-option:hover {
  background: rgba(138, 163, 255, 0.15);
}

.zone-option:last-child {
  border-bottom: none;
}
</style>
