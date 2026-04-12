<template>
  <div class="loader-fake-progress">
    <eq-progress-bar :percent="progress"/>
    <div class="loader-fake-progress-frame"/>
  </div>
</template>

<script>
import EqProgressBar from "./eq-ui/EQProgressBar";

export default {
  name: 'loader-fake-progress',
  data() {
    return {
      progress: 0,
      internalProgress: 0,
      interval: null,
    }
  },
  components: { EqProgressBar },
  props: {
    intervalMs: {
      type: Number,
      required: false,
      default: 10
    },
  },
  mounted() {
    this.interval = setInterval(this.incrementLoader, this.intervalMs)
  },
  beforeDestroy() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  },
  methods: {
    incrementLoader() {
      let progress = this.internalProgress

      if (progress < 25) {
        progress += .5;
      } else if (progress < 50) {
        progress += .1;
      } else if (progress < 75) {
        progress += .05;
      } else if (progress < 85) {
        progress += .025;
      } else if (progress < 100) {
        progress += .01;
      }

      if (progress > 100) {
        clearInterval(this.interval)
      }

      this.internalProgress = progress;
      this.progress         = Math.round(progress)
    }
  }
}
</script>

<style scoped>
.loader-fake-progress {
  position: relative;
}

.loader-fake-progress-frame {
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

.loader-fake-progress ::v-deep .eq-progress-bar > div::before {
  display: none;
}
</style>
