<template>
  <div class="row" v-if="mask !== null && typeof mask !== 'undefined'">
    <div
      class="ml-1 mr-3 d-inline-block text-center"
      :style="(centeredButtons ? 'width: 100%' : '')"
    >
      <div v-for="(gClass, classId) in classes" class="d-inline-block">
        <div class="text-center p-0 mr-1 col-lg-12 col-sm-12">
          <span v-if="showTextTop">{{ gClass.short }}</span>
          <div class="text-center">
            <span
              :title="gClass.class"
              @click="selectClass(classId)"
              :style="getClassIconStyle(classId)"
              :class="'hover-highlight-inner item-' + gClass.icon + (iconSmall ? '-sm' : '') + ' ' + (isClassSelected(classId) ? 'highlight-selected-inner' : '')"
            />
          </div>
        </div>
      </div>

      <!-- Select All / None - inline (original behaviour) -->
      <div
        class="d-inline-block"
        v-if="displayAllNone && !allNoneBelow"
        :style="'line-height: 25px; bottom: ' + (centeredButtons ? -10 : 15) + 'px; position: relative;'"
      >
        <div
          :class="'text-center mt-2 btn-xs eq-button-fancy ' + (isAllMask() && !this.isOnlySelectedAndEnabled() ? 'eq-button-fancy-highlighted' : '')"
          @click="selectAll()"
        >
          All
        </div>
        <div
          :class="'text-center mt-2 btn-xs eq-button-fancy ' + (normalizeMask(mask) === noneMaskValue && !this.isOnlySelectedAndEnabled() ? 'eq-button-fancy-highlighted' : '')"
          @click="selectNone()"
        >
          None
        </div>
        <div
          :class="'text-center mt-2 btn-xs eq-button-fancy ' + (this.onlySelected ? 'eq-button-fancy-highlighted' : '')"
          @click="selectOnly()"
          v-if="addOnlyButtonEnabled"
          title="When this is selected, only entries selected will appear in the results"
        >
          Only
        </div>
      </div>

      <!-- Select All / None - below icons -->
      <div
        v-if="displayAllNone && allNoneBelow"
        style="display: block; width: 100%; text-align: center; margin-top: 6px;"
      >
        <div
          class="d-inline-block mr-1"
          :class="'btn-xs eq-button-fancy ' + (isAllMask() && !this.isOnlySelectedAndEnabled() ? 'eq-button-fancy-highlighted' : '')"
          @click="selectAll()"
        >
          All
        </div>
        <div
          class="d-inline-block"
          :class="'btn-xs eq-button-fancy ' + (normalizeMask(mask) === noneMaskValue && !this.isOnlySelectedAndEnabled() ? 'eq-button-fancy-highlighted' : '')"
          @click="selectNone()"
        >
          None
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import {DB_PLAYER_CLASSES_ALL} from "@/app/constants/eq-classes-constants";

