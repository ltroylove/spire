<template>
  <content-area style="padding: 0 !important;">
    <div class="row">
      <!-- Left panel: AA ability list -->
      <div class="col-5">
        <eq-window title="Alternate Advancement Editor" class="p-0">
          <div class="p-3 border-bottom aa-toolbar minified-inputs">
            <div class="d-flex gap-2 align-items-end flex-wrap">
              <div class="flex-grow-1 min-search">
                <label class="mb-1">Search</label>
                <b-form-input v-model="search" placeholder="Search by AA name or id" @input="applyFilters"/>
              </div>
              <div>
                <label class="mb-1">Status</label>
                <b-form-select v-model.number="enabledFilter" :options="enabledOptions" @change="applyFilters"/>
              </div>
              <div>
                <label class="mb-1">Type</label>
                <b-form-select v-model.number="typeFilter" :options="typeOptions" @change="applyFilters"/>
              </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mt-2">
              <div class="btn-group">
                <b-button size="sm" variant="outline-warning" @click="refreshAll"><i class="fa fa-refresh mr-1"/>Refresh</b-button>
                <b-button size="sm" variant="outline-success" @click="newAbility"><i class="fa fa-plus mr-1"/>New</b-button>
              </div>
              <div class="d-flex align-items-center gap-2">
                <small class="text-muted">Sort:</small>
                <div class="btn-group btn-group-sm">
                  <b-button size="sm" :variant="sortBy === 'id' ? 'secondary' : 'outline-secondary'" @click="sortBy = 'id'; applyFilters()">ID</b-button>
                  <b-button size="sm" :variant="sortBy === 'name' ? 'secondary' : 'outline-secondary'" @click="sortBy = 'name'; applyFilters()">Name</b-button>
                </div>
                <small class="text-muted" v-if="filteredRows.length">{{ filteredRows.length }}</small>
              </div>
            </div>

            <!-- Bitmask filters - compact inline rows -->
            <div class="mt-2 pt-2" style="border-top: 1px solid rgba(174,189,213,0.15)">
              <div class="filter-section">
                <div class="filter-left">
                  <span class="filter-label">Class</span>
                  <div class="filter-header-btns">
                    <b-button size="sm" variant="outline-secondary" @click="classFilter = 65535; applyFilters()">All</b-button>
                    <b-button size="sm" variant="outline-secondary" @click="classFilter = 0; applyFilters()">None</b-button>
                  </div>
                </div>
                <div class="filter-icons">
                  <class-bitmask-calculator :mask="classFilter" :show-text-top="false" :centered-buttons="false" :display-all-none="false" @input="classFilter = Number($event || 0); applyFilters()"/>
                </div>
              </div>
              <div class="filter-section">
                <div class="filter-left">
                  <span class="filter-label">Race</span>
                  <div class="filter-header-btns">
                    <b-button size="sm" variant="outline-secondary" @click="raceFilter = 65535; applyFilters()">All</b-button>
                    <b-button size="sm" variant="outline-secondary" @click="raceFilter = 0; applyFilters()">None</b-button>
                  </div>
                </div>
                <div class="filter-icons">
                  <race-bitmask-calculator :mask="raceFilter" :show-text-top="false" :centered-buttons="false" :display-all-none="false" @input="raceFilter = Number($event || 0); applyFilters()"/>
                </div>
              </div>
              <div class="filter-section">
                <div class="filter-left">
                  <span class="filter-label">Deity</span>
                  <div class="filter-header-btns">
                    <b-button size="sm" variant="outline-secondary" @click="deityFilter = 131071; applyFilters()">All</b-button>
                    <b-button size="sm" variant="outline-secondary" @click="deityFilter = 0; applyFilters()">None</b-button>
                  </div>
                </div>
                <div class="filter-icons">
                  <deity-bitmask-calculator :mask="deityFilter" :show-names="false" :centered-buttons="false" :display-all-none="false" @input="deityFilter = Number($event || 0); applyFilters()"/>
                </div>
              </div>
            </div>
          </div>

          <div class="aa-list-wrap">
            <app-loader :is-loading="loading" padding="4"/>
            <div v-if="!loading && filteredRows.length === 0" class="text-center text-muted p-4">No AA abilities matched your filters.</div>
            <table v-if="filteredRows.length" class="eq-table eq-highlight-rows bordered" id="aa-editor-table">
              <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 60px; text-align:center">ID</th>
                <th>Name</th>
                <th style="width: 80px; text-align:center">Type</th>
                <th style="width: 50px; text-align:center">On</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="row in filteredRows" :key="row.id" :class="selected && selected.id === row.id ? 'pulsate-highlight-white' : ''" @click="selectRow(row)">
                <td style="text-align:center">{{ row.id }}</td>
                <td>{{ row.name || '(unnamed)' }}</td>
                <td style="text-align:center"><small>{{ aaTypeLabel(row.type) }}</small></td>
                <td style="text-align:center"><i :class="row.enabled ? 'fa fa-check text-success' : 'fa fa-minus text-muted'" :title="row.enabled ? 'Enabled' : 'Disabled'"/></td>
              </tr>
              </tbody>
            </table>
          </div>
        </eq-window>
      </div>

      <!-- Right panel: AA ability details -->
      <div class="col-7">
        <eq-window :title="selectedTitle" class="aa-details-window">
          <div ref="aaDetailsScroll" class="aa-details-wrap" @scroll="onAaDetailsScroll">
            <div v-if="!selected" class="text-center text-muted p-5">
              <i class="fa fa-hand-pointer-o fa-2x mb-3 d-block" style="opacity: 0.4"/>
              Select an AA ability from the list or create a new one.
            </div>

            <div v-if="selected" class="minified-inputs p-2">
              <!-- Action bar -->
              <div class="aa-action-bar d-flex align-items-center gap-2 flex-wrap mb-3 p-2">
                <b-button size="sm" variant="outline-warning" @click="saveSelected" :disabled="!dirty" :class="{ 'save-btn-glow': dirty }"><i class="fa fa-save mr-1"/>Save All</b-button>
                <b-button size="sm" variant="outline-secondary" @click="discardChanges" :disabled="!dirty"><i class="fa fa-undo mr-1"/>Discard</b-button>
                <b-button size="sm" variant="outline-info" @click="cloneAbility" v-if="!isNew"><i class="fa fa-clone mr-1"/>Clone</b-button>
                <b-button size="sm" variant="outline-danger" @click="deleteSelected" :disabled="isNew"><i class="fa fa-trash mr-1"/>Delete</b-button>
                <span v-if="dirty" class="text-warning ml-auto"><i class="fa fa-exclamation-triangle mr-1"/>Unsaved changes</span>
              </div>

              <info-error-banner :notification="notification" :error="error" @dismiss-error="error = ''" @dismiss-notification="notification = ''"/>

              <!-- Tabbed content -->
              <eq-tabs :selected="tabSelected" @on-selected="tabSelected = $event">
                <!-- TAB: Basic -->
                <eq-tab name="Basic" :selected="true">
                  <div class="p-2">
                    <div class="row">
                      <div class="col-2">ID<b-form-input v-model.number="selected.id" disabled/></div>
                      <div class="col-5">Name<b-form-input v-model="selected.name" placeholder="AA ability name" :class="{ 'pending-edit': isFieldEdited('name') }" @input="trackFieldEdit('name', originalValues.name, selected.name); markDirty()"/></div>
                      <div class="col-2">
                        Category
                        <b-form-select v-model.number="selected.category" :options="aaCategoryOptions" :class="{ 'pending-edit': isFieldEdited('category') }" @change="trackFieldEdit('category', originalValues.category, selected.category); markDirty()"/>
                      </div>
                      <div class="col-3">
                        Type
                        <b-form-select v-model.number="selected.type" :options="aaTypeOptions" :class="{ 'pending-edit': isFieldEdited('type') }" @change="trackFieldEdit('type', originalValues.type, selected.type); markDirty()"/>
                      </div>
                    </div>

                    <div class="row mt-3">
                      <div class="col-2">
                        First Rank ID
                        <div class="d-flex gap-1 align-items-center">
                          <b-form-input v-model.number="selected.first_rank_id" :class="{ 'pending-edit': isFieldEdited('first_rank_id') }" @input="trackFieldEdit('first_rank_id', originalValues.first_rank_id, selected.first_rank_id); onFirstRankIdChanged()" style="flex: 1"/>
                          <b-button size="sm" variant="outline-info" @click="findFirstRankId" title="Find First Rank ID"><i class="fa fa-search"/></b-button>
                        </div>
                      </div>
                      <div class="col-2">Charges<b-form-input v-model.number="selected.charges" :class="{ 'pending-edit': isFieldEdited('charges') }" @input="trackFieldEdit('charges', originalValues.charges, selected.charges); markDirty()"/></div>
                      <div class="col-2">Status<b-form-input v-model.number="selected.status" :class="{ 'pending-edit': isFieldEdited('status') }" @input="trackFieldEdit('status', originalValues.status, selected.status); markDirty()"/></div>
                      <div class="col-2">Drakkin Heritage<b-form-input v-model.number="selected.drakkin_heritage" :class="{ 'pending-edit': isFieldEdited('drakkin_heritage') }" @input="trackFieldEdit('drakkin_heritage', originalValues.drakkin_heritage, selected.drakkin_heritage); markDirty()"/></div>
                    </div>

                    <!-- Flags -->
                    <div class="aa-flags-row mt-3 p-2">
                      <div class="d-flex gap-4 flex-wrap">
                        <div :class="{ 'pending-edit-check': isFieldEdited('enabled') }" style="border-radius: 4px; padding: 2px 6px;">
                          <eq-checkbox :value="selected.enabled" label-right="Enabled" @input="v => { selected.enabled = v; trackFieldEdit('enabled', originalValues.enabled, v); markDirty() }"/>
                        </div>
                        <div :class="{ 'pending-edit-check': isFieldEdited('grant_only') }" style="border-radius: 4px; padding: 2px 6px;">
                          <eq-checkbox :value="selected.grant_only" label-right="Grant Only" @input="v => { selected.grant_only = v; trackFieldEdit('grant_only', originalValues.grant_only, v); markDirty() }"/>
                        </div>
                        <div :class="{ 'pending-edit-check': isFieldEdited('auto_grant_enabled') }" style="border-radius: 4px; padding: 2px 6px;">
                          <eq-checkbox :value="selected.auto_grant_enabled" label-right="Auto Grant" @input="v => { selected.auto_grant_enabled = v; trackFieldEdit('auto_grant_enabled', originalValues.auto_grant_enabled, v); markDirty() }"/>
                        </div>
                        <div :class="{ 'pending-edit-check': isFieldEdited('reset_on_death') }" style="border-radius: 4px; padding: 2px 6px;">
                          <eq-checkbox :value="selected.reset_on_death" label-right="Reset On Death" @input="v => { selected.reset_on_death = v; trackFieldEdit('reset_on_death', originalValues.reset_on_death, v); markDirty() }"/>
                        </div>
                      </div>
                    </div>

                    <!-- Rank 1 Title & Description (resolved from dbstr) -->
                    <div v-if="chainRanks.length" class="mt-3">
                      <div class="row">
                        <div class="col-12">
                          Rank 1 Title
                          <b-form-input :value="rankTitleText(chainRanks[0].title_sid)" disabled placeholder="(no title)"/>
                        </div>
                      </div>
                      <div class="row mt-2">
                        <div class="col-12">
                          Rank 1 Description
                          <b-form-textarea :value="rankDescText(chainRanks[0].desc_sid)" disabled placeholder="(no description)" rows="3"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </eq-tab>

                <!-- TAB: Restrictions -->
                <eq-tab name="Restrictions">
                  <div class="p-2">
                    <!-- Classes -->
                    <div class="aa-restriction-section mb-3">
                      <div class="mb-2">
                        <strong>Classes</strong>
                        <span class="text-muted ml-2">Bitmask: {{ selected.classes }}</span>
                      </div>
                      <class-bitmask-calculator
                        :mask="selected.classes"
                        :show-text-top="true"
                        :centered-buttons="true"
                        :all-none-below="true"
                        @input="selected.classes = Number($event || 0); markDirty()"
                      />
                    </div>

                    <!-- Races -->
                    <div class="aa-restriction-section mb-3">
                      <div class="mb-2">
                        <strong>Races</strong>
                        <span class="text-muted ml-2">Bitmask: {{ selected.races }}</span>
                      </div>
                      <race-bitmask-calculator
                        :mask="selected.races"
                        :show-text-top="true"
                        :centered-buttons="true"
                        :all-none-below="true"
                        @input="selected.races = Number($event || 0); markDirty()"
                      />
                    </div>

                    <!-- Deities -->
                    <div class="aa-restriction-section">
                      <div class="mb-2">
                        <strong>Deities</strong>
                        <span class="text-muted ml-2">Bitmask: {{ selected.deities }}</span>
                      </div>
                      <deity-bitmask-calculator
                        :mask="selected.deities"
                        :show-names="true"
                        :centered-buttons="true"
                        :all-none-below="true"
                        @input="selected.deities = Number($event || 0); markDirty()"
                      />
                    </div>
                  </div>
                </eq-tab>

                <!-- TAB: Ranks -->
                <eq-tab name="Ranks">
                  <div class="p-2">
                    <div class="d-flex align-items-center justify-content-between mb-3">
                      <div>
                        <span v-if="chainRanks.length" class="text-muted">
                          {{ chainRanks.length }} rank{{ chainRanks.length !== 1 ? 's' : '' }}
                          <span v-if="totalRankCost"> &middot; Total cost: {{ totalRankCost }}</span>
                        </span>
                      </div>
                      <div class="btn-group">
                        <b-button v-if="chainRanks.length" size="sm" variant="outline-secondary" @click="toggleAllRanks"><i class="fa mr-1" :class="allRanksExpanded ? 'fa-compress' : 'fa-expand'"/>{{ allRanksExpanded ? 'Collapse All' : 'Expand All' }}</b-button>
                        <b-button size="sm" variant="outline-info" @click="loadChainByFirstRank"><i class="fa fa-refresh mr-1"/>Reload Chain</b-button>
                        <b-button size="sm" variant="outline-success" @click="appendRank"><i class="fa fa-plus mr-1"/>Add Rank</b-button>
                      </div>
                    </div>

                    <div v-if="chainRanks.length === 0" class="text-center text-muted p-4">
                      <i class="fa fa-link fa-2x mb-2 d-block" style="opacity: 0.3"/>
                      No ranks loaded. Click "Add Rank" to create the first rank.
                    </div>

                    <div v-for="(rank, idx) in chainRanks" :key="rank.id || idx" class="rank-card mb-3" :class="{ 'rank-card-new': rank._isNew }">
                      <!-- Rank header -->
                      <div class="rank-card-header d-flex align-items-center justify-content-between rank-card-header-clickable" @click.self="rank._expanded = !rank._expanded; $forceUpdate()">
                        <div class="d-flex align-items-center gap-2 flex-grow-1" style="min-width: 0;" @click="rank._expanded = !rank._expanded; $forceUpdate()">
                          <i class="fa mr-1" :class="rank._expanded ? 'fa-chevron-down' : 'fa-chevron-right'" style="width:12px; opacity:.6; flex-shrink:0;"/>
                          <span class="rank-badge" style="flex-shrink:0;">Rank {{ idx + 1 }}</span>
                          <span class="text-muted small" style="flex-shrink:0;">ID: {{ rank.id }}</span>
                          <span v-if="rank._isNew" class="badge-new" style="flex-shrink:0;">NEW</span>
                          <span v-if="rank._dirty && !rank._isNew" class="badge-modified" style="flex-shrink:0;">MODIFIED</span>
                          <span v-if="!rank._expanded" class="rank-collapsed-summary ml-2">
                            <span v-if="rank.cost" class="mr-3"><span class="summary-label">Cost</span> {{ rank.cost }}</span>
                            <span v-if="rank.spell" class="mr-3"><span class="summary-label">Spell</span> {{ rank.spell }}</span>
                            <span v-if="rank.effects && rank.effects.length" class="mr-3"><span class="summary-label">Effects</span> {{ rank.effects.length }}</span>
                            <span v-if="rank.prereqs && rank.prereqs.length"><span class="summary-label">Prereqs</span> {{ rank.prereqs.length }}</span>
                          </span>
                        </div>
                        <b-button size="sm" variant="outline-danger" @click.stop="removeRank(idx, rank)" title="Remove this rank" style="flex-shrink:0;"><i class="fa fa-trash"/></b-button>
                      </div>

                      <!-- Rank body -->
                      <div v-if="rank._expanded" class="rank-card-body">
                        <div class="row">
                          <div class="col-2">Cost<b-form-input v-model.number="rank.cost" @input="markRankDirty(rank)"/></div>
                          <div class="col-2">Level Req<b-form-input v-model.number="rank.level_req" @input="markRankDirty(rank)"/></div>
                          <div class="col-2">Recast Time<b-form-input v-model.number="rank.recast_time" @input="markRankDirty(rank)"/></div>
                          <div class="col-3">
                            Spell
                            <div class="d-flex gap-2 align-items-center">
                              <b-form-input v-model.number="rank.spell" @input="markRankDirty(rank)" style="flex: 1"/>
                              <b-button size="sm" variant="outline-info" @click="openSpellSelector(idx)" title="Select Spell"><i class="fa fa-search"/></b-button>
                            </div>
                            <small v-if="rank.spell" class="text-muted">{{ spellName(rank.spell) }}</small>
                          </div>
                          <div class="col-3">
                            Spell Type
                            <b-form-select v-model.number="rank.spell_type" :options="spellTypeOptions" @change="markRankDirty(rank)"/>
                          </div>
                        </div>

                        <div class="row mt-2">
                          <div class="col-3">
                            Expansion
                            <div class="d-flex gap-2 align-items-center">
                              <b-form-input v-model.number="rank.expansion" @input="markRankDirty(rank)" style="flex: 1"/>
                              <b-button size="sm" variant="outline-info" @click="openExpansionSelector(idx)" title="Select Expansion"><i class="fa fa-search"/></b-button>
                            </div>
                            <small class="text-muted">{{ expansionName(rank.expansion) }}</small>
                          </div>
                          <div class="col-2">Prev ID<b-form-input v-model.number="rank.prev_id" @input="markRankDirty(rank)"/></div>
                          <div class="col-2">Next ID<b-form-input v-model.number="rank.next_id" @input="markRankDirty(rank)"/></div>
                          <div class="col-2">
                            Title SID
                            <b-form-input v-model.number="rank.title_sid" @input="markRankDirty(rank)" :title="rankTitleText(rank.title_sid) || '(no title)'"/>
                            <a
                              class="btn btn-warning btn-sm mt-1"
                              :href="DB_STRING_EDITOR_URL + '?type=1&selectedId=' + rank.title_sid"
                              target="_blank"
                            >
                              <i class="ra ra-scroll-unfurled mr-1"></i> Editor
                            </a>
                          </div>
                          <div class="col-3">
                            Desc SID
                            <b-form-input v-model.number="rank.desc_sid" @input="markRankDirty(rank)" :title="rankDescText(rank.desc_sid) || '(no description)'"/>
                            <a
                              class="btn btn-warning btn-sm mt-1"
                              :href="DB_STRING_EDITOR_URL + '?type=4&selectedId=' + rank.desc_sid"
                              target="_blank"
                            >
                              <i class="ra ra-scroll-unfurled mr-1"></i> Editor
                            </a>
                          </div>
                        </div>

                        <div class="row mt-2">
                          <div class="col-3">
                            Lower Hotkey SID
                            <b-form-input v-model.number="rank.lower_hotkey_sid" @input="markRankDirty(rank)" :title="rankHotkeyLowerText(rank.lower_hotkey_sid) || '(no hotkey)'"/>
                            <a
                              class="btn btn-warning btn-sm mt-1"
                              :href="DB_STRING_EDITOR_URL + '?type=2&selectedId=' + rank.lower_hotkey_sid"
                              target="_blank"
                            >
                              <i class="ra ra-scroll-unfurled mr-1"></i> Editor
                            </a>
                          </div>
                          <div class="col-3">
                            Upper Hotkey SID
                            <b-form-input v-model.number="rank.upper_hotkey_sid" @input="markRankDirty(rank)" :title="rankHotkeyUpperText(rank.upper_hotkey_sid) || '(no hotkey)'"/>
                            <a
                              class="btn btn-warning btn-sm mt-1"
                              :href="DB_STRING_EDITOR_URL + '?type=3&selectedId=' + rank.upper_hotkey_sid"
                              target="_blank"
                            >
                              <i class="ra ra-scroll-unfurled mr-1"></i> Editor
                            </a>
                          </div>
                        </div>

                        <!-- Effects sub-section -->
                        <div class="rank-subsection mt-3">
                          <div class="rank-subsection-header d-flex justify-content-between align-items-center">
                            <span><i class="fa fa-bolt mr-1"/>Effects <small class="text-muted" v-if="rank.effects && rank.effects.length">({{ rank.effects.length }})</small></span>
                            <b-button size="sm" variant="outline-success" @click="addRankEffect(rank)"><i class="fa fa-plus mr-1"/>Add</b-button>
                          </div>
                          <div v-if="!rank.effects || rank.effects.length === 0" class="text-muted small p-2">No effects defined.</div>
                          <table v-if="rank.effects && rank.effects.length" class="eq-table bordered w-100 mt-1 aa-sub-table">
                            <thead>
                            <tr>
                              <th style="width: 60px; text-align: center;">Slot</th>
                              <th style="width: 140px;">Effect ID</th>
                              <th>Effect Name</th>
                              <th style="width: 100px;" title="Base 1 (Base) — hover the input for effect-specific description">Base 1</th>
                              <th style="width: 100px;" title="Base 2 (Max) — hover the input for effect-specific description">Base 2</th>
                              <th style="width: 36px;"></th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(fx, fxIdx) in rank.effects" :key="`${rank.id}-fx-${fxIdx}`">
                              <td style="text-align: center;"><b-form-input size="sm" v-model.number="fx.slot" @input="markRankDirty(rank)" class="text-center"/></td>
                              <td>
                                <div class="d-flex gap-1 align-items-center">
                                  <b-form-input size="sm" v-model.number="fx.effect_id" @input="markRankDirty(rank)" style="flex: 1"/>
                                  <b-button size="sm" variant="outline-info" @click="openEffectSelector(rank, fx)" title="Select Effect"><i class="fa fa-search"/></b-button>
                                </div>
                              </td>
                              <td><small class="text-muted">{{ spaName(fx.effect_id) }}</small></td>
                              <td><b-form-input size="sm" v-model.number="fx.base_1" @input="markRankDirty(rank)" :title="spaBase1Tooltip(fx.effect_id)"/></td>
                              <td><b-form-input size="sm" v-model.number="fx.base_2" @input="markRankDirty(rank)" :title="spaBase2Tooltip(fx.effect_id)"/></td>
                              <td><b-button size="sm" variant="outline-danger" @click="removeRankEffect(rank, fxIdx)" title="Remove effect"><i class="fa fa-times"/></b-button></td>
                            </tr>
                            </tbody>
                          </table>
                        </div>

                        <!-- Prereqs sub-section -->
                        <div class="rank-subsection mt-3">
                          <div class="rank-subsection-header d-flex justify-content-between align-items-center">
                            <span><i class="fa fa-lock mr-1"/>Prerequisites <small class="text-muted" v-if="rank.prereqs && rank.prereqs.length">({{ rank.prereqs.length }})</small></span>
                            <b-button size="sm" variant="outline-success" @click="addRankPrereq(rank)"><i class="fa fa-plus mr-1"/>Add</b-button>
                          </div>
                          <div v-if="!rank.prereqs || rank.prereqs.length === 0" class="text-muted small p-2">No prerequisites defined.</div>
                          <table v-if="rank.prereqs && rank.prereqs.length" class="eq-table bordered w-100 mt-1 aa-sub-table">
                            <thead>
                            <tr>
                              <th style="width: 140px;">AA ID</th>
                              <th>AA Name</th>
                              <th style="width: 100px;">Points</th>
                              <th style="width: 36px;"></th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr v-for="(pr, prIdx) in rank.prereqs" :key="`${rank.id}-pr-${prIdx}`">
                              <td>
                                <div class="d-flex gap-1 align-items-center">
                                  <b-form-input size="sm" v-model.number="pr.aa_id" @input="markRankDirty(rank)" style="flex: 1"/>
                                  <b-button size="sm" variant="outline-info" @click="openAaSelector(rank, pr)" title="Select AA"><i class="fa fa-search"/></b-button>
                                </div>
                              </td>
                              <td><small class="text-muted">{{ aaName(pr.aa_id) }}</small></td>
                              <td><b-form-input size="sm" v-model.number="pr.points" @input="markRankDirty(rank)"/></td>
                              <td><b-button size="sm" variant="outline-danger" @click="removeRankPrereq(rank, prIdx)" title="Remove prereq"><i class="fa fa-times"/></b-button></td>
                            </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </eq-tab>
              </eq-tabs>
            </div>
          </div>

          <!-- Scroll hint -->
          <transition name="fade">
            <div v-if="showDetailsScrollHint" class="scroll-hint-overlay">
              <div class="scroll-hint-arrow">
                <i class="fa fa-chevron-down"></i>
              </div>
            </div>
          </transition>
        </eq-window>
      </div>
    </div>

    <!-- Expansion Selector Modal -->
    <b-modal ref="expansionSelectorModal" size="lg" hide-footer hide-header body-class="p-0" content-class="bg-transparent border-0" centered>
      <eq-window title="Expansion Selector">
        <div class="p-3">
          <content-expansion-selector :value="selectedExpansionValue" @input="onExpansionSelected"/>
        </div>
      </eq-window>
    </b-modal>

    <!-- Spell Selector Modal -->
    <b-modal ref="spellSelectorModal" size="xl" hide-footer hide-header body-class="p-0" content-class="bg-transparent border-0" centered>
      <eq-window title="Spell Selector">
        <div class="p-2 spell-selector-wrap">
          <spell-selector @input="onSpellSelected"/>
        </div>
      </eq-window>
    </b-modal>

    <!-- Effect Selector Modal -->
    <b-modal ref="effectSelectorModal" size="xl" hide-footer hide-header body-class="p-0" content-class="bg-transparent border-0" centered>
      <eq-window title="AA Effect (SPA) Selector">
        <div class="p-3">
          <div class="mb-2">
            <b-form-input v-model="effectSearch" placeholder="Search by effect id or description..." autofocus/>
          </div>
          <div class="effect-selector-table-wrap">
            <table class="eq-table eq-highlight-rows bordered w-100">
              <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 80px; text-align: center;">ID</th>
                <th>Effect</th>
                <th style="width: 80px;"></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="effect in filteredEffects" :key="effect.id" @dblclick="selectEffectId(effect.id)">
                <td style="text-align: center;">{{ effect.id }}</td>
                <td>{{ effect.name }}</td>
                <td style="text-align: center;"><b-button size="sm" variant="outline-warning" @click="selectEffectId(effect.id)">Use</b-button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-end mt-2">
            <b-button size="sm" variant="outline-secondary" @click="$refs.effectSelectorModal.hide()">Cancel</b-button>
          </div>
        </div>
      </eq-window>
    </b-modal>

    <!-- AA Selector Modal -->
    <b-modal ref="aaSelectorModal" size="xl" hide-footer hide-header body-class="p-0" content-class="bg-transparent border-0" centered>
      <eq-window title="AA Ability Selector">
        <div class="p-3">
          <div class="d-flex gap-2 mb-2">
            <b-form-input v-model="aaSearch" placeholder="Search by AA name or id..." autofocus class="flex-grow-1"/>
            <b-form-select v-model.number="aaSearchType" :options="aaTypeOptionsWithAll" style="width: 180px;"/>
          </div>
          <div class="aa-selector-table-wrap">
            <table class="eq-table eq-highlight-rows bordered w-100">
              <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 80px; text-align: center;">ID</th>
                <th>Name</th>
                <th style="width: 100px; text-align: center;">Type</th>
                <th style="width: 80px;"></th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="aa in filteredAaForSelector" :key="aa.id" @dblclick="selectAaId(aa.id)">
                <td style="text-align: center;">{{ aa.id }}</td>
                <td>{{ aa.name || '(unnamed)' }}</td>
                <td style="text-align: center;"><small>{{ aaTypeLabel(aa.type) }}</small></td>
                <td style="text-align: center;"><b-button size="sm" variant="outline-warning" @click="selectAaId(aa.id)">Use</b-button></td>
              </tr>
              </tbody>
            </table>
          </div>
          <div class="d-flex justify-content-end mt-2">
            <b-button size="sm" variant="outline-secondary" @click="$refs.aaSelectorModal.hide()">Cancel</b-button>
          </div>
        </div>
      </eq-window>
    </b-modal>
  </content-area>
