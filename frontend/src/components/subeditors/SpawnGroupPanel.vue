<template>
  <div>
    <div class="d-flex align-items-center justify-content-between mb-2">
      <div class="font-weight-bold" style="font-size: 13px; color: #ffc832;">
        <i class="fa fa-map-marker mr-1"></i> Spawn Group
        <span v-if="spawn2 && spawn2.spawngroup" class="text-muted ml-1" style="font-size: 11px;">
          #{{ spawn2.spawngroup_id }}
        </span>
      </div>
      <button
        v-if="spawn2 && spawn2.spawngroup_id"
        class="btn btn-sm btn-outline-warning py-0"
        style="font-size: 11px; height: 22px;"
        title="Open in Spawn Editor"
        @click="openInSpawnEditor"
      >
        <i class="fa fa-external-link mr-1"></i> Edit
      </button>
    </div>

    <!-- NPCs in Spawngroup -->
    <div>
      <div class="font-weight-bold mb-1" style="font-size: 12px; opacity: 0.7;">
        NPCs in Spawngroup
      </div>
      <div v-if="!spawn2 || !spawn2.spawnentries || spawn2.spawnentries.length === 0" class="text-muted" style="font-size: 11px;">
        No NPCs in this spawngroup.
      </div>
      <table
        v-else
        style="width: 100%; table-layout: fixed; font-size: 12px; border-collapse: collapse;"
      >
        <colgroup>
          <col style="width: 70%;" />
          <col style="width: 30%;" />
        </colgroup>
        <thead>
          <tr>
            <th style="padding: 3px 4px; font-size: 11px; opacity: 0.6; font-weight: normal; text-align: left;">NPC</th>
            <th style="padding: 3px 4px; font-size: 11px; opacity: 0.6; font-weight: normal; text-align: right;">Chance</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in spawn2.spawnentries" :key="entry.npc_id + '-' + entry.spawngroup_id">
            <td style="padding: 3px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <npc-popover
                v-if="entry.npc_type"
                :npc="entry.npc_type"
                :show-image="false"
                :show-label="false"
                :no-stats="true"
                :limit-entries="25"
              >
                <span :title="cleanName(entry.npc_type.name)">{{ cleanName(entry.npc_type.name) }}</span>
              </npc-popover>
              <span v-else class="text-muted">#{{ entry.npc_id }}</span>
            </td>
            <td style="padding: 3px 4px; text-align: right; opacity: 0.8;">{{ entry.chance }}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import { Npcs } from "../../app/npcs";
import { ROUTE } from "../../routes";
import NpcPopover from "../NpcPopover";

export default {
  name: "SpawnGroupPanel",
  components: { NpcPopover },
  props: {
    spawn2: {
      type: Object,
      default: null,
    },
  },
  methods: {
    cleanName(name) {
      return Npcs.getCleanName(name);
    },
    openInSpawnEditor() {
      if (!this.spawn2 || !this.spawn2.spawngroup_id) return;
      this.$router.push({
        path: ROUTE.SPAWN_EDITOR,
        query: { spawnGroupId: this.spawn2.spawngroup_id },
      });
    },
  },
};
</script>
