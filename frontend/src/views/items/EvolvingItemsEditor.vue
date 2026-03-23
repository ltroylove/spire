<template>
  <content-area style="padding: 0 !important;">
    <div class="row">
      <div class="col-12 col-lg-5">
        <eq-window title="Evolving Items" class="p-0">
          <div class="p-3 border-bottom minified-inputs">
            <div class="d-flex align-items-end flex-wrap">
              <div class="flex-grow-1 mr-2 evolving-min-search">
                <label class="mb-1">Search</label>
                <b-form-input
                  v-model.trim="search"
                  placeholder="Search by evolution id, item id, or item name"
                />
              </div>
              <div class="mr-2">
                <label class="mb-1">Type</label>
                <b-form-select v-model.number="typeFilter" :options="typeFilterOptions"/>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center mt-2 flex-wrap">
              <div class="btn-group">
                <b-button id="evolving-refresh-btn" size="sm" variant="outline-warning" @click="loadDetails">
                  <i class="fa fa-refresh mr-1"/>Refresh
                </b-button>
                <b-button id="new-evolution-btn" size="sm" variant="outline-success" @click="startNewEvolution">
                  <i class="fa fa-plus mr-1"/>New Evolution
                </b-button>
              </div>
              <small class="text-muted mt-2 mt-sm-0" v-if="filteredGroups.length">
                {{ filteredGroups.length }} chains
              </small>
            </div>
          </div>

          <div class="evolving-list-wrap">
            <app-loader :is-loading="loading" padding="4"/>

            <div v-if="!loading && filteredGroups.length === 0" class="text-center text-muted p-4">
              No evolving item chains matched the current filters.
            </div>

            <table
              v-if="!loading && filteredGroups.length > 0"
              id="evolving-items-table"
              class="eq-table eq-highlight-rows bordered"
            >
              <thead class="eq-table-floating-header">
              <tr>
                <th style="width: 90px; text-align: center;">Evo ID</th>
                <th style="width: 80px; text-align: center;">Levels</th>
                <th>Items</th>
                <th style="width: 120px; text-align: center;">Type</th>
              </tr>
              </thead>
              <tbody>
              <tr
                v-for="group in filteredGroups"
                :key="group.evoId"
                :class="selectedEvoId === group.evoId ? 'pulsate-highlight-white' : ''"
                @click="selectEvolution(group.evoId)"
              >
                <td style="text-align: center;">{{ group.evoId }}</td>
                <td style="text-align: center;">{{ group.details.length }}</td>
                <td>
                  <div class="d-flex flex-wrap align-items-center">
                    <div
                      v-for="detail in group.details.slice(0, 3)"
                      :key="`group-${group.evoId}-${detail.id}`"
                      class="mr-3 mb-1 evolving-inline-item"
                    >
                      <item-popover
                        v-if="getCachedItem(detail.item_id)"
                        :item="getCachedItem(detail.item_id)"
                        size="sm"
                      />
                      <span v-else>{{ itemName(detail.item_id) }}</span>
                    </div>
                    <span v-if="group.details.length > 3" class="text-muted small">
                      +{{ group.details.length - 3 }} more
                    </span>
                  </div>
                </td>
                <td style="text-align: center;">{{ typeLabel(group.details.length > 0 ? group.details[0].type : 0) }}</td>
              </tr>
              </tbody>
            </table>
          </div>
        </eq-window>
      </div>

      <div class="col-12 col-lg-7">
        <eq-window :title="detailsTitle">
          <div class="p-2">
            <div v-if="!selectedEvoId && formMode === ''" class="text-center text-muted p-5">
              <i class="fa fa-level-up fa-2x mb-3 d-block" style="opacity: 0.4"/>
              Select an evolution chain from the left or create a new one.
            </div>

            <div v-if="selectedEvoId || formMode !== ''">
              <div class="evolving-action-bar d-flex align-items-center flex-wrap mb-3 p-2">
                <b-button id="evolving-reload-chain-btn" size="sm" variant="outline-warning" class="mr-2 mb-2" @click="loadDetails">
                  <i class="fa fa-refresh mr-1"/>Reload
                </b-button>
                <b-button id="new-evolution-chain-btn" size="sm" variant="outline-success" class="mr-2 mb-2" @click="startNewEvolution">
                  <i class="fa fa-plus mr-1"/>New Chain
                </b-button>
                <b-button
                  id="add-evolution-level-btn"
                  size="sm"
                  variant="outline-info"
                  class="mr-2 mb-2"
                  :disabled="selectedEvoId === 0"
                  @click="startAddLevel"
                >
                  <i class="fa fa-plus mr-1"/>Add Level
                </b-button>
                <span class="text-muted mb-2" v-if="selectedChain.length">
                  {{ selectedChain.length }} levels in chain {{ selectedEvoId }}
                </span>
              </div>

              <info-error-banner
                :notification="notification"
                :error="error"
                @dismiss-error="error = ''"
                @dismiss-notification="notification = ''"
                class="mb-3"
              />

              <div v-if="selectedChain.length" class="mb-3">
                <table id="selected-evolution-chain-table" class="eq-table eq-highlight-rows bordered">
                  <thead>
                  <tr>
                    <th style="width: 70px; text-align: center;">Level</th>
                    <th style="width: 90px; text-align: center;">Item ID</th>
                    <th>Item</th>
                    <th style="width: 120px; text-align: center;">Type</th>
                    <th>Subtype</th>
                    <th style="width: 130px; text-align: center;">Required Amount</th>
                    <th style="width: 150px; text-align: center;">Actions</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr
                    v-for="detail in selectedChain"
                    :key="detail.id"
                    class="evolving-chain-row"
                    :class="editingId === Number(detail.id) ? 'pulsate-highlight-white' : ''"
                  >
                    <td style="text-align: center;">{{ detail.item_evolve_level }}</td>
                    <td style="text-align: center;">{{ detail.item_id }}</td>
                    <td class="text-left">
                      <item-popover
                        v-if="getCachedItem(detail.item_id)"
                        :item="getCachedItem(detail.item_id)"
                        size="sm"
                      />
                      <span v-else>{{ itemName(detail.item_id) }}</span>
                    </td>
                    <td style="text-align: center;">{{ typeLabel(detail.type) }}</td>
                    <td>{{ subtypeLabel(detail) }}</td>
                    <td style="text-align: center;">{{ detail.required_amount }}</td>
                    <td style="text-align: center;">
                      <b-button :id="`edit-evolution-entry-${detail.id}`" size="sm" variant="outline-info" class="mr-1" @click="startEdit(detail)">
                        Edit
                      </b-button>
                      <b-button :id="`delete-evolution-entry-${detail.id}`" size="sm" variant="outline-danger" @click="deleteEntry(detail)">
                        Delete
                      </b-button>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <eq-window-simple class="evolving-form-window">
                <div
                  :class="[
                    'd-flex justify-content-between align-items-center evolving-section-header',
                    { 'evolving-section-header-collapsed': !formSectionExpanded }
                  ]"
                  @click="toggleFormSection"
                >
                  <div class="evolving-section-spacer"></div>
                  <div class="eq-header mb-0 evolving-section-title">
                    {{ formMode === 'edit' ? 'Edit Evolution Entry' : 'Add Evolution Entry' }}
                  </div>
                  <b-button
                    size="sm"
                    variant="outline-warning"
                    class="evolving-section-toggle"
                    @click.stop="toggleFormSection"
                  >
                    <i :class="formSectionExpanded ? 'fa fa-chevron-up' : 'fa fa-chevron-down'"></i>
                    {{ formSectionExpanded ? 'Collapse' : 'Open' }}
                  </b-button>
                </div>

                <div v-if="formSectionExpanded" class="minified-inputs p-2 evolving-form">
                  <div class="row">
                    <div class="col-6 col-md-2">
                      ID
                      <b-form-input id="evolving-detail-id" v-model.number="form.id"/>
                    </div>
                    <div class="col-6 col-md-3">
                      Evo ID
                      <b-form-input id="evolving-detail-evo-id" v-model.number="form.item_evo_id"/>
                    </div>
                    <div class="col-6 col-md-3">
                      Level
                      <b-form-input id="evolving-detail-level" v-model.number="form.item_evolve_level"/>
                    </div>
                    <div class="col-6 col-md-4">
                      Required Amount
                      <b-form-input id="evolving-detail-required" v-model.number="form.required_amount"/>
                    </div>
                  </div>

                  <div class="row mt-2">
                    <div class="col-12 col-md-5">
                      Item ID
                      <b-input-group class="evolving-inline-input-group">
                        <b-form-input id="evolving-detail-item-id" v-model.number="form.item_id"/>
                        <b-input-group-append>
                          <b-button
                            id="evolving-detail-item-search-btn"
                            variant="outline-warning"
                            class="evolving-item-search-btn"
                            @click="toggleItemSelector"
                          >
                            <i class="fa fa-search"></i>
                          </b-button>
                        </b-input-group-append>
                      </b-input-group>
                    </div>
                    <div class="col-12 col-md-3">
                      Type
                      <b-form-select id="evolving-detail-type" v-model.number="form.type" :options="EVOLVING_TYPE_OPTIONS"/>
                    </div>
                    <div class="col-12 col-md-4">
                      Subtype
                      <b-form-select
                        v-if="Number(form.type) === 1"
                        id="evolving-detail-subtype"
                        v-model="form.sub_type"
                        :options="experienceSubtypeOptions"
                      />
                      <b-form-input v-else id="evolving-detail-subtype" v-model="form.sub_type"/>
                    </div>
                  </div>

                  <div class="row mt-3">
                    <div class="col-12 col-lg-8">
                      <div v-if="getCachedItem(form.item_id)" class="mb-2">
                        <item-popover
                          :item="getCachedItem(form.item_id)"
                          size="sm"
                        />
                      </div>
                      <div v-else-if="Number(form.item_id) > 0" class="text-muted small">
                        {{ formItemName }}
                      </div>
                    </div>
                    <div class="col-12 col-lg-4 text-lg-right mt-2 mt-lg-0">
                      <b-button id="cancel-evolution-entry-btn" size="sm" variant="outline-secondary" class="mr-2" @click="cancelForm">
                        Cancel
                      </b-button>
                      <b-button id="save-evolution-entry-btn" size="sm" variant="outline-success" @click="saveEntry">
                        <i class="fa fa-save mr-1"/>Save Entry
                      </b-button>
                    </div>
                  </div>

                  <div class="row mt-3" v-if="Number(form.item_id) > 0">
                    <div class="col-12">
                      <b-button
                        :href="itemEditorPath(form.item_id)"
                        target="_blank"
                        rel="noopener noreferrer"
                        size="sm"
                        variant="outline-warning"
                        class="evolving-open-item-link"
                      >
                        Open Item
                      </b-button>
                    </div>
                  </div>
                </div>
              </eq-window-simple>

              <div v-if="itemSelectorActive" class="fade-in mt-3">
                <task-item-selector
                  @input="selectFormItem($event)"
                />
              </div>
            </div>
          </div>
        </eq-window>
      </div>
    </div>
  </content-area>