export default {
  name: "ClassBitmaskCalculator",
  props: {
    debug: {
      type: Boolean,
      required: false
    },
    mask: {
      type: Number,
      required: false
    },
    displayAllNone: {
      type: Boolean,
      required: false,
      default: true
    },
    centeredButtons: {
      type: Boolean,
      required: false,
      default: true
    },
    showTextTop: {
      type: Boolean,
      required: false,
      default: true
    },
    showTextSide: {
      type: Boolean,
      required: false,
      default: false
    },
    addOnlyButtonEnabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    addOnlyStateEnabled: {
      type: Boolean,
      required: false,
      default: false,
    },
    iconSmall: {
      type: Boolean,
      required: false,
      default: false,
    },
    allNoneBelow: {
      type: Boolean,
      required: false,
      default: false,
    },
    iconScale: {
      type: Number,
      required: false,
      default: 1,
    },
    allMaskValues: {
      type: Array,
      required: false,
      default: () => [65535],
    },
    emitAllMaskValue: {
      type: Number,
      required: false,
      default: 65535,
    },
    noneMaskValue: {
      type: Number,
      required: false,
      default: 0,
    },
  },
  watch: {
    mask: {
      // the callback will be called immediately after the start of the observation
      immediate: true,
      handler(val) {
        this.calculateFromBitmask(val);
      }
    }
  },
  data() {
    return {
      classes: DB_PLAYER_CLASSES_ALL,
      selectedClasses: {},
      onlySelected: false,
    }
  },
  mounted() {
    // queue this since we may not have this available right at mount point
    setTimeout(() => {
      // if we have the only button enabled and we are being passed in that its current state is enabled
      if (this.addOnlyButtonEnabled && this.addOnlyStateEnabled) {
        this.onlySelected = true
      }
    }, 100)
  },
  methods: {
    normalizeMask(mask) {
      const parsedMask = parseInt(mask)

      return Number.isNaN(parsedMask) ? 0 : parsedMask
    },
    getClassIconStyle(classId) {
      const styles = [
        "border-radius: 3px",
        "display: inline-block",
      ]

      if (!this.isClassSelected(classId)) {
        styles.push("opacity: .6")
      }

      if (this.iconScale !== 1) {
        styles.push(`transform: scale(${this.iconScale})`)
        styles.push("transform-origin: center center")
        styles.push("margin: 6px")
      }

      return styles.join("; ")
    },
    isOnlySelectedAndEnabled() {
      return this.addOnlyButtonEnabled && this.onlySelected
    },
    isAllMask(mask = this.mask) {
      const normalizedMask = this.normalizeMask(mask)

      return this.allMaskValues.includes(normalizedMask)
    },
    allClassesSelected() {
      return Object.keys(this.classes).every((classId) => this.selectedClasses[classId])
    },
    noClassesSelected() {
      return Object.keys(this.classes).every((classId) => !this.selectedClasses[classId])
    },
    selectOnly() {
      this.selectNone()
      console.log("selecting only")
      this.onlySelected = true
    },

    selectAll() {
      this.onlySelected = false
      Object.keys(this.classes).reverse().forEach((classId) => {
        this.selectedClasses[classId] = true;
      });
      this.$forceUpdate();
      this.calculateToBitmask();
    },
    selectNone() {
      this.onlySelected = false
      Object.keys(this.classes).reverse().forEach((classId) => {
        this.selectedClasses[classId] = false;
      });
      this.$forceUpdate();
      this.calculateToBitmask();
    },
    calculateFromBitmask(mask = this.mask) {
      const normalizedMask = this.normalizeMask(mask)

      if (this.isAllMask(normalizedMask)) {
        Object.keys(this.classes).reverse().forEach((classId) => {
          this.selectedClasses[classId] = true
        });
        this.$forceUpdate()
        return
      }

      if (normalizedMask === this.noneMaskValue) {
        Object.keys(this.classes).reverse().forEach((classId) => {
          this.selectedClasses[classId] = false
        });
        this.$forceUpdate()
        return
      }

      let remainingMask = normalizedMask

      Object.keys(this.classes).reverse().forEach((classId) => {
        const gameClass               = this.classes[classId];
        this.selectedClasses[classId] = false
        if (remainingMask >= gameClass.mask) {
          remainingMask -= gameClass.mask;
          this.selectedClasses[classId] = true;
        }
      });
      this.$forceUpdate()
    },
    calculateToBitmask() {
      let bitmask = 0;

      Object.keys(this.classes).reverse().forEach((classId) => {
        const gameClass = this.classes[classId];
        if (this.selectedClasses[classId]) {
          bitmask += parseInt(gameClass.mask);
        }
      });

      if (this.allClassesSelected()) {
        bitmask = this.emitAllMaskValue
      }

      if (this.noClassesSelected()) {
        bitmask = this.noneMaskValue
      }

      this.$emit("update:inputData", parseInt(bitmask));
      this.$emit("selectOnly", this.onlySelected);
      this.$emit("input", parseInt(bitmask));
      this.$emit("fired", "true");
    },
    selectClass: function (classId) {

      // if the only button is enabled, we need to unselect all other classes before
      // selecting a class
      if (this.isOnlySelectedAndEnabled()) {
        Object.keys(this.classes).forEach((classId) => {
          this.selectedClasses[classId] = false
        });
      }

      this.selectedClasses[classId] = !this.selectedClasses[classId];

      this.$forceUpdate()
      this.calculateToBitmask();
    },
    isClassSelected: function (classId) {
      return this.selectedClasses[classId]
    },
  }
}
</script>

<style scoped>

</style>
