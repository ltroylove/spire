<template>
  <div class="cast-bar-outer" :style="(timeMs === 0 ? 'opacity: .5' : '')">
    <eq-progress-bar
      :percent="progress"
      :show-percent="false"
      :color="color"
    />
    <!-- Stationary full-width frame — progress_bar_top.png always spans the full bar -->
    <div class="cast-bar-frame"/>
  </div>
</template>

<script>
import EqProgressBar       from "./eq-ui/EQProgressBar";
import {EditFormFieldUtil} from "../app/forms/edit-form-field-util";

const TIME_INCREMENT_MS = 50

export default {
  name: 'loader-cast-bar-timer',
  data() {
    return {
      progress: 0,
      internalProgress: 0,
      internalTimeRemaining: 0,
      interval: null,
    }
  },
  props: {
    timeMs: {
      type: Number,
      required: false,
      default: 1000
    },
    color: {
      type: String,
      required: false,
      default: 'yellow'
    }
  },
  components: { EqProgressBar },
  watch: {
    'timeMs'() {
      this.progress = 0
      this.internalProgress = 0
      this.internalTimeRemaining = 0
    }
  },
  mounted() {
    this.interval              = setInterval(this.incrementLoader, TIME_INCREMENT_MS)
    this.internalTimeRemaining = parseInt(this.timeMs)
  },
  beforeDestroy() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  },
  methods: {
    calculateProgress() {
      this.internalProgress = parseInt((this.internalTimeRemaining / this.timeMs) * 100)
      this.progress         = Math.round(this.internalProgress)
    },

    incrementLoader() {
      if (this.timeMs === 0) {
        this.internalProgress = 0
        this.progress = 0
        return;
      }

      this.internalTimeRemaining = parseInt(this.internalTimeRemaining - TIME_INCREMENT_MS)

      if (this.internalTimeRemaining <= 0) {
        clearInterval(this.interval)

        // When we hit 0, pause briefly
        setTimeout(() => {
          this.internalTimeRemaining = this.timeMs
          this.calculateProgress()

          // pause for a split second when we've reset to 100%
          setTimeout(() => {
            this.interval = setInterval(this.incrementLoader, TIME_INCREMENT_MS)
          }, 500)
        }, 500)
      }

      this.calculateProgress()

      // console.log(progress)
    }
  }
}
</script>

<style scoped>
.cast-bar-outer {
  position: relative;
}

/* Full-width stationary frame overlay (progress_bar_top.png) */
.cast-bar-frame {
  position: absolute;
  top: -2px;
  left: -4px;
  width: calc(100% + 8px);
  height: 10px;
  background-image: url('./eq-ui/images/progress_bar_top.png');
  background-size: 100% 100%;
  pointer-events: none;
  z-index: 2;
}

/* Suppress the fill div's moving overlay — replaced by the stationary frame above */
.cast-bar-outer ::v-deep .eq-progress-bar > div::before {
  display: none;
}
</style>
