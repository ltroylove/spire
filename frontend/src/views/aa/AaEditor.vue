<template>
  <content-area style="padding: 0 !important;">
    <div class="row">
      <div class="col-4">
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
            <div class="btn-group mt-2">
              <b-button size="sm" variant="outline-warning" @click="refreshAll"><i class="fa fa-refresh mr-1"/>Refresh</b-button>
              <b-button size="sm" variant="outline-success" @click="newAbility"><i class="fa fa-plus mr-1"/>New</b-button>
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
                <th style="width: 90px; text-align:center">Type</th>
                <th style="width: 90px; text-align:center">Enabled</th>
              </tr>
              </thead>
              <tbody>
              <tr v-for="row in filteredRows" :key="row.id" :class="selected && selected.id === row.id ? 'pulsate-highlight-white' : ''" @click="selectRow(row)">
                <td style="text-align:center">{{ row.id }}</td>
                <td>{{ row.name || '(unnamed)' }}</td>
                <td style="text-align:center">{{ aaTypeLabel(row.type) }}</td>
                <td style="text-align:center"><span :class="row.enabled ? 'text-success' : 'text-muted'">{{ row.enabled ? 'Yes' : 'No' }}</span></td>
              </tr>
              </tbody>
            </table>
          </div>
        </eq-window>
      </div>

      <div class="col-8">
        <eq-window :title="selectedTitle" class="aa-details-window">
          <div ref="aaDetailsScroll" class="aa-details-wrap" @scroll="onAaDetailsScroll">
          <div v-if="!selected" class="text-muted p-3">Select an AA ability from the list or create a new one.</div>

          <div v-if="selected" class="minified-inputs">
            <div class="row mt-2">
              <div class="col-3">ID<b-form-input v-model.number="selected.id" disabled/></div>
              <div class="col-6">Name<b-form-input v-model="selected.name" @input="markDirty"/></div>
              <div class="col-3">First Rank ID<b-form-input v-model.number="selected.first_rank_id" @input="onFirstRankIdChanged"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-3">Category<b-form-input v-model.number="selected.category" @input="markDirty"/></div>
              <div class="col-3">Type<b-form-select v-model.number="selected.type" :options="aaTypeOptions" @change="markDirty"/></div>
              <div class="col-3">Charges<b-form-input v-model.number="selected.charges" @input="markDirty"/></div>
              <div class="col-3">Status<b-form-input v-model.number="selected.status" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-4">
                Classes
                <div class="d-flex gap-2 align-items-center">
                  <b-form-input v-model.number="selected.classes" @input="markDirty"/>
                  <b-button size="sm" variant="outline-info" @click="openClassSelector">Select</b-button>
                </div>
              </div>
              <div class="col-4">
                Races
                <div class="d-flex gap-2 align-items-center">
                  <b-form-input v-model.number="selected.races" @input="markDirty"/>
                  <b-button size="sm" variant="outline-info" @click="openRaceSelector">Select</b-button>
                </div>
              </div>
              <div class="col-4">
                Deities
                <div class="d-flex gap-2 align-items-center">
                  <b-form-input v-model.number="selected.deities" @input="markDirty"/>
                  <b-button size="sm" variant="outline-info" @click="openDeitySelector">Select</b-button>
                </div>
              </div>
            </div>

            <div class="row mt-3">
              <div class="col-3">Drakkin Heritage<b-form-input v-model.number="selected.drakkin_heritage" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-3"><b-form-checkbox v-model="selected.enabled" :value="1" :unchecked-value="0" @change="markDirty">Enabled</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.grant_only" :value="1" :unchecked-value="0" @change="markDirty">Grant Only</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.auto_grant_enabled" :value="1" :unchecked-value="0" @change="markDirty">Auto Grant</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.reset_on_death" :value="1" :unchecked-value="0" @change="markDirty">Reset On Death</b-form-checkbox></div>
            </div>

            <div class="aa-subpanel mt-4 p-3">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Rank Chain Manager</h6>
                <div class="btn-group">
                  <b-button size="sm" variant="outline-info" @click="loadChainByFirstRank">Load Chain</b-button>
                  <b-button size="sm" variant="outline-success" @click="appendRank">Add Rank</b-button>
                </div>
              </div>
              <div v-if="chainRanks.length === 0" class="text-muted">No ranks loaded for this ability.</div>
              <div v-for="(rank, idx) in chainRanks" :key="rank.id || idx" class="rank-row mb-3 p-2">
                <div class="row">
                  <div class="col-2">ID<b-form-input v-model.number="rank.id" disabled/></div>
                  <div class="col-2">Cost<b-form-input v-model.number="rank.cost" @input="markRankDirty(rank)"/></div>
                  <div class="col-2">Level<b-form-input v-model.number="rank.level_req" @input="markRankDirty(rank)"/></div>
                  <div class="col-2">Prev ID<b-form-input v-model.number="rank.prev_id" @input="markRankDirty(rank)"/></div>
                  <div class="col-2">Next ID<b-form-input v-model.number="rank.next_id" @input="markRankDirty(rank)"/></div>
                  <div class="col-2 d-flex align-items-end">
                    <b-button size="sm" variant="outline-danger" @click="removeRank(idx, rank)"><i class="fa fa-trash"/></b-button>
                  </div>
                </div>
                <div class="row mt-2">
                  <div class="col-2">
                    Spell
                    <div class="d-flex gap-2 align-items-center">
                      <b-form-input v-model.number="rank.spell" @input="markRankDirty(rank)"/>
                      <b-button size="sm" variant="outline-info" @click="openSpellSelector(idx)">Select</b-button>
                    </div>
                  </div>
                  <div class="col-2">Spell Type<b-form-select v-model.number="rank.spell_type" :options="spellTypeOptions" @change="markRankDirty(rank)"/></div>
                  <div class="col-2">
                    Expansion
                    <div class="d-flex gap-2 align-items-center">
                      <b-form-input v-model.number="rank.expansion" @input="markRankDirty(rank)"/>
                      <b-button size="sm" variant="outline-info" @click="openExpansionSelector(idx)">Select</b-button>
                    </div>
                  </div>
                  <div class="col-2">Recast<b-form-input v-model.number="rank.recast_time" @input="markRankDirty(rank)"/></div>
                  <div class="col-2">Title SID<b-form-input v-model.number="rank.title_sid" @input="markRankDirty(rank)"/></div>
                  <div class="col-2">Desc SID<b-form-input v-model.number="rank.desc_sid" @input="markRankDirty(rank)"/></div>
                </div>

                <div class="row mt-2">
                  <div class="col-3">Lower Hotkey SID<b-form-input v-model.number="rank.lower_hotkey_sid" @input="markRankDirty(rank)"/></div>
                  <div class="col-3">Upper Hotkey SID<b-form-input v-model.number="rank.upper_hotkey_sid" @input="markRankDirty(rank)"/></div>
                </div>

                <div class="mt-2 effects-box p-2">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong>aa_rank_effects</strong>
                    <b-button size="sm" variant="outline-success" @click="addRankEffect(rank)">Add Effect</b-button>
                  </div>
                  <div v-if="!rank.effects || rank.effects.length === 0" class="text-muted small">No effects</div>
                  <div v-for="(fx, fxIdx) in rank.effects" :key="`${rank.id}-fx-${fxIdx}`" class="row mb-1">
                    <div class="col-2">Slot<b-form-input v-model.number="fx.slot" @input="markRankDirty(rank)"/></div>
                    <div class="col-3">
                      Effect ID
                      <div class="d-flex gap-2 align-items-center">
                        <b-form-input v-model.number="fx.effect_id" @input="markRankDirty(rank)"/>
                        <b-button size="sm" variant="outline-info" @click="openEffectSelector(rank, fx)">Select</b-button>
                      </div>
                    </div>
                    <div class="col-3">Base 1<b-form-input v-model.number="fx.base_1" @input="markRankDirty(rank)"/></div>
                    <div class="col-3">Base 2<b-form-input v-model.number="fx.base_2" @input="markRankDirty(rank)"/></div>
                    <div class="col-1 d-flex align-items-end"><b-button size="sm" variant="outline-danger" @click="removeRankEffect(rank, fxIdx)"><i class="fa fa-times"/></b-button></div>
                  </div>
                </div>

                <div class="mt-2 effects-box p-2">
                  <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong>aa_rank_prereqs</strong>
                    <b-button size="sm" variant="outline-success" @click="addRankPrereq(rank)">Add Prereq</b-button>
                  </div>
                  <div v-if="!rank.prereqs || rank.prereqs.length === 0" class="text-muted small">No prereqs</div>
                  <div v-for="(pr, prIdx) in rank.prereqs" :key="`${rank.id}-pr-${prIdx}`" class="row mb-1">
                    <div class="col-4">Required AA ID<b-form-input v-model.number="pr.aa_id" @input="markRankDirty(rank)"/></div>
                    <div class="col-3">Points<b-form-input v-model.number="pr.points" @input="markRankDirty(rank)"/></div>
                    <div class="col-1 d-flex align-items-end"><b-button size="sm" variant="outline-danger" @click="removeRankPrereq(rank, prIdx)"><i class="fa fa-times"/></b-button></div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-3 d-flex align-items-center gap-2 flex-wrap">
              <b-button size="sm" variant="outline-warning" @click="saveSelected"><i class="fa fa-save mr-1"/>Save Ability + Chain</b-button>
              <b-button size="sm" variant="outline-danger" @click="deleteSelected" :disabled="isNew"><i class="fa fa-trash mr-1"/>Delete Ability</b-button>
              <b-button size="sm" variant="outline-secondary" @click="discardChanges" :disabled="!dirty">Discard</b-button>
              <span v-if="dirty" class="text-warning ml-2"><i class="fa fa-exclamation-triangle mr-1"/>Unsaved changes</span>
            </div>
          </div>

          <info-error-banner class="mt-3" :notification="notification" :error="error" @dismiss-error="error = ''" @dismiss-notification="notification = ''"/>
          </div>
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

    <b-modal ref="classSelectorModal" size="xl" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="Class Selector">
        <class-bitmask-calculator :mask="selected ? selected.classes : 0" @input="onClassSelected" :show-text-top="false" :show-text-side="true" :imageSize="38" :centered-buttons="true"/>
      </eq-window>
    </b-modal>

    <b-modal ref="raceSelectorModal" size="xl" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="Race Selector">
        <race-bitmask-calculator :mask="selected ? selected.races : 0" @input="onRaceSelected" :show-text-top="false" :imageSize="37" :centered-buttons="true"/>
      </eq-window>
    </b-modal>

    <b-modal ref="deitySelectorModal" size="xl" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="Deity Selector">
        <deity-bitmask-calculator :mask="selected ? selected.deities : 0" @input="onDeitySelected" :show-names="false" :imageSize="37" :centered-buttons="true"/>
      </eq-window>
    </b-modal>

    <b-modal ref="expansionSelectorModal" size="lg" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="Expansion Selector">
        <content-expansion-selector :value="selectedExpansionValue" @input="onExpansionSelected"/>
      </eq-window>
    </b-modal>

    <b-modal ref="spellSelectorModal" size="xl" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="Spell Selector" class="p-2">
        <spell-selector @input="onSpellSelected"/>
      </eq-window>
    </b-modal>

    <b-modal ref="effectSelectorModal" size="xl" hide-footer hide-header body-class="p-2" content-class="bg-transparent border-0">
      <eq-window title="AA Effect ID Selector" class="p-2">
        <div class="mb-2">
          <b-form-input v-model="effectSearch" placeholder="Search effect id or description"/>
        </div>
        <div class="effect-selector-table-wrap">
          <table class="eq-table eq-highlight-rows bordered w-100">
            <thead>
            <tr>
              <th style="width: 90px; text-align: center;">ID</th>
              <th>Effect</th>
              <th style="width: 90px;"></th>
            </tr>
            </thead>
            <tbody>
            <tr v-for="effect in filteredEffects" :key="effect.id">
              <td style="text-align: center;">{{ effect.id }}</td>
              <td>{{ effect.name }}</td>
              <td><b-button size="sm" variant="outline-warning" @click="selectEffectId(effect.id)">Use</b-button></td>
            </tr>
            </tbody>
          </table>
        </div>
      </eq-window>
    </b-modal>
  </content-area>
