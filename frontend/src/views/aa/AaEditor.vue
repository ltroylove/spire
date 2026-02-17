<template>
  <content-area style="padding: 0 !important;">
    <div class="row">
      <div class="col-5">
        <eq-window title="Alternate Advancement Editor" class="p-0">
          <div class="p-3 border-bottom aa-toolbar minified-inputs">
            <div class="d-flex gap-2 align-items-end flex-wrap">
              <div class="flex-grow-1 min-search">
                <label class="mb-1">Search</label>
                <b-form-input
                  v-model="search"
                  placeholder="Search by AA name or id"
                  @input="applyFilters"
                />
              </div>
              <div>
                <label class="mb-1">Status</label>
                <b-form-select v-model.number="enabledFilter" :options="enabledOptions" @change="applyFilters"/>
              </div>
              <div>
                <label class="mb-1">Type</label>
                <b-form-select v-model.number="typeFilter" :options="typeOptions" @change="applyFilters"/>
              </div>
              <div class="btn-group">
                <b-button size="sm" variant="outline-warning" @click="refreshList"><i class="fa fa-refresh mr-1"/>Refresh</b-button>
                <b-button size="sm" variant="outline-success" @click="newAbility"><i class="fa fa-plus mr-1"/>New</b-button>
              </div>
            </div>
          </div>

          <div class="aa-list-wrap">
            <app-loader :is-loading="loading" padding="4"/>
            <div v-if="!loading && filteredRows.length === 0" class="text-center text-muted p-4">
              No AA abilities matched your filters.
            </div>
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
              <tr
                v-for="row in filteredRows"
                :key="row.id"
                :class="selected && selected.id === row.id ? 'pulsate-highlight-white' : ''"
                @click="selectRow(row)"
              >
                <td style="text-align:center">{{ row.id }}</td>
                <td>{{ row.name || '(unnamed)' }}</td>
                <td style="text-align:center">{{ row.type }}</td>
                <td style="text-align:center">
                  <span :class="row.enabled ? 'text-success' : 'text-muted'">{{ row.enabled ? 'Yes' : 'No' }}</span>
                </td>
              </tr>
              </tbody>
            </table>
          </div>
        </eq-window>
      </div>

      <div class="col-7">
        <eq-window :title="selectedTitle">
          <div v-if="!selected" class="text-muted p-3">
            Select an AA ability from the list or create a new one.
          </div>

          <div v-if="selected" class="minified-inputs">
            <div class="row mt-2">
              <div class="col-4">ID<b-form-input v-model.number="selected.id" disabled/></div>
              <div class="col-8">Name<b-form-input v-model="selected.name" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-4">First Rank ID<b-form-input v-model.number="selected.first_rank_id" @input="markDirty"/></div>
              <div class="col-4">Category<b-form-input v-model.number="selected.category" @input="markDirty"/></div>
              <div class="col-4">Type<b-form-input v-model.number="selected.type" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-4">Charges<b-form-input v-model.number="selected.charges" @input="markDirty"/></div>
              <div class="col-4">Status<b-form-input v-model.number="selected.status" @input="markDirty"/></div>
              <div class="col-4">Deities<b-form-input v-model.number="selected.deities" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-4">Classes<b-form-input v-model.number="selected.classes" @input="markDirty"/></div>
              <div class="col-4">Races<b-form-input v-model.number="selected.races" @input="markDirty"/></div>
              <div class="col-4">Drakkin Heritage<b-form-input v-model.number="selected.drakkin_heritage" @input="markDirty"/></div>
            </div>

            <div class="row mt-3">
              <div class="col-3"><b-form-checkbox v-model="selected.enabled" :value="1" :unchecked-value="0" @change="markDirty">Enabled</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.grant_only" :value="1" :unchecked-value="0" @change="markDirty">Grant Only</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.auto_grant_enabled" :value="1" :unchecked-value="0" @change="markDirty">Auto Grant</b-form-checkbox></div>
              <div class="col-3"><b-form-checkbox v-model="selected.reset_on_death" :value="1" :unchecked-value="0" @change="markDirty">Reset On Death</b-form-checkbox></div>
            </div>

            <div class="mt-4 d-flex align-items-center gap-2">
              <b-button size="sm" variant="outline-warning" @click="saveSelected"><i class="fa fa-save mr-1"/>Save</b-button>
              <b-button size="sm" variant="outline-danger" @click="deleteSelected" :disabled="isNew"><i class="fa fa-trash mr-1"/>Delete</b-button>
              <b-button size="sm" variant="outline-secondary" @click="discardChanges" :disabled="!dirty">Discard</b-button>
              <span v-if="dirty" class="text-warning ml-2"><i class="fa fa-exclamation-triangle mr-1"/>Unsaved changes</span>
            </div>
          </div>

          <info-error-banner
            class="mt-3"
            :notification="notification"
            :error="error"
            @dismiss-error="error = ''"
            @dismiss-notification="notification = ''"
          />
        </eq-window>
      </div>
    </div>
  </content-area>
</template>

<script>
import ContentArea from "@/components/layout/ContentArea";
import EqWindow from "@/components/eq-ui/EQWindow";
import InfoErrorBanner from "@/components/InfoErrorBanner";
import LoaderComponent from "@/components/LoaderComponent";
import {SpireApi} from "@/app/api/spire-api";
import {SpireQueryBuilder} from "@/app/api/spire-query-builder";
import {AaAbilityApi} from "@/app/api/api/aa-ability-api";

const AaAbilityClient = new AaAbilityApi(...SpireApi.cfg())

