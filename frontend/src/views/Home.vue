<template>
  <eq-window
    title="Spire Changelog"
    class="p-0 m-0 mt-3"
    style="padding-left: 15px !important; padding-right: 15px !important;"
  >
    <div style="min-height: 100vh">

      <div class="row" id="changelog">
        <div class="col-12">
          <div
            ref="changelogRoot"
            class="changelog markdown-body"
            v-html="changelog"
          ></div>
        </div>
      </div>

    </div>
  </eq-window>
</template>

<script>

import EqWindow        from "@/components/eq-ui/EQWindow";
import UserContext     from "@/app/user/UserContext";
import {SpireApi}      from "../app/api/spire-api";
import VideoViewer     from "../app/video-viewer/video-viewer";
import LazyImageLoader from "@/app/lazy-image-load/lazy-image-load";
import {decorateChangelogDom, renderChangelogMarkdown} from "@/app/changelog/changelog-renderer";

export default {
  components: {
    EqWindow
  },
  data() {
    return {
      userContext: null,
      changelog: "",
    }
  },
  async mounted() {
    this.userContext = await (UserContext.getUser())

    SpireApi.v1().get(`/app/changelog`).then((response) => {
      if (response.data && response.data.data) {
        this.changelog = renderChangelogMarkdown(response.data.data)

        setTimeout(() => {
          decorateChangelogDom(this.$refs.changelogRoot);
        }, 100)

      }
    })

    LazyImageLoader.addScrollListener()

    // auto play videos that are in the viewport
    window.addEventListener("scroll", this.handleRender);
    setTimeout(() => {
      this.handleRender()
      LazyImageLoader.handleRender()
    }, 500)
  },
  methods: {
    handleRender() {
      let videos = document.getElementsByClassName("video");
      for (let i = 0; i < videos.length; i++) {
        let video = videos.item(i)
        if (VideoViewer.elementInViewport(video) && !video.src.includes("autoplay")) {
          video.src = video.src + "&autoplay=1"
        }
      }
    }
  },
  deactivated() {
    window.removeEventListener("scroll", this.handleRender, false)
    LazyImageLoader.destroyScrollListener()
  }
}
</script>

<style>


</style>
