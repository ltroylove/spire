<template>
  <div>
    <app-loader :is-loading="loading"/>

    <eq-window title="Spire Changelog Authoring" class="p-3" v-if="!loading">
      <div class="row">
        <div class="col-12 col-lg-8">
          <div class="eq-alert mb-3">
            Edit the main-page Spire changelog from the repo checkout. This page reads and writes <code>CHANGELOG.md</code> when a live checkout is available and falls back to read-only embedded content otherwise.
          </div>
        </div>
        <div class="col-12 col-lg-4">
          <div class="eq-window-simple p-3 small">
            <div><strong>Package Version</strong> {{ packageVersion || "-" }}</div>
            <div><strong>Source</strong> {{ source || "-" }}</div>
            <div><strong>Writable</strong> {{ writable ? "Yes" : "No" }}</div>
            <div><strong>Current Top Release</strong> {{ currentTopLabel }}</div>
          </div>
        </div>
      </div>

      <info-error-banner
        class="mt-3"
        :slim="true"
        :notification="notification"
        :error="error"
        @dismiss-error="error = ''"
        @dismiss-notification="notification = ''"
      />

      <div class="alert alert-danger mt-3 mb-0" v-if="documentValidationErrors.length > 0 || editorValidationErrors.length > 0">
        <div class="font-weight-bold mb-2">Validation Issues</div>
        <ul class="mb-0 pl-3">
          <li v-for="issue in combinedValidationErrors" :key="issue">{{ issue }}</li>
        </ul>
      </div>

      <div class="row mt-3">
        <div class="col-12 col-xl-6">
          <eq-window-simple class="p-3 h-100">
            <div class="d-flex flex-wrap align-items-center mb-3">
              <button class="btn btn-sm btn-dark mr-2 mb-2" @click="startNewRelease()">
                <i class="fa fa-plus mr-1"></i> Start New Release
              </button>
              <button class="btn btn-sm btn-primary mr-2 mb-2" @click="generateDraft()" :disabled="!canGenerateDraft">
                <i class="fa fa-magic mr-1"></i> Generate Draft
              </button>
              <button class="btn btn-sm btn-success mb-2" @click="saveRelease()" :disabled="!writable || saving">
                <i class="fa fa-save mr-1"></i> {{ saving ? "Saving..." : "Save CHANGELOG.md" }}
              </button>
            </div>

            <div class="form-group">
              <label class="font-weight-bold">Version</label>
              <input v-model.trim="version" type="text" class="form-control">
            </div>

            <div class="form-group">
              <label class="font-weight-bold">Release Date</label>
              <input v-model.trim="releaseDate" type="text" class="form-control" placeholder="3/25/2026">
            </div>

            <div class="form-group mb-0">
              <label class="font-weight-bold">Release Notes Body</label>
              <b-textarea
                v-model="body"
                rows="18"
                max-rows="24"
                no-resize
              />
            </div>
          </eq-window-simple>
        </div>

        <div class="col-12 col-xl-6 mt-3 mt-xl-0">
          <eq-window-simple class="p-3 h-100">
            <div class="font-weight-bold mb-3">Preview</div>
            <div
              ref="previewRoot"
              class="changelog markdown-body spire-changelog-preview"
              v-html="previewHtml"
            ></div>
          </eq-window-simple>
        </div>
      </div>
    </eq-window>
  </div>
</template>

<script>
import EqWindow from "@/components/eq-ui/EQWindow.vue";
import InfoErrorBanner from "@/components/InfoErrorBanner.vue";
import {SpireApi} from "@/app/api/spire-api";
import {decorateChangelogDom, renderChangelogMarkdown} from "@/app/changelog/changelog-renderer";

function todaysDate() {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
}