</template>

<script>
import EqWindow from "@/components/eq-ui/EQWindow.vue";
import EqWindowSimple from "@/components/eq-ui/EQWindowSimple.vue";
import ContentArea from "@/components/layout/ContentArea.vue";
import InfoErrorBanner from "@/components/InfoErrorBanner.vue";
import ItemPopover from "@/components/ItemPopover.vue";
import TaskItemSelector from "@/views/tasks/components/TaskItemSelector.vue";
import { ItemsEvolvingDetailApi } from "@/app/api";
import { SpireApi } from "@/app/api/spire-api";
import { SpireQueryBuilder } from "@/app/api/spire-query-builder";
import { Items } from "@/app/items";
import {
  cloneEvolvingDetail,
  createExistingEvolutionDraft,
  createNewEvolutionDraft,
  EVOLVING_EXPERIENCE_SUBTYPES,
  EVOLVING_TYPE_OPTIONS,
  getCachedItemName,
  getEvolutionChain,
  getEvolutionSubtypeLabel,
  getEvolvingTypeLabel,
  groupEvolvingDetails,
  sortEvolvingDetails,
  summarizeEvolutionChain,
} from "@/app/items-evolving";
import { ROUTE } from "@/routes";
import { Zones } from "@/app/zones";
import * as util from "util";

