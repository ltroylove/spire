<template>
  <div
    class='eq-window-simple p-0 mb-0'
    :style="'margin-bottom: 40px; ' + (title ? 'padding-top: 30px' : 'padding-top: 0px !important')"
  >
    <!--      <div class='eq-window-title-bar' v-if="title">{{ title }}</div>-->
    <div :style="'' + (title ? '' : '') ">
      <div class='eq-window-nested-blue text-center p-5' v-if="spells.length === 0">
        No spells were found
      </div>

      <div
        class='spell-table fill-screen'
        style="overflow-y: scroll; overflow-x: hidden;"
        v-if="spells.length > 0"
      >
        <!--        <div class='eq-window-nested-blue' v-if="spells.length > 0" style="overflow-y: scroll;">-->
        <table id="spell-table" class="eq-table bordered eq-highlight-rows">
          <thead class="eq-table-floating-header">
          <tr>
            <th style="width: 200px;"></th>
            <th class="sortable-th" style="width: auto;" @click="setSort('id')">Id <i :class="sortIconClass('id')"/></th>
            <th class="sortable-th" style="width: auto; min-width: 270px" @click="setSort('name')">Spell <i :class="sortIconClass('name')"/></th>
            <th style="width: auto; min-width: 300px">Level</th>
            <th style="width: 400px">Effects</th>
            <th class="sortable-th" @click="setSort('mana')">Mana <i :class="sortIconClass('mana')"/></th>
            <th class="sortable-th" style="width: 80px" @click="setSort('cast_time')">Cast <i :class="sortIconClass('cast_time')"/></th>
            <th class="sortable-th" style="width: 80px" @click="setSort('recast_time')">Recast <i :class="sortIconClass('recast_time')"/></th>
            <th class="sortable-th" style="width: 120px" @click="setSort('buffduration')">Duration <i :class="sortIconClass('buffduration')"/></th>
            <th class="sortable-th" @click="setSort('targettype')">Target <i :class="sortIconClass('targettype')"/></th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(spell, index) in sortedSpells" :key="spell.id">
            <td class="p-0 text-center">

              <b-button
                variant="outline-danger"
                size="sm"
                style="width: 28px; height: 28px"
                class="btn-dark mr-2"
                title="Delete"
                @click="deleteSpell(spell)"
              >
                <i class="fa fa-trash"></i>
              </b-button>

              <b-button
                @click="editSpell(spell.id)"
                style="width: 28px; height: 28px"
                size="sm"
                title="Edit"
                class="btn btn-dark btn-outline-success mr-2"
              >
                <i class="fa fa-pencil-square"></i>
              </b-button>

              <b-button
                @click="editSpell(spell.id, true)"
                style="width: 30px; height: 28px"
                size="sm"
                title="Clone"
                variant="outline-light"
              >
                <i class="ra ra-double-team"></i>

              </b-button>

            </td>
            <td>
              {{ spell.id }}
            </td>
            <td
              class="text-left"
            >
              <spell-popover
                :spell="spell"
                :size="30"
                :spell-name-length="25"
                v-if="Object.keys(spell).length > 0 && spell"
                class="mt-2"
              />
            </td>
            <td class="text-left">
                <span v-for="(icon, index) in dbClassIcons">
                  <div
                    v-if="spell['classes_' + index] > 0 && spell['classes_' + index] < 255"
                    class="d-inline-block mr-2"
                  >
                      <span
                        style="border-radius: 4px"
                        :class="'item-' + icon + '-sm'"
                        :title="dbClassesShort[index]"
                      />
                    {{ dbClassesShort[index] }}
                    ({{ spell["classes_" + index] }})
                    </div>
                </span>
            </td>
            <td style="text-align: left">
              <eq-spell-effects :spell="spell"/>
            </td>

            <td>{{ spell["mana"] > 0 ? spell["mana"] : "" }}</td>
            <td> {{ (spell["cast_time"] / 1000) }} sec</td>
            <td> {{ (spell["recast_time"] / 1000) }} sec</td>
            <td v-if="spell['buffduration']"> {{ humanTime(getBuffDuration(spell) * 6) }} {{ getBuffDuration(spell) }} tic(s)</td>
            <td v-else>N/A</td>
            <td> {{ getTargetTypeName(spell["targettype"]) }}</td>


            <!--              <td style="text-align: left">-->
            <!--                <eq-spell-description :spell="spell"/>-->
            <!--              </td>-->
          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import {Spells}           from "@/app/spells";