const DEFAULT_ABILITY = () => ({
  id: 0,
  name: "",
  first_rank_id: 0,
  category: 0,
  charges: 0,
  classes: 0,
  deities: 0,
  drakkin_heritage: 0,
  enabled: 1,
  grant_only: 0,
  auto_grant_enabled: 0,
  races: 0,
  reset_on_death: 0,
  status: 0,
  type: 0,
})

export default {
  name: "AaEditor",
  components: {ContentArea, EqWindow, InfoErrorBanner, AppLoader: LoaderComponent},
  data() {
    return {
      rows: [],
      filteredRows: [],
      selected: null,
      selectedOriginal: null,
      loading: false,
      search: "",
      enabledFilter: -1,
      typeFilter: -1,
      enabledOptions: [
        {value: -1, text: "All"},
        {value: 1, text: "Enabled"},
        {value: 0, text: "Disabled"},
      ],
      typeOptions: [{value: -1, text: "All"}],
      dirty: false,
      notification: "",
      error: "",
      isNew: false,
    }
  },
  computed: {
    selectedTitle() {
      if (!this.selected) {
        return "AA Ability Details"
      }
      return `${this.isNew ? 'New' : 'Edit'} AA Ability (${this.selected.id || 'pending'})`
    }
  },
  async mounted() {
    await this.refreshList()
  },
  methods: {
    async refreshList() {
      this.loading = true
      this.error = ""
      try {
        const builder = new SpireQueryBuilder().limit(100000)
        const response = await AaAbilityClient.listAaAbilities(builder.get())
        this.rows = response.data || []
        this.typeOptions = [{value: -1, text: "All"}].concat(
          [...new Set(this.rows.map(r => Number(r.type || 0)))].sort((a, b) => a - b).map(v => ({value: v, text: String(v)}))
        )
        this.applyFilters()
      } catch (e) {
        this.error = `Failed to load AA abilities: ${e}`
      } finally {
        this.loading = false
      }
    },
    applyFilters() {
      const q = this.search.toLowerCase().trim()
      this.filteredRows = this.rows
        .filter(r => this.enabledFilter === -1 || Number(r.enabled || 0) === this.enabledFilter)
        .filter(r => this.typeFilter === -1 || Number(r.type || 0) === this.typeFilter)
        .filter(r => !q || String(r.id).includes(q) || String(r.name || "").toLowerCase().includes(q))
        .sort((a, b) => Number(a.id || 0) - Number(b.id || 0))
    },
    selectRow(row) {
      if (this.dirty && !confirm("Discard unsaved changes?")) {
        return
      }
      this.isNew = false
      this.selected = JSON.parse(JSON.stringify(row))
      this.selectedOriginal = JSON.parse(JSON.stringify(row))
      this.dirty = false
      this.notification = ""
      this.error = ""
    },
    newAbility() {
      if (this.dirty && !confirm("Discard unsaved changes?")) {
        return
      }
      const nextId = this.rows.reduce((max, r) => Math.max(max, Number(r.id || 0)), 0) + 1
      this.selected = DEFAULT_ABILITY()
      this.selected.id = nextId
      this.selectedOriginal = JSON.parse(JSON.stringify(this.selected))
      this.isNew = true
      this.dirty = true
      this.notification = "Initialized new AA ability draft"
    },
    markDirty() {
      if (!this.selected || !this.selectedOriginal) {
        this.dirty = false
        return
      }
      this.dirty = JSON.stringify(this.selected) !== JSON.stringify(this.selectedOriginal)
    },
    discardChanges() {
      if (!this.selectedOriginal) {
        return
      }
      this.selected = JSON.parse(JSON.stringify(this.selectedOriginal))
      this.dirty = false
      this.notification = "Changes discarded"
    },
    async saveSelected() {
      this.error = ""
      this.notification = ""
      if (!this.selected) {
        return
      }
      if (!this.selected.name || !String(this.selected.name).trim()) {
        this.error = "Name is required"
        return
      }

      try {
        if (this.isNew) {
          await AaAbilityClient.createAaAbility({aaAbility: this.selected})
          this.notification = `Created AA ability ${this.selected.id}`
          this.isNew = false
        } else {
          await AaAbilityClient.updateAaAbility({id: Number(this.selected.id), aaAbility: this.selected})
          this.notification = `Saved AA ability ${this.selected.id}`
        }

        await this.refreshList()
        const reselected = this.rows.find(r => Number(r.id) === Number(this.selected.id))
        if (reselected) {
          this.selected = JSON.parse(JSON.stringify(reselected))
          this.selectedOriginal = JSON.parse(JSON.stringify(reselected))
          this.dirty = false
        }
      } catch (e) {
        this.error = `Save failed: ${e}`
      }
    },
    async deleteSelected() {
      this.error = ""
      this.notification = ""
      if (!this.selected || this.isNew) {
        return
      }
      if (!confirm(`Delete AA ability ${this.selected.id}?`)) {
        return
      }

      try {
        await AaAbilityClient.deleteAaAbility({id: Number(this.selected.id)})
        this.notification = `Deleted AA ability ${this.selected.id}`
        this.selected = null
        this.selectedOriginal = null
        this.dirty = false
        await this.refreshList()
      } catch (e) {
        this.error = `Delete failed: ${e}`
      }
    },
  }
}
</script>

<style scoped>
.aa-list-wrap {
  max-height: 82vh;
  overflow: auto;
}
.min-search {
  min-width: 260px;
}
.aa-toolbar {
  background: rgba(14, 23, 38, 0.6);
}
.gap-2 {
  gap: 8px;
}
</style>