export default {
  name: "EvolvingItemsEditor",
  components: {
    ContentArea,
    EqWindow,
    EqWindowSimple,
    InfoErrorBanner,
    ItemPopover,
    TaskItemSelector,
  },
  data() {
    return {
      loading: false,
      details: [],
      search: "",
      typeFilter: -1,
      selectedEvoId: 0,
      formMode: "",
      editingId: 0,
      form: createNewEvolutionDraft(),
      formSectionExpanded: false,
      itemSelectorActive: false,
      notification: "",
      error: "",
      EVOLVING_TYPE_OPTIONS,
    };
  },
  computed: {
    detailsTitle() {
      if (this.formMode === "create" && this.selectedEvoId === 0) {
        return "Create Evolution Chain";
      }

      if (this.selectedEvoId > 0) {
        return `Evolution Chain ${this.selectedEvoId}`;
      }

      return "Evolving Item Details";
    },
    experienceSubtypeOptions() {
      return Object.keys(EVOLVING_EXPERIENCE_SUBTYPES).map((key) => ({
        value: key,
        text: `${key}) ${EVOLVING_EXPERIENCE_SUBTYPES[key]}`,
      }));
    },
    typeFilterOptions() {
      return [{ value: -1, text: "All Types" }].concat(EVOLVING_TYPE_OPTIONS);
    },
    groupedChains() {
      return groupEvolvingDetails(this.details);
    },
    filteredGroups() {
      const search = this.search.toLowerCase();

      return this.groupedChains.filter((group) => {
        const matchesType = this.typeFilter < 0 || group.details.some((detail) => Number(detail.type) === Number(this.typeFilter));
        if (!matchesType) {
          return false;
        }

        if (search.length === 0) {
          return true;
        }

        const haystack = [
          `${group.evoId}`,
          ...group.details.map((detail) => `${detail.item_id}`),
          ...group.details.map((detail) => `${detail.item_evolve_level}`),
          ...group.details.map((detail) => this.itemName(detail.item_id)),
        ].join(" ").toLowerCase();

        return haystack.includes(search);
      });
    },
    selectedChain() {
      return getEvolutionChain(this.details, this.selectedEvoId);
    },
    formItemName() {
      return this.itemName(this.form.item_id);
    },
  },
  async created() {
    this.loadQueryState();
    await this.loadDetails();
  },
  methods: {
    itemEditorPath(itemId) {
      return util.format(ROUTE.ITEM_EDIT, itemId);
    },
    getCachedItem(itemId) {
      return Items.cacheExists(Number(itemId));
    },

    typeLabel(type) {
      return getEvolvingTypeLabel(type);
    },

    itemName(itemId) {
      return getCachedItemName(itemId);
    },

    summarizeChain(details) {
      return summarizeEvolutionChain(details);
    },

    subtypeLabel(detail) {
      return getEvolutionSubtypeLabel(detail);
    },

    updateQueryState() {
      const query = {};

      if (this.selectedEvoId > 0) {
        query.evoId = this.selectedEvoId;
      }

      if (this.formMode.length > 0) {
        query.mode = this.formMode;
      }

      if (this.editingId > 0) {
        query.editId = this.editingId;
      }

      this.$router.replace({
        path: ROUTE.ITEMS_EVOLVING,
        query,
      }).catch(() => {});
    },

    loadQueryState() {
      if (this.$route.query.evoId) {
        this.selectedEvoId = Number(this.$route.query.evoId);
      }

      if (this.$route.query.mode) {
        this.formMode = `${this.$route.query.mode}`;
      }

      if (this.$route.query.editId) {
        this.editingId = Number(this.$route.query.editId);
      }
    },

    async preloadItems() {
      const ids = [...new Set(this.details.map((detail) => Number(detail.item_id)).filter((id) => id > 0))];
      if (ids.length > 0) {
        await Items.loadItemsBulk(ids);
      }
    },

    syncSelectionFromQuery() {
      if (this.editingId > 0) {
        const detail = this.details.find((entry) => Number(entry.id) === this.editingId);
        if (detail) {
          this.startEdit(detail, false);
          return;
        }
      }

      if (this.formMode === "create" && this.selectedEvoId === 0) {
        this.form = createNewEvolutionDraft(this.details);
        return;
      }

      if (this.selectedEvoId > 0 && this.formMode === "create") {
        this.form = createExistingEvolutionDraft(this.details, this.selectedEvoId);
      }
    },

    async loadDetails() {
      this.loading = true;
      this.error = "";

      try {
        await Zones.getZones();

        const result = await (new ItemsEvolvingDetailApi(...SpireApi.cfg())).listItemsEvolvingDetails(
          (new SpireQueryBuilder())
            .orderBy(["item_evo_id", "item_evolve_level"])
            .limit(10000)
            .get()
        );

        this.details = sortEvolvingDetails(result.data || []);
        await this.preloadItems();

        if (this.selectedEvoId === 0 && this.filteredGroups.length > 0 && this.formMode === "") {
          this.selectedEvoId = this.filteredGroups[0].evoId;
        }

        this.syncSelectionFromQuery();
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = "Failed to load evolving item data.";
        }
      } finally {
        this.loading = false;
      }
    },

    selectEvolution(evoId) {
      this.selectedEvoId = Number(evoId);
      if (this.formMode !== "edit") {
        this.formMode = "";
        this.editingId = 0;
        this.formSectionExpanded = false;
        this.itemSelectorActive = false;
      }
      this.updateQueryState();
    },

    startNewEvolution() {
      this.formMode = "create";
      this.editingId = 0;
      this.form = createNewEvolutionDraft(this.details);
      this.selectedEvoId = Number(this.form.item_evo_id);
      this.formSectionExpanded = true;
      this.itemSelectorActive = false;
      this.error = "";
      this.updateQueryState();
    },

    startAddLevel() {
      if (this.selectedEvoId === 0) {
        return;
      }

      this.formMode = "create";
      this.editingId = 0;
      this.form = createExistingEvolutionDraft(this.details, this.selectedEvoId);
      this.formSectionExpanded = true;
      this.itemSelectorActive = false;
      this.error = "";
      this.updateQueryState();
    },

    startEdit(detail, updateRoute = true) {
      this.formMode = "edit";
      this.editingId = Number(detail.id);
      this.selectedEvoId = Number(detail.item_evo_id);
      this.form = cloneEvolvingDetail(detail);
      this.formSectionExpanded = true;
      this.itemSelectorActive = false;
      this.error = "";

      if (updateRoute) {
        this.updateQueryState();
      }
    },

    cancelForm() {
      this.formMode = "";
      this.editingId = 0;
      this.form = createNewEvolutionDraft(this.details);
      this.formSectionExpanded = false;
      this.itemSelectorActive = false;
      this.error = "";
      this.updateQueryState();
    },
    toggleFormSection() {
      this.formSectionExpanded = !this.formSectionExpanded;
    },
    toggleItemSelector() {
      this.itemSelectorActive = !this.itemSelectorActive;
      if (this.itemSelectorActive) {
        this.formSectionExpanded = true;
      }
    },
    selectFormItem(item) {
      this.form.item_id = item.id;
      this.itemSelectorActive = false;
    },

    getPayload() {
      return {
        id: Number(this.form.id || 0),
        item_evo_id: Number(this.form.item_evo_id || 0),
        item_evolve_level: Number(this.form.item_evolve_level || 0),
        item_id: Number(this.form.item_id || 0),
        type: Number(this.form.type || 0),
        sub_type: `${typeof this.form.sub_type !== "undefined" && this.form.sub_type !== null ? this.form.sub_type : ""}`,
        required_amount: Number(this.form.required_amount || 0),
      };
    },

    validatePayload(payload) {
      if (payload.item_evo_id <= 0) {
        return "Evolution id must be greater than 0.";
      }

      if (payload.item_evolve_level <= 0) {
        return "Evolution level must be greater than 0.";
      }

      if (payload.item_id <= 0) {
        return "Item id must be greater than 0.";
      }

      const duplicate = this.details.find((detail) => {
        const sameChain = Number(detail.item_evo_id) === payload.item_evo_id;
        const sameLevel = Number(detail.item_evolve_level) === payload.item_evolve_level;
        const sameRow = Number(detail.id) === Number(this.editingId);
        return sameChain && sameLevel && !sameRow;
      });

      if (duplicate) {
        return "This evolution chain already has an entry for the selected level.";
      }

      return "";
    },

    async saveEntry() {
      this.error = "";
      this.notification = "";

      const payload = this.getPayload();
      const validationError = this.validatePayload(payload);
      if (validationError.length > 0) {
        this.error = validationError;
        return;
      }

      try {
        const api = new ItemsEvolvingDetailApi(...SpireApi.cfg());

        if (this.formMode === "edit" && this.editingId > 0) {
          await api.updateItemsEvolvingDetail({
            id: this.editingId,
            itemsEvolvingDetail: payload,
          });
          this.notification = "Evolution entry updated.";
        } else {
          await api.createItemsEvolvingDetail({
            itemsEvolvingDetail: payload,
          });
          this.notification = "Evolution entry created.";
        }

        await this.loadDetails();
        this.selectedEvoId = payload.item_evo_id;
        this.cancelForm();
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = "Failed to save the evolution entry.";
        }
      }
    },

    async deleteEntry(detail) {
      if (!window.confirm(`Delete evolving entry ${detail.id}?`)) {
        return;
      }

      this.error = "";
      this.notification = "";

      try {
        await (new ItemsEvolvingDetailApi(...SpireApi.cfg())).deleteItemsEvolvingDetail({
          id: Number(detail.id),
        });

        if (Number(detail.id) === this.editingId) {
          this.cancelForm();
        }

        this.notification = "Evolution entry deleted.";
        await this.loadDetails();

        if (!this.details.some((entry) => Number(entry.item_evo_id) === this.selectedEvoId)) {
          this.selectedEvoId = 0;
        }

        this.updateQueryState();
      } catch (err) {
        if (err.response && err.response.data && err.response.data.error) {
          this.error = err.response.data.error;
        } else {
          this.error = "Failed to delete the evolution entry.";
        }
      }
    },
  },
};

