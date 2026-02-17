<template>
  <div class="npc-spawn-editor">
    <div class="d-flex align-items-center justify-content-between p-2 editor-header">
      <div class="font-weight-bold title-text">
        <i class="fa fa-map-marker mr-1"></i>
        NPC Spawn Editor
        <small v-if="loaded" class="ml-2 count-text">({{ spawnRows.length }})</small>
      </div>

      <div>
        <button class="btn btn-xs btn-outline-info mr-1" @click="loadSpawns" :disabled="loading">
          <i class="fa fa-refresh mr-1"></i> Refresh
        </button>
        <button class="btn btn-xs btn-outline-warning" @click="toggleExpanded">
          <span v-if="expanded"><i class="fa fa-chevron-up mr-1"></i> Collapse</span>
          <span v-else><i class="fa fa-chevron-down mr-1"></i> Expand</span>
        </button>
      </div>
    </div>

    <b-collapse v-model="expanded">
      <div v-if="loading" class="text-center p-3">
        <i class="fa fa-spinner fa-spin mr-1"></i> Loading spawn data...
      </div>

      <div v-else class="p-2">
        <div class="editor-panel mb-3 p-2">
          <div class="d-flex align-items-center justify-content-between mb-2">
            <div class="font-weight-bold"><i class="fa fa-plus-circle mr-1"></i> Add Spawn</div>
            <button class="btn btn-xs btn-outline-success" @click="showCreate = !showCreate">
              {{ showCreate ? 'Hide' : 'New Spawn' }}
            </button>
          </div>

          <div v-if="showCreate" class="row">
            <div class="col-4 mb-2">
              <label class="eq-label">Zone</label>
              <input v-model="createForm.zone" class="form-control form-control-sm eq-input" placeholder="freportw" />
            </div>
            <div class="col-2 mb-2">
              <label class="eq-label">Version</label>
              <input v-model.number="createForm.version" type="number" class="form-control form-control-sm eq-input" />
            </div>
            <div class="col-2 mb-2">
              <label class="eq-label">Respawn</label>
              <input v-model.number="createForm.respawntime" type="number" class="form-control form-control-sm eq-input" />
            </div>
            <div class="col-2 mb-2">
              <label class="eq-label">Grid</label>
              <input v-model.number="createForm.pathgrid" type="number" class="form-control form-control-sm eq-input" />
            </div>
            <div class="col-2 mb-2">
              <label class="eq-label">Chance %</label>
              <input v-model.number="createForm.chance" type="number" min="0" max="100" class="form-control form-control-sm eq-input" />
            </div>

            <div class="col-3 mb-2"><label class="eq-label">X</label><input v-model.number="createForm.x" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-3 mb-2"><label class="eq-label">Y</label><input v-model.number="createForm.y" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-3 mb-2"><label class="eq-label">Z</label><input v-model.number="createForm.z" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-3 mb-2"><label class="eq-label">Heading</label><input v-model.number="createForm.heading" type="number" class="form-control form-control-sm eq-input" /></div>

            <div class="col-8 mb-2">
              <label class="eq-label">Spawn Group Name</label>
              <input v-model="createForm.spawngroupName" class="form-control form-control-sm eq-input" placeholder="Auto-created group" />
            </div>
            <div class="col-4 mb-2 d-flex align-items-end">
              <button class="btn btn-sm btn-success w-100" @click="createSpawn" :disabled="saving">
                <i class="fa fa-save mr-1"></i> Create Spawn
              </button>
            </div>
          </div>
        </div>

        <div v-if="error" class="alert alert-danger py-1 px-2 mb-2">{{ error }}</div>
        <div v-if="success" class="alert alert-success py-1 px-2 mb-2">{{ success }}</div>

        <div v-if="loaded && spawnRows.length === 0" class="text-center p-3 empty-state">
          <i class="fa fa-info-circle mr-1"></i> No spawn locations found for this NPC.
        </div>

        <div v-for="row in spawnRows" :key="row.spawn2Id" class="editor-panel mb-2 p-2">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <div>
              <span class="font-weight-bold zone-text">{{ row.zone }}</span>
              <small class="ml-2 text-muted">spawn2 #{{ row.spawn2Id }} · SG {{ row.spawngroupId }}</small>
            </div>
            <div>
              <button class="btn btn-xs btn-outline-warning mr-1" @click="row.editing = !row.editing">{{ row.editing ? 'Done' : 'Edit' }}</button>
              <button class="btn btn-xs btn-outline-danger" @click="deleteSpawn(row)" :disabled="saving"><i class="fa fa-trash"></i></button>
            </div>
          </div>

          <div class="row">
            <div class="col-2 mb-1"><label class="eq-label">X</label><input v-model.number="row.x" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Y</label><input v-model.number="row.y" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Z</label><input v-model.number="row.z" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Heading</label><input v-model.number="row.heading" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Respawn</label><input v-model.number="row.respawntime" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Chance %</label><input v-model.number="row.chance" :disabled="!row.editing" min="0" max="100" type="number" class="form-control form-control-sm eq-input" /></div>

            <div class="col-2 mb-1"><label class="eq-label">Version</label><input v-model.number="row.version" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-2 mb-1"><label class="eq-label">Grid</label><input v-model.number="row.pathgrid" :disabled="!row.editing" type="number" class="form-control form-control-sm eq-input" /></div>
            <div class="col-4 mb-1"><label class="eq-label">Zone</label><input v-model="row.zone" :disabled="!row.editing" class="form-control form-control-sm eq-input" /></div>
            <div class="col-4 mb-1 d-flex align-items-end">
              <button class="btn btn-sm btn-warning w-100" :disabled="!row.editing || saving" @click="saveSpawn(row)">
                <i class="fa fa-save mr-1"></i> Save Spawn
              </button>
            </div>
          </div>
        </div>
      </div>
    </b-collapse>
  </div>