</template>

<script>
import ContentArea from "@/components/layout/ContentArea";
import EqWindow from "@/components/eq-ui/EQWindow";
import EqTabs from "@/components/eq-ui/EQTabs";
import EqTab from "@/components/eq-ui/EQTab";
import EqCheckbox from "@/components/eq-ui/EQCheckbox";
import InfoErrorBanner from "@/components/InfoErrorBanner";
import LoaderComponent from "@/components/LoaderComponent";
import ClassBitmaskCalculator from "@/components/tools/ClassBitmaskCalculator.vue";
import RaceBitmaskCalculator from "@/components/tools/RaceBitmaskCalculator.vue";
import DeityBitmaskCalculator from "@/components/tools/DeityCalculator.vue";
import ContentExpansionSelector from "@/components/selectors/ContentExpansionSelector.vue";
import SpellSelector from "@/components/selectors/SpellSelector.vue";
import {SpireApi} from "@/app/api/spire-api";
import {SpireQueryBuilder} from "@/app/api/spire-query-builder";
import {AaAbilityApi} from "@/app/api/api/aa-ability-api";
import {AaRankApi} from "@/app/api/api/aa-rank-api";
import {AaRankEffectApi} from "@/app/api/api/aa-rank-effect-api";
import {AaRankPrereqApi} from "@/app/api/api/aa-rank-prereq-api";
import {DbStrApi} from "@/app/api/api/db-str-api";
import {DB_SPA, DB_SPA_DESCRIPTIONS, DB_SPELL_TYPES} from "@/app/constants/eq-spell-constants";
import {EXPANSION_NAMES} from "@/app/constants/eq-expansions";
import {ROUTE}            from "@/routes";