function subtypeLabel(detail) {
  return getEvolutionSubtypeLabel(detail);
}
</script>

<style scoped>
.evolving-list-wrap {
  max-height: 72vh;
  overflow-y: auto;
}

.evolving-action-bar {
  border: 1px solid rgba(174, 189, 213, 0.15);
  border-radius: 6px;
  background: rgba(12, 22, 36, 0.3);
}

.evolving-min-search {
  min-width: 240px;
}

.evolving-form-window {
  margin-top: 10px;
}

.evolving-section-header {
  cursor: pointer;
  position: relative;
  padding: 10px 12px 6px;
  min-height: 42px;
}

.evolving-section-header-collapsed {
  padding-top: 1px;
  padding-bottom: 1px;
  min-height: 14px;
}

.evolving-section-toggle {
  min-width: 84px;
}

.evolving-section-spacer {
  min-width: 84px;
}

.evolving-section-title {
  flex: 1;
  text-align: center;
  font-size: 24px;
}

.evolving-open-item-link {
  min-width: 110px;
}

.evolving-inline-item {
  display: inline-flex;
  align-items: center;
}

#evolving-items-table tbody tr {
  cursor: pointer;
  user-select: none;
}

#evolving-items-table tbody tr td,
.evolving-chain-row td,
.evolving-inline-item,
.evolving-open-item-link {
  user-select: none;
}

