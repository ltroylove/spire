<template>
  <content-area style="padding: 0 !important">
    <div class="row mt-3">

      <!-- Left Panel: NPC Search & Selection -->
      <div class="col-4">
        <eq-window title="NPCs">
          <div class="spawn-search-pane">
            <!-- Search input -->
            <div class="d-flex mb-2">
              <div class="input-group input-group-sm flex-grow-1">
                <div class="input-group-prepend">
                  <span class="input-group-text spawn-input-icon">
                    <i class="fa fa-search"></i>
                  </span>
                </div>
                <input
                  type="text"
                  class="form-control"
                  placeholder="Search NPC name or ID..."
                  v-model="npcSearch"
                  @keyup.enter="doNpcSearch"
                  @input="debouncedNpcSearch"
                  autofocus
                />
                <div class="input-group-append" v-if="npcSearch">
                  <button class="btn btn-sm spawn-clear-btn" @click="npcSearch = ''; npcList = []; selectedNpc = null; spawnGroupCards = [];" title="Clear">
                    <i class="fa fa-times"></i>
                  </button>
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline-warning ml-2 flex-shrink-0"
                @click="showCreatePanel = !showCreatePanel; selectedNpc = null; spawnGroupCards = [];"
                title="Create a new spawn"
              >
                <i class="fa fa-plus mr-1"></i> New
              </button>
            </div>

            <!-- Results count -->
            <div class="spawn-results-meta" v-if="!npcListLoading && npcSearch">
              <i class="fa fa-database mr-1" style="opacity: 0.5;"></i>
              <span v-if="npcList.length === 0">No NPCs found</span>
              <span v-else>{{ npcList.length }} NPC{{ npcList.length !== 1 ? 's' : '' }}<span v-if="npcTotalResults > npcPerPage"> &middot; page {{ npcCurrentPage }}</span></span>
            </div>
          </div>

          <!-- NPC List -->
          <div class="spawn-list" style="height: calc(100vh - 200px); overflow-y: auto;">
            <div v-if="npcListLoading" class="text-center p-3">
              <i class="fa fa-spinner fa-spin"></i> Searching...
            </div>

            <div v-if="!npcListLoading && npcList.length === 0 && npcSearch" class="text-center p-3" style="opacity: .5;">
              <i class="ra ra-dragon d-block mb-2" style="font-size: 2em;"></i>
              No NPCs found
            </div>

            <div v-if="!npcListLoading && !npcSearch && npcList.length === 0" class="text-center p-3" style="opacity: .4;">
              <i class="ra ra-dragon" style="font-size: 3em;"></i>
              <div class="mt-3">Search for an NPC to view its spawn groups</div>
            </div>

            <div
              v-for="npc in npcList"
              :key="npc.id"
              class="spawn-list-item"
              :class="{ 'active': selectedNpc && selectedNpc.id === npc.id }"
              @click="selectNpc(npc)"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div style="min-width: 0; flex: 1;">
                  <div class="spawn-list-name text-truncate">
                    {{ npc.cleanName }}
                  </div>
                  <small class="text-muted">
                    NPC #{{ npc.id }}
                  </small>
                </div>
                <div class="text-right ml-2" style="flex-shrink: 0;">
                  <span class="badge badge-pill" style="background: rgba(252,199,33,0.15); color: #fcc721; font-size: 0.75em;">
                    Level {{ npc.level || '?' }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="text-center mt-2 mb-2" v-if="npcTotalResults > npcPerPage">
              <b-pagination
                size="sm"
                v-model="npcCurrentPage"
                :total-rows="npcTotalResults"
                :per-page="npcPerPage"
                :hide-ellipsis="true"
                @change="paginateNpcs"
              />
            </div>
          </div>
        </eq-window>
      </div>

      <!-- Right Panel: Spawngroups for selected NPC -->
      <div class="col-8">

        <!-- Empty State -->
        <eq-window v-if="!selectedNpc && !showCreatePanel" title="Spawn Editor">
          <div class="text-center p-5" style="opacity: .4;">
            <i class="fa fa-map-marker" style="font-size: 3em;"></i>
            <div class="mt-3">Select an NPC from the left panel to view its spawn groups</div>
          </div>
        </eq-window>

        <!-- Create New Spawn Panel -->
        <eq-window v-if="showCreatePanel" title="Create New Spawn">
          <div class="create-form-container">
            <!-- NPC Selection -->
            <div class="detail-section mb-3">
              <div class="detail-section-title">
                <i class="ra ra-dragon mr-1"></i> NPC
              </div>
              <div class="row mt-2">
                <div class="col-8">
                  <label class="field-label">NPC Search</label>
                  <div class="position-relative">
                    <input
                      v-model="createForm.npcSearch"
                      class="form-control form-control-sm"
                      placeholder="Search NPC by name or ID..."
                      @input="onCreateNpcSearch"
                      @focus="showCreateNpcDropdown = true"
                      @blur="delayCloseCreateNpcDropdown"
                      autocomplete="off"
                    />
                    <div v-if="showCreateNpcDropdown && createNpcResults.length > 0" class="zone-dropdown">
                      <div
                        v-for="n in createNpcResults"
                        :key="n.id"
                        class="zone-option"
                        @mousedown.prevent="selectCreateNpc(n)"
                      >
                        <span class="text-warning">{{ (n.name || '').replace(/_/g, ' ') }}</span>
                        <span class="text-muted ml-2" style="font-size: 0.85em;">#{{ n.id }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-4">
                  <label class="field-label">NPC ID</label>
                  <input v-model.number="createForm.npcId" type="number" class="form-control form-control-sm" />
                </div>
              </div>
            </div>

            <!-- Zone & Position -->
            <div class="detail-section mb-3">
              <div class="detail-section-title">
                <i class="fa fa-map-pin mr-1"></i> Location
              </div>
              <div class="row mt-2">
                <div class="col-6 mb-2">
                  <label class="field-label">Zone</label>
                  <div class="d-flex position-relative">
                    <input
                      v-model="createForm.zoneSearch"
                      class="form-control form-control-sm"
                      placeholder="Search zones..."
                      @input="onCreateZoneSearch"
                      @focus="showCreateZoneDropdown = true"
                      @blur="delayCloseCreateZoneDropdown"
                      autocomplete="off"
                      style="flex: 1;"
                    />
                    <button
                      class="btn btn-sm btn-dark ml-1 flex-shrink-0"
                      @click="openZonePicker(z => { createForm.zone = z.short_name; createForm.zoneSearch = z.short_name; })"
                      title="Browse zones"
                    ><i class="fa fa-search"></i></button>
                    <div v-if="showCreateZoneDropdown && createFilteredZones.length > 0" class="zone-dropdown">
                      <div
                        v-for="z in createFilteredZones"
                        :key="z.short_name + '-' + z.version"
                        class="zone-option"
                        @mousedown.prevent="selectCreateZone(z)"
                      >
                        <span class="text-warning">{{ z.short_name }}</span>
                        <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="col-3 mb-2">
                  <label class="field-label">Version</label>
                  <input v-model.number="createForm.version" type="number" class="form-control form-control-sm" />
                </div>
                <div class="col-3 mb-2">
                  <label class="field-label">Path Grid</label>
                  <input v-model.number="createForm.pathgrid" type="number" class="form-control form-control-sm" />
                </div>
              </div>
              <div class="row">
                <div class="col-3 mb-2">
                  <label class="field-label">X</label>
                  <input v-model.number="createForm.x" type="number" step="0.01" class="form-control form-control-sm" />
                </div>
                <div class="col-3 mb-2">
                  <label class="field-label">Y</label>
                  <input v-model.number="createForm.y" type="number" step="0.01" class="form-control form-control-sm" />
                </div>
                <div class="col-3 mb-2">
                  <label class="field-label">Z</label>
                  <input v-model.number="createForm.z" type="number" step="0.01" class="form-control form-control-sm" />
                </div>
                <div class="col-3 mb-2">
                  <label class="field-label">Heading</label>
                  <input v-model.number="createForm.heading" type="number" step="0.01" class="form-control form-control-sm" />
                </div>
              </div>
            </div>

            <!-- Timing -->
            <div class="detail-section mb-3">
              <div class="detail-section-title">
                <i class="fa fa-clock-o mr-1"></i> Timing & Config
              </div>
              <div class="row mt-2">
                <div class="col-4 mb-2">
                  <label class="field-label">Respawn Time (sec)</label>
                  <div class="input-group input-group-sm">
                    <input v-model.number="createForm.respawntime" type="number" class="form-control" />
                    <div class="input-group-append">
                      <span class="input-group-text" style="font-size: 0.75em;">{{ formatTime(createForm.respawntime) }}</span>
                    </div>
                  </div>
                </div>
                <div class="col-4 mb-2">
                  <label class="field-label">Chance %</label>
                  <input v-model.number="createForm.chance" type="number" min="0" max="100" class="form-control form-control-sm" />
                </div>
                <div class="col-4 mb-2">
                  <label class="field-label">Spawngroup Name <small class="text-muted">(optional)</small></label>
                  <input v-model="createForm.spawngroupName" class="form-control form-control-sm" placeholder="Auto-generated" />
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="d-flex justify-content-end">
              <button class="btn btn-sm btn-dark mr-2" @click="showCreatePanel = false">Cancel</button>
              <button class="btn btn-sm btn-outline-success" @click="createSpawn" :disabled="saving">
                <i class="fa fa-plus mr-1"></i> Create Spawn
              </button>
            </div>
          </div>
        </eq-window>

        <!-- Loading -->
        <div v-if="spawnGroupsLoading" class="text-center p-5">
          <i class="fa fa-spinner fa-spin fa-2x"></i>
          <div class="mt-2 text-muted">Loading spawn groups...</div>
        </div>

        <!-- Selected NPC header -->
        <div v-if="selectedNpc && !showCreatePanel && !spawnGroupsLoading">
          <eq-window class="p-0">
            <div class="spawn-editor-header">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                  <h5 class="mb-0 mr-3" style="color: #fcc721;">
                    <i class="ra ra-dragon mr-2"></i>
                    {{ selectedNpc.cleanName }}
                  </h5>
                  <small class="text-muted">NPC #{{ selectedNpc.id }}</small>
                </div>
                <span class="badge badge-pill" style="background: rgba(138,163,255,0.15); color: #8aa3ff;">
                  {{ spawnGroupCards.length }} spawn group{{ spawnGroupCards.length !== 1 ? 's' : '' }}
                </span>
              </div>
            </div>
          </eq-window>

          <!-- Messages -->
          <div v-if="editorError" class="alert alert-danger py-2 px-3 mt-2 small">
            <i class="fa fa-exclamation-triangle mr-1"></i>{{ editorError }}
          </div>
          <div v-if="editorSuccess" class="alert alert-success py-2 px-3 mt-2 small">
            <i class="fa fa-check mr-1"></i>{{ editorSuccess }}
          </div>

          <!-- Spawngroup Cards (scrollable EQ frame) -->
          <eq-window title="Spawn Groups" class="p-0 mt-3">
            <div style="height: calc(100vh - 250px); overflow-y: auto; padding: 8px;">

              <!-- Expand / Collapse All -->
              <div v-if="spawnGroupCards.length > 1" class="d-flex justify-content-end mb-2" style="gap: 4px;">
                <button class="btn btn-xs btn-dark" @click="spawnGroupCards.forEach((c,i) => $set(spawnGroupCards[i], 'collapsed', false))">
                  <i class="fa fa-expand mr-1"></i> Expand All
                </button>
                <button class="btn btn-xs btn-dark" @click="spawnGroupCards.forEach((c,i) => $set(spawnGroupCards[i], 'collapsed', true))">
                  <i class="fa fa-compress mr-1"></i> Collapse All
                </button>
              </div>

              <!-- No spawngroups message -->
              <div v-if="spawnGroupCards.length === 0" class="text-center p-4" style="opacity: .5;">
                <i class="fa fa-map-marker fa-2x d-block mb-2"></i>
                This NPC has no spawn groups.
              </div>

              <div
                v-for="(card, cardIdx) in spawnGroupCards"
                :key="card.spawngroupId"
              >
                <div v-if="cardIdx > 0" class="spawn-group-separator"></div>
                <eq-window>
              <!-- Spawngroup Header -->
              <div
                class="d-flex justify-content-between align-items-center"
                :class="card.collapsed ? '' : 'mb-2'"
                style="cursor: pointer;"
                @click="$set(card, 'collapsed', !card.collapsed)"
              >
                <div
                  class="d-flex align-items-center"
                  style="flex: 1; min-width: 0;"
                >
                  <i
                    class="fa mr-2"
                    :class="card.collapsed ? 'fa-chevron-right' : 'fa-chevron-down'"
                    style="color: #888; font-size: 11px; flex-shrink: 0;"
                  ></i>
                  <span style="color: #fcc721; font-weight: bold; white-space: nowrap;">
                    <i class="fa fa-object-group mr-1"></i>
                    {{ card.spawngroup.name || ('Spawngroup #' + card.spawngroupId) }}
                  </span>
                  <small class="text-muted ml-2" style="white-space: nowrap;">SG #{{ card.spawngroupId }}</small>
                  <!-- Collapsed summary: NPC count + spawn point count -->
                  <small v-if="card.collapsed" class="text-muted ml-3" style="font-size: 10px; white-space: nowrap; opacity: 0.7;">
                    {{ card.entries.length }} NPC{{ card.entries.length !== 1 ? 's' : '' }}
                    <template v-if="card.spawnPoints.length > 0"> &middot; {{ card.spawnPoints.length }} point{{ card.spawnPoints.length !== 1 ? 's' : '' }}</template>
                  </small>
                  <!-- Expanded: zone badges -->
                  <template v-if="!card.collapsed">
                    <span
                      v-for="sp in card.spawnPoints"
                      :key="sp.id"
                      class="badge badge-pill ml-2"
                      style="background: rgba(252,199,33,0.2); color: #fcc721; font-size: 0.75em;"
                    >
                      {{ sp.zone }} ({{ sp.x.toFixed(0) }}, {{ sp.y.toFixed(0) }}, {{ sp.z.toFixed(0) }})
                    </span>
                  </template>
                </div>
                <div class="ml-2" style="flex-shrink: 0;">
                  <button
                    class="btn btn-sm btn-outline-info mr-1"
                    @click.stop="cloneSpawnGroupCard(card)"
                    :disabled="saving"
                    title="Clone this spawngroup"
                  >
                    <i class="fa fa-copy mr-1"></i> Clone
                  </button>
                  <button
                    class="btn btn-sm btn-outline-success mr-1"
                    @click.stop="saveSpawnGroupCard(card)"
                    :disabled="saving"
                    title="Save all changes to this spawngroup"
                  >
                    <i class="fa fa-save mr-1"></i> Save
                  </button>
                </div>
              </div>

              <!-- Spawngroup body (collapsible) -->
              <div v-if="!card.collapsed">

              <!-- Spawngroup Settings Row -->
              <div class="detail-section mb-3">
                <div class="detail-section-title">
                  <i class="fa fa-cog mr-1"></i> Spawngroup Settings
                </div>
                <div class="row mt-2">
                  <div class="col-4 mb-2">
                    <label class="field-label">Group Name</label>
                    <input v-model="card.spawngroup.name" class="form-control form-control-sm" />
                  </div>
                  <div class="col-2 mb-2">
                    <label class="field-label">Spawn Limit</label>
                    <input v-model.number="card.spawngroup.spawn_limit" type="number" class="form-control form-control-sm" />
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Roam Distance</label>
                    <input
                      v-model.number="card.spawngroup.dist"
                      type="number"
                      step="0.1"
                      class="form-control form-control-sm"
                      @focus="$set(card, 'roamDistVisualizerActive', true)"
                      @blur="$set(card, 'roamDistVisualizerActive', false)"
                    />
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Despawn</label>
                    <select v-model.number="card.spawngroup.despawn" class="form-control form-control-sm">
                      <option :value="0">None</option>
                      <option :value="1">On Death</option>
                      <option :value="2">Depop</option>
                      <option :value="3">Timer</option>
                    </select>
                  </div>
                </div>
                <div class="row">
                  <div class="col-3 mb-2">
                    <label class="field-label">Delay (ms)</label>
                    <div class="input-group input-group-sm">
                      <input v-model.number="card.spawngroup.delay" type="number" class="form-control" />
                      <div class="input-group-append">
                        <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(Math.round((card.spawngroup.delay || 0) / 1000)) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Min Delay (ms)</label>
                    <div class="input-group input-group-sm">
                      <input v-model.number="card.spawngroup.mindelay" type="number" class="form-control" />
                      <div class="input-group-append">
                        <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(Math.round((card.spawngroup.mindelay || 0) / 1000)) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Despawn Timer (sec)</label>
                    <div class="input-group input-group-sm">
                      <input v-model.number="card.spawngroup.despawn_timer" type="number" class="form-control" />
                      <div class="input-group-append">
                        <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(card.spawngroup.despawn_timer) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">WP Spawns</label>
                    <input v-model.number="card.spawngroup.wp_spawns" type="number" class="form-control form-control-sm" />
                  </div>
                </div>
                <div class="row">
                  <div class="col-3 mb-2">
                    <label class="field-label">Min X</label>
                    <input v-model.number="card.spawngroup.min_x" type="number" step="0.1" class="form-control form-control-sm" />
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Max X</label>
                    <input v-model.number="card.spawngroup.max_x" type="number" step="0.1" class="form-control form-control-sm" />
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Min Y</label>
                    <input v-model.number="card.spawngroup.min_y" type="number" step="0.1" class="form-control form-control-sm" />
                  </div>
                  <div class="col-3 mb-2">
                    <label class="field-label">Max Y</label>
                    <input v-model.number="card.spawngroup.max_y" type="number" step="0.1" class="form-control form-control-sm" />
                  </div>
                </div>
              </div>

              <!-- Range Visualizer -->
              <eq-window-simple
                class="fade-in text-center mt-2 mb-3"
                title="Range Visualizer"
                v-if="card.roamDistVisualizerActive"
              >
                <range-visualizer :unit-marker="card.spawngroup.dist || 0" />
              </eq-window-simple>

              <!-- NPCs in Spawngroup (Spawnentries) -->
              <div class="detail-section mb-3">
                <div class="detail-section-title d-flex justify-content-between align-items-center">
                  <span><i class="ra ra-dragon mr-1"></i> NPCs in Spawngroup ({{ card.entries.length }})</span>
                  <div>
                    <button class="btn btn-xs btn-outline-warning mr-1" @click="openAddNpcModal(card)" title="Add NPC">
                      <i class="fa fa-plus mr-1"></i> Add NPC
                    </button>
                    <button class="btn btn-xs btn-dark" @click="balanceChances(card)" title="Balance chances equally">
                      <i class="fa fa-balance-scale mr-1"></i> Balance
                    </button>
                  </div>
                </div>
                <table class="eq-table eq-highlight-rows w-100 mt-2" style="font-size: 13px; table-layout: fixed;">
                  <thead class="eq-table-floating-header">
                    <tr>
                      <th style="width: 20%;">NPC</th>
                      <th class="text-center" style="width: 26%;">Chance %</th>
                      <th style="width: 18%;">Content Flags</th>
                      <th style="width: 18%;">Flags Disabled</th>
                      <th style="width: 10%;">Exp. Range</th>
                      <th class="text-center" style="width: 8%;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="entry in card.entries"
                      :key="entry.npc_id"
                      :class="{ 'highlight-row': selectedNpc && entry.npc_id === selectedNpc.id }"
                    >
                      <td style="vertical-align: middle; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <npc-popover
                          v-if="entry.npcData"
                          :npc="entry.npcData"
                          :show-image="false"
                          :show-label="false"
                        >
                          <router-link :to="'/npc/' + entry.npc_id" target="_blank" class="npc-link">
                            {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                          </router-link>
                          <small class="text-muted ml-1">#{{ entry.npc_id }}</small>
                        </npc-popover>
                        <span v-else>
                          <router-link :to="'/npc/' + entry.npc_id" target="_blank" class="npc-link">
                            {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                          </router-link>
                          <small class="text-muted ml-1">#{{ entry.npc_id }}</small>
                        </span>
                      </td>
                      <td style="vertical-align: middle;">
                        <div class="d-flex align-items-center justify-content-center">
                          <input v-model.number="entry.chance" type="range" min="0" max="100" class="mr-2" style="width: 140px;" />
                          <input v-model.number="entry.chance" type="number" min="0" max="100" class="form-control form-control-sm text-center" style="width: 55px;" />
                        </div>
                      </td>
                      <td style="vertical-align: middle;">
                        <content-flag-selector
                          :value="entry.content_flags"
                          @input="entry.content_flags = $event"
                        />
                      </td>
                      <td style="vertical-align: middle;">
                        <content-flag-selector
                          :value="entry.content_flags_disabled"
                          @input="entry.content_flags_disabled = $event"
                        />
                      </td>
                      <td style="vertical-align: middle;">
                        <div class="d-flex flex-column" style="gap: 3px;">
                          <button
                            class="btn expansion-pick-btn"
                            :class="entry.min_expansion === -1 ? 'expansion-pick-btn-all' : 'expansion-pick-btn-set'"
                            :title="'Min Expansion: ' + expansionName(entry.min_expansion)"
                            @click="openExpansionPicker(entry, 'min_expansion', 'Min Expansion')"
                          >Min: {{ expansionName(entry.min_expansion) }}</button>
                          <button
                            class="btn expansion-pick-btn"
                            :class="entry.max_expansion === -1 ? 'expansion-pick-btn-all' : 'expansion-pick-btn-set'"
                            :title="'Max Expansion: ' + expansionName(entry.max_expansion)"
                            @click="openExpansionPicker(entry, 'max_expansion', 'Max Expansion')"
                          >Max: {{ expansionName(entry.max_expansion) }}</button>
                        </div>
                      </td>
                      <td class="text-center" style="vertical-align: middle;">
                        <button class="btn btn-xs btn-dark" @click="removeSpawnEntry(card, entry)" title="Remove NPC">
                          <i class="fa fa-times text-danger"></i>
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Spawn Point Toggle Button -->
              <div class="mb-2" v-if="card.spawnPoints.length > 0">
                <button
                  class="btn btn-sm btn-block spawn-point-toggle"
                  @click="$set(card, 'showSpawnPoints', !card.showSpawnPoints)"
                >
                  <i class="fa mr-1" :class="card.showSpawnPoints ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
                  <i class="fa fa-map-marker mr-1"></i>
                  Spawn Points ({{ card.spawnPoints.length }})
                </button>
              </div>

              <!-- Spawn Points (spawn2) Editor for this Spawngroup -->
              <div v-if="card.showSpawnPoints && card.spawnPoints.length > 0">
                <div
                  v-for="(sp, spIdx) in card.spawnPoints"
                  :key="sp.id"
                  class="detail-section mb-3"
                >
                  <div class="detail-section-title d-flex justify-content-between align-items-center">
                    <span>
                      <i class="fa fa-map-marker mr-1"></i>
                      Spawn Point #{{ sp.id }}
                      <span class="text-muted ml-2" style="font-size: 0.85em;">
                        {{ sp.zone }} ({{ Number(sp.x || 0).toFixed(1) }}, {{ Number(sp.y || 0).toFixed(1) }}, {{ Number(sp.z || 0).toFixed(1) }})
                      </span>
                    </span>
                    <button
                      class="btn btn-xs btn-outline-danger"
                      @click="deleteSpawnPoint(card, sp)"
                      :disabled="saving"
                      title="Delete this spawn point"
                    >
                      <i class="fa fa-trash mr-1"></i> Delete
                    </button>
                  </div>

                  <div class="row mt-2">
                    <div class="col-4 mb-2">
                      <label class="field-label">Zone</label>
                      <div class="d-flex position-relative">
                        <input
                          v-model="sp.zoneSearch"
                          class="form-control form-control-sm"
                          @input="onSpEditZoneSearch(sp)"
                          @focus="sp.showZoneDropdown = true"
                          @blur="delayClose(sp, 'showZoneDropdown')"
                          autocomplete="off"
                          style="flex: 1;"
                        />
                        <button
                          class="btn btn-sm btn-dark ml-1 flex-shrink-0"
                          @click="openZonePicker(z => { selectSpEditZone(sp, z); })"
                          title="Browse zones"
                        ><i class="fa fa-search"></i></button>
                        <div v-if="sp.showZoneDropdown && sp.filteredZones && sp.filteredZones.length > 0" class="zone-dropdown">
                          <div
                            v-for="z in sp.filteredZones"
                            :key="z.short_name"
                            class="zone-option"
                            @mousedown.prevent="selectSpEditZone(sp, z)"
                          >
                            <span class="text-warning">{{ z.short_name }}</span>
                            <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col-2 mb-2">
                      <label class="field-label">Version</label>
                      <input v-model.number="sp.version" type="number" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Respawn (sec)</label>
                      <div class="input-group input-group-sm">
                        <input v-model.number="sp.respawntime" type="number" class="form-control" />
                        <div class="input-group-append">
                          <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(sp.respawntime) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Variance (sec)</label>
                      <div class="input-group input-group-sm">
                        <input v-model.number="sp.variance" type="number" class="form-control" />
                        <div class="input-group-append">
                          <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(sp.variance) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-3 mb-2">
                      <label class="field-label">X</label>
                      <input v-model.number="sp.x" type="number" step="0.01" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Y</label>
                      <input v-model.number="sp.y" type="number" step="0.01" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Z</label>
                      <input v-model.number="sp.z" type="number" step="0.01" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Heading</label>
                      <input v-model.number="sp.heading" type="number" step="0.01" class="form-control form-control-sm" />
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-3 mb-2">
                      <label class="field-label">Path Grid</label>
                      <input v-model.number="sp.pathgrid" type="number" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Animation</label>
                      <select v-model.number="sp.animation" class="form-control form-control-sm">
                        <option :value="0">Standing</option>
                        <option :value="64">Sitting</option>
                        <option :value="100">Crouching</option>
                        <option :value="110">Lying Down</option>
                        <option :value="105">Kneeling</option>
                      </select>
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Condition</label>
                      <input v-model.number="sp.condition" type="number" class="form-control form-control-sm" />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Cond Value</label>
                      <input v-model.number="sp.cond_value" type="number" class="form-control form-control-sm" />
                    </div>
                  </div>

                  <div class="row">
                    <div class="col-3 mb-2">
                      <label class="field-label">Min Expansion</label>
                      <button
                        class="btn btn-sm btn-block expansion-pick-btn"
                        :class="sp.min_expansion === -1 ? 'expansion-pick-btn-all' : 'expansion-pick-btn-set'"
                        @click="openExpansionPicker(sp, 'min_expansion', 'Min Expansion')"
                      >{{ expansionName(sp.min_expansion) }}</button>
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Max Expansion</label>
                      <button
                        class="btn btn-sm btn-block expansion-pick-btn"
                        :class="sp.max_expansion === -1 ? 'expansion-pick-btn-all' : 'expansion-pick-btn-set'"
                        @click="openExpansionPicker(sp, 'max_expansion', 'Max Expansion')"
                      >{{ expansionName(sp.max_expansion) }}</button>
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Content Flags</label>
                      <content-flag-selector
                        :value="sp.content_flags"
                        @input="sp.content_flags = $event"
                      />
                    </div>
                    <div class="col-3 mb-2">
                      <label class="field-label">Flags Disabled</label>
                      <content-flag-selector
                        :value="sp.content_flags_disabled"
                        @input="sp.content_flags_disabled = $event"
                      />
                    </div>
                  </div>
                </div>
              </div>

              </div><!-- end collapsible body -->
                </eq-window>
              </div>
            </div>
          </eq-window>
        </div>
      </div>
    </div>

    <!-- Expansion Picker Modal -->
    <b-modal
      id="expansion-picker-modal"
      hide-header
      hide-footer
      modal-class="eq-expansion-modal"
      content-class="bg-transparent border-0 shadow-none"
      body-class="p-0"
    >
      <eq-window :title="expansionPickerLabel || 'Select Expansion'">
        <content-expansion-selector
          :value="expansionPickerValue"
          @input="applyExpansionPick($event)"
        />
        <div class="d-flex justify-content-end mt-3">
          <button class="btn btn-sm btn-dark" @click="$bvModal.hide('expansion-picker-modal')">
            Cancel
          </button>
        </div>
      </eq-window>
    </b-modal>

    <!-- Zone Picker Modal -->
    <b-modal
      id="zone-picker-modal"
      hide-header
      hide-footer
      modal-class="eq-style-modal"
      content-class="bg-transparent border-0 shadow-none"
      body-class="p-0"
      size="lg"
    >
      <eq-window title="Select Zone">
        <input
          v-model="zonePicker.search"
          class="form-control form-control-sm mb-2"
          placeholder="Search by zone name or short name..."
          @input="onZonePickerSearch"
          autofocus
        />
        <div style="height: 60vh; overflow-y: auto;">
          <table class="eq-table eq-highlight-rows w-100" style="font-size: 13px;">
            <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 30%;">Short Name</th>
                <th>Long Name</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="z in zonePicker.filteredZones"
                :key="z.short_name + '-' + z.version"
                style="cursor: pointer;"
                @click="selectZonePicker(z)"
              >
                <td class="text-warning">{{ z.short_name }}</td>
                <td class="text-muted">{{ z.long_name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="d-flex justify-content-end mt-2">
          <button class="btn btn-sm btn-dark" @click="$bvModal.hide('zone-picker-modal')">Cancel</button>
        </div>
      </eq-window>
    </b-modal>

    <!-- Add NPC Modal -->
    <b-modal
      id="add-npc-modal"
      hide-header
      hide-footer
      modal-class="eq-style-modal"
      content-class="bg-transparent border-0 shadow-none"
      body-class="p-0"
      @show="resetAddNpcForm"
    >
      <eq-window title="Add NPC to Spawngroup">
        <div class="mb-3">
          <label class="field-label">NPC Search</label>
          <div class="position-relative">
            <input
              v-model="addNpcSearch"
              class="form-control form-control-sm add-npc-input"
              placeholder="Search NPC by name or ID..."
              @input="onAddNpcSearch"
              @focus="showAddNpcDropdown = true"
              @blur="delayCloseAddNpcDropdown"
              autocomplete="off"
            />
            <div v-if="showAddNpcDropdown && addNpcResults.length > 0" class="zone-dropdown">
              <div
                v-for="n in addNpcResults"
                :key="n.id"
                class="zone-option"
                @mousedown.prevent="selectAddNpc(n)"
              >
                <span class="text-warning">{{ (n.name || '').replace(/_/g, ' ') }}</span>
                <span class="text-muted ml-2">#{{ n.id }}</span>
              </div>
            </div>
          </div>
          <div v-if="addNpcId" class="text-muted mt-1" style="font-size: 0.8em;">
            Selected: <span class="text-warning">{{ addNpcSearch }}</span>
          </div>
        </div>
        <div class="mb-3">
          <label class="field-label">Chance %</label>
          <div class="d-flex align-items-center">
            <input v-model.number="addNpcChance" type="range" min="0" max="100" class="mr-2" style="flex: 1;" />
            <input v-model.number="addNpcChance" type="number" min="0" max="100" class="form-control form-control-sm add-npc-input text-center" style="width: 70px;" />
          </div>
        </div>
        <div class="d-flex justify-content-end">
          <button class="btn btn-sm btn-dark mr-2" @click="$bvModal.hide('add-npc-modal')">Cancel</button>
          <button class="btn btn-sm btn-outline-success" @click="confirmAddNpc" :disabled="!addNpcId || saving">
            <i class="fa fa-plus mr-1"></i> Add NPC
          </button>
        </div>
      </eq-window>
    </b-modal>
  </content-area>
</template>

<script>
import { Spawn2Api, SpawnentryApi, SpawngroupApi, NpcTypeApi } from "../../app/api";
import { SpireApi } from "../../app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Zones } from "@/app/zones";
import EqWindow from "../../components/eq-ui/EQWindow";
import EqWindowSimple from "../../components/eq-ui/EQWindowSimple";
import ContentArea from "../../components/layout/ContentArea";
import NpcPopover from "../../components/NpcPopover";
import ContentFlagSelector from "../../components/selectors/ContentFlagSelector";
import ContentExpansionSelector from "../../components/selectors/ContentExpansionSelector";
import RangeVisualizer from "../../components/tools/RangeVisualizer";
import Expansions from "../../app/utility/expansions";

let npcSearchTimeout = null;
let createNpcSearchTimeout = null;
let addNpcSearchTimeout = null;

export default {
  name: "SpawnEditor",
  components: { EqWindow, EqWindowSimple, ContentArea, NpcPopover, ContentFlagSelector, ContentExpansionSelector, RangeVisualizer },
  data() {
    return {
      // NPC search / list (left panel)
      npcSearch: "",
      npcList: [],
      npcListLoading: false,
      npcCurrentPage: 1,
      npcPerPage: 50,
      npcTotalResults: 0,

      // Selected NPC and its spawngroup cards (right panel)
      selectedNpc: null,
      spawnGroupCards: [],
      spawnGroupsLoading: false,

      // Zones
      zones: [],

      // Create form
      showCreatePanel: false,
      showCreateNpcDropdown: false,
      showCreateZoneDropdown: false,
      createNpcResults: [],
      createFilteredZones: [],
      createForm: this.getDefaultCreateForm(),

      // Add NPC to spawngroup modal
      addNpcSearch: "",
      addNpcId: 0,
      addNpcChance: 50,
      showAddNpcDropdown: false,
      addNpcResults: [],
      addNpcTargetCard: null,

      // Expansion picker modal
      expansionPickerTarget: null,
      expansionPickerField: "",
      expansionPickerLabel: "",
      expansionPickerValue: -1,

      // Zone picker modal
      zonePicker: {
        search: "",
        filteredZones: [],
        callback: null,
      },

      // State
      saving: false,
      editorError: "",
      editorSuccess: "",
    };
  },

  async created() {
    this.zones = await Zones.getZones() || [];

    // If navigated with NPC ID in route, pre-search
    if (this.$route.params.npcId) {
      this.npcSearch = this.$route.params.npcId;
      this.doNpcSearch();
    }
  },

  watch: {
    '$route'() {
      if (this.$route.params.npcId) {
        this.npcSearch = this.$route.params.npcId;
        this.doNpcSearch();
      }
    },
    editorSuccess(val) {
      if (val) {
        setTimeout(() => { this.editorSuccess = ''; }, 4000);
      }
    },
  },

  methods: {
    getDefaultCreateForm() {
      return {
        npcSearch: "",
        npcId: 0,
        zoneSearch: "",
        zone: "",
        version: 0,
        x: 0, y: 0, z: 0, heading: 0,
        respawntime: 1200,
        pathgrid: 0,
        chance: 100,
        spawngroupName: "",
      };
    },

    clearMessages() {
      this.editorError = "";
      this.editorSuccess = "";
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

    normalizeChance(v) {
      const n = Number(v || 0);
      if (n < 0) return 0;
      if (n > 100) return 100;
      return n;
    },

    // ========================
    // NPC Search (left panel)
    // ========================
    debouncedNpcSearch() {
      if (npcSearchTimeout) clearTimeout(npcSearchTimeout);
      npcSearchTimeout = setTimeout(() => this.doNpcSearch(), 300);
    },

    async doNpcSearch() {
      const q = (this.npcSearch || "").trim();
      if (!q) {
        this.npcList = [];
        this.npcTotalResults = 0;
        return;
      }

      this.npcListLoading = true;
      this.npcList = [];

      try {
        const npcApi = new NpcTypeApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();

        if (/^\d+$/.test(q)) {
          builder.where("id", "=", parseInt(q));
        } else {
          builder.where("name", "like", `%${q}%`);
        }

        builder.select(["id", "name", "level", "race", "class"]);
        builder.limit(this.npcPerPage);
        builder.page(this.npcCurrentPage);
        builder.orderBy(["name"]);

        const result = await npcApi.listNpcTypes(builder.get());
        const npcs = result.data || [];

        this.npcList = npcs.map(n => ({
          id: n.id,
          name: n.name || "",
          cleanName: (n.name || "").replace(/_/g, " "),
          level: n.level || 0,
          race: n.race || 0,
          class: n.class || 0,
        }));

        this.npcTotalResults = this.npcList.length >= this.npcPerPage
          ? (this.npcCurrentPage * this.npcPerPage) + 1
          : this.npcList.length;
      } catch (e) {
        console.error("Failed to search NPCs", e);
      }

      this.npcListLoading = false;
    },

    paginateNpcs(page) {
      this.npcCurrentPage = page;
      this.doNpcSearch();
    },

    // ========================
    // Select NPC & Load Spawngroups
    // ========================
    async selectNpc(npc) {
      this.showCreatePanel = false;
      this.selectedNpc = npc;
      this.clearMessages();
      this.spawnGroupCards = [];
      this.spawnGroupsLoading = true;

      try {
        // Step 1: Find all spawnentries for this NPC
        const entryApi = new SpawnentryApi(...SpireApi.cfg());
        const entryBuilder = new SpireQueryBuilder();
        entryBuilder.where("npcID", "=", npc.id);
        entryBuilder.limit(200);
        const entryResult = await entryApi.listSpawnentries(entryBuilder.get());
        const entries = entryResult.data || [];

        if (entries.length === 0) {
          this.spawnGroupsLoading = false;
          return;
        }

        // Step 2: Get unique spawngroup IDs
        const sgIds = [...new Set(entries.map(e => e.spawngroup_id || e.spawngroupID))];

        // Step 3: For each spawngroup, load full data
        const cards = [];
        for (const sgId of sgIds) {
          const card = await this.loadSpawnGroupCard(sgId);
          if (card) {
            cards.push(card);
          }
        }

        this.spawnGroupCards = cards;
      } catch (e) {
        console.error("Failed to load spawn groups for NPC", e);
        this.editorError = "Failed to load spawn groups.";
      }

      this.spawnGroupsLoading = false;
    },

    async loadSpawnGroupCard(sgId) {
      try {
        // Load spawngroup
        const sgApi = new SpawngroupApi(...SpireApi.cfg());
        const sgBuilder = new SpireQueryBuilder();
        sgBuilder.where("id", "=", sgId);
        const sgResult = await sgApi.listSpawngroups(sgBuilder.get());
        const sg = (sgResult.data && sgResult.data[0]) || null;
        if (!sg) return null;

        // Load all spawnentries for this group
        const entryApi = new SpawnentryApi(...SpireApi.cfg());
        const eBuilder = new SpireQueryBuilder();
        eBuilder.where("spawngroupID", "=", sgId);
        eBuilder.limit(100);
        const eResult = await entryApi.listSpawnentries(eBuilder.get());
        const rawEntries = eResult.data || [];

        // Resolve NPC names for entries
        const enrichedEntries = [];
        for (const entry of rawEntries) {
          const npcId = entry.npc_id || entry.npcID;
          let npcName = "";
          let npcData = null;
          try {
            const npcApi = new NpcTypeApi(...SpireApi.cfg());
            const nb = new SpireQueryBuilder();
            nb.where("id", "=", npcId);
            const nr = await npcApi.listNpcTypes(nb.get());
            if (nr.data && nr.data[0]) {
              npcData = nr.data[0];
              npcName = (npcData.name || "").replace(/_/g, " ");
            }
          } catch (e) { /* ignore */ }

          enrichedEntries.push({
            npc_id: npcId,
            npcName: npcName,
            npcData: npcData,
            chance: Number(entry.chance || 0),
            content_flags: entry.content_flags || "",
            content_flags_disabled: entry.content_flags_disabled || "",
            min_expansion: entry.min_expansion != null ? Number(entry.min_expansion) : -1,
            max_expansion: entry.max_expansion != null ? Number(entry.max_expansion) : -1,
            min_time: Number(entry.min_time || 0),
            max_time: Number(entry.max_time || 0),
            condition_value_filter: Number(entry.condition_value_filter || 0),
            spawngroup_id: entry.spawngroup_id || entry.spawngroupID,
          });
        }

        // Load spawn2 records for this spawngroup
        const sp2Api = new Spawn2Api(...SpireApi.cfg());
        const sp2Builder = new SpireQueryBuilder();
        sp2Builder.where("spawngroupID", "=", sgId);
        sp2Builder.limit(50);
        const sp2Result = await sp2Api.listSpawn2s(sp2Builder.get());
        const spawn2s = sp2Result.data || [];

        const spawnPoints = spawn2s.map(s2 => ({
          id: s2.id,
          spawngroupId: sgId,
          zone: s2.zone || "",
          zoneSearch: s2.zone || "",
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
          min_expansion: s2.min_expansion != null ? Number(s2.min_expansion) : -1,
          max_expansion: s2.max_expansion != null ? Number(s2.max_expansion) : -1,
          content_flags: s2.content_flags || "",
          content_flags_disabled: s2.content_flags_disabled || "",
          // UI state for zone dropdown
          showZoneDropdown: false,
          filteredZones: [],
        }));

        return {
          spawngroupId: sgId,
          spawngroup: {
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
          },
          entries: enrichedEntries,
          spawnPoints: spawnPoints,
          showSpawnPoints: false,
          collapsed: true,
        };
      } catch (e) {
        console.error("Failed to load spawngroup card", sgId, e);
        return null;
      }
    },

    // ========================
    // Spawn Point zone dropdown helpers
    // ========================
    onSpEditZoneSearch(sp) {
      sp.showZoneDropdown = true;
      const q = (sp.zoneSearch || "").toLowerCase();
      sp.filteredZones = this.zones
        .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 15);
      sp.zone = sp.zoneSearch;
    },

    selectSpEditZone(sp, z) {
      sp.zone = z.short_name;
      sp.zoneSearch = z.short_name;
      sp.showZoneDropdown = false;
    },

    delayClose(obj, key) {
      setTimeout(() => { this.$set(obj, key, false); }, 200);
    },

    // ========================
    // Save Spawngroup Card (all data in one card)
    // ========================
    async saveSpawnGroupCard(card) {
      this.saving = true;
      this.clearMessages();

      try {
        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        // Save spawngroup
        await spawngroupApi.updateSpawngroup({
          id: card.spawngroupId,
          spawngroup: {
            id: card.spawngroupId,
            name: card.spawngroup.name || "",
            spawn_limit: Number(card.spawngroup.spawn_limit || 0),
            dist: Number(card.spawngroup.dist || 0),
            delay: Number(card.spawngroup.delay || 45000),
            mindelay: Number(card.spawngroup.mindelay || 15000),
            despawn: Number(card.spawngroup.despawn || 0),
            despawn_timer: Number(card.spawngroup.despawn_timer || 100),
            wp_spawns: Number(card.spawngroup.wp_spawns || 0),
            min_x: Number(card.spawngroup.min_x || 0),
            max_x: Number(card.spawngroup.max_x || 0),
            min_y: Number(card.spawngroup.min_y || 0),
            max_y: Number(card.spawngroup.max_y || 0),
          }
        });

        // Save spawn entries (chances, content flags, etc.)
        for (const entry of card.entries) {
          await spawnentryApi.updateSpawnentry({
            id: card.spawngroupId,
            spawnentry: {
              spawngroup_id: card.spawngroupId,
              npc_id: entry.npc_id,
              chance: this.normalizeChance(entry.chance),
              content_flags: entry.content_flags || "",
              content_flags_disabled: entry.content_flags_disabled || "",
              min_expansion: Number(entry.min_expansion != null ? entry.min_expansion : -1),
              max_expansion: Number(entry.max_expansion != null ? entry.max_expansion : -1),
              min_time: Number(entry.min_time || 0),
              max_time: Number(entry.max_time || 0),
              condition_value_filter: Number(entry.condition_value_filter || 0),
            }
          });
        }

        // Save spawn points (spawn2 records)
        for (const sp of card.spawnPoints) {
          await spawn2Api.updateSpawn2({
            id: sp.id,
            spawn2: {
              id: sp.id,
              spawngroup_id: card.spawngroupId,
              zone: (sp.zone || "").toLowerCase(),
              version: Number(sp.version || 0),
              x: Number(sp.x || 0),
              y: Number(sp.y || 0),
              z: Number(sp.z || 0),
              heading: Number(sp.heading || 0),
              respawntime: Number(sp.respawntime || 0),
              variance: Number(sp.variance || 0),
              pathgrid: Number(sp.pathgrid || 0),
              animation: Number(sp.animation || 0),
              _condition: Number(sp.condition || 0),
              cond_value: Number(sp.cond_value || 1),
              min_expansion: Number(sp.min_expansion != null ? sp.min_expansion : -1),
              max_expansion: Number(sp.max_expansion != null ? sp.max_expansion : -1),
              content_flags: sp.content_flags || "",
              content_flags_disabled: sp.content_flags_disabled || "",
            }
          });
        }

        this.editorSuccess = `Saved spawngroup #${card.spawngroupId} successfully.`;
      } catch (e) {
        console.error("Failed to save spawngroup card", e);
        this.editorError = `Failed to save spawngroup #${card.spawngroupId}.`;
      }

      this.saving = false;
    },

    // ========================
    // Delete spawn point
    // ========================
    async deleteSpawnPoint(card, sp) {
      if (!confirm(`Delete spawn point #${sp.id} in ${sp.zone}?`)) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        await spawn2Api.deleteSpawn2({ id: sp.id });

        card.spawnPoints = card.spawnPoints.filter(s => s.id !== sp.id);
        this.editorSuccess = `Deleted spawn point #${sp.id}.`;

        // If no more spawn points, remove the card
        if (card.spawnPoints.length === 0) {
          this.spawnGroupCards = this.spawnGroupCards.filter(c => c.spawngroupId !== card.spawngroupId);
        }
      } catch (e) {
        console.error("Failed to delete spawn point", e);
        this.editorError = `Failed to delete spawn point #${sp.id}.`;
      }

      this.saving = false;
    },

    // ========================
    // Remove NPC from spawngroup
    // ========================
    async removeSpawnEntry(card, entry) {
      if (!confirm(`Remove NPC #${entry.npc_id} from spawngroup #${card.spawngroupId}?`)) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        await spawnentryApi.deleteSpawnentry({ id: entry.spawngroup_id });

        card.entries = card.entries.filter(e => e.npc_id !== entry.npc_id);
        this.editorSuccess = `Removed NPC #${entry.npc_id} from spawngroup.`;
      } catch (e) {
        console.error("Failed to remove spawn entry", e);
        this.editorError = "Failed to remove NPC from spawngroup.";
      }

      this.saving = false;
    },

    // ========================
    // Add NPC to spawngroup
    // ========================
    openAddNpcModal(card) {
      this.addNpcTargetCard = card;
      this.$bvModal.show('add-npc-modal');
    },

    resetAddNpcForm() {
      this.addNpcSearch = "";
      this.addNpcId = 0;
      this.addNpcChance = 50;
      this.addNpcResults = [];
      this.showAddNpcDropdown = false;
    },

    onAddNpcSearch() {
      this.showAddNpcDropdown = true;
      if (addNpcSearchTimeout) clearTimeout(addNpcSearchTimeout);
      addNpcSearchTimeout = setTimeout(() => this.searchAddNpc(), 300);
    },
    delayCloseAddNpcDropdown() {
      setTimeout(() => { this.showAddNpcDropdown = false; }, 200);
    },

    async searchAddNpc() {
      const q = (this.addNpcSearch || "").trim();
      if (q.length < 2) { this.addNpcResults = []; return; }

      try {
        const npcApi = new NpcTypeApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        if (/^\d+$/.test(q)) {
          builder.where("id", "=", parseInt(q));
        } else {
          builder.where("name", "like", `%${q}%`);
        }
        builder.select(["id", "name"]);
        builder.limit(15);
        const result = await npcApi.listNpcTypes(builder.get());
        this.addNpcResults = result.data || [];
      } catch (e) {
        this.addNpcResults = [];
      }
    },

    selectAddNpc(n) {
      this.addNpcId = n.id;
      this.addNpcSearch = (n.name || "").replace(/_/g, " ") + " (#" + n.id + ")";
      this.showAddNpcDropdown = false;
    },

    async confirmAddNpc() {
      if (!this.addNpcId || !this.addNpcTargetCard) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        await spawnentryApi.createSpawnentry({
          spawnentry: {
            spawngroup_id: this.addNpcTargetCard.spawngroupId,
            npc_id: this.addNpcId,
            chance: this.normalizeChance(this.addNpcChance),
          }
        });

        this.editorSuccess = `Added NPC #${this.addNpcId} to spawngroup.`;
        this.$bvModal.hide('add-npc-modal');

        // Reload this card's entries
        const refreshed = await this.loadSpawnGroupCard(this.addNpcTargetCard.spawngroupId);
        if (refreshed) {
          const idx = this.spawnGroupCards.findIndex(c => c.spawngroupId === this.addNpcTargetCard.spawngroupId);
          if (idx >= 0) {
            refreshed.showSpawnPoints = this.spawnGroupCards[idx].showSpawnPoints;
            this.$set(this.spawnGroupCards, idx, refreshed);
          }
        }
      } catch (e) {
        console.error("Failed to add NPC to spawngroup", e);
        this.editorError = "Failed to add NPC to spawngroup.";
      }

      this.saving = false;
    },

    // ========================
    // Balance chances
    // ========================
    balanceChances(card) {
      if (!card.entries || card.entries.length === 0) return;
      const count = card.entries.length;
      const equalChance = Math.floor(100 / count);
      const remainder = 100 - (equalChance * count);

      for (let i = 0; i < card.entries.length; i++) {
        card.entries[i].chance = equalChance + (i < remainder ? 1 : 0);
      }
    },

    // ========================
    // Zone picker modal
    // ========================
    openZonePicker(callback) {
      this.zonePicker.search = "";
      this.zonePicker.filteredZones = this.zones.slice(0, 100);
      this.zonePicker.callback = callback;
      this.$bvModal.show("zone-picker-modal");
    },
    onZonePickerSearch() {
      const q = (this.zonePicker.search || "").toLowerCase();
      if (!q) {
        this.zonePicker.filteredZones = this.zones.slice(0, 100);
        return;
      }
      this.zonePicker.filteredZones = this.zones
        .filter(z => z.short_name.toLowerCase().includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 100);
    },
    selectZonePicker(zone) {
      if (this.zonePicker.callback) {
        this.zonePicker.callback(zone);
      }
      this.$bvModal.hide("zone-picker-modal");
    },

    // ========================
    // Clone spawngroup card
    // ========================
    async cloneSpawnGroupCard(card) {
      this.saving = true;
      this.clearMessages();

      try {
        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        const newName = "Copy of " + (card.spawngroup.name || "Spawngroup #" + card.spawngroupId);
        const sgCreate = await spawngroupApi.createSpawngroup({
          spawngroup: {
            id: 0,
            name: newName,
            spawn_limit: Number(card.spawngroup.spawn_limit || 0),
            dist: Number(card.spawngroup.dist || 0),
            delay: Number(card.spawngroup.delay || 45000),
            mindelay: Number(card.spawngroup.mindelay || 15000),
            despawn: Number(card.spawngroup.despawn || 0),
            despawn_timer: Number(card.spawngroup.despawn_timer || 100),
            wp_spawns: Number(card.spawngroup.wp_spawns || 0),
            min_x: Number(card.spawngroup.min_x || 0),
            max_x: Number(card.spawngroup.max_x || 0),
            min_y: Number(card.spawngroup.min_y || 0),
            max_y: Number(card.spawngroup.max_y || 0),
          }
        });
        const sg = sgCreate.data || null;
        const newSgId = sg && sg.id;
        if (!newSgId) throw new Error("Unable to create cloned spawngroup");

        for (const entry of card.entries) {
          await spawnentryApi.createSpawnentry({
            spawnentry: {
              spawngroup_id: newSgId,
              npc_id: entry.npc_id,
              chance: this.normalizeChance(entry.chance),
              content_flags: entry.content_flags || "",
              content_flags_disabled: entry.content_flags_disabled || "",
              min_expansion: Number(entry.min_expansion != null ? entry.min_expansion : -1),
              max_expansion: Number(entry.max_expansion != null ? entry.max_expansion : -1),
              min_time: Number(entry.min_time || 0),
              max_time: Number(entry.max_time || 0),
              condition_value_filter: Number(entry.condition_value_filter || 0),
            }
          });
        }

        const newCard = await this.loadSpawnGroupCard(newSgId);
        if (newCard) {
          newCard.collapsed = false;
          this.spawnGroupCards.push(newCard);
        }

        this.editorSuccess = `Cloned spawngroup #${card.spawngroupId} → new spawngroup #${newSgId}.`;
      } catch (e) {
        console.error("Failed to clone spawngroup", e);
        this.editorError = "Failed to clone spawngroup.";
      }

      this.saving = false;
    },

    // ========================
    // Create form helpers
    // ========================
    onCreateZoneSearch() {
      this.showCreateZoneDropdown = true;
      const q = (this.createForm.zoneSearch || "").toLowerCase();
      this.createFilteredZones = this.zones
        .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 15);
      this.createForm.zone = this.createForm.zoneSearch;
    },
    delayCloseCreateZoneDropdown() {
      setTimeout(() => { this.showCreateZoneDropdown = false; }, 200);
    },
    selectCreateZone(z) {
      this.createForm.zone = z.short_name;
      this.createForm.zoneSearch = z.short_name;
      this.showCreateZoneDropdown = false;
    },

    onCreateNpcSearch() {
      this.showCreateNpcDropdown = true;
      if (createNpcSearchTimeout) clearTimeout(createNpcSearchTimeout);
      createNpcSearchTimeout = setTimeout(() => this.searchCreateNpc(), 300);
    },
    delayCloseCreateNpcDropdown() {
      setTimeout(() => { this.showCreateNpcDropdown = false; }, 200);
    },
    async searchCreateNpc() {
      const q = (this.createForm.npcSearch || "").trim();
      if (q.length < 2) { this.createNpcResults = []; return; }

      try {
        const npcApi = new NpcTypeApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        if (/^\d+$/.test(q)) {
          builder.where("id", "=", parseInt(q));
        } else {
          builder.where("name", "like", `%${q}%`);
        }
        builder.select(["id", "name"]);
        builder.limit(15);
        const result = await npcApi.listNpcTypes(builder.get());
        this.createNpcResults = result.data || [];
      } catch (e) {
        this.createNpcResults = [];
      }
    },
    selectCreateNpc(n) {
      this.createForm.npcId = n.id;
      this.createForm.npcSearch = (n.name || "").replace(/_/g, " ") + " (#" + n.id + ")";
      this.showCreateNpcDropdown = false;
    },

    // ========================
    // Create spawn
    // ========================
    async createSpawn() {
      this.saving = true;
      this.clearMessages();

      try {
        const zone = (this.createForm.zone || "").trim().toLowerCase();
        if (!zone) { this.editorError = "Zone is required."; this.saving = false; return; }
        if (!this.createForm.npcId) { this.editorError = "NPC ID is required."; this.saving = false; return; }

        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());

        const sgName = this.createForm.spawngroupName && this.createForm.spawngroupName.trim().length > 0
          ? this.createForm.spawngroupName.trim()
          : `${zone}_${this.createForm.npcId}`;

        const sgCreate = await spawngroupApi.createSpawngroup({ spawngroup: { name: sgName, id: 0 } });
        const sg = sgCreate.data || null;
        const spawngroupId = sg && sg.id;
        if (!spawngroupId) throw new Error("Unable to create spawngroup");

        await spawn2Api.createSpawn2({
          spawn2: {
            spawngroup_id: spawngroupId,
            zone: zone,
            version: Number(this.createForm.version || 0),
            x: Number(this.createForm.x || 0),
            y: Number(this.createForm.y || 0),
            z: Number(this.createForm.z || 0),
            heading: Number(this.createForm.heading || 0),
            respawntime: Number(this.createForm.respawntime || 1200),
            pathgrid: Number(this.createForm.pathgrid || 0),
          }
        });

        await spawnentryApi.createSpawnentry({
          spawnentry: {
            spawngroup_id: spawngroupId,
            npc_id: this.createForm.npcId,
            chance: this.normalizeChance(this.createForm.chance),
          }
        });

        this.editorSuccess = `Created spawngroup #${spawngroupId} in ${zone}.`;
        this.showCreatePanel = false;
        this.createForm = this.getDefaultCreateForm();

        // If an NPC is selected, refresh its data
        if (this.selectedNpc) {
          await this.selectNpc(this.selectedNpc);
        }
      } catch (e) {
        console.error("Failed to create spawn", e);
        this.editorError = "Failed to create spawn. Check values and try again.";
      }

      this.saving = false;
    },

    // ========================
    // Expansion Picker
    // ========================
    expansionName(id) {
      return Expansions.getExpansionName(parseInt(id));
    },

    openExpansionPicker(target, field, label) {
      this.expansionPickerTarget = target;
      this.expansionPickerField  = field;
      this.expansionPickerLabel  = label;
      this.expansionPickerValue  = parseInt(target[field]);
      this.$bvModal.show('expansion-picker-modal');
    },

    applyExpansionPick(value) {
      if (this.expansionPickerTarget && this.expansionPickerField) {
        this.$set(this.expansionPickerTarget, this.expansionPickerField, parseInt(value));
      }
      this.$bvModal.hide('expansion-picker-modal');
    },
  },
};
</script>