</template>

<script>
import { Spawn2Api, SpawnentryApi, SpawngroupApi } from "../../app/api";
import { SpireApi } from "../../app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";

export default {
  name: "NpcSpawnLocations",
  props: {
    npcId: { type: Number, required: true },
  },
  data() {
    return {
      expanded: false,
      loading: false,
      loaded: false,
      saving: false,
      showCreate: false,
      error: "",
      success: "",
      spawnRows: [],
      createForm: {
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
  watch: {
    npcId() {
      this.resetState();
    },
  },
  methods: {
    resetState() {
      this.expanded = false;
      this.loading = false;
      this.loaded = false;
      this.spawnRows = [];
      this.error = "";
      this.success = "";
    },
    toggleExpanded() {
      this.expanded = !this.expanded;
      if (this.expanded && !this.loaded && !this.loading) {
        this.loadSpawns();
      }
    },
    normalizeChance(v) {
      const n = Number(v || 0);
      if (n < 0) return 0;
      if (n > 100) return 100;
      return n;
    },
    async loadSpawns() {
      this.loading = true;
      this.error = "";
      this.success = "";
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
          return {
            editing: false,
            spawn2Id: s2.id,
            spawngroupId: sgId,
            zone: s2.zone || "unknown",
            version: Number(s2.version || 0),
            x: Number(s2.x || 0),
            y: Number(s2.y || 0),
            z: Number(s2.z || 0),
            heading: Number(s2.heading || 0),
            respawntime: Number(s2.respawntime || 0),
            pathgrid: Number(s2.pathgrid || 0),
            chance: this.normalizeChance(e.chance || 100),
          };
        }).sort((a, b) => (a.zone || "").localeCompare(b.zone || "") || (a.spawn2Id || 0) - (b.spawn2Id || 0));
      } catch (e) {
        console.error("Failed to load NPC spawn editor data", e);
        this.error = "Failed to load spawn data.";
      }

      this.loaded = true;
      this.loading = false;
    },
    async saveSpawn(row) {
      this.saving = true;
      this.error = "";
      this.success = "";

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

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
          pathgrid: Number(row.pathgrid || 0),
        });

        await spawnentryApi.updateSpawnentry(row.spawngroupId, {
          spawngroup_id: row.spawngroupId,
          npc_id: this.npcId,
          chance: this.normalizeChance(row.chance),
        });

        row.editing = false;
        this.success = `Saved spawn2 #${row.spawn2Id}.`;
      } catch (e) {
        console.error("Failed to save spawn", e);
        this.error = `Save failed for spawn2 #${row.spawn2Id}.`;
      }

      this.saving = false;
    },
    async createSpawn() {
      this.saving = true;
      this.error = "";
      this.success = "";

      try {
        if (!this.createForm.zone || !this.createForm.zone.trim()) {
          this.error = "Zone is required.";
          this.saving = false;
          return;
        }

        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        const sgName = this.createForm.spawngroupName && this.createForm.spawngroupName.trim().length > 0
          ? this.createForm.spawngroupName.trim()
          : `npc_${this.npcId}_spawn_${Date.now()}`;

        const sgCreate = await spawngroupApi.createSpawngroup({ name: sgName, id: 0 });
        const sg = (sgCreate.data && sgCreate.data[0]) ? sgCreate.data[0] : null;
        const spawngroupId = sg && (sg.id || sg.ID);
        if (!spawngroupId) {
          throw new Error("Unable to create spawngroup");
        }

        await spawn2Api.createSpawn2({
          spawngroup_id: spawngroupId,
          zone: this.createForm.zone.toLowerCase(),
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

        this.success = `Created spawn group ${spawngroupId} and attached NPC ${this.npcId}.`;
        this.showCreate = false;
        await this.loadSpawns();
      } catch (e) {
        console.error("Failed to create spawn", e);
        this.error = "Failed to create spawn. Check values and try again.";
      }

      this.saving = false;
    },
    async deleteSpawn(row) {
      if (!confirm(`Delete spawn2 #${row.spawn2Id}? This removes the spawn point.`)) {
        return;
      }

      this.saving = true;
      this.error = "";
      this.success = "";

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
  },
};
</script>

<style scoped>
.editor-header { border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2); }
.editor-panel { border: 1px solid rgba(248, 150, 32, 0.25); border-radius: 4px; background: rgba(16,16,16,0.55); }
.eq-label { font-size: 11px; opacity: 0.7; margin-bottom: 2px; display: block; }
.eq-input { background: rgba(0,0,0,.35); border-color: rgba(248,150,32,.25); color: #f0f0f0; }
.eq-input:disabled { opacity: .7; }
.title-text, .zone-text { color: #f89620; }
.count-text, .empty-state { opacity: .6; }
</style>
