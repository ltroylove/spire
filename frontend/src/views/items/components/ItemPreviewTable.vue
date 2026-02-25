<template>
  <div>
    <div
      class='eq-window-simple text-center mb-0'
      v-if="items.length === 0"
    >
      No items were found
    </div>

    <div
      class='eq-window-simple p-0'
      v-if="items && items.length > 0"
      style="transition: all 1s ease;"
    >
      <div
        class='item-table fill-screen'
        style="overflow-y: scroll; overflow-x: hidden;"
        v-if="items.length > 0"
      >
        <table id="items-table" class="eq-table bordered eq-highlight-rows">
          <thead class="eq-table-floating-header">
          <tr>
            <th style="text-align: center; width: 120px"></th>
            <th class="sortable-th" style="text-align: center; width: 100px" @click="setSort('id')">Id <i :class="sortIconClass('id')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('name')">Name <i :class="sortIconClass('name')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('reqlevel')">ReqLvl <i :class="sortIconClass('reqlevel')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('ac')">AC <i :class="sortIconClass('ac')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('hp')">HP <i :class="sortIconClass('hp')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('mana')">Mana <i :class="sortIconClass('mana')"/></th>
            <th class="sortable-th" style="text-align: center; width: auto;" @click="setSort('endur')">End <i :class="sortIconClass('endur')"/></th>
            <th style="width: auto;">Classes</th>
          </tr>
          </thead>
          <tbody>
          <tr v-for="(item, index) in sortedItems" :key="item.id">
            <td class="p-0 text-center">

              <b-button
                variant="primary"
                size="sm"
                style="width: 28px; height: 28px"
                class="btn-outline-danger mr-2"
                title="Delete"
                @click="deleteItem(item)"
              >
                <i class="fa fa-trash"></i>
              </b-button>

              <router-link
                :to="ROUTE.ITEM_EDIT.replace('%s', item.id)"
                size="sm"
                tag="button"
                style="width: 28px; height: 28px"
                title="Edit"
                class="btn btn-sm btn-outline-success mr-2"
              >
                <i class="fa fa-pencil-square"></i>
              </router-link>

              <router-link
                :to="ROUTE.ITEM_EDIT.replace('%s', item.id) + '?clone=true'"
                size="sm"
                tag="button"
                style="width: 30px; height: 28px"
                title="Clone"
                class="btn btn-sm btn-outline-light mr-2"
              >
                <i class="ra ra-double-team"></i>
              </router-link>

            </td>
            <td>
              {{ item.id }}
            </td>
            <td class="text-left" style="vertical-align: middle">
              <item-popover
                :item="item"
                v-if="Object.keys(item).length > 0 && item"
                size="regular"
              />
            </td>

            <td>{{ item.reqlevel }}</td>
            <td>{{ item.ac }}</td>
            <td>{{ commify(item.hp) }}</td>
            <td>{{ commify(item.mana) }}</td>
            <td>{{ commify(item.endur) }}</td>
            <td class="text-left">{{ getClasses(item) }}</td>

          </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import EqWindow from "@/components/eq-ui/EQWindow.vue";
import {DB_CLASSES_ICONS} from "@/app/constants/eq-class-icon-constants";
import {DB_CLASSES_SHORT, DB_CLASSES_WEAR_SHORT} from "@/app/constants/eq-classes-constants";
import {ROUTE} from "@/routes";
import ItemPopover from "@/components/ItemPopover";
import {Items} from "@/app/items";
import {WindowManager} from "@/app/window";

export default {
  name: "ItemPreviewTable",
  components: {
    ItemPopover,
    EqWindow,
  },
  data() {
    return {
      title: "",
      dbClassIcons: DB_CLASSES_ICONS,
      dbClassesShort: DB_CLASSES_SHORT,
      ROUTE: ROUTE,
      sortBy: 'id',
      sortDir: 'asc',
    }
  },
  mounted() {
    setTimeout(() => {
      WindowManager.resizeFillScreenElements()
    }, 100);
  },
  props: {
    items: Array
  },
  computed: {
    sortedItems() {
      return [...this.items].sort((a, b) => {
        let cmp = 0
        if (this.sortBy === 'name') {
          cmp = String(a.name || '').localeCompare(String(b.name || ''))
        } else if (this.sortBy === 'reqlevel') {
          cmp = Number(a.reqlevel || 0) - Number(b.reqlevel || 0)
        } else if (this.sortBy === 'ac') {
          cmp = Number(a.ac || 0) - Number(b.ac || 0)
        } else if (this.sortBy === 'hp') {
          cmp = Number(a.hp || 0) - Number(b.hp || 0)
        } else if (this.sortBy === 'mana') {
          cmp = Number(a.mana || 0) - Number(b.mana || 0)
        } else if (this.sortBy === 'endur') {
          cmp = Number(a.endur || 0) - Number(b.endur || 0)
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

    async deleteItem(item) {
      if (confirm(`Are you sure you want to permanently delete this item? [${item.name}] (${item.id})`)) {
        await Items.deleteItem(item.id)
        this.$emit("reload-list", true);
      }
    },

    commify(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    },
    getClasses(item) {
      let classes = []
      let classesValue = item.classes
      for (const [key, value] of Object.entries(DB_CLASSES_WEAR_SHORT).reverse()) {
        if (key <= classesValue) {
          classesValue -= key;
          classes.push(value)
        }
      }

      return item.classes >= 65535 ? 'ALL' : classes.join(", ").trim()
    },
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

.item-table td {
  vertical-align: middle;
  text-align: center;
}

/* For Mobile */
@media screen and (max-width: 540px) {
  .item-table {
    overflow-x: visible;
    overflow-y: scroll !important
  }
}

/* For Tablets */
@media screen and (min-width: 540px) and (max-width: 780px) {
  .item-table {
    overflow-x: visible;
    overflow-y: scroll !important
  }
}
</style>
