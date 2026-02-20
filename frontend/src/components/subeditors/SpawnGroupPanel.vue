<template>
  <div>
    <div class="font-weight-bold mb-2" style="font-size: 13px; color: #ffc832;">
      <i class="fa fa-map-marker mr-1"></i> Spawn Group
      <span v-if="spawn2 && spawn2.spawngroup" class="text-muted ml-1" style="font-size: 11px;">
        #{{ spawn2.spawngroup_id }}
      </span>
    </div>

    <!-- Roam Distance Field -->
    <div class="mb-2" v-if="spawn2 && spawn2.spawngroup">
      <label style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; display: block;">Roam Distance</label>
      <input
        type="number"
        class="form-control form-control-sm bg-dark text-white border-secondary"
        style="width: 120px; font-size: 12px;"
        :value="localDist"
        @input="onDistInput"
        @focus="rangeVisualizerActive = true"
        @blur="saveRoamDistance"
        min="0"
        step="1"
      />
    </div>

    <!-- NPCs in Spawngroup Table -->
    <div class="mt-2">
      <div class="font-weight-bold mb-1" style="font-size: 12px; opacity: 0.7;">
        NPCs in Spawngroup
      </div>
      <div v-if="localEntries.length === 0" class="text-muted" style="font-size: 11px;">
        No NPCs in this spawngroup.
      </div>
      <table
        v-else
        style="width: 100%; table-layout: fixed; font-size: 12px; border-collapse: collapse;"
      >
        <colgroup>
          <col style="width: calc(50% - 20px);" />
          <col style="width: calc(50% - 20px);" />
          <col style="width: 40px;" />
        </colgroup>
        <thead>
          <tr>
            <th style="padding: 3px 4px; font-size: 11px; opacity: 0.6; font-weight: normal; text-align: left;">NPC</th>
            <th style="padding: 3px 4px; font-size: 11px; opacity: 0.6; font-weight: normal; text-align: left;">Chance %</th>
            <th style="padding: 3px 2px; text-align: center;"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in localEntries" :key="entry.npc_id + '-' + entry.spawngroup_id">
            <td style="padding: 3px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" :title="entry.npc_type ? cleanName(entry.npc_type.name) : '#' + entry.npc_id">
              <span v-if="entry.npc_type">{{ cleanName(entry.npc_type.name) }}</span>
              <span v-else class="text-muted">#{{ entry.npc_id }}</span>
            </td>
            <td style="padding: 3px 4px;">
              <div class="d-flex align-items-center">
                <input
                  type="range"
                  class="mr-2"
                  style="width: 100px; accent-color: #ffc832;"
                  min="0"
                  max="100"
                  step="1"
                  :value="entry.chance"
                  @input="onChanceInput(entry, $event)"
                  @change="saveChance(entry)"
                />
                <span style="min-width: 28px; font-size: 11px; text-align: right;">{{ entry.chance }}%</span>
              </div>
            </td>
            <td style="padding: 3px 2px; text-align: center;">
              <button
                class="btn btn-sm btn-outline-danger py-0"
                style="font-size: 10px; width: 28px; height: 22px; padding: 0;"
                title="Remove NPC from spawngroup"
                @click="deleteEntry(entry)"
              >
                <i class="fa fa-trash"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Range Visualizer -->
    <div v-if="rangeVisualizerActive && spawn2 && spawn2.spawngroup" class="mt-3 fade-in">
      <div class="font-weight-bold mb-1" style="font-size: 11px; opacity: 0.6;">Range Visualizer — Roam Distance: {{ localDist }} units</div>
      <range-visualizer :unit-marker="localDistNum" />
    </div>
  </div>
</template>

<script>
import RangeVisualizer from "../tools/RangeVisualizer";
import {SpireApi}      from "../../app/api/spire-api";
import {Npcs}          from "../../app/npcs";

export default {
  name: "SpawnGroupPanel",
  components: { RangeVisualizer },
  props: {
    spawn2: {
      type: Object,
      default: null,
    },
  },
  data() {
    return {
      rangeVisualizerActive: false,
      localDist: 0,
      localEntries: [],
    }
  },
  computed: {
    localDistNum() {
      return parseInt(this.localDist) || 0
    },
  },
  watch: {
    spawn2: {
      immediate: true,
      handler(val) {
        if (val && val.spawngroup) {
          this.localDist = val.spawngroup.dist || 0
        }
        if (val && val.spawnentries) {
          this.localEntries = val.spawnentries.map(e => Object.assign({}, e))
        } else {
          this.localEntries = []
        }
        this.rangeVisualizerActive = false
      }
    }
  },
  methods: {
    cleanName(name) {
      return Npcs.getCleanName(name)
    },

    onDistInput(event) {
      this.localDist = parseInt(event.target.value) || 0
    },

    async saveRoamDistance() {
      if (!this.spawn2 || !this.spawn2.spawngroup) return
      const id = this.spawn2.spawngroup.id
      if (!id) return
      try {
        await SpireApi.v1().patch(`/spawngroup/${id}`, { dist: this.localDist })
        // update local spawn2 copy
        const updated = Object.assign({}, this.spawn2, {
          spawngroup: Object.assign({}, this.spawn2.spawngroup, { dist: this.localDist })
        })
        this.$emit('spawn2-updated', updated)
      } catch (e) {
        console.error('Failed to update roam distance', e)
      }
    },

    onChanceInput(entry, event) {
      entry.chance = parseInt(event.target.value) || 0
    },

    async saveChance(entry) {
      if (!entry.spawngroup_id || entry.npc_id == null) return
      try {
        await SpireApi.v1().patch(
          `/spawnentry/${entry.spawngroup_id}`,
          { chance: entry.chance },
          { params: { npcID: entry.npc_id } }
        )
      } catch (e) {
        console.error('Failed to update chance', e)
      }
    },

    async deleteEntry(entry) {
      if (!entry.spawngroup_id || entry.npc_id == null) return
      try {
        await SpireApi.v1().delete(
          `/spawnentry/${entry.spawngroup_id}`,
          { params: { npcID: entry.npc_id } }
        )
        // Remove only this entry from local list
        this.localEntries = this.localEntries.filter(
          e => !(e.spawngroup_id === entry.spawngroup_id && e.npc_id === entry.npc_id)
        )
        // Emit updated spawn2
        const updated = Object.assign({}, this.spawn2, {
          spawnentries: this.localEntries
        })
        this.$emit('spawn2-updated', updated)
      } catch (e) {
        console.error('Failed to delete spawnentry', e)
      }
    },
  }
}
</script>