const AaAbilityClient = new AaAbilityApi(...SpireApi.cfg())
const AaRankClient = new AaRankApi(...SpireApi.cfg())
const AaRankEffectClient = new AaRankEffectApi(...SpireApi.cfg())
const AaRankPrereqClient = new AaRankPrereqApi(...SpireApi.cfg())
const DbStrClient = new DbStrApi(...SpireApi.cfg())

const DEFAULT_ABILITY = () => ({ id: 0, name: "", first_rank_id: 0, category: 0, charges: 0, classes: 0, deities: 0, drakkin_heritage: 0, enabled: 1, grant_only: 0, auto_grant_enabled: 0, races: 0, reset_on_death: 0, status: 0, type: 0 })
const DEFAULT_RANK = (id = 0) => ({ id, cost: 0, desc_sid: 0, expansion: 0, level_req: 0, lower_hotkey_sid: 0, next_id: 0, prev_id: 0, recast_time: 0, spell: 0, spell_type: 0, title_sid: 0, upper_hotkey_sid: 0, effects: [], prereqs: [], _dirty: true, _isNew: true, _expanded: true })

export default {
  name: "AaEditor",
  components: {
    ContentArea,
    EqWindow,
    EqTabs,
    EqTab,
    EqCheckbox,
    InfoErrorBanner,
    AppLoader: LoaderComponent,
    ClassBitmaskCalculator,
    RaceBitmaskCalculator,
    DeityBitmaskCalculator,
    ContentExpansionSelector,
    SpellSelector,
  },
  data() {
    return {
      DB_STRING_EDITOR_URL: ROUTE.STRINGS_DATABASE,
      rows: [],
      filteredRows: [],
      allRanks: [],
      allSpells: {},
      dbStrs: [],
      dbStrsDesc: [],
      dbStrsHotkeyLower: [],
      dbStrsHotkeyUpper: [],
      selected: null,
      selectedOriginal: null,
      chainRanks: [],
      deletedRanks: [],
      loading: false,
      search: "",
      enabledFilter: -1,
      typeFilter: -1,
      classFilter: 0,
      raceFilter: 0,
      deityFilter: 0,
      tabSelected: "Basic",
      enabledOptions: [{value: -1, text: "All"}, {value: 1, text: "Enabled"}, {value: 0, text: "Disabled"}],
      typeOptions: [{value: -1, text: "All"}],
      aaTypeOptions: [
        {value: 0, text: "Not Applicable"},
        {value: 1, text: "General"},
        {value: 2, text: "Archetype"},
        {value: 3, text: "Class"},
        {value: 4, text: "PoP Advanced"},
        {value: 5, text: "PoP Abilities"},
        {value: 6, text: "Gates of Discord"},
        {value: 7, text: "Omens of War"},
        {value: 8, text: "Veteran"},
        {value: 9, text: "Dragons of Norrath"},
        {value: 10, text: "Depths of Darkhollow"},
      ],
      spellTypeOptions: [{value: 0, text: "None"}],
      effectEntries: [],
      effectSearch: "",
      selectedExpansionRankIndex: null,
      selectedExpansionValue: 0,
      selectedSpellRankIndex: null,
      selectedEffectTarget: null,
      aaSearch: "",
      aaSearchType: -1,
      selectedAaTarget: null,
      dirty: false,
      notification: "",
      error: "",
      isNew: false,
      showDetailsScrollHint: false,
      sortBy: 'id',
      originalValues: {},
      pendingChanges: { editedFields: {} },
      aaCategoryOptions: [
        {value: -1, text: "None"},
        {value: 1, text: "Passive"},
        {value: 2, text: "Progression"},
        {value: 3, text: "Shroud Passive"},
        {value: 4, text: "Shroud Active"},
        {value: 5, text: "Veteran Reward"},
        {value: 6, text: "Tradeskill"},
        {value: 7, text: "Expendable"},
        {value: 8, text: "Racial Innate"},
        {value: 9, text: "Everquest"},
      ],
    }
  },
  computed: {
    selectedTitle() {
      if (!this.selected) return "AA Ability Details"
      const name = this.selected.name ? ` - ${this.selected.name}` : ''
      return `${this.isNew ? 'New' : 'Edit'} AA #${this.selected.id || '?'}${name}`
    },
    filteredEffects() {
      const q = String(this.effectSearch || "").toLowerCase().trim()
      return this.effectEntries
        .filter(e => !q || String(e.id).includes(q) || String(e.name).toLowerCase().includes(q))
        .slice(0, 500)
    },
    totalRankCost() {
      return this.chainRanks.reduce((sum, r) => sum + Number(r.cost || 0), 0)
    },
    aaTypeOptionsWithAll() {
      return [{value: -1, text: "All Types"}].concat(this.aaTypeOptions)
    },
    allRanksExpanded() {
      return this.chainRanks.length > 0 && this.chainRanks.every(r => r._expanded)
    },
    filteredAaForSelector() {
      const q = String(this.aaSearch || "").toLowerCase().trim()
      return this.rows
        .filter(r => this.aaSearchType === -1 || Number(r.type || 0) === this.aaSearchType)
        .filter(r => !q || String(r.id).includes(q) || String(r.name || "").toLowerCase().includes(q))
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        .slice(0, 500)
    },
  },
  async mounted() {
    this.spellTypeOptions = Object.entries(DB_SPELL_TYPES)
      .map(([value, text]) => ({value: Number(value), text: `${value}) ${text}`}))
      .sort((a, b) => a.value - b.value)
    this.effectEntries = Object.entries(DB_SPA)
      .map(([id, name]) => ({id: Number(id), name: String(name)}))
      .sort((a, b) => a.id - b.id)
    await this.refreshAll()
    this.$nextTick(this.checkAaDetailsOverflow)
    window.addEventListener("resize", this.checkAaDetailsOverflow)
  },
  beforeDestroy() { window.removeEventListener("resize", this.checkAaDetailsOverflow) },
  methods: {
    async refreshAll() {
      this.loading = true
      this.error = ""
      try {
        const builder = new SpireQueryBuilder().limit(100000)
        const [abilitiesResponse, ranksResponse, dbStrResponse] = await Promise.all([
          AaAbilityClient.listAaAbilities(builder.get()),
          AaRankClient.listAaRanks(builder.get()),
          DbStrClient.listDbStrs(builder.get()),
        ])
        this.rows = abilitiesResponse.data || []
        this.allRanks = (ranksResponse.data || []).sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        const allDbStrs = dbStrResponse.data || []
        this.dbStrs = allDbStrs.filter(e => Number(e.type) === 1)
        this.dbStrsDesc = allDbStrs.filter(e => Number(e.type) === 4)
        this.dbStrsHotkeyLower = allDbStrs.filter(e => Number(e.type) === 2)
        this.dbStrsHotkeyUpper = allDbStrs.filter(e => Number(e.type) === 3)
        this.typeOptions = [{value: -1, text: "All"}].concat([...new Set(this.rows.map(r => Number(r.type || 0)))].sort((a, b) => a - b).map(v => ({value: v, text: this.aaTypeLabel(v)})))
        this.applyFilters()
      } catch (e) {
        this.error = `Failed to load AA data: ${e}`
      } finally {
        this.loading = false
        this.$nextTick(this.checkAaDetailsOverflow)
      }
    },

    // ---- Label helpers ----
    aaTypeLabel(typeValue) {
      const match = this.aaTypeOptions.find(o => Number(o.value) === Number(typeValue))
      return match ? match.text : String(typeValue)
    },
    spaName(effectId) {
      const id = Number(effectId || 0)
      return DB_SPA[id] || `Unknown (${id})`
    },
    spaBase1Tooltip(effectId) {
      const desc = DB_SPA_DESCRIPTIONS[Number(effectId || 0)]
      return desc ? `Base 1 (Base): ${desc.base}` : 'Base 1 (Base)'
    },
    spaBase2Tooltip(effectId) {
      const desc = DB_SPA_DESCRIPTIONS[Number(effectId || 0)]
      return desc ? `Base 2 (Max): ${desc.max}` : 'Base 2 (Max)'
    },
    aaName(aaId) {
      const id = Number(aaId || 0)
      if (!id) return ''
      const ability = this.rows.find(r => Number(r.id) === id)
      return ability ? ability.name : `AA #${id}`
    },
    spellName(spellId) {
      const id = Number(spellId || 0)
      if (!id) return ''
      return `Spell #${id}`
    },
    rankTitleText(titleSid) {
      const id = Number(titleSid || 0)
      if (!id) return ''
      const entry = this.dbStrs.find(e => Number(e.id) === id)
      return entry ? entry.value : ''
    },
    rankDescText(descSid) {
      const id = Number(descSid || 0)
      if (!id) return ''
      const entry = this.dbStrsDesc.find(e => Number(e.id) === id)
      return entry ? entry.value : ''
    },
    rankHotkeyLowerText(sid) {
      const id = Number(sid || 0)
      if (!id) return ''
      const entry = this.dbStrsHotkeyLower.find(e => Number(e.id) === id)
      return entry ? entry.value : ''
    },
    rankHotkeyUpperText(sid) {
      const id = Number(sid || 0)
      if (!id) return ''
      const entry = this.dbStrsHotkeyUpper.find(e => Number(e.id) === id)
      return entry ? entry.value : ''
    },
    expansionName(expansionId) {
      const id = Number(expansionId)
      if (id === -1) return 'All'
      return EXPANSION_NAMES[id] || `Expansion ${id}`
    },
    // ---- Filters ----
    applyFilters() {
      const q = this.search.toLowerCase().trim()
      this.filteredRows = this.rows
        .filter(r => this.enabledFilter === -1 || Number(r.enabled || 0) === this.enabledFilter)
        .filter(r => this.typeFilter === -1 || Number(r.type || 0) === this.typeFilter)
        .filter(r => !q || String(r.id).includes(q) || String(r.name || "").toLowerCase().includes(q))
        .filter(r => !this.classFilter || Number(r.classes || 0) === 0 || (Number(r.classes || 0) & this.classFilter) !== 0)
        .filter(r => !this.raceFilter || Number(r.races || 0) === 0 || (Number(r.races || 0) & this.raceFilter) !== 0)
        .filter(r => !this.deityFilter || Number(r.deities || 0) === 0 || (Number(r.deities || 0) & this.deityFilter) !== 0)
        .sort((a, b) => this.sortBy === 'name'
          ? String(a.name || '').localeCompare(String(b.name || ''))
          : Number(a.id || 0) - Number(b.id || 0))
    },

    setAllFilters() {
      this.classFilter = 65535
      this.raceFilter = 65535
      this.deityFilter = 131071
      this.applyFilters()
    },
    clearAllFilters() {
      this.classFilter = 0
      this.raceFilter = 0
      this.deityFilter = 0
      this.applyFilters()
    },

    // ---- Rank collapse toggle ----
    toggleAllRanks() {
      const expand = !this.allRanksExpanded
      this.chainRanks.forEach(r => { r._expanded = expand })
      this.$forceUpdate()
    },

    // ---- Pending changes / field tracking ----
    trackFieldEdit(key, oldVal, newVal) {
      const oldStr = String(oldVal != null ? oldVal : '')
      const newStr = String(newVal != null ? newVal : '')
      if (oldStr === newStr) {
        this.$delete(this.pendingChanges.editedFields, key)
      } else {
        this.$set(this.pendingChanges.editedFields, key, {old: oldVal, new: newVal})
      }
    },
    isFieldEdited(key) {
      return !!this.pendingChanges.editedFields[key]
    },
    storeOriginalValues() {
      if (!this.selected) return
      this.originalValues = {
        name: this.selected.name,
        category: this.selected.category,
        type: this.selected.type,
        first_rank_id: this.selected.first_rank_id,
        charges: this.selected.charges,
        status: this.selected.status,
        drakkin_heritage: this.selected.drakkin_heritage,
        enabled: this.selected.enabled,
        grant_only: this.selected.grant_only,
        auto_grant_enabled: this.selected.auto_grant_enabled,
        reset_on_death: this.selected.reset_on_death,
      }
    },
    resetPendingChanges() {
      this.pendingChanges = {editedFields: {}}
    },

    // ---- Expansion selector ----
    openExpansionSelector(rankIndex) {
      const rank = this.chainRanks[rankIndex]
      if (!rank) return
      this.selectedExpansionRankIndex = rankIndex
      this.selectedExpansionValue = Number(rank.expansion || 0)
      this.$refs.expansionSelectorModal.show()
    },
    onExpansionSelected(expansion) {
      if (this.selectedExpansionRankIndex === null) return
      const rank = this.chainRanks[this.selectedExpansionRankIndex]
      if (!rank) return
      rank.expansion = Number(expansion || 0)
      this.markRankDirty(rank)
      this.$refs.expansionSelectorModal.hide()
      this.selectedExpansionRankIndex = null
    },

    // ---- Spell selector ----
    openSpellSelector(rankIndex) {
      this.selectedSpellRankIndex = rankIndex
      this.$refs.spellSelectorModal.show()
    },
    onSpellSelected(event) {
      if (this.selectedSpellRankIndex === null) return
      const rank = this.chainRanks[this.selectedSpellRankIndex]
      if (!rank) return
      rank.spell = Number(event.spellId || 0)
      this.markRankDirty(rank)
      this.$refs.spellSelectorModal.hide()
      this.selectedSpellRankIndex = null
    },

    // ---- Effect selector ----
    openEffectSelector(rank, fx) {
      this.selectedEffectTarget = {rank, fx}
      this.effectSearch = ""
      this.$refs.effectSelectorModal.show()
    },
    selectEffectId(effectId) {
      if (!this.selectedEffectTarget) return
      this.selectedEffectTarget.fx.effect_id = Number(effectId || 0)
      this.markRankDirty(this.selectedEffectTarget.rank)
      this.$refs.effectSelectorModal.hide()
      this.selectedEffectTarget = null
    },

    // ---- AA selector ----
    openAaSelector(rank, prereq) {
      this.selectedAaTarget = {rank, prereq}
      this.aaSearch = ""
      this.aaSearchType = -1
      this.$refs.aaSelectorModal.show()
    },
    selectAaId(aaId) {
      if (!this.selectedAaTarget) return
      this.selectedAaTarget.prereq.aa_id = Number(aaId || 0)
      this.markRankDirty(this.selectedAaTarget.rank)
      this.$refs.aaSelectorModal.hide()
      this.selectedAaTarget = null
    },

    // ---- Selection / CRUD ----
    async selectRow(row) {
      if (this.dirty && !confirm("Discard unsaved changes?")) return
      this.isNew = false
      this.selected = JSON.parse(JSON.stringify(row))
      this.selectedOriginal = JSON.parse(JSON.stringify(row))
      this.dirty = false
      this.deletedRanks = []
      this.notification = ""
      this.error = ""
      this.tabSelected = "Basic"
      this.storeOriginalValues()
      await this.loadChainByFirstRank()
    },
    newAbility() {
      if (this.dirty && !confirm("Discard unsaved changes?")) return
      const nextId = this.rows.reduce((max, r) => Math.max(max, Number(r.id || 0)), 0) + 1
      this.selected = DEFAULT_ABILITY()
      this.selected.id = nextId
      this.selectedOriginal = JSON.parse(JSON.stringify(this.selected))
      this.isNew = true
      this.chainRanks = []
      this.deletedRanks = []
      this.dirty = true
      this.tabSelected = "Basic"
      this.notification = "New AA ability draft initialized"
      this.storeOriginalValues()
    },
    cloneAbility() {
      if (this.dirty && !confirm("Discard unsaved changes?")) return
      const nextId = this.rows.reduce((max, r) => Math.max(max, Number(r.id || 0)), 0) + 1
      this.selected = JSON.parse(JSON.stringify(this.selected))
      this.selected.id = nextId
      this.selected.first_rank_id = 0
      this.selectedOriginal = JSON.parse(JSON.stringify(this.selected))
      this.isNew = true
      this.chainRanks = []
      this.deletedRanks = []
      this.dirty = true
      this.tabSelected = "Basic"
      this.notification = `Cloned AA ability as #${nextId}. Ranks were not cloned.`
      this.storeOriginalValues()
    },
    onFirstRankIdChanged() {
      this.markDirty()
    },
    findFirstRankId() {
      // Collect first_rank_ids already claimed by other abilities
      const usedFirstRankIds = new Set(
        this.rows
          .filter(r => Number(r.id) !== Number(this.selected.id))
          .map(r => Number(r.first_rank_id || 0))
          .filter(id => id > 0)
      )
      // Include locally-created (unsaved) chain ranks in the search pool
      const localNewRanks = this.chainRanks.filter(r => r._isNew)
      const rankPool = [...this.allRanks, ...localNewRanks]
      // Candidates: ranks with prev_id=0 not already owned by another ability
      const candidates = rankPool.filter(r =>
        Number(r.prev_id || 0) === 0 && !usedFirstRankIds.has(Number(r.id))
      )
      const toast = (msg, variant) => this.$bvToast.toast(msg, {
        title: 'First Rank Lookup',
        variant,
        solid: true,
        toaster: 'b-toaster-bottom-right',
      })
      if (candidates.length === 0) {
        // Fall back to the first rank in the currently-loaded chain (handles data-inconsistency cases)
        if (this.chainRanks.length > 0) {
          const foundId = Number(this.chainRanks[0].id)
          this.selected.first_rank_id = foundId
          this.trackFieldEdit('first_rank_id', this.originalValues.first_rank_id, foundId)
          this.markDirty()
          toast(`Found first rank ID: ${foundId}`, 'success')
        } else {
          toast('No unclaimed first rank found.', 'danger')
        }
      } else if (candidates.length === 1) {
        const foundId = candidates[0].id
        this.selected.first_rank_id = foundId
        this.trackFieldEdit('first_rank_id', this.originalValues.first_rank_id, foundId)
        this.markDirty()
        toast(`Found first rank ID: ${foundId}`, 'success')
      } else {
        toast(`${candidates.length} unclaimed first ranks found — please enter ID manually.`, 'warning')
      }
    },
    markDirty() {
      if (!this.selected || !this.selectedOriginal) return this.dirty = false
      this.dirty = JSON.stringify(this.selected) !== JSON.stringify(this.selectedOriginal) || this.chainRanks.some(r => r._dirty || r._deleted) || this.deletedRanks.length > 0
    },
    markRankDirty(rank) { rank._dirty = true; this.markDirty() },
    discardChanges() {
      if (!this.selectedOriginal) return
      this.selected = JSON.parse(JSON.stringify(this.selectedOriginal))
      this.chainRanks = []
      this.deletedRanks = []
      this.dirty = false
      this.resetPendingChanges()
      this.storeOriginalValues()
      this.notification = "Changes discarded"
      this.loadChainByFirstRank()
    },

    // ---- Rank chain ----
    async loadChainByFirstRank() {
      this.chainRanks = []
      this.deletedRanks = []
      if (!this.selected || !Number(this.selected.first_rank_id || 0)) {
        this.$nextTick(this.checkAaDetailsOverflow)
        return
      }
      const idMap = new Map((this.allRanks || []).map(r => [Number(r.id), JSON.parse(JSON.stringify(r))]))
      const visited = new Set()
      let cursor = Number(this.selected.first_rank_id)
      while (cursor && idMap.has(cursor) && !visited.has(cursor)) {
        const rank = idMap.get(cursor)
        visited.add(cursor)
        rank.effects = await this.fetchRankEffects(cursor)
        rank.prereqs = await this.fetchRankPrereqs(cursor)
        rank.spell_type = Number(rank.spell_type || 0)
        rank._expanded = false
        rank._dirty = false
        rank._isNew = false
        this.chainRanks.push(rank)
        cursor = Number(rank.next_id || 0)
      }
      if (this.chainRanks.length === 0) {
        this.notification = "No ranks found. Click 'Add Rank' on the Ranks tab to create one."
      }
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    async fetchRankEffects(rankId) {
      const builder = new SpireQueryBuilder().where('rank_id', '=', Number(rankId)).limit(1000)
      const r = await AaRankEffectClient.listAaRankEffects(builder.get())
      return (r.data || []).map(e => ({...e}))
    },
    async fetchRankPrereqs(rankId) {
      const builder = new SpireQueryBuilder().where('rank_id', '=', Number(rankId)).limit(1000)
      const r = await AaRankPrereqClient.listAaRankPrereqs(builder.get())
      return (r.data || []).map(e => ({...e}))
    },
    appendRank() {
      const maxExisting = this.allRanks.reduce((max, r) => Math.max(max, Number(r.id || 0)), 0)
      const maxLocal = this.chainRanks.reduce((max, r) => Math.max(max, Number(r.id || 0)), 0)
      const nextId = Math.max(maxExisting, maxLocal) + 1
      const newRank = DEFAULT_RANK(nextId)
      const prev = this.chainRanks[this.chainRanks.length - 1]
      if (prev) {
        prev.next_id = nextId
        prev._dirty = true
        newRank.prev_id = Number(prev.id)
      }
      if (!this.selected.first_rank_id) {
        this.selected.first_rank_id = nextId
      }
      this.chainRanks.push(newRank)
      this.markDirty()
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    removeRank(idx, rank) {
      if (!confirm(`Remove rank ${rank.id}?`)) return
      const prev = this.chainRanks[idx - 1]
      const next = this.chainRanks[idx + 1]
      if (prev) { prev.next_id = next ? Number(next.id) : 0; prev._dirty = true }
      if (next) { next.prev_id = prev ? Number(prev.id) : 0; next._dirty = true }
      if (idx === 0) this.selected.first_rank_id = next ? Number(next.id) : 0
      if (rank._isNew) {
        this.chainRanks.splice(idx, 1)
      } else {
        rank._deleted = true
        this.deletedRanks.push({...rank})
        this.chainRanks.splice(idx, 1)
      }
      this.markDirty()
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    addRankEffect(rank) {
      rank.effects.push({rank_id: rank.id, slot: rank.effects.length + 1, effect_id: 0, base_1: 0, base_2: 0, _isNew: true})
      this.markRankDirty(rank)
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    removeRankEffect(rank, idx) {
      rank.effects.splice(idx, 1)
      this.markRankDirty(rank)
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    addRankPrereq(rank) {
      rank.prereqs.push({rank_id: rank.id, aa_id: 0, points: 0, _isNew: true})
      this.markRankDirty(rank)
      this.$nextTick(this.checkAaDetailsOverflow)
    },
    removeRankPrereq(rank, idx) {
      rank.prereqs.splice(idx, 1)
      this.markRankDirty(rank)
      this.$nextTick(this.checkAaDetailsOverflow)
    },

    // ---- Scroll hint ----
    checkAaDetailsOverflow() {
      const el = this.$refs.aaDetailsScroll
      if (!el) return
      const shouldShow = el.scrollHeight > el.clientHeight && (el.scrollHeight - el.scrollTop - el.clientHeight) > 30
      if (shouldShow !== this.showDetailsScrollHint) this.showDetailsScrollHint = shouldShow
    },
    onAaDetailsScroll() {
      this.checkAaDetailsOverflow()
    },

    // ---- Validation ----
    validateBeforeSave() {
      if (!this.selected.name || !String(this.selected.name).trim()) return "Name is required"
      if (this.chainRanks.some(r => Number(r.id || 0) <= 0)) return "All rank IDs must be positive"
      if (this.chainRanks.some(r => Number(r.prev_id || 0) === Number(r.id) || Number(r.next_id || 0) === Number(r.id))) return "Rank cannot reference itself in prev_id/next_id"
      const ids = new Set(this.chainRanks.map(r => Number(r.id)))
      const badLinks = this.chainRanks.some(r => Number(r.prev_id || 0) && !ids.has(Number(r.prev_id)) || Number(r.next_id || 0) && !ids.has(Number(r.next_id)))
      if (badLinks) return "All prev_id/next_id links must target a rank in this chain"
      const duplicateSlots = this.chainRanks.some(r => {
        const slots = (r.effects || []).map(f => Number(f.slot || 0)).filter(Boolean)
        return new Set(slots).size !== slots.length
      })
      if (duplicateSlots) return "Each rank must use unique effect slots"
      return ""
    },

    // ---- Save ----
    async saveSelected() {
      this.error = ""
      this.notification = ""
      if (!this.selected) return

      const validationError = this.validateBeforeSave()
      if (validationError) { this.error = validationError; return }

      try {
        if (this.isNew) {
          await AaAbilityClient.createAaAbility({aaAbility: this.selected})
          this.notification = `Created AA ability ${this.selected.id}`
          this.isNew = false
        } else {
          await AaAbilityClient.updateAaAbility({id: Number(this.selected.id), aaAbility: this.selected})
          this.notification = `Saved AA ability ${this.selected.id}`
        }

        for (const rank of this.chainRanks) {
          const rankPayload = {...rank}
          delete rankPayload.effects
          delete rankPayload.prereqs
          delete rankPayload._dirty
          delete rankPayload._isNew
          delete rankPayload._deleted

          if (rank._isNew) await AaRankClient.createAaRank({aaRank: rankPayload})
          else if (rank._dirty) await AaRankClient.updateAaRank({id: Number(rank.id), aaRank: rankPayload})

          await this.syncRankEffects(rank)
          await this.syncRankPrereqs(rank)
        }

        for (const deletedRank of this.deletedRanks) {
          const rankId = Number(deletedRank.id)
          if (!rankId) continue
          for (const oldFx of await this.fetchRankEffects(rankId)) {
            await AaRankEffectClient.deleteAaRankEffect({id: rankId, query: {slot: Number(oldFx.slot)}})
          }
          for (const oldPr of await this.fetchRankPrereqs(rankId)) {
            await AaRankPrereqClient.deleteAaRankPrereq({id: rankId, query: {aa_id: Number(oldPr.aa_id)}})
          }
          await AaRankClient.deleteAaRank({id: rankId})
        }

        await this.refreshAll()
        const reselected = this.rows.find(r => Number(r.id) === Number(this.selected.id))
        if (reselected) {
          this.selected = JSON.parse(JSON.stringify(reselected))
          this.selectedOriginal = JSON.parse(JSON.stringify(reselected))
          await this.loadChainByFirstRank()
          this.deletedRanks = []
          this.dirty = false
          this.storeOriginalValues()
          this.resetPendingChanges()
        }
        this.notification = `${this.notification} (chain, effects, prereqs saved)`
      } catch (e) {
        this.error = `Save failed: ${e}`
      }
    },
    async syncRankEffects(rank) {
      const existing = await this.fetchRankEffects(rank.id)
      const incoming = (rank.effects || []).filter(f => Number(f.effect_id || 0) > 0)
      const existingBySlot = new Map(existing.map(e => [Number(e.slot), e]))
      const incomingSlots = new Set(incoming.map(e => Number(e.slot)))

      for (const oldFx of existing) {
        if (!incomingSlots.has(Number(oldFx.slot))) {
          await AaRankEffectClient.deleteAaRankEffect({id: Number(rank.id), query: {slot: Number(oldFx.slot)}})
        }
      }
      for (const fx of incoming) {
        const payload = {rank_id: Number(rank.id), slot: Number(fx.slot), effect_id: Number(fx.effect_id), base_1: Number(fx.base_1 || 0), base_2: Number(fx.base_2 || 0)}
        if (existingBySlot.has(Number(fx.slot))) await AaRankEffectClient.updateAaRankEffect({id: Number(rank.id), aaRankEffect: payload, query: {slot: Number(fx.slot)}})
        else await AaRankEffectClient.createAaRankEffect({aaRankEffect: payload})
      }
    },
    async syncRankPrereqs(rank) {
      const existing = await this.fetchRankPrereqs(rank.id)
      const incoming = (rank.prereqs || []).filter(p => Number(p.aa_id || 0) > 0)
      const existingByAa = new Map(existing.map(e => [Number(e.aa_id), e]))
      const incomingAa = new Set(incoming.map(e => Number(e.aa_id)))

      for (const oldPr of existing) {
        if (!incomingAa.has(Number(oldPr.aa_id))) {
          await AaRankPrereqClient.deleteAaRankPrereq({id: Number(rank.id), query: {aa_id: Number(oldPr.aa_id)}})
        }
      }
      for (const pr of incoming) {
        const payload = {rank_id: Number(rank.id), aa_id: Number(pr.aa_id), points: Number(pr.points || 0)}
        if (existingByAa.has(Number(pr.aa_id))) await AaRankPrereqClient.updateAaRankPrereq({id: Number(rank.id), aaRankPrereq: payload, query: {aa_id: Number(pr.aa_id)}})
        else await AaRankPrereqClient.createAaRankPrereq({aaRankPrereq: payload})
      }
    },

    // ---- Delete ----
    async deleteSelected() {
      this.error = ""
      this.notification = ""
      if (!this.selected || this.isNew) return
      if (!confirm(`Delete AA ability ${this.selected.id} (${this.selected.name})? This cannot be undone.`)) return

      try {
        await AaAbilityClient.deleteAaAbility({id: Number(this.selected.id)})
        this.notification = `Deleted AA ability ${this.selected.id}`
        this.selected = null
        this.selectedOriginal = null
        this.chainRanks = []
        this.deletedRanks = []
        this.dirty = false
        await this.refreshAll()
      } catch (e) {
        this.error = `Delete failed: ${e}`
      }
    },
  }
}
</script>

<style scoped>
/* Left panel list */
.aa-list-wrap { max-height: 82vh; overflow: auto; }

/* Right panel */
.aa-details-window {
  position: relative;
  height: 82vh;
  overflow: visible;
}
.aa-details-wrap {
  height: calc(82vh - 48px);
  max-height: calc(82vh - 48px);
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

/* Scroll hint */
.scroll-hint-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: linear-gradient(transparent, rgba(15, 15, 25, 0.95));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  pointer-events: none;
  z-index: 5;
}
.scroll-hint-arrow {
  color: #e8c56d;
  font-size: 18px;
  animation: pulse-bounce 1.5s ease-in-out infinite;
}
@keyframes pulse-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(5px); opacity: 1; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }

/* Toolbar */
.min-search { min-width: 220px; }
.aa-toolbar { background: rgba(14, 23, 38, 0.6); }
.gap-1 { gap: 4px; }
.gap-2 { gap: 8px; }
.gap-4 { gap: 16px; }

/* Action bar */
.aa-action-bar {
  background: rgba(14, 23, 38, 0.5);
  border: 1px solid rgba(83, 146, 255, 0.2);
  border-radius: 6px;
}

/* Flags row */
.aa-flags-row {
  background: rgba(11, 18, 31, 0.5);
  border: 1px solid rgba(174, 189, 213, 0.15);
  border-radius: 4px;
}

/* Restriction sections */
.aa-restriction-section {
  background: rgba(11, 18, 31, 0.4);
  border: 1px solid rgba(174, 189, 213, 0.15);
  border-radius: 6px;
  padding: 12px;
}
/* Rank cards */
.rank-card {
  border: 1px solid rgba(174, 189, 213, 0.2);
  border-radius: 6px;
  background: rgba(18, 31, 53, 0.35);
  overflow: hidden;
}
.rank-card-new {
  border-color: rgba(40, 167, 69, 0.4);
}
.rank-card-header {
  background: rgba(14, 23, 38, 0.6);
  padding: 6px 10px;
  border-bottom: 1px solid rgba(174, 189, 213, 0.1);
}
.rank-badge {
  background: rgba(138, 163, 255, 0.2);
  border: 1px solid rgba(138, 163, 255, 0.4);
  border-radius: 3px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: bold;
  color: #8aa3ff;
}
.badge-new {
  background: rgba(40, 167, 69, 0.2);
  border: 1px solid rgba(40, 167, 69, 0.4);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  color: #28a745;
}
.badge-modified {
  background: rgba(255, 193, 7, 0.15);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 3px;
  padding: 1px 6px;
  font-size: 10px;
  color: #ffc107;
}
.rank-card-body {
  padding: 10px;
}

/* Clickable rank header */
.rank-card-header-clickable {
  cursor: pointer;
  user-select: none;
}
.rank-card-header-clickable:hover {
  background: rgba(20, 33, 56, 0.8);
}

/* Collapsed rank summary */
.rank-collapsed-summary {
  font-size: 12px;
  color: #8a9bb0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-collapsed-summary .summary-label {
  color: #5a6a7a;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  margin-right: 2px;
}

/* Rank sub-sections (effects, prereqs) */
.rank-subsection {
  background: rgba(11, 18, 31, 0.5);
  border: 1px solid rgba(174, 189, 213, 0.15);
  border-radius: 4px;
  overflow: hidden;
}
.rank-subsection-header {
  background: rgba(14, 23, 38, 0.5);
  padding: 6px 10px;
  border-bottom: 1px solid rgba(174, 189, 213, 0.1);
  font-size: 13px;
  color: #b0bec5;
}

/* Sub-tables for effects/prereqs */
.aa-sub-table th {
  font-size: 11px;
  padding: 4px 6px !important;
}
.aa-sub-table td {
  padding: 3px 6px !important;
  vertical-align: middle;
}
.aa-sub-table .form-control {
  height: 28px;
  font-size: 12px;
  padding: 2px 6px;
}

/* Spell selector modal */
.spell-selector-wrap { max-height: 80vh; overflow-y: auto; overflow-x: hidden; }

/* Effect selector modal */
.effect-selector-table-wrap { max-height: 55vh; overflow-y: auto; }

/* AA selector modal */
.aa-selector-table-wrap { max-height: 55vh; overflow-y: auto; }

/* Pending edit field highlights */
.pending-edit {
  background-color: rgba(255, 165, 0, 0.15) !important;
  border-color: rgba(255, 165, 0, 0.5) !important;
  box-shadow: 0 0 0 1px rgba(255, 165, 0, 0.3);
}
.pending-edit-check {
  background: rgba(255, 165, 0, 0.15);
  border-radius: 4px;
}

/* Compact inline bitmask filter sections */
.filter-section { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
.filter-left { display: flex; flex-direction: column; align-items: center; min-width: 44px; flex-shrink: 0; padding-top: 2px; }
.filter-label { font-size: 10px; color: #8a9bb0; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; white-space: nowrap; }
.filter-header-btns { display: flex; gap: 2px; margin-top: 3px; }
.filter-header-btns .btn { font-size: 9px; padding: 0 5px; line-height: 1.5; }
.filter-icons { flex: 1; min-width: 0; overflow: hidden; }
/* Force icons into a single non-wrapping row; overflow is clipped by parent overflow:hidden */
.filter-icons ::v-deep .row { margin: 0; width: 100%; }
.filter-icons ::v-deep .row > div { display: flex !important; flex-wrap: nowrap; margin: 0 !important; padding: 0 !important; }
.filter-icons ::v-deep .row > div > div { margin: 0 !important; flex-shrink: 0; }
.filter-icons ::v-deep .row > div > div > div { padding: 0 !important; margin-right: 1px !important; }

/* Save button glow when dirty */
.save-btn-glow {
  animation: save-glow 1.5s ease-in-out infinite;
}
@keyframes save-glow {
  0%, 100% { box-shadow: 0 0 4px rgba(255, 100, 0, 0.3); }
  50% { box-shadow: 0 0 12px rgba(255, 100, 0, 0.7); }
}
</style>