export default {
  name: "SpireChangelog",
  components: {
    EqWindow,
    InfoErrorBanner
  },
  data() {
    return {
      loading: false,
      saving: false,
      notification: "",
      error: "",
      version: "",
      releaseDate: "",
      body: "",
      currentContent: "",
      packageVersion: "",
      writable: false,
      source: "",
      currentTopRelease: {},
      documentValidationErrors: [],
      draftStarted: false,
    };
  },
  computed: {
    currentTopLabel() {
      if (this.currentTopRelease && this.currentTopRelease.version) {
        return `${this.currentTopRelease.version} (${this.currentTopRelease.release_date})`;
      }
      return "-";
    },
    canGenerateDraft() {
      return this.writable;
    },
    editorValidationErrors() {
      if (!this.draftStarted && !this.body) {
        return [];
      }

      const issues = [];

      if (!this.version) {
        issues.push("Version is required.");
      }
      if (!this.releaseDate) {
        issues.push("Release date is required.");
      } else if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(this.releaseDate)) {
        issues.push("Release date must use M/D/YYYY format.");
      }
      if (!this.body || !this.body.trim()) {
        issues.push("Release notes body is required.");
      }
      if (this.packageVersion && this.version && this.packageVersion !== this.version) {
        issues.push(`Version [${this.version}] does not match package.json version [${this.packageVersion}].`);
      }
      if (this.version && this.existingVersions.includes(this.version)) {
        issues.push(`Changelog version [${this.version}] already exists.`);
      }

      return issues;
    },
    combinedValidationErrors() {
      return [...this.documentValidationErrors, ...this.editorValidationErrors];
    },
    existingVersions() {
      const matches = this.currentContent.match(/^## \[([^\]]+)\] /gm) || [];
      return matches.map((line) => line.replace(/^## \[([^\]]+)\] .*/, "$1"));
    },
    previewMarkdown() {
      if (!this.version && !this.releaseDate && !this.body) {
        return this.currentContent;
      }

      const section = `## [${this.version || "version"}] ${this.releaseDate || "M/D/YYYY"}\n\n${(this.body || "").trim()}`;
      if (!this.currentContent) {
        return section;
      }

      return `${section}\n\n${this.currentContent}`;
    },
    previewHtml() {
      return renderChangelogMarkdown(this.previewMarkdown);
    }
  },
  watch: {
    previewHtml() {
      this.$nextTick(() => {
        decorateChangelogDom(this.$refs.previewRoot);
      });
    }
  },
  mounted() {
    this.fetchState();
  },
  methods: {
    async fetchState() {
      this.loading = true;
      this.error = "";
      try {
        const response = await SpireApi.v1().get("spirechangelog");
        this.applyState(response.data.data);
      } catch (e) {
        this.error = e.response?.data?.error || "Failed to load Spire changelog state.";
      } finally {
        this.loading = false;
      }
    },
    applyState(state) {
      this.currentContent = state.content || "";
      this.packageVersion = state.package_version || "";
      this.writable = !!state.writable;
      this.source = state.source || "";
      this.currentTopRelease = state.top_release || {};
      this.documentValidationErrors = state.validation_errors || [];
    },
    startNewRelease() {
      this.draftStarted = true;
      this.version = this.packageVersion || this.version;
      this.releaseDate = todaysDate();
      this.body = "";
      this.notification = "Ready to draft a new top release section.";
      this.error = "";
    },
    async generateDraft() {
      this.error = "";
      this.draftStarted = true;
      try {
        if (!this.version) {
          this.version = this.packageVersion || "";
        }
        if (!this.releaseDate) {
          this.releaseDate = todaysDate();
        }

        const response = await SpireApi.v1().post("spirechangelog/draft");
        this.body = response.data.data.body || "";
        this.notification = response.data.data.latest_tag ?
          `Draft generated from commits since ${response.data.data.latest_tag}.` :
          "Draft generated from local git history.";
      } catch (e) {
        this.error = e.response?.data?.error || "Failed to generate changelog draft.";
      }
    },
    async saveRelease() {
      this.draftStarted = true;
      if (this.editorValidationErrors.length > 0) {
        this.error = this.editorValidationErrors[0];
        return;
      }

      this.saving = true;
      this.error = "";
      try {
        const response = await SpireApi.v1().post("spirechangelog/save", {
          version: this.version,
          release_date: this.releaseDate,
          body: this.body
        });

        this.applyState(response.data.data);
        this.notification = response.data.message || "Spire changelog saved successfully.";
        this.draftStarted = false;
        this.version = "";
        this.releaseDate = "";
        this.body = "";
      } catch (e) {
        this.error = e.response?.data?.error || "Failed to save CHANGELOG.md.";
      } finally {
        this.saving = false;
      }
    }
  }
}
</script>

<style scoped>
.spire-changelog-preview {
  min-height: 65vh;
  max-height: 65vh;
  overflow-y: auto;
}
</style>
