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
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong>Package Version</strong>
              <span class="badge badge-secondary">{{ packageVersion || "-" }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>Release Repo</strong>
                <i
                  class="fa fa-question-circle text-muted ml-1"
                  v-b-tooltip.hover.v-dark.top
                  title="This is the GitHub repository used for release publishing and updater checks."
                ></i>
              </div>
              <span class="badge badge-dark">{{ releaseRepository || "-" }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <strong>Source</strong>
                <i
                  class="fa fa-question-circle text-muted ml-1"
                  v-b-tooltip.hover.v-dark.top
                  title="Live means the repo checkout file is being edited directly. Embedded means the page is read-only and showing the baked-in changelog."
                ></i>
              </div>
              <span :class="sourceBadgeClass">{{ source || "-" }}</span>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <strong>Writable</strong>
              <span :class="writableBadgeClass">{{ writable ? "Yes" : "No" }}</span>
            </div>
            <div><strong>Current Top Release</strong> {{ currentTopLabel }}</div>
            <div class="small text-muted mt-2" v-if="!writable">
              This environment is read-only. Use a local or dev checkout to bump versions and save release notes.
            </div>
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

      <div class="eq-window-simple p-3 mt-3">
        <div class="font-weight-bold mb-2">Release Flow</div>
        <div class="row">
          <div class="col-12 col-md-6 col-xl-3 mb-2 mb-xl-0" v-for="step in workflowSteps" :key="step.title">
            <div class="workflow-step" :class="step.complete ? 'workflow-step-complete' : 'workflow-step-pending'">
              <div class="workflow-step-number">{{ step.number }}</div>
              <div>
                <div class="font-weight-bold">{{ step.title }}</div>
                <div class="small text-muted">{{ step.description }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="alert alert-danger mt-3 mb-0" v-if="documentValidationErrors.length > 0 || editorValidationErrors.length > 0">
        <div class="font-weight-bold mb-2">Validation Issues</div>
        <ul class="mb-0 pl-3">
          <li v-for="issue in combinedValidationErrors" :key="issue">{{ issue }}</li>
        </ul>
      </div>

      <div class="row mt-3">
        <div class="col-12 col-xl-6">
          <eq-window-simple class="p-3 h-100">
            <div class="font-weight-bold mb-2">Step 1: Choose The Release Version</div>
            <div class="small text-muted mb-3">
              Start with a patch, minor, or major bump, or type your own semantic version and apply it.
            </div>
            <div class="d-flex flex-wrap align-items-center mb-2">
              <button
                class="btn btn-sm btn-dark mr-2 mb-2"
                @click="prepareVersionBump('patch')"
                :disabled="!writable || versionActionPending"
                v-b-tooltip.hover.v-dark.top
                :title="patchTooltip"
              >
                <i class="fa fa-level-up mr-1"></i> Patch Release
              </button>
              <button
                class="btn btn-sm btn-dark mr-2 mb-2"
                @click="prepareVersionBump('minor')"
                :disabled="!writable || versionActionPending"
                v-b-tooltip.hover.v-dark.top
                :title="minorTooltip"
              >
                <i class="fa fa-level-up mr-1"></i> Minor Release
              </button>
              <button
                class="btn btn-sm btn-dark mr-2 mb-2"
                @click="prepareVersionBump('major')"
                :disabled="!writable || versionActionPending"
                v-b-tooltip.hover.v-dark.top
                :title="majorTooltip"
              >
                <i class="fa fa-level-up mr-1"></i> Major Release
              </button>
              <button
                class="btn btn-sm btn-secondary mr-2 mb-2"
                @click="startNewRelease()"
                :disabled="!writable || versionActionPending"
                v-b-tooltip.hover.v-dark.top
                title="Draft a release using the current package.json version without bumping it."
              >
                <i class="fa fa-plus mr-1"></i> Use Current Version
              </button>
              <button
                class="btn btn-sm btn-outline-light mb-2"
                @click="applyVersion()"
                :disabled="!writable || versionActionPending || !version"
                v-b-tooltip.hover.v-dark.top
                title="Write the version field into package.json so the release pipeline and updater checks point at the same version."
              >
                <i class="fa fa-tag mr-1"></i> {{ versionActionPending ? "Applying..." : "Apply Version" }}
              </button>
            </div>

            <div class="form-group">
              <label class="font-weight-bold">
                Version
                <i
                  class="fa fa-question-circle text-muted ml-1"
                  v-b-tooltip.hover.v-dark.right
                  title="Use semantic versions like 4.23.6. Saving will also sync package.json to this version."
                ></i>
              </label>
              <input v-model.trim="version" type="text" class="form-control">
              <small class="form-text text-muted">
                {{ versionStatusText }}
              </small>
            </div>

            <div class="form-group">
              <label class="font-weight-bold">
                Release Date
                <i
                  class="fa fa-question-circle text-muted ml-1"
                  v-b-tooltip.hover.v-dark.right
                  title="Shown in the top changelog heading. Use M/D/YYYY, for example 3/25/2026."
                ></i>
              </label>
              <input v-model.trim="releaseDate" type="text" class="form-control" placeholder="3/25/2026">
              <small class="form-text text-muted">
                This date is used in both the main-page changelog heading and the GitHub release payload.
              </small>
            </div>

            <div class="font-weight-bold mb-2">Step 2: Generate Or Edit The Draft</div>
            <div class="small text-muted mb-3">
              Generate starter bullets from recent Spire commits, then edit them into the release notes you want users to read.
            </div>

            <div class="d-flex flex-wrap align-items-center mb-3">
              <button
                class="btn btn-sm btn-primary mr-2 mb-2"
                @click="generateDraft()"
                :disabled="!canGenerateDraft"
                v-b-tooltip.hover.v-dark.top
                title="Build starter release bullets from local git history since the latest v* tag."
              >
                <i class="fa fa-magic mr-1"></i> Generate Draft
              </button>
              <span class="small text-muted mb-2">
                {{ draftHelperText }}
              </span>
            </div>

            <div class="form-group mb-3">
              <label class="font-weight-bold">
                Release Notes Body
                <i
                  class="fa fa-question-circle text-muted ml-1"
                  v-b-tooltip.hover.v-dark.right
                  title="This body becomes the top CHANGELOG.md section and the GitHub release notes shown in the app updater modal after publish."
                ></i>
              </label>
              <b-textarea
                v-model="body"
                rows="18"
                max-rows="24"
                no-resize
              />
              <small class="form-text text-muted">
                Keep the bullets user-facing. The right side previews both the homepage markdown rendering and the GitHub release payload.
              </small>
            </div>

            <div class="font-weight-bold mb-2">Step 3: Review And Save</div>
            <div class="small text-muted mb-3">
              Confirm the updater release payload and homepage preview on the right, then write the new top section into <code>CHANGELOG.md</code>.
            </div>

            <div class="d-flex flex-wrap align-items-center">
              <button
                class="btn btn-sm btn-success mb-2 mr-2"
                @click="saveRelease()"
                :disabled="!writable || saving || versionActionPending"
                v-b-tooltip.hover.v-dark.top
                title="Prepends the new top release section to CHANGELOG.md and keeps package.json aligned."
              >
                <i class="fa fa-save mr-1"></i> {{ saving ? "Saving..." : "Save CHANGELOG.md" }}
              </button>
              <span class="small text-muted mb-2">{{ saveHelperText }}</span>
            </div>
          </eq-window-simple>
        </div>

        <div class="col-12 col-xl-6 mt-3 mt-xl-0">
          <eq-window-simple class="p-3 mb-3">
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
              <div>
                <div class="font-weight-bold">GitHub Release Payload</div>
                <div class="small text-muted">This is the tag, title, and body that will be published to the configured release repo.</div>
              </div>
              <button
                class="btn btn-sm btn-outline-light mt-2 mt-md-0"
                @click="copyReleaseBody()"
                :disabled="!releasePayloadPreview.body"
                v-b-tooltip.hover.v-dark.left
                title="Copy the GitHub release body to the clipboard."
              >
                <i class="fa fa-clipboard mr-1"></i> Copy Body
              </button>
            </div>
            <div class="small mb-2 d-flex align-items-center justify-content-between">
              <div><strong>Tag</strong> {{ releasePayloadPreview.tag_name || "-" }}</div>
              <button
                class="btn btn-sm btn-dark py-0 px-2"
                @click="copyToClipboard(releasePayloadPreview.tag_name, 'Copied release tag to clipboard!')"
                :disabled="!releasePayloadPreview.tag_name"
              >
                <i class="fa fa-clipboard"></i>
              </button>
            </div>
            <div class="small mb-3 d-flex align-items-center justify-content-between">
              <div><strong>Title</strong> {{ releasePayloadPreview.title || "-" }}</div>
              <button
                class="btn btn-sm btn-dark py-0 px-2"
                @click="copyToClipboard(releasePayloadPreview.title, 'Copied release title to clipboard!')"
                :disabled="!releasePayloadPreview.title"
              >
                <i class="fa fa-clipboard"></i>
              </button>
            </div>
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
            <div class="font-weight-bold mb-1">Homepage Preview</div>
            <div class="small text-muted mb-3">This uses the same markdown rendering logic as the Spire main page changelog window.</div>
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
import Clipboard from "@/app/clipboard/clipboard";
import {decorateChangelogDom, renderChangelogMarkdown} from "@/app/changelog/changelog-renderer";
import {Notify} from "@/app/Notify";

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
      releaseRepository: "",
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
    sourceBadgeClass() {
      return this.source === "live" ? "badge badge-success" : "badge badge-secondary";
    },
    writableBadgeClass() {
      return this.writable ? "badge badge-success" : "badge badge-warning";
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
    },
    versionStatusText() {
      if (!this.version) {
        return "Choose a semantic version. Saving will keep package.json and CHANGELOG.md aligned.";
      }
      if (this.packageVersion === this.version) {
        return `Version is in sync with package.json (${this.packageVersion}).`;
      }
      return `Version differs from package.json (${this.packageVersion || "unset"}). Saving will sync package.json first.`;
    },
    patchTooltip() {
      return this.nextVersion("patch") ? `Bump ${this.packageVersion} to ${this.nextVersion("patch")}.` : "Current package version could not be parsed.";
    },
    minorTooltip() {
      return this.nextVersion("minor") ? `Bump ${this.packageVersion} to ${this.nextVersion("minor")}.` : "Current package version could not be parsed.";
    },
    majorTooltip() {
      return this.nextVersion("major") ? `Bump ${this.packageVersion} to ${this.nextVersion("major")}.` : "Current package version could not be parsed.";
    },
    hasDraftBody() {
      return !!(this.body && this.body.trim());
    },
    isReadyToSave() {
      return this.editorValidationErrors.length === 0 && this.hasDraftBody;
    },
    saveHelperText() {
      if (!this.writable) {
        return "Saving is disabled in embedded/read-only environments.";
      }
      if (this.editorValidationErrors.length > 0) {
        return "Resolve the validation issues above before saving.";
      }
      if (!this.hasDraftBody) {
        return "Add release notes or generate a draft before saving.";
      }
      return "Ready to save. This will update CHANGELOG.md and keep the release version in sync.";
    },
    draftHelperText() {
      if (!this.writable) {
        return "Draft generation only runs in a live repo checkout.";
      }
      return "Drafts are built from local git history since the latest tagged release.";
    },
    workflowSteps() {
      return [
        {
          number: "1",
          title: "Pick Version",
          description: this.version ? `Release version ${this.version} selected.` : "Choose a patch, minor, major, or custom version.",
          complete: !!this.version
        },
        {
          number: "2",
          title: "Draft Notes",
          description: this.hasDraftBody ? "Release notes body is ready to review." : "Generate a draft or write the notes manually.",
          complete: this.hasDraftBody
        },
        {
          number: "3",
          title: "Review Payload",
          description: this.releasePayloadPreview.tag_name ? `GitHub payload will publish as ${this.releasePayloadPreview.tag_name}.` : "Review the publish payload on the right.",
          complete: !!this.releasePayloadPreview.tag_name
        },
        {
          number: "4",
          title: "Save Changelog",
          description: this.isReadyToSave ? "Everything is ready to be written to CHANGELOG.md." : "Save becomes available once the draft is valid.",
          complete: this.isReadyToSave
        }
      ];
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
      this.releaseRepository = state.release_repository || "";
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
    copyToClipboard(value, message = "Copied to clipboard!") {
      if (!value) {
        return;
      }

      Clipboard.copyFromText(value);
      Notify.toast(message);
    },
    copyReleaseBody() {
      this.copyToClipboard(this.releasePayloadPreview.body, "Copied release body to clipboard!");
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

.workflow-step {
  display: flex;
  align-items: flex-start;
  min-height: 84px;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.18);
}

.workflow-step-complete {
  border-color: rgba(40, 167, 69, 0.55);
}

.workflow-step-pending {
  border-color: rgba(255, 255, 255, 0.08);
}

.workflow-step-number {
  min-width: 28px;
  height: 28px;
  margin-right: 0.75rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  background: rgba(255, 255, 255, 0.12);
}
</style>