<style scoped>
/* Search pane */
.spawn-search-pane {
  margin-bottom: 8px;
}
.spawn-search-pane .form-control {
  background: rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
  border-color: rgba(255, 255, 255, 0.15);
}
.spawn-search-pane .form-control:focus {
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-color: rgba(252, 199, 33, 0.4);
  box-shadow: 0 0 0 0.15rem rgba(252, 199, 33, 0.15);
  outline: none;
}
.spawn-search-pane .form-control::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.spawn-input-icon {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.8em;
}
.spawn-clear-btn {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.4);
  padding: 0 8px;
}
.spawn-clear-btn:hover {
  color: #fcc721;
  border-color: rgba(252, 199, 33, 0.4);
}
.spawn-results-meta {
  font-size: 0.75em;
  color: rgba(255, 255, 255, 0.35);
  padding: 0 1px 4px;
}

/* Spawn list items */
.spawn-list-item {
  padding: 8px 10px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  transition: background 0.15s;
}
.spawn-list-item:hover {
  background: rgba(255, 255, 255, 0.03);
}
.spawn-list-item.active {
  background: rgba(252, 199, 33, 0.08);
  border-left: 3px solid #fcc721;
}
.spawn-list-name {
  font-weight: 600;
  font-size: 0.9em;
  color: #e0e0e0;
}

