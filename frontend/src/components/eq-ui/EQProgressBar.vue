<template>
    <div class='eq-progress-bar'>
        <div :style=' {width: percent + "%", "background-color": color }'>
            <span v-if="percent > 0 && showPercent" style="text-shadow: -2px 2px 3px #000;">{{percent}}%</span>
        </div>
    </div>
</template>

<script>
  export default {
    name: 'EqProgressBar',
    props: {
      title: {
        type: String,
        required: false,
        default: 'Window Title'
      },
      percent: {
        type: Number,
        required: false,
        default: 0
      },
      color: {
        type: String,
        required: false,
        default: 'yellow'
      },
      showPercent: {
        type: Boolean,
        required: false,
        default: true
      }
    }
  }
</script>

<style scoped>
.eq-progress-bar {
  position: relative;
  width: 100%;
  height: 14px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 2px;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.3);
}

.eq-progress-bar > div {
  height: 100%;
  transition: width 0.05s linear;
}
</style>