import EqWindow           from "@/components/eq-ui/EQWindow.vue";
import EqSpellEffects     from "@/components/preview/EQSpellEffects";
import EqSpellPreview     from "@/components/preview/EQSpellCardPreview.vue";
import {App}              from "@/constants/app";
import EqSpellDescription from "@/components/preview/EQSpellDescription";
import {DB_SPELL_TARGETS} from "@/app/constants/eq-spell-constants";
import {DB_CLASSES_ICONS} from "@/app/constants/eq-class-icon-constants";
import {DB_CLASSES_SHORT} from "@/app/constants/eq-classes-constants";
import {ROUTE}            from "@/routes";
import * as util          from "util";
import SpellPopover       from "@/components/SpellPopover";
import {Items}            from "@/app/items";
import {WindowManager} from "@/app/window";

export default {
  name: "EqSpellPreviewTable",
  components: {
    SpellPopover,
    EqSpellDescription,
    EqSpellEffects,
    EqSpellPreview,
    EqWindow,
  },
  data() {
    return {
      debug: App.DEBUG,
      debugSpellEffects: false,
      title: "",
      dbClassIcons: DB_CLASSES_ICONS,
      dbClassesShort: DB_CLASSES_SHORT,
      sortBy: 'id',
      sortDir: 'asc',
    }
  },
  async created() {
    this.title = "Spells (" + this.spells.length + ")";
  },
  mounted() {
    setTimeout(() => {
      WindowManager.resizeFillScreenElements()
    }, 100);
  },
  props: {
    spells: Array
  },
  computed: {
    sortedSpells() {
      return [...this.spells].sort((a, b) => {
        let cmp = 0
        if (this.sortBy === 'name') {
          cmp = String(a.name || '').localeCompare(String(b.name || ''))
        } else if (this.sortBy === 'mana') {
          cmp = Number(a.mana || 0) - Number(b.mana || 0)
        } else if (this.sortBy === 'cast_time') {
          cmp = Number(a.cast_time || 0) - Number(b.cast_time || 0)
        } else if (this.sortBy === 'recast_time') {
          cmp = Number(a.recast_time || 0) - Number(b.recast_time || 0)
        } else if (this.sortBy === 'buffduration') {
          cmp = Number(a.buffduration || 0) - Number(b.buffduration || 0)
        } else if (this.sortBy === 'targettype') {
          cmp = Number(a.targettype || 0) - Number(b.targettype || 0)
        } else {
          cmp = Number(a.id || 0) - Number(b.id || 0)
        }
        return this.sortDir === 'desc' ? -cmp : cmp
      })
    },
  },
  methods: {
    setSort(col) {
      if (this.sortBy === col) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc'
      } else {
        this.sortBy = col
        this.sortDir = 'asc'
      }
    },
    sortIconClass(col) {
      if (this.sortBy !== col) return 'fa fa-sort sort-icon'
      return this.sortDir === 'asc' ? 'fa fa-sort-asc sort-icon sort-icon--active' : 'fa fa-sort-desc sort-icon sort-icon--active'
    },
    async deleteSpell(spell) {
      if (confirm(`Are you sure you want to permanently delete this spell? [${spell.name}] (${spell.id})`)) {
        await Spells.deleteSpell(spell.id)
        this.$emit("reload-list", true);
      }
    },

    getClasses: function (spell) {
      return Spells.getClasses(spell)
    },
    getTargetTypeColor: function (targetType) {
      return Spells.getTargetTypeColor(targetType)
    },
    getTargetTypeName: function (targetType) {
      return DB_SPELL_TARGETS[targetType] ? DB_SPELL_TARGETS[targetType] : "Unknown Target (" + targetType + ")"
    },
    humanTime: function (sec) {
      let result = ""
      if (sec === 0) {
        result = "";
      } else {
        let h  = Math.floor(sec / 3600);
        let m  = Math.floor((sec - h * 3600) / 60);
        let s  = sec - h * 3600 - m * 60;
        result = (h > 1 ? h + " hours " : "") + (h === 1 ? "1 hour " : "") + (m > 0 ? m + " min " : "") + (s > 0 ? s + " sec" : "");
      }

      return result;
    },
    getBuffDuration: function (spell) {
      return Spells.getBuffDuration(spell)
    },
    editSpell(spellId, clone = false) {
      this.$router.push(
        {
          path: util.format(ROUTE.SPELL_EDIT + (clone ? "?clone" : ""), spellId),
          query: {}
        }
      ).catch(() => {
      })
    }
  }
}
</script>

<style scoped>
.sortable-th {
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}
.sortable-th:hover {
  background: rgba(138, 163, 255, 0.1);
}
.sort-icon {
  opacity: 0.3;
  font-size: 11px;
  margin-left: 2px;
}
.sort-icon--active {
  opacity: 1;
  color: #8aa3ff;
}

/* For Mobile */
@media screen and (max-width: 540px) {
  .spell-table {
    overflow-x: visible;
    overflow-y: scroll !important
  }
}

/* For Tablets */
@media screen and (min-width: 540px) and (max-width: 780px) {
  .spell-table {
    overflow-x: visible;
    overflow-y: scroll !important
  }
}
</style>
