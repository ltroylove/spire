<template>
  <content-area style="padding: 0 !important">
    <div class="row mt-3">

      <!-- Left Panel: Search & Spawn List -->
      <div class="col-4">
        <eq-window title="Spawn Points">
          <!-- Search Controls -->
          <div class="spawn-search-pane">
            <!-- Row 1: NPC search + New button -->
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
                  placeholder="NPC name, ID..."
                  v-model="search"
                  @keyup.enter="doSearch"
                  @input="debouncedSearch"
                  autofocus
                />
                <div class="input-group-append" v-if="search">
                  <button class="btn btn-sm spawn-clear-btn" @click="search = ''; doSearch()" title="Clear search">
                    <i class="fa fa-times"></i>
                  </button>
                </div>
              </div>
              <button
                class="btn btn-sm btn-outline-warning ml-2 flex-shrink-0"
                @click="showCreatePanel = !showCreatePanel"
                title="Create a new spawn point"
              >
                <i class="fa fa-plus mr-1"></i> New
              </button>
            </div>

            <!-- Row 2: Zone filter -->
            <div class="input-group input-group-sm mb-2 position-relative">
              <div class="input-group-prepend">
                <span class="input-group-text spawn-input-icon">
                  <i class="fa fa-map-marker"></i>
                </span>
              </div>
              <input
                type="text"
                class="form-control"
                placeholder="Filter by zone..."
                v-model="zoneFilter"
                @input="onZoneFilterInput"
                @focus="showZoneFilterDropdown = true"
                @blur="delayCloseZoneFilter"
                autocomplete="off"
              />
              <div class="input-group-append" v-if="selectedZone">
                <button class="btn btn-sm spawn-clear-btn" @click="zoneFilter = ''; selectedZone = ''; doSearch()" title="Clear zone filter">
                  <i class="fa fa-times"></i>
                </button>
              </div>
              <div v-if="showZoneFilterDropdown && filteredZoneOptions.length > 0" class="zone-dropdown">
                <div
                  class="zone-option"
                  @mousedown.prevent="zoneFilter = ''; selectedZone = ''; doSearch()"
                >
                  <span class="text-muted">(All Zones)</span>
                </div>
                <div
                  v-for="z in filteredZoneOptions"
                  :key="z.short_name + '-' + z.version"
                  class="zone-option"
                  @mousedown.prevent="selectZoneFilter(z)"
                >
                  <span class="text-warning">{{ z.short_name }}</span>
                  <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                </div>
              </div>
            </div>

            <!-- Row 3: Version + Respawn filters -->
            <div class="d-flex mb-2" style="gap: 6px;">
              <div class="spawn-filter-group flex-grow-1">
                <label class="spawn-filter-label">Version</label>
                <select class="form-control form-control-sm spawn-filter-select" v-model="selectedVersion" @change="currentPage = 1; doSearch()">
                  <option value="">Any</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
              <div class="spawn-filter-group flex-grow-1">
                <label class="spawn-filter-label">Respawn</label>
                <select class="form-control form-control-sm spawn-filter-select" v-model="selectedRespawnFilter" @change="currentPage = 1; doSearch()">
                  <option value="">Any</option>
                  <option value="short">Short (&lt;5m)</option>
                  <option value="medium">Medium (5–30m)</option>
                  <option value="long">Long (&gt;30m)</option>
                </select>
              </div>
            </div>

            <!-- Active filter chips -->
            <div class="spawn-active-filters" v-if="activeFilterChips.length > 0">
              <span
                v-for="chip in activeFilterChips"
                :key="chip.key"
                class="spawn-filter-chip"
              >
                <i :class="chip.icon + ' mr-1'" style="font-size: 0.8em;"></i>{{ chip.label }}
                <span class="spawn-chip-remove" @click="chip.clear()"><i class="fa fa-times"></i></span>
              </span>
            </div>

            <!-- Results count -->
            <div class="spawn-results-meta" v-if="!listLoading">
              <i class="fa fa-database mr-1" style="opacity: 0.5;"></i>
              <span v-if="totalResults === 0">No results</span>
              <span v-else>{{ spawnList.length }} spawn{{ spawnList.length !== 1 ? 's' : '' }}<span v-if="totalResults > perPage"> &middot; page {{ currentPage }}</span></span>
            </div>
          </div>

          <!-- Spawn List -->
          <div class="spawn-list" style="height: calc(100vh - 260px); overflow-y: auto;">
            <div v-if="listLoading" class="text-center p-3">
              <i class="fa fa-spinner fa-spin"></i> Loading...
            </div>

            <div v-if="!listLoading && spawnList.length === 0" class="text-center p-3" style="opacity: .5;">
              <i class="fa fa-map-marker fa-2x d-block mb-2"></i>
              No spawn points found
            </div>

            <div
              v-for="sp in spawnList"
              :key="sp.id"
              class="spawn-list-item"
              :class="{ 'active': selectedSpawn && selectedSpawn.id === sp.id }"
              @click="selectSpawn(sp)"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div style="min-width: 0; flex: 1;">
                  <div class="spawn-list-name text-truncate">
                    {{ sp.npcName || ('NPC #' + sp.npcId) }}
                  </div>
                  <small class="text-muted">
                    Spawn2 #{{ sp.id }} &middot; SG #{{ sp.spawngroupId }}
                  </small>
                </div>
                <div class="text-right ml-2" style="flex-shrink: 0;">
                  <span class="badge badge-pill" style="background: rgba(252,199,33,0.2); color: #fcc721;">
                    {{ sp.zone }}
                  </span>
                  <div style="font-size: 0.75em; opacity: 0.5; margin-top: 2px;">
                    {{ sp.x.toFixed(0) }}, {{ sp.y.toFixed(0) }}, {{ sp.z.toFixed(0) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Pagination -->
            <div class="text-center mt-2 mb-2" v-if="totalResults > perPage">
              <b-pagination
                size="sm"
                v-model="currentPage"
                :total-rows="totalResults"
                :per-page="perPage"
                :hide-ellipsis="true"
                @change="paginate"
              />
            </div>
          </div>
        </eq-window>
      </div>

      <!-- Right Panel: Editor -->
      <div class="col-8">

        <!-- Empty State -->
        <eq-window v-if="!selectedSpawn && !showCreatePanel" title="Spawn Editor">
          <div class="text-center p-5" style="opacity: .4;">
            <i class="fa fa-map-marker" style="font-size: 3em;"></i>
            <div class="mt-3">Select a spawn point to edit, or create a new one</div>
          </div>
        </eq-window>

        <!-- Create Panel -->
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
                  <div class="position-relative">
                    <input
                      v-model="createForm.zoneSearch"
                      class="form-control form-control-sm"
                      placeholder="Search zones..."
                      @input="onCreateZoneSearch"
                      @focus="showCreateZoneDropdown = true"
                      @blur="delayCloseCreateZoneDropdown"
                      autocomplete="off"
                    />
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

        <!-- Spawn Editor -->
        <div v-if="selectedSpawn && !showCreatePanel">
          <!-- Header -->
          <eq-window class="p-0">
            <div class="spawn-editor-header">
              <div class="d-flex justify-content-between align-items-center">
                <div class="d-flex align-items-center">
                  <h5 class="mb-0 mr-3" style="color: #fcc721;">
                    <i class="fa fa-map-marker mr-2"></i>
                    {{ selectedSpawnNpcName }}
                  </h5>
                  <span class="badge badge-pill mr-2" style="background: rgba(252,199,33,0.2); color: #fcc721;">
                    {{ selectedSpawn.zone }}
                  </span>
                  <small class="text-muted">
                    Spawn2 #{{ selectedSpawn.id }} &middot; SG #{{ selectedSpawn.spawngroupId }}
                  </small>
                </div>
                <div>
                  <button
                    class="btn btn-sm btn-outline-success mr-1"
                    @click="saveSelectedSpawn"
                    :disabled="saving"
                  >
                    <i class="fa fa-save mr-1"></i> Save
                  </button>
                  <button
                    class="btn btn-sm btn-outline-danger"
                    @click="deleteSelectedSpawn"
                    :disabled="saving"
                  >
                    <i class="fa fa-trash mr-1"></i> Delete
                  </button>
                </div>
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

          <!-- Spawn2 Fields -->
          <eq-window title="Spawn Point (spawn2)" class="mt-3">
            <div class="row">
              <div class="col-4 mb-3">
                <label class="field-label">Zone</label>
                <div class="position-relative">
                  <input
                    v-model="editData.zoneSearch"
                    class="form-control form-control-sm"
                    @input="onEditZoneSearch"
                    @focus="showEditZoneDropdown = true"
                    @blur="delayCloseEditZoneDropdown"
                    autocomplete="off"
                  />
                  <div v-if="showEditZoneDropdown && editFilteredZones.length > 0" class="zone-dropdown">
                    <div
                      v-for="z in editFilteredZones"
                      :key="z.short_name + '-' + z.version"
                      class="zone-option"
                      @mousedown.prevent="selectEditZone(z)"
                    >
                      <span class="text-warning">{{ z.short_name }}</span>
                      <span class="text-muted ml-2" style="font-size: 0.85em;">{{ z.long_name }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-2 mb-3">
                <label class="field-label">Version</label>
                <input v-model.number="editData.version" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Respawn (sec)</label>
                <div class="input-group input-group-sm">
                  <input v-model.number="editData.respawntime" type="number" class="form-control" />
                  <div class="input-group-append">
                    <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(editData.respawntime) }}</span>
                  </div>
                </div>
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Variance (sec)</label>
                <div class="input-group input-group-sm">
                  <input v-model.number="editData.variance" type="number" class="form-control" />
                  <div class="input-group-append">
                    <span class="input-group-text" style="font-size: 0.7em;">{{ formatTime(editData.variance) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-3 mb-3">
                <label class="field-label">X</label>
                <input v-model.number="editData.x" type="number" step="0.01" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Y</label>
                <input v-model.number="editData.y" type="number" step="0.01" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Z</label>
                <input v-model.number="editData.z" type="number" step="0.01" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Heading</label>
                <input v-model.number="editData.heading" type="number" step="0.01" class="form-control form-control-sm" />
              </div>
            </div>

            <div class="row">
              <div class="col-3 mb-3">
                <label class="field-label">Path Grid</label>
                <input v-model.number="editData.pathgrid" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Animation</label>
                <select v-model.number="editData.animation" class="form-control form-control-sm">
                  <option :value="0">Standing</option>
                  <option :value="64">Sitting</option>
                  <option :value="100">Crouching</option>
                  <option :value="110">Lying Down</option>
                  <option :value="105">Kneeling</option>
                </select>
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Condition</label>
                <input v-model.number="editData.condition" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Cond Value</label>
                <input v-model.number="editData.cond_value" type="number" class="form-control form-control-sm" />
              </div>
            </div>

            <div class="row">
              <div class="col-3 mb-2">
                <label class="field-label">Min Expansion</label>
                <input v-model.number="editData.min_expansion" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Max Expansion</label>
                <input v-model.number="editData.max_expansion" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Content Flags</label>
                <input v-model="editData.content_flags" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Flags Disabled</label>
                <input v-model="editData.content_flags_disabled" class="form-control form-control-sm" />
              </div>
            </div>
          </eq-window>

          <!-- Spawngroup Fields -->
          <eq-window title="Spawngroup" class="mt-3" v-if="editSpawngroup">
            <div class="row">
              <div class="col-6 mb-3">
                <label class="field-label">Group Name</label>
                <input v-model="editSpawngroup.name" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Spawn Limit</label>
                <input v-model.number="editSpawngroup.spawn_limit" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Roam Distance</label>
                <input v-model.number="editSpawngroup.dist" type="number" step="0.1" class="form-control form-control-sm" />
              </div>
            </div>
            <div class="row">
              <div class="col-3 mb-3">
                <label class="field-label">Delay</label>
                <input v-model.number="editSpawngroup.delay" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Min Delay</label>
                <input v-model.number="editSpawngroup.mindelay" type="number" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Despawn</label>
                <select v-model.number="editSpawngroup.despawn" class="form-control form-control-sm">
                  <option :value="0">None</option>
                  <option :value="1">Despawn on Death</option>
                  <option :value="2">Depop on Death</option>
                  <option :value="3">Despawn Timer</option>
                </select>
              </div>
              <div class="col-3 mb-3">
                <label class="field-label">Despawn Timer</label>
                <input v-model.number="editSpawngroup.despawn_timer" type="number" class="form-control form-control-sm" />
              </div>
            </div>
            <div class="row">
              <div class="col-3 mb-2">
                <label class="field-label">Min X</label>
                <input v-model.number="editSpawngroup.min_x" type="number" step="0.1" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Max X</label>
                <input v-model.number="editSpawngroup.max_x" type="number" step="0.1" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Min Y</label>
                <input v-model.number="editSpawngroup.min_y" type="number" step="0.1" class="form-control form-control-sm" />
              </div>
              <div class="col-3 mb-2">
                <label class="field-label">Max Y</label>
                <input v-model.number="editSpawngroup.max_y" type="number" step="0.1" class="form-control form-control-sm" />
              </div>
            </div>
          </eq-window>

          <!-- Spawngroup Entries (NPCs in this group) -->
          <eq-window title="NPCs in Spawngroup" class="mt-3" v-if="editSpawnEntries && editSpawnEntries.length > 0">
            <table class="eq-table eq-highlight-rows w-100" style="font-size: 13px;">
              <thead class="eq-table-floating-header">
                <tr>
                  <th style="width: 35%;">NPC</th>
                  <th class="text-center" style="width: 220px;">Chance %</th>
                  <th class="text-center" style="width: 80px;"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="entry in editSpawnEntries" :key="entry.npc_id">
                  <td style="vertical-align: middle; width: 35%;">
                    <npc-popover
                      v-if="entry.npcData"
                      :npc="entry.npcData"
                      :show-image="false"
                      :show-label="false"
                    >
                      <router-link
                        :to="'/npc/' + entry.npc_id"
                        target="_blank"
                        class="npc-link"
                      >
                        {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                      </router-link>
                      <small class="text-muted ml-1">#{{ entry.npc_id }}</small>
                    </npc-popover>
                    <span v-else>
                      <router-link
                        :to="'/npc/' + entry.npc_id"
                        target="_blank"
                        class="npc-link"
                      >
                        {{ entry.npcName || ('NPC #' + entry.npc_id) }}
                      </router-link>
                      <small class="text-muted ml-1">#{{ entry.npc_id }}</small>
                    </span>
                  </td>
                  <td style="vertical-align: middle;">
                    <div class="d-flex align-items-center justify-content-center">
                      <input
                        v-model.number="entry.chance"
                        type="range"
                        min="0"
                        max="100"
                        class="mr-2"
                        style="width: 90px;"
                      />
                      <input
                        v-model.number="entry.chance"
                        type="number"
                        min="0"
                        max="100"
                        class="form-control form-control-sm text-center"
                        style="width: 60px; display: inline-block;"
                      />
                    </div>
                  </td>
                  <td class="text-center" style="vertical-align: middle;">
                    <button
                      class="btn btn-xs btn-dark"
                      @click="removeSpawnEntry(entry)"
                      title="Remove NPC from spawngroup"
                    >
                      <i class="fa fa-times text-danger"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <button class="btn btn-xs btn-outline-warning" @click="addNpcToSpawngroup" title="Add another NPC to this spawngroup">
                <i class="fa fa-plus mr-1"></i> Add NPC
              </button>
              <button class="btn btn-xs btn-dark" @click="balanceChances" title="Equally distribute chances">
                <i class="fa fa-balance-scale mr-1"></i> Balance
              </button>
            </div>

            <!-- Add NPC Panel -->
            <div v-if="showAddNpcPanel" class="add-npc-panel mt-2">
              <div class="row align-items-end">
                <div class="col-6">
                  <label class="field-label">NPC Search</label>
                  <div class="position-relative">
                    <input
                      v-model="addNpcSearch"
                      class="form-control form-control-sm"
                      placeholder="Search NPC..."
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
                </div>
                <div class="col-3">
                  <label class="field-label">Chance %</label>
                  <input v-model.number="addNpcChance" type="number" min="0" max="100" class="form-control form-control-sm" />
                </div>
                <div class="col-3">
                  <button class="btn btn-sm btn-outline-success w-100" @click="confirmAddNpc" :disabled="!addNpcId">
                    <i class="fa fa-plus mr-1"></i> Add
                  </button>
                </div>
              </div>
            </div>
          </eq-window>
        </div>
      </div>
    </div>
  </content-area>
</template>

<script>
import { Spawn2Api, SpawnentryApi, SpawngroupApi, NpcTypeApi } from "../../app/api";
import { SpireApi } from "../../app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Zones } from "@/app/zones";
import EqWindow from "../../components/eq-ui/EQWindow";
import ContentArea from "../../components/layout/ContentArea";
import NpcPopover from "../../components/NpcPopover";

let searchTimeout = null;
let npcSearchTimeout = null;
let addNpcSearchTimeout = null;

export default {
  name: "SpawnEditor",
  components: { EqWindow, ContentArea, NpcPopover },
  data() {
    return {
      // Search / list
      search: "",
      zoneFilter: "",
      selectedZone: "",
      selectedVersion: "",
      selectedRespawnFilter: "",
      showZoneFilterDropdown: false,
      zones: [],
      spawnList: [],
      listLoading: false,
      currentPage: 1,
      perPage: 50,
      totalResults: 0,

      // Selected spawn
      selectedSpawn: null,
      selectedSpawnNpcName: "",
      editData: {},
      editSpawngroup: null,
      editSpawnEntries: [],
      editLoading: false,

      // Edit zone dropdown
      showEditZoneDropdown: false,
      editFilteredZones: [],

      // Create form
      showCreatePanel: false,
      showCreateNpcDropdown: false,
      showCreateZoneDropdown: false,
      createNpcResults: [],
      createFilteredZones: [],
      createForm: this.getDefaultCreateForm(),

      // Add NPC to spawngroup
      showAddNpcPanel: false,
      addNpcSearch: "",
      addNpcId: 0,
      addNpcChance: 50,
      showAddNpcDropdown: false,
      addNpcResults: [],

      // State
      saving: false,
      editorError: "",
      editorSuccess: "",
    };
  },

  computed: {
    filteredZoneOptions() {
      if (!this.zoneFilter || this.zoneFilter.length < 1) return [];
      const q = this.zoneFilter.toLowerCase();
      return this.zones
        .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 15);
    },
    activeFilterChips() {
      const chips = [];
      if (this.search) {
        chips.push({ key: "search", icon: "fa fa-search", label: this.search, clear: () => { this.search = ""; this.doSearch(); } });
      }
      if (this.selectedZone) {
        chips.push({ key: "zone", icon: "fa fa-map-marker", label: this.selectedZone, clear: () => { this.zoneFilter = ""; this.selectedZone = ""; this.doSearch(); } });
      }
      if (this.selectedVersion !== "") {
        chips.push({ key: "version", icon: "fa fa-code-fork", label: `v${this.selectedVersion}`, clear: () => { this.selectedVersion = ""; this.doSearch(); } });
      }
      if (this.selectedRespawnFilter) {
        const labels = { short: "Short respawn", medium: "Medium respawn", long: "Long respawn" };
        chips.push({ key: "respawn", icon: "fa fa-clock-o", label: labels[this.selectedRespawnFilter] || this.selectedRespawnFilter, clear: () => { this.selectedRespawnFilter = ""; this.doSearch(); } });
      }
      return chips;
    },
  },

  async created() {
    this.zones = await Zones.getZones() || [];

    // If navigated with NPC ID in route, pre-filter
    if (this.$route.params.npcId) {
      this.search = this.$route.params.npcId;
    }

    this.doSearch();
  },

  watch: {
    '$route'() {
      if (this.$route.params.npcId) {
        this.search = this.$route.params.npcId;
        this.doSearch();
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
    // Zone filter
    // ========================
    onZoneFilterInput() {
      this.showZoneFilterDropdown = true;
    },
    delayCloseZoneFilter() {
      setTimeout(() => { this.showZoneFilterDropdown = false; }, 200);
    },
    selectZoneFilter(z) {
      this.zoneFilter = z.short_name;
      this.selectedZone = z.short_name;
      this.showZoneFilterDropdown = false;
      this.currentPage = 1;
      this.doSearch();
    },

    // ========================
    // Search & List
    // ========================
    debouncedSearch() {
      if (searchTimeout) clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => this.doSearch(), 300);
    },

    async doSearch() {
      this.listLoading = true;
      this.spawnList = [];

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();

        // Zone filter
        if (this.selectedZone) {
          builder.where("zone", "=", this.selectedZone);
        }

        // Version filter
        if (this.selectedVersion !== "" && this.selectedVersion !== null) {
          builder.where("version", "=", Number(this.selectedVersion));
        }

        // Respawn time filter
        if (this.selectedRespawnFilter === "short") {
          builder.where("respawntime", "<", 300);
        } else if (this.selectedRespawnFilter === "medium") {
          builder.where("respawntime", ">=", 300);
          builder.where("respawntime", "<=", 1800);
        } else if (this.selectedRespawnFilter === "long") {
          builder.where("respawntime", ">", 1800);
        }

        // Text search - could be NPC ID or a zone name
        const q = (this.search || "").trim();
        if (q) {
          const isNumeric = /^\d+$/.test(q);
          if (isNumeric) {
            // Search spawn entries for this NPC ID to find spawngroup IDs
            const entryApi = new SpawnentryApi(...SpireApi.cfg());
            const entryBuilder = new SpireQueryBuilder();
            entryBuilder.where("npcID", "=", parseInt(q));
            entryBuilder.limit(200);
            const entryResult = await entryApi.listSpawnentries(entryBuilder.get());
            const entries = entryResult.data || [];

            if (entries.length > 0) {
              const sgIds = [...new Set(entries.map(e => e.spawngroup_id || e.spawngroupID))];
              for (const sgId of sgIds) {
                builder.whereOr("spawngroupID", "=", sgId);
              }
            } else {
              this.spawnList = [];
              this.totalResults = 0;
              this.listLoading = false;
              return;
            }
          } else {
            // Text search: try matching zone name first
            const matchingZones = this.zones
              .filter(z => z.short_name.includes(q.toLowerCase()) || (z.long_name && z.long_name.toLowerCase().includes(q.toLowerCase())))
              .map(z => z.short_name);

            if (matchingZones.length > 0 && matchingZones.length <= 20) {
              for (const zn of matchingZones) {
                builder.whereOr("zone", "=", zn);
              }
            } else {
              // Try searching NPC names
              const npcApi = new NpcTypeApi(...SpireApi.cfg());
              const npcBuilder = new SpireQueryBuilder();
              npcBuilder.where("name", "like", `%${q}%`);
              npcBuilder.select(["id"]);
              npcBuilder.limit(50);
              const npcResult = await npcApi.listNpcTypes(npcBuilder.get());
              const npcIds = (npcResult.data || []).map(n => n.id);

              if (npcIds.length > 0) {
                const entryApi = new SpawnentryApi(...SpireApi.cfg());
                const entryBuilder = new SpireQueryBuilder();
                for (const nid of npcIds.slice(0, 50)) {
                  entryBuilder.whereOr("npcID", "=", nid);
                }
                entryBuilder.limit(500);
                const entryResult = await entryApi.listSpawnentries(entryBuilder.get());
                const entries = entryResult.data || [];
                const sgIds = [...new Set(entries.map(e => e.spawngroup_id || e.spawngroupID))];

                if (sgIds.length > 0) {
                  for (const sgId of sgIds.slice(0, 100)) {
                    builder.whereOr("spawngroupID", "=", sgId);
                  }
                } else {
                  this.spawnList = [];
                  this.totalResults = 0;
                  this.listLoading = false;
                  return;
                }
              } else {
                this.spawnList = [];
                this.totalResults = 0;
                this.listLoading = false;
                return;
              }
            }
          }
        }

        builder.limit(this.perPage);
        builder.page(this.currentPage);
        builder.orderBy(["zone"]);

        // Use includes to load spawnentries + NPC type in a single request
        // (avoids N+1 queries that caused the list to appear empty)
        builder.includes(["Spawnentries.NpcType"]);

        const result = await spawn2Api.listSpawn2s(builder.get());
        const spawn2s = result.data || [];

        const enriched = spawn2s.map(s2 => {
          const sgId = s2.spawngroup_id || s2.spawngroupID;
          const firstEntry = s2.spawnentries && s2.spawnentries[0];
          const npcType = firstEntry && (firstEntry.npc_type || firstEntry.NpcType);
          const npcId = firstEntry ? (firstEntry.npc_id || firstEntry.npcID || 0) : 0;
          const npcName = npcType ? (npcType.name || "").replace(/_/g, " ") : "";

          return {
            id: s2.id,
            spawngroupId: sgId,
            zone: s2.zone || "unknown",
            x: Number(s2.x || 0),
            y: Number(s2.y || 0),
            z: Number(s2.z || 0),
            heading: Number(s2.heading || 0),
            respawntime: Number(s2.respawntime || 0),
            npcId: npcId,
            npcName: npcName,
          };
        });

        this.spawnList = enriched;
        this.totalResults = enriched.length >= this.perPage ? (this.currentPage * this.perPage) + 1 : enriched.length;
      } catch (e) {
        console.error("Failed to search spawns", e);
      }

      this.listLoading = false;
    },

    paginate(page) {
      this.currentPage = page;
      this.doSearch();
    },

    // ========================
    // Select & Load Spawn
    // ========================
    async selectSpawn(sp) {
      this.showCreatePanel = false;
      this.selectedSpawn = sp;
      this.selectedSpawnNpcName = sp.npcName || ('NPC #' + sp.npcId);
      this.clearMessages();
      this.showAddNpcPanel = false;

      // Load full spawn2 data
      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        builder.where("id", "=", sp.id);
        const result = await spawn2Api.listSpawn2s(builder.get());
        const s2 = (result.data && result.data[0]) || {};

        const zoneData = this.zones.find(z => z.short_name === (s2.zone || sp.zone));

        this.editData = {
          zone: s2.zone || sp.zone,
          zoneSearch: s2.zone || sp.zone,
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
        };

        // Load spawngroup
        await this.loadSpawngroup(sp.spawngroupId);
        // Load spawn entries
        await this.loadSpawnEntries(sp.spawngroupId);
      } catch (e) {
        console.error("Failed to load spawn data", e);
        this.editorError = "Failed to load spawn data.";
      }
    },

    async loadSpawngroup(sgId) {
      try {
        const sgApi = new SpawngroupApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        builder.where("id", "=", sgId);
        const result = await sgApi.listSpawngroups(builder.get());
        const sg = (result.data && result.data[0]) || null;

        if (sg) {
          this.editSpawngroup = {
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
          };
        } else {
          this.editSpawngroup = null;
        }
      } catch (e) {
        console.error("Failed to load spawngroup", e);
        this.editSpawngroup = null;
      }
    },

    async loadSpawnEntries(sgId) {
      try {
        const entryApi = new SpawnentryApi(...SpireApi.cfg());
        const builder = new SpireQueryBuilder();
        builder.where("spawngroupID", "=", sgId);
        builder.limit(100);
        const result = await entryApi.listSpawnentries(builder.get());
        const entries = result.data || [];

        const enriched = [];
        for (const entry of entries) {
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

          enriched.push({
            npc_id: npcId,
            npcName: npcName,
            npcData: npcData,
            chance: Number(entry.chance || 0),
            spawngroup_id: entry.spawngroup_id || entry.spawngroupID,
          });
        }

        this.editSpawnEntries = enriched;
      } catch (e) {
        console.error("Failed to load spawn entries", e);
        this.editSpawnEntries = [];
      }
    },

    // ========================
    // Edit zone dropdown
    // ========================
    onEditZoneSearch() {
      this.showEditZoneDropdown = true;
      const q = (this.editData.zoneSearch || "").toLowerCase();
      this.editFilteredZones = this.zones
        .filter(z => z.short_name.includes(q) || (z.long_name && z.long_name.toLowerCase().includes(q)))
        .slice(0, 15);
      this.editData.zone = this.editData.zoneSearch;
    },
    delayCloseEditZoneDropdown() {
      setTimeout(() => { this.showEditZoneDropdown = false; }, 200);
    },
    selectEditZone(z) {
      this.editData.zone = z.short_name;
      this.editData.zoneSearch = z.short_name;
      this.editData.zoneLongName = z.long_name || "";
      this.showEditZoneDropdown = false;
    },

    // ========================
    // Create form zone & NPC dropdowns
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
      if (npcSearchTimeout) clearTimeout(npcSearchTimeout);
      npcSearchTimeout = setTimeout(() => this.searchCreateNpc(), 300);
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
    // Add NPC to spawngroup
    // ========================
    addNpcToSpawngroup() {
      this.showAddNpcPanel = !this.showAddNpcPanel;
      this.addNpcSearch = "";
      this.addNpcId = 0;
      this.addNpcChance = 50;
      this.addNpcResults = [];
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
      if (!this.addNpcId || !this.selectedSpawn) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        await spawnentryApi.createSpawnentry({
          spawngroup_id: this.selectedSpawn.spawngroupId,
          npc_id: this.addNpcId,
          chance: this.normalizeChance(this.addNpcChance),
        });

        this.editorSuccess = `Added NPC #${this.addNpcId} to spawngroup.`;
        this.showAddNpcPanel = false;
        await this.loadSpawnEntries(this.selectedSpawn.spawngroupId);
      } catch (e) {
        console.error("Failed to add NPC to spawngroup", e);
        this.editorError = "Failed to add NPC to spawngroup.";
      }

      this.saving = false;
    },

    async removeSpawnEntry(entry) {
      if (!confirm(`Remove NPC #${entry.npc_id} from this spawngroup?`)) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        await spawnentryApi.deleteSpawnentry(entry.spawngroup_id);

        this.editorSuccess = `Removed NPC #${entry.npc_id} from spawngroup.`;
        await this.loadSpawnEntries(this.selectedSpawn.spawngroupId);
      } catch (e) {
        console.error("Failed to remove spawn entry", e);
        this.editorError = "Failed to remove NPC from spawngroup.";
      }

      this.saving = false;
    },

    // ========================
    // Save
    // ========================
    async saveSelectedSpawn() {
      if (!this.selectedSpawn) return;
      this.saving = true;
      this.clearMessages();

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        const spawngroupApi = new SpawngroupApi(...SpireApi.cfg());

        // Save spawn2
        await spawn2Api.updateSpawn2(this.selectedSpawn.id, {
          id: this.selectedSpawn.id,
          spawngroup_id: this.selectedSpawn.spawngroupId,
          zone: (this.editData.zone || "").toLowerCase(),
          version: Number(this.editData.version || 0),
          x: Number(this.editData.x || 0),
          y: Number(this.editData.y || 0),
          z: Number(this.editData.z || 0),
          heading: Number(this.editData.heading || 0),
          respawntime: Number(this.editData.respawntime || 0),
          variance: Number(this.editData.variance || 0),
          pathgrid: Number(this.editData.pathgrid || 0),
          animation: Number(this.editData.animation || 0),
          _condition: Number(this.editData.condition || 0),
          cond_value: Number(this.editData.cond_value || 1),
          min_expansion: Number(this.editData.min_expansion != null ? this.editData.min_expansion : -1),
          max_expansion: Number(this.editData.max_expansion != null ? this.editData.max_expansion : -1),
          content_flags: this.editData.content_flags || "",
          content_flags_disabled: this.editData.content_flags_disabled || "",
        });

        // Save spawngroup
        if (this.editSpawngroup) {
          await spawngroupApi.updateSpawngroup(this.selectedSpawn.spawngroupId, {
            id: this.selectedSpawn.spawngroupId,
            name: this.editSpawngroup.name || "",
            spawn_limit: Number(this.editSpawngroup.spawn_limit || 0),
            dist: Number(this.editSpawngroup.dist || 0),
            delay: Number(this.editSpawngroup.delay || 45000),
            mindelay: Number(this.editSpawngroup.mindelay || 15000),
            despawn: Number(this.editSpawngroup.despawn || 0),
            despawn_timer: Number(this.editSpawngroup.despawn_timer || 100),
            wp_spawns: Number(this.editSpawngroup.wp_spawns || 0),
            min_x: Number(this.editSpawngroup.min_x || 0),
            max_x: Number(this.editSpawngroup.max_x || 0),
            min_y: Number(this.editSpawngroup.min_y || 0),
            max_y: Number(this.editSpawngroup.max_y || 0),
          });
        }

        // Save spawn entry chances
        for (const entry of this.editSpawnEntries) {
          await spawnentryApi.updateSpawnentry(this.selectedSpawn.spawngroupId, {
            spawngroup_id: this.selectedSpawn.spawngroupId,
            npc_id: entry.npc_id,
            chance: this.normalizeChance(entry.chance),
          });
        }

        this.editorSuccess = `Saved spawn2 #${this.selectedSpawn.id} successfully.`;

        // Refresh list entry
        const idx = this.spawnList.findIndex(s => s.id === this.selectedSpawn.id);
        if (idx >= 0) {
          this.spawnList[idx].zone = this.editData.zone;
          this.spawnList[idx].x = this.editData.x;
          this.spawnList[idx].y = this.editData.y;
          this.spawnList[idx].z = this.editData.z;
        }
      } catch (e) {
        console.error("Failed to save spawn", e);
        this.editorError = `Failed to save spawn2 #${this.selectedSpawn.id}.`;
      }

      this.saving = false;
    },

    // ========================
    // Delete
    // ========================
    async deleteSelectedSpawn() {
      if (!this.selectedSpawn) return;
      if (!confirm(`Delete spawn point #${this.selectedSpawn.id} in ${this.selectedSpawn.zone}?`)) return;

      this.saving = true;
      this.clearMessages();

      try {
        const spawn2Api = new Spawn2Api(...SpireApi.cfg());
        await spawn2Api.deleteSpawn2(this.selectedSpawn.id);

        this.spawnList = this.spawnList.filter(s => s.id !== this.selectedSpawn.id);
        this.selectedSpawn = null;
        this.editData = {};
        this.editSpawngroup = null;
        this.editSpawnEntries = [];
      } catch (e) {
        console.error("Failed to delete spawn", e);
        this.editorError = `Failed to delete spawn2 #${this.selectedSpawn.id}.`;
      }

      this.saving = false;
    },

    // ========================
    // Create
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

        const sgCreate = await spawngroupApi.createSpawngroup({ name: sgName, id: 0 });
        const sg = (sgCreate.data && sgCreate.data[0]) ? sgCreate.data[0] : null;
        const spawngroupId = sg && (sg.id || sg.ID);
        if (!spawngroupId) throw new Error("Unable to create spawngroup");

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
          npc_id: this.createForm.npcId,
          chance: this.normalizeChance(this.createForm.chance),
        });

        this.editorSuccess = `Created spawngroup #${spawngroupId} in ${zone}.`;
        this.showCreatePanel = false;
        this.createForm = this.getDefaultCreateForm();
        await this.doSearch();
      } catch (e) {
        console.error("Failed to create spawn", e);
        this.editorError = "Failed to create spawn. Check values and try again.";
      }

      this.saving = false;
    },

    // ========================
    // Balance chances
    // ========================
    async balanceChances() {
      if (!this.editSpawnEntries || this.editSpawnEntries.length === 0) return;

      const count = this.editSpawnEntries.length;
      const equalChance = Math.floor(100 / count);
      const remainder = 100 - (equalChance * count);

      try {
        const spawnentryApi = new SpawnentryApi(...SpireApi.cfg());
        for (let i = 0; i < this.editSpawnEntries.length; i++) {
          const entry = this.editSpawnEntries[i];
          const chance = equalChance + (i < remainder ? 1 : 0);
          entry.chance = chance;

          await spawnentryApi.updateSpawnentry(this.selectedSpawn.spawngroupId, {
            spawngroup_id: this.selectedSpawn.spawngroupId,
            npc_id: entry.npc_id,
            chance: chance,
          });
        }

        this.editorSuccess = `Balanced chances across ${count} NPCs (${equalChance}% each).`;
      } catch (e) {
        console.error("Failed to balance chances", e);
        this.editorError = "Failed to balance chances.";
      }
    },
  },
};
</script>