::v-deep .evolving-inline-item [id$='-popover'],
::v-deep .evolving-inline-item [id$='-popover'] span,
::v-deep .evolving-chain-row [id$='-popover'],
::v-deep .evolving-chain-row [id$='-popover'] span,
::v-deep .evolving-form [id$='-popover'],
::v-deep .evolving-form [id$='-popover'] span {
  cursor: pointer;
}

.evolving-item-search-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  height: 30px;
  margin-top: 0;
  line-height: 1;
  padding-top: 0;
  padding-bottom: 0;
}

.evolving-inline-input-group ::v-deep .form-control {
  margin-top: 0;
  margin-bottom: 0;
  height: 30px;
}

.evolving-inline-input-group ::v-deep .input-group-append .btn {
  margin-top: 0;
  margin-bottom: 0;
  height: 30px;
}

.evolving-section-header-collapsed .evolving-section-title {
  font-size: 18px;
}

.evolving-section-header-collapsed .evolving-section-toggle {
  min-width: 64px;
  padding-top: 1px;
  padding-bottom: 1px;
  font-size: 11px;
  line-height: 1;
}

.evolving-section-header-collapsed .evolving-section-spacer {
  min-width: 64px;
}

.minified-inputs input,
.minified-inputs select {
  margin-top: 3px;
  margin-bottom: 3px;
  height: 30px;
}
</style>
