<template>
  <div>
    <app-loader :is-loading="loading"/>

    <eq-window title="Spire Changelog Authoring" class="p-3" v-if="!loading">
      <div class="row">
        <div class="col-12 col-lg-8">
          <div class="eq-alert mb-3">
            Manage the main-page Spire changelog from the repo checkout. This page can bump <code>package.json</code>, draft a new top release section, preview the rendered markdown, and save <code>CHANGELOG.md</code> when a live checkout is available. Embedded environments stay read-only.
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
              <button class="btn btn-sm btn-dark mr-2 mb-2" @click="prepareVersionBump('patch')" :disabled="!writable || versionActionPending">
                <i class="fa fa-level-up mr-1"></i> Patch Release
              </button>
              <button class="btn btn-sm btn-dark mr-2 mb-2" @click="prepareVersionBump('minor')" :disabled="!writable || versionActionPending">
                <i class="fa fa-level-up mr-1"></i> Minor Release
              </button>
              <button class="btn btn-sm btn-dark mr-2 mb-2" @click="prepareVersionBump('major')" :disabled="!writable || versionActionPending">
                <i class="fa fa-level-up mr-1"></i> Major Release
              </button>
              <button class="btn btn-sm btn-secondary mr-2 mb-2" @click="startNewRelease()" :disabled="versionActionPending">
                <i class="fa fa-plus mr-1"></i> Use Current Version
              </button>
              <button class="btn btn-sm btn-outline-light mr-2 mb-2" @click="applyVersion()" :disabled="!writable || versionActionPending || !version">
                <i class="fa fa-tag mr-1"></i> {{ versionActionPending ? "Applying..." : "Apply Version" }}
              </button>
              <button class="btn btn-sm btn-primary mr-2 mb-2" @click="generateDraft()" :disabled="!canGenerateDraft">
                <i class="fa fa-magic mr-1"></i> Generate Draft
              </button>
              <button class="btn btn-sm btn-success mb-2" @click="saveRelease()" :disabled="!writable || saving || versionActionPending">
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
          <eq-window-simple class="p-3 mb-3">
            <div class="font-weight-bold mb-3">GitHub Release Payload</div>
            <div class="small mb-2"><strong>Tag</strong> {{ releasePayloadPreview.tag_name || "-" }}</div>
            <div class="small mb-3"><strong>Title</strong> {{ releasePayloadPreview.title || "-" }}</div>
            <div class="form-group mb-0">
              <label class="font-weight-bold small">Release Body</label>
              <b-textarea
                :value="releasePayloadPreview.body || ''"
                rows="10"
                max-rows="16"
                no-resize
                readonly
              />
            </div>
          </eq-window-simple>

          <eq-window-simple class="p-3">
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
      versionActionPending: false,
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
      currentReleasePayload: {},
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
      return this.writable && !this.versionActionPending;
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
    },
    releasePayloadPreview() {
      const version = (this.version || "").trim();
      const releaseDate = (this.releaseDate || "").trim();
      const body = (this.body || "").trim();

      if (!version && !releaseDate && !body) {
        return this.currentReleasePayload || {};
      }

      const fallbackVersion = this.currentTopRelease && this.currentTopRelease.version ? this.currentTopRelease.version : "";
      const fallbackDate = this.currentTopRelease && this.currentTopRelease.release_date ? this.currentTopRelease.release_date : "";
      const fallbackBody = this.currentTopRelease && this.currentTopRelease.body ? this.currentTopRelease.body : "";

      return this.buildReleasePayload(
        version || this.packageVersion || fallbackVersion,
        releaseDate || fallbackDate,
        body || fallbackBody
      );
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
      this.currentReleasePayload = state.release_payload || {};
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
    nextVersion(kind) {
      const parsed = this.parseVersion(this.packageVersion);
      if (!parsed) {
        return "";
      }

      const next = {...parsed};
      if (kind === "patch") {
        next.patch += 1;
      }
      if (kind === "minor") {
        next.minor += 1;
        next.patch = 0;
      }
      if (kind === "major") {
        next.major += 1;
        next.minor = 0;
        next.patch = 0;
      }

      return `${next.major}.${next.minor}.${next.patch}`;
    },
    parseVersion(version) {
      const match = (version || "").trim().match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
      if (!match) {
        return null;
      }

      return {
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
      };
    },
    buildReleasePayload(version, releaseDate, body) {
      const cleanVersion = (version || "").trim();
      if (!cleanVersion) {
        return {};
      }

      const cleanDate = (releaseDate || "").trim();
      const cleanBody = (body || "").trim();

      return {
        version: cleanVersion,
        tag_name: `v${cleanVersion}`,
        title: `Spire v${cleanVersion}`,
        release_date: cleanDate,
        body: `## [${cleanVersion}] ${cleanDate || "M/D/YYYY"}\n\n${cleanBody}`.trim()
      };
    },
    async prepareVersionBump(kind) {
      const nextVersion = this.nextVersion(kind);
      if (!nextVersion) {
        this.error = "Current package version could not be parsed for automatic bumping.";
        return;
      }

      this.version = nextVersion;
      await this.applyVersion({
        versionOverride: nextVersion,
        notification: `package.json bumped to ${nextVersion}. Ready to draft a new release.`,
        resetBody: true
      });
    },
    async applyVersion(options = {}) {
      const version = (options.versionOverride || this.version || "").trim();
      if (!version) {
        this.error = "Version is required.";
        return false;
      }

      this.versionActionPending = true;
      this.error = "";

      try {
        const response = await SpireApi.v1().post("spirechangelog/version", {
          version
        });

        this.applyState(response.data.data);
        this.draftStarted = true;
        this.version = version;
        this.releaseDate = this.releaseDate || todaysDate();
        if (options.resetBody) {
          this.body = "";
        }
        this.notification = options.notification || `package.json updated to ${version}.`;
        return true;
      } catch (e) {
        this.error = e.response?.data?.error || "Failed to update package.json version.";
        return false;
      } finally {
        this.versionActionPending = false;
      }
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

      if (this.packageVersion && this.version && this.packageVersion !== this.version) {
        const synced = await this.applyVersion({
          versionOverride: this.version,
          notification: `package.json updated to ${this.version}.`
        });
        if (!synced) {
          return;
        }
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