<style scoped>
/* Search pane */
.spawn-search-pane {
  margin-bottom: 8px;
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
.spawn-filter-group {
  display: flex;
  flex-direction: column;
}
.spawn-filter-label {
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 2px;
  font-weight: bold;
}
.spawn-filter-select {
  background: rgba(0, 0, 0, 0.3);
  border-color: rgba(255, 255, 255, 0.1);
  color: #e0e0e0;
  font-size: 0.8em;
}
.spawn-filter-select:focus {
  border-color: rgba(138, 163, 255, 0.5);
  box-shadow: 0 0 0 0.15rem rgba(138, 163, 255, 0.15);
}
.spawn-active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 6px;
}
.spawn-filter-chip {
  display: inline-flex;
  align-items: center;
  background: rgba(138, 163, 255, 0.12);
  border: 1px solid rgba(138, 163, 255, 0.25);
  border-radius: 12px;
  padding: 2px 8px 2px 8px;
  font-size: 0.78em;
  color: #8aa3ff;
  cursor: default;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.spawn-chip-remove {
  margin-left: 5px;
  cursor: pointer;
  opacity: 0.6;
  font-size: 0.9em;
  flex-shrink: 0;
}
.spawn-chip-remove:hover {
  opacity: 1;
  color: #fcc721;
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

/* Add NPC panel */
.add-npc-panel {
  padding: 10px;
  border: 1px solid rgba(138, 163, 255, 0.2);
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.15);
}
</style>