</template>

<script>
import ContentArea from "@/components/layout/ContentArea";
import EqWindow from "@/components/eq-ui/EQWindow";
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
import {DB_SPA, DB_SPELL_TYPES} from "@/app/constants/eq-spell-constants";

const AaAbilityClient = new AaAbilityApi(...SpireApi.cfg())
const AaRankClient = new AaRankApi(...SpireApi.cfg())
const AaRankEffectClient = new AaRankEffectApi(...SpireApi.cfg())
const AaRankPrereqClient = new AaRankPrereqApi(...SpireApi.cfg())

const DEFAULT_ABILITY = () => ({ id: 0, name: "", first_rank_id: 0, category: 0, charges: 0, classes: 0, deities: 0, drakkin_heritage: 0, enabled: 1, grant_only: 0, auto_grant_enabled: 0, races: 0, reset_on_death: 0, status: 0, type: 0 })
const DEFAULT_RANK = (id = 0) => ({ id, cost: 0, desc_sid: 0, expansion: 0, level_req: 0, lower_hotkey_sid: 0, next_id: 0, prev_id: 0, recast_time: 0, spell: 0, spell_type: 0, title_sid: 0, upper_hotkey_sid: 0, effects: [], prereqs: [], _dirty: true, _isNew: true })

export default {
  name: "AaEditor",
  components: {
    ContentArea,
    EqWindow,
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
      rows: [],
      filteredRows: [],
      allRanks: [],
      selected: null,
      selectedOriginal: null,
      chainRanks: [],
      deletedRanks: [],
      loading: false,
      search: "",
      enabledFilter: -1,
      typeFilter: -1,
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
      dirty: false,
      notification: "",
      error: "",
      isNew: false,
      showDetailsScrollHint: false,
    }
  },
  computed: {
    selectedTitle() {
      if (!this.selected) return "AA Ability Details"
      return `${this.isNew ? 'New' : 'Edit'} AA Ability (${this.selected.id || 'pending'})`
    },
    filteredEffects() {
      const q = String(this.effectSearch || "").toLowerCase().trim()
      return this.effectEntries
        .filter(e => !q || String(e.id).includes(q) || String(e.name).toLowerCase().includes(q))
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
        const [abilitiesResponse, ranksResponse] = await Promise.all([
          AaAbilityClient.listAaAbilities(builder.get()),
          AaRankClient.listAaRanks(builder.get()),
        ])
        this.rows = abilitiesResponse.data || []
        this.allRanks = (ranksResponse.data || []).sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
        this.typeOptions = [{value: -1, text: "All"}].concat([...new Set(this.rows.map(r => Number(r.type || 0)))].sort((a, b) => a - b).map(v => ({value: v, text: this.aaTypeLabel(v)})))
        this.applyFilters()
      } catch (e) {
        this.error = `Failed to load AA data: ${e}`
      } finally {
        this.loading = false
        this.$nextTick(this.checkAaDetailsOverflow)
      }
    },
    aaTypeLabel(typeValue) {
      const match = this.aaTypeOptions.find(o => Number(o.value) === Number(typeValue))
      return match ? match.text : String(typeValue)
    },
    applyFilters() {
      const q = this.search.toLowerCase().trim()
      this.filteredRows = this.rows
        .filter(r => this.enabledFilter === -1 || Number(r.enabled || 0) === this.enabledFilter)
        .filter(r => this.typeFilter === -1 || Number(r.type || 0) === this.typeFilter)
        .filter(r => !q || String(r.id).includes(q) || String(r.name || "").toLowerCase().includes(q))
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    },
    openClassSelector() { this.$refs.classSelectorModal.show() },
    openRaceSelector() { this.$refs.raceSelectorModal.show() },
    openDeitySelector() { this.$refs.deitySelectorModal.show() },
    onClassSelected(mask) {
      if (!this.selected) return
      this.selected.classes = Number(mask || 0)
      this.markDirty()
    },
    onRaceSelected(mask) {
      if (!this.selected) return
      this.selected.races = Number(mask || 0)
      this.markDirty()
    },
    onDeitySelected(mask) {
      if (!this.selected) return
      this.selected.deities = Number(mask || 0)
      this.markDirty()
    },
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
    async selectRow(row) {
      if (this.dirty && !confirm("Discard unsaved changes?")) return
      this.isNew = false
      this.selected = JSON.parse(JSON.stringify(row))
      this.selectedOriginal = JSON.parse(JSON.stringify(row))
      this.dirty = false
      this.deletedRanks = []
      this.notification = ""
      this.error = ""
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
      this.notification = "Initialized new AA ability draft"
    },
    onFirstRankIdChanged() {
      this.markDirty()
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
      this.notification = "Changes discarded"
      this.loadChainByFirstRank()
    },
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
        rank._dirty = false
        rank._isNew = false
        this.chainRanks.push(rank)
        cursor = Number(rank.next_id || 0)
      }
      if (this.chainRanks.length === 0) {
        this.notification = "No ranks found by first_rank_id. You can create one with Add Rank."
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
    addRankEffect(rank) { rank.effects.push({rank_id: rank.id, slot: rank.effects.length + 1, effect_id: 0, base_1: 0, base_2: 0, _isNew: true}); this.markRankDirty(rank); this.$nextTick(this.checkAaDetailsOverflow) },
    removeRankEffect(rank, idx) { rank.effects.splice(idx, 1); this.markRankDirty(rank); this.$nextTick(this.checkAaDetailsOverflow) },
    addRankPrereq(rank) { rank.prereqs.push({rank_id: rank.id, aa_id: 0, points: 0, _isNew: true}); this.markRankDirty(rank); this.$nextTick(this.checkAaDetailsOverflow) },
    removeRankPrereq(rank, idx) { rank.prereqs.splice(idx, 1); this.markRankDirty(rank); this.$nextTick(this.checkAaDetailsOverflow) },
    checkAaDetailsOverflow() {
      const el = this.$refs.aaDetailsScroll
      if (!el) return
      const shouldShow = el.scrollHeight > el.clientHeight && (el.scrollHeight - el.scrollTop - el.clientHeight) > 30
      if (shouldShow !== this.showDetailsScrollHint) this.showDetailsScrollHint = shouldShow
    },
    onAaDetailsScroll() {
      this.checkAaDetailsOverflow()
    },
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
    async deleteSelected() {
      this.error = ""
      this.notification = ""
      if (!this.selected || this.isNew) return
      if (!confirm(`Delete AA ability ${this.selected.id}?`)) return

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
.aa-list-wrap { max-height: 82vh; overflow: auto; }
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
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}
.min-search { min-width: 220px; }
.aa-toolbar { background: rgba(14, 23, 38, 0.6); }
.gap-2 { gap: 8px; }
.aa-subpanel { background: rgba(11, 18, 31, 0.75); border: 1px solid rgba(83, 146, 255, 0.25); border-radius: 6px; }
.rank-row { border: 1px solid rgba(174, 189, 213, 0.2); border-radius: 6px; background: rgba(18, 31, 53, 0.35); }
.effects-box { border: 1px dashed rgba(174, 189, 213, 0.35); border-radius: 4px; }
.effect-selector-table-wrap { max-height: 60vh; overflow-y: auto; }
</style>