/* Editor header */
.spawn-editor-header {
  padding: 12px 16px;
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

/* Detail sections */
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

/* Spawn point toggle button */
.spawn-point-toggle {
  background: rgba(138, 163, 255, 0.08);
  border: 1px solid rgba(138, 163, 255, 0.2);
  color: #8aa3ff;
  font-size: 0.85em;
  font-weight: 600;
  padding: 6px 12px;
  transition: all 0.15s;
}
.spawn-point-toggle:hover {
  background: rgba(138, 163, 255, 0.15);
  border-color: rgba(138, 163, 255, 0.35);
  color: #a0b8ff;
}

/* Highlight row for the selected NPC */
.highlight-row {
  background: rgba(252, 199, 33, 0.06);
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

/* NPC link */
.npc-link {
  color: #8aa3ff;
  text-decoration: none;
}
.npc-link:hover {
  color: #fcc721;
  text-decoration: underline;
}

/* Dark-theme overrides for form controls throughout the editor */
.create-form-container .form-control,
.detail-section .form-control {
  background: rgba(0, 0, 0, 0.3);
  color: #e0e0e0;
  border-color: rgba(255, 255, 255, 0.15);
}
.create-form-container .form-control:focus,
.detail-section .form-control:focus {
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-color: rgba(252, 199, 33, 0.4);
  box-shadow: 0 0 0 0.15rem rgba(252, 199, 33, 0.15);
  outline: none;
}
.create-form-container .form-control::placeholder,
.detail-section .form-control::placeholder {
  color: rgba(255, 255, 255, 0.3);
}
.create-form-container .input-group-text,
.detail-section .input-group-text {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(255, 255, 255, 0.15);
  color: #999;
}
.create-form-container select.form-control option,
.detail-section select.form-control option {
  background: #1a1a2e;
  color: #e0e0e0;
}

/* Expand/collapse all buttons */
.spawn-group-controls {
  gap: 4px;
}

/* Separator between spawn group cards */
.spawn-group-separator {
  height: 2px;
  margin: 12px 0;
  background: linear-gradient(to right, transparent, rgba(252, 199, 33, 0.35), transparent);
  border-radius: 1px;
}

/* EQ-styled modal: strip Bootstrap chrome, let eq-window provide the frame */
.eq-style-modal .modal-dialog {
  max-width: 500px;
}

/* Expansion picker modal — wider to fit icon grid */
.eq-expansion-modal .modal-dialog {
  max-width: 700px;
}

/* Expansion picker trigger buttons */
.expansion-pick-btn {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.25);
  color: #aaa;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  transition: border-color 0.15s, color 0.15s;
}
.expansion-pick-btn:hover {
  border-color: rgba(252, 199, 33, 0.45);
  color: #fcc721;
}
.expansion-pick-btn-set {
  border-color: rgba(138, 163, 255, 0.4);
  color: #8aa3ff;
}
.expansion-pick-btn-set:hover {
  border-color: rgba(252, 199, 33, 0.45);
  color: #fcc721;
}

/* Input text visibility fix */
.add-npc-input {
  background: rgba(0, 0, 0, 0.4) !important;
  color: #e0e0e0 !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
}
.add-npc-input::placeholder {
  color: rgba(255, 255, 255, 0.3) !important;
}
.add-npc-input:focus {
  background: rgba(0, 0, 0, 0.5) !important;
  color: #fff !important;
  border-color: rgba(252, 199, 33, 0.4) !important;
  box-shadow: 0 0 0 0.15rem rgba(252, 199, 33, 0.15) !important;
}
</style>
