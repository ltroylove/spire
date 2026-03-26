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
            <div class="small text-muted mb-2">
              Source: {{ releaseRepositorySourceLabel }}
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

      <div
        class="eq-window-simple p-3 mt-3 guided-callout"
        :class="nextActionFocus === 'status' ? 'guided-callout-active' : ''"
      >
        <div class="d-flex flex-wrap align-items-start justify-content-between">
          <div class="mr-3">
            <div class="d-flex align-items-center mb-1">
              <span class="badge badge-warning mr-2">Do This Next</span>
              <span class="small text-muted">Step {{ nextActionStepLabel }}</span>
            </div>
            <div class="font-weight-bold">{{ nextActionTitle }}</div>
            <div class="small text-muted mt-1">{{ nextActionMessage }}</div>
            <ul class="small text-muted mt-2 mb-0 pl-3" v-if="nextActionChecklist.length > 0">
              <li v-for="item in nextActionChecklist" :key="item">{{ item }}</li>
            </ul>
          </div>
          <div class="small text-muted mt-2 mt-md-0">
            {{ nextActionContext }}
          </div>
        </div>
      </div>

      <div class="eq-window-simple p-3 mt-3">
        <div class="font-weight-bold mb-2">Release Flow</div>
        <div class="row">
          <div class="col-12 col-md-6 col-xl-3 mb-2 mb-xl-0" v-for="step in workflowSteps" :key="step.title">
            <div class="workflow-step" :class="workflowStepClass(step)">
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
            <div class="guided-section mb-3" :class="sectionStateClass('version')">
              <div class="font-weight-bold mb-2 d-flex align-items-center justify-content-between">
                <span>Step 1: Choose The Release Target And Version</span>
                <span class="small guided-step-indicator" :class="stepIndicatorClass(1)">{{ stepIndicatorLabel(1) }}</span>
              </div>
              <div class="small text-muted mb-3">
                Confirm which GitHub repository this release should publish to, then pick the version you want to ship.
              </div>
              <div class="d-flex flex-wrap align-items-center mb-2 action-row" :class="actionRowClass('repository')">
                <button
                  class="btn btn-sm btn-dark mr-2 mb-2"
                  :class="buttonHighlightClass('repository')"
                  @click="releaseRepositoryDraft = releaseRepository || releaseRepositoryDraft"
                  :disabled="!writable || repositoryActionPending || !releaseRepository"
                  v-b-tooltip.hover.v-dark.top
                  title="Copy the currently active release repo into the editable field below."
                >
                  <i class="fa fa-crosshairs mr-1"></i> Use Active Repo
                </button>
                <button
                  class="btn btn-sm btn-secondary mr-2 mb-2"
                  :class="buttonHighlightClass('repository')"
                  @click="releaseRepositoryDraft = configuredReleaseRepository || releaseRepositoryDraft"
                  :disabled="!writable || repositoryActionPending || !configuredReleaseRepository"
                  v-b-tooltip.hover.v-dark.top
                  title="Restore the repo currently saved in package.json."
                >
                  <i class="fa fa-history mr-1"></i> Use Saved Repo
                </button>
                <button
                  class="btn btn-sm btn-outline-light mb-2"
                  :class="buttonHighlightClass('repository')"
                  @click="applyReleaseRepository()"
                  :disabled="!canApplyReleaseRepository"
                  v-b-tooltip.hover.v-dark.top
                  title="Save the selected GitHub repository into package.json so release publishing and updater checks use the same target."
                >
                  <i class="fa fa-github mr-1"></i> {{ repositoryActionPending ? "Applying..." : "Apply Release Repo" }}
                </button>
              </div>

              <div class="form-group" :class="fieldHighlightClass('repository')">
                <label class="font-weight-bold">
                  Release Repository
                  <i
                    class="fa fa-question-circle text-muted ml-1"
                    v-b-tooltip.hover.v-dark.right
                    title="Use owner/repo format like EQEmuTools/spire or paste a GitHub repository URL. This controls where releases are published and what repo the updater checks."
                  ></i>
                </label>
                <input
                  v-model.trim="releaseRepositoryDraft"
                  type="text"
                  class="form-control"
                  list="release-repository-candidates"
                  placeholder="EQEmuTools/spire"
                >
                <datalist id="release-repository-candidates">
                  <option v-for="candidate in releaseRepositoryCandidates" :key="candidate" :value="candidate"></option>
                </datalist>
                <small class="form-text text-muted">
                  {{ repositoryStatusText }}
                </small>
                <small class="form-text text-warning" v-if="releaseRepositoryOverride">
                  Environment override active: <code>SPIRE_RELEASE_REPO={{ releaseRepositoryOverride }}</code>. Changing package.json updates the saved default, but the active repo stays overridden until that env var is removed.
                </small>
              </div>

              <div class="d-flex flex-wrap align-items-center mb-2 action-row" :class="actionRowClass('version')">
                <button
                  class="btn btn-sm btn-dark mr-2 mb-2"
                  :class="buttonHighlightClass('version')"
                  @click="prepareVersionBump('patch')"
                  :disabled="!writable || versionActionPending || repositoryActionPending"
                  v-b-tooltip.hover.v-dark.top
                  :title="patchTooltip"
                >
                  <i class="fa fa-level-up mr-1"></i> Patch Release
                </button>
                <button
                  class="btn btn-sm btn-dark mr-2 mb-2"
                  :class="buttonHighlightClass('version')"
                  @click="prepareVersionBump('minor')"
                  :disabled="!writable || versionActionPending || repositoryActionPending"
                  v-b-tooltip.hover.v-dark.top
                  :title="minorTooltip"
                >
                  <i class="fa fa-level-up mr-1"></i> Minor Release
                </button>
                <button
                  class="btn btn-sm btn-dark mr-2 mb-2"
                  :class="buttonHighlightClass('version')"
                  @click="prepareVersionBump('major')"
                  :disabled="!writable || versionActionPending || repositoryActionPending"
                  v-b-tooltip.hover.v-dark.top
                  :title="majorTooltip"
                >
                  <i class="fa fa-level-up mr-1"></i> Major Release
                </button>
                <button
                  class="btn btn-sm btn-secondary mr-2 mb-2"
                  :class="buttonHighlightClass('version')"
                  @click="startNewRelease()"
                  :disabled="!writable || versionActionPending || repositoryActionPending"
                  v-b-tooltip.hover.v-dark.top
                  title="Draft a release using the current package.json version without bumping it."
                >
                  <i class="fa fa-plus mr-1"></i> Use Current Version
                </button>
                <button
                  class="btn btn-sm btn-outline-light mb-2"
                  :class="buttonHighlightClass('version')"
                  @click="applyVersion()"
                  :disabled="!writable || versionActionPending || repositoryActionPending || !version"
                  v-b-tooltip.hover.v-dark.top
                  title="Write the version field into package.json so the release pipeline and updater checks point at the same version."
                >
                  <i class="fa fa-tag mr-1"></i> {{ versionActionPending ? "Applying..." : "Apply Version" }}
                </button>
              </div>

              <div class="form-group" :class="fieldHighlightClass('version')">
                <label class="font-weight-bold">
                  Version
                  <i
                    class="fa fa-question-circle text-muted ml-1"
                    v-b-tooltip.hover.v-dark.right
                    title="Use semantic versions like 4.23.6. Saving will also sync package.json to this version."
                  ></i>
                </label>
                <input v-model.trim="version" type="text" class="form-control" @input="handleDraftInputChange()">
                <small class="form-text text-muted">
                  {{ versionStatusText }}
                </small>
              </div>

              <div class="form-group mb-0" :class="fieldHighlightClass('date')">
                <label class="font-weight-bold">
                  Release Date
                  <i
                    class="fa fa-question-circle text-muted ml-1"
                    v-b-tooltip.hover.v-dark.right
                    title="Shown in the top changelog heading. Use M/D/YYYY, for example 3/25/2026."
                  ></i>
                </label>
                <input v-model.trim="releaseDate" type="text" class="form-control" placeholder="3/25/2026" @input="handleDraftInputChange()">
                <small class="form-text text-muted">
                  This date is used in both the main-page changelog heading and the GitHub release payload.
                </small>
              </div>
            </div>

            <div class="guided-section mb-3" :class="sectionStateClass('draft')">
              <div class="font-weight-bold mb-2 d-flex align-items-center justify-content-between">
                <span>Step 2: Generate Or Edit The Draft</span>
                <span class="small guided-step-indicator" :class="stepIndicatorClass(2)">{{ stepIndicatorLabel(2) }}</span>
              </div>
              <div class="small text-muted mb-3">
                Generate starter bullets from recent Spire commits, then edit them into the release notes you want users to read.
              </div>

              <div class="d-flex flex-wrap align-items-center mb-3 action-row" :class="actionRowClass('draft')">
                <button
                  class="btn btn-sm btn-primary mr-2 mb-2"
                  :class="buttonHighlightClass('draft')"
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

              <div class="form-group mb-0" :class="fieldHighlightClass('draft')">
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
                  @input="handleDraftInputChange()"
                />
                <small class="form-text text-muted">
                  Keep the bullets user-facing. The right side previews both the homepage markdown rendering and the GitHub release payload.
                </small>
              </div>
            </div>

            <div class="guided-section mb-0" :class="sectionStateClass('review')">
              <div class="font-weight-bold mb-2 d-flex align-items-center justify-content-between">
                <span>Step 3: Review And Save</span>
                <span class="small guided-step-indicator" :class="stepIndicatorClass(3)">{{ stepIndicatorLabel(3) }}</span>
              </div>
              <div class="small text-muted mb-3">
                Confirm the updater release payload and homepage preview on the right, then write the new top section into <code>CHANGELOG.md</code>.
              </div>

              <div class="review-checklist mb-3" :class="fieldHighlightClass('review')">
                <b-form-checkbox v-model="reviewedPayload" :disabled="!hasDraftBody">
                  I reviewed the GitHub release payload on the right.
                </b-form-checkbox>
                <b-form-checkbox v-model="reviewedHomepagePreview" :disabled="!hasDraftBody">
                  I reviewed the homepage preview on the right.
                </b-form-checkbox>
                <div class="small text-muted mt-2">
                  Saving stays disabled until both review checks are complete.
                </div>
              </div>

              <div class="d-flex flex-wrap align-items-center action-row" :class="actionRowClass('save')">
                <button
                  class="btn btn-sm btn-success mb-2 mr-2"
                  :class="buttonHighlightClass('save')"
                  @click="saveRelease()"
                  :disabled="!writable || saving || versionActionPending || repositoryActionPending || !isReadyToSave"
                  v-b-tooltip.hover.v-dark.top
                  title="Prepends the new top release section to CHANGELOG.md and keeps package.json aligned."
                >
                  <i class="fa fa-save mr-1"></i> {{ saving ? "Saving..." : "Save CHANGELOG.md" }}
                </button>
                <span class="small text-muted mb-2">{{ saveHelperText }}</span>
              </div>
            </div>
          </eq-window-simple>
        </div>

        <div class="col-12 col-xl-6 mt-3 mt-xl-0">
          <eq-window-simple class="p-3 mb-3" :class="sectionStateClass('review')">
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

          <eq-window-simple class="p-3" :class="sectionStateClass('review')">
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
import {AppEnv} from "@/app/env/app-env";

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
      repositoryActionPending: false,
      versionActionPending: false,
      notification: "",
      error: "",
      version: "",
      releaseDate: "",
      body: "",
      currentContent: "",
      packageVersion: "",
      releaseRepository: "",
      configuredReleaseRepository: "",
      releaseRepositorySource: "",
      releaseRepositoryOverride: "",
      releaseRepositoryCandidates: [],
      releaseRepositoryDraft: "",
      writable: false,
      source: "",
      currentTopRelease: {},
      currentReleasePayload: {},
      documentValidationErrors: [],
      draftStarted: false,
      reviewedPayload: false,
      reviewedHomepagePreview: false,
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
      return this.writable &&
        !this.versionActionPending &&
        !this.repositoryActionPending &&
        !this.hasPendingRepositoryChange &&
        !this.hasInvalidReleaseRepositoryDraft;
    },
    sourceBadgeClass() {
      return this.source === "live" ? "badge badge-success" : "badge badge-secondary";
    },
    writableBadgeClass() {
      return this.writable ? "badge badge-success" : "badge badge-warning";
    },
    releaseRepositorySourceLabel() {
      switch (this.releaseRepositorySource) {
      case "env":
        return "env override";
      case "package_json":
        return "package.json";
      case "git_remote_upstream":
        return "git remote upstream";
      case "git_remote_origin":
        return "git remote origin";
      case "default":
        return "default fallback";
      default:
        return this.releaseRepositorySource || "unknown";
      }
    },
    normalizedReleaseRepositoryDraft() {
      return this.normalizeRepository(this.releaseRepositoryDraft);
    },
    hasInvalidReleaseRepositoryDraft() {
      return !!this.releaseRepositoryDraft && !this.normalizedReleaseRepositoryDraft;
    },
    hasPendingRepositoryChange() {
      return !!this.normalizedReleaseRepositoryDraft && this.normalizedReleaseRepositoryDraft !== this.configuredReleaseRepository;
    },
    canApplyReleaseRepository() {
      return this.writable &&
        !this.repositoryActionPending &&
        !!this.normalizedReleaseRepositoryDraft &&
        this.hasPendingRepositoryChange;
    },
    repositoryStatusText() {
      if (!this.releaseRepositoryDraft) {
        return "Choose the GitHub owner/repo that releases should publish to. The updater will also check this repo for releases.";
      }
      if (this.hasInvalidReleaseRepositoryDraft) {
        return "Use owner/repo format like EQEmuTools/spire or paste a GitHub repository URL.";
      }
      if (this.hasPendingRepositoryChange) {
        return `Apply to save ${this.normalizedReleaseRepositoryDraft} into package.json.`;
      }
      if (this.releaseRepositorySource === "package_json") {
        return `package.json currently controls the active release repo (${this.releaseRepository || "-"})`;
      }
      if (this.releaseRepositorySource && this.releaseRepositorySource.indexOf("git_remote_") === 0) {
        const remoteName = this.releaseRepositorySource.replace("git_remote_", "");
        return `No repo override is saved in package.json, so the active repo currently falls back to git remote ${remoteName}.`;
      }
      if (this.releaseRepositorySource === "env") {
        return `An environment override is currently controlling the active release repo (${this.releaseRepository || "-"})`;
      }
      return `Active release repo: ${this.releaseRepository || "-"}`;
    },
    versionStepComplete() {
      return !this.hasPendingRepositoryChange &&
        !this.hasInvalidReleaseRepositoryDraft &&
        !!this.version &&
        !!this.releaseDate;
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
      return !this.hasPendingRepositoryChange &&
        !this.hasInvalidReleaseRepositoryDraft &&
        this.editorValidationErrors.length === 0 &&
        this.hasDraftBody &&
        this.reviewedPayload &&
        this.reviewedHomepagePreview;
    },
    saveHelperText() {
      if (!this.writable) {
        return "Saving is disabled in embedded/read-only environments.";
      }
      if (this.editorValidationErrors.length > 0) {
        return "Resolve the validation issues above before saving.";
      }
      if (this.hasInvalidReleaseRepositoryDraft) {
        return "Fix the release repository format before saving.";
      }
      if (this.hasPendingRepositoryChange) {
        return "Apply the release repository change before saving so publishing and updater checks stay aligned.";
      }
      if (!this.hasDraftBody) {
        return "Add release notes or generate a draft before saving.";
      }
      if (!this.reviewedPayload || !this.reviewedHomepagePreview) {
        return "Review the GitHub payload and homepage preview, then check both review boxes.";
      }
      return "Ready to save. This will update CHANGELOG.md and keep the release version in sync.";
    },
    draftHelperText() {
      if (!this.writable) {
        return "Draft generation only runs in a live repo checkout.";
      }
      if (this.hasInvalidReleaseRepositoryDraft) {
        return "Fix the release repo format before generating a draft.";
      }
      if (this.hasPendingRepositoryChange) {
        return "Apply the release repo change first so the draft reflects the target you intend to publish.";
      }
      return "Drafts are built from local git history since the latest tagged release.";
    },
    workflowSteps() {
      return [
        {
          number: "1",
          title: "Target + Version",
          description: this.versionStepComplete ?
            `Release target ${this.releaseRepository || this.configuredReleaseRepository || "-"} and version ${this.version} are ready.` :
            "Choose the release repo, then pick a patch, minor, major, or custom version.",
          complete: this.versionStepComplete
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
          description: this.reviewedPayload && this.reviewedHomepagePreview ?
            "Both review checks are complete." :
            "Review the payload and homepage preview, then confirm both.",
          complete: this.reviewedPayload && this.reviewedHomepagePreview
        },
        {
          number: "4",
          title: "Save Changelog",
          description: this.isReadyToSave ? "Everything is ready to be written to CHANGELOG.md." : "Save becomes available once the draft is valid.",
          complete: this.isReadyToSave
        }
      ];
    },
    nextAction() {
      if (!this.writable) {
        return {
          step: 0,
          focus: "status",
          title: "Move to a writable local or dev checkout",
          message: "This page is read-only because it is using embedded changelog data. The next real action is to open Spire in a local/dev repo checkout where Source becomes live and Writable becomes Yes.",
          checklist: [
            "Open a local or dev Spire checkout.",
            "Return here and confirm Source is live.",
            "Then start with Step 1 below."
          ],
          context: `Current source: ${this.source || "unknown"}`
        };
      }
      if (this.hasInvalidReleaseRepositoryDraft) {
        return {
          step: 1,
          focus: "repository",
          title: "Fix the release repository format",
          message: "Enter the GitHub repo in owner/repo format or paste a GitHub URL, then apply it.",
          checklist: [
            "Example: EQEmuTools/spire",
            "Click Apply Release Repo after updating the field."
          ],
          context: `Current draft: ${this.releaseRepositoryDraft || "unset"}`
        };
      }
      if (this.hasPendingRepositoryChange) {
        return {
          step: 1,
          focus: "repository",
          title: "Apply the release repository change",
          message: this.releaseRepositoryOverride ?
            "You picked a different GitHub repo. Apply it to save the new default into package.json. The active repo will keep using the environment override until that override is removed." :
            "You picked a different GitHub repo. Apply it so package.json, release publishing, and updater checks all point at the same place.",
          checklist: [
            `Apply ${this.normalizedReleaseRepositoryDraft}.`,
            this.releaseRepositoryOverride ? "Confirm the saved repo is updated for future releases." : "Confirm the Release Repo badge updates.",
            "Then continue with the version and notes."
          ],
          context: this.releaseRepositoryOverride ?
            `Active override: ${this.releaseRepositoryOverride}` :
            `Active repo: ${this.releaseRepository || "-"}`
        };
      }
      if (!this.version) {
        return {
          step: 1,
          focus: "version",
          title: "Choose the release version",
          message: "Start with Patch Release, Minor Release, Major Release, or type a semantic version and click Apply Version.",
          checklist: [
            "Pick an automatic bump or type a custom version.",
            "Make sure the version field looks correct.",
            "The tool will keep package.json aligned."
          ],
          context: `Current package.json version: ${this.packageVersion || "unset"}`
        };
      }
      if (!this.releaseDate) {
        return {
          step: 1,
          focus: "date",
          title: "Set the release date",
          message: "Add the release date that should appear in the top changelog heading and GitHub release payload.",
          checklist: [
            "Use M/D/YYYY format.",
            "Example: 3/25/2026."
          ],
          context: `Selected version: ${this.version}`
        };
      }
      if (!this.hasDraftBody) {
        return {
          step: 2,
          focus: "draft",
          title: "Create the release notes draft",
          message: "Generate a draft from local git history or write the release notes manually in the body field.",
          checklist: [
            "Click Generate Draft for a starting point.",
            "Edit the notes until they read well for users."
          ],
          context: `Release target: v${this.version}`
        };
      }
      if (this.editorValidationErrors.length > 0) {
        return {
          step: 2,
          focus: "draft",
          title: "Fix the draft validation issues",
          message: this.editorValidationErrors[0],
          checklist: [
            "Resolve the highlighted issue.",
            "Then review the payload and preview."
          ],
          context: `Validation issues: ${this.editorValidationErrors.length}`
        };
      }
      if (!this.reviewedPayload || !this.reviewedHomepagePreview) {
        return {
          step: 3,
          focus: "review",
          title: "Review the release outputs",
          message: "Check the GitHub release payload and homepage preview on the right, then confirm both review checkboxes.",
          checklist: [
            this.reviewedPayload ? "GitHub payload review is complete." : "Review the GitHub release payload.",
            this.reviewedHomepagePreview ? "Homepage preview review is complete." : "Review the homepage preview.",
            "Check both boxes when you are satisfied."
          ],
          context: `GitHub tag preview: ${this.releasePayloadPreview.tag_name || "-"}`
        };
      }
      return {
        step: 4,
        focus: "save",
        title: "Save the new top changelog entry",
        message: "Everything is ready. Save CHANGELOG.md to prepend the new release section and keep package.json aligned.",
        checklist: [
          "Click Save CHANGELOG.md.",
          "After saving, verify the top release and release payload."
        ],
        context: `Ready to publish ${this.releasePayloadPreview.tag_name || ""}`.trim()
      };
    },
    nextActionTitle() {
      return this.nextAction.title;
    },
    nextActionMessage() {
      return this.nextAction.message;
    },
    nextActionChecklist() {
      return this.nextAction.checklist || [];
    },
    nextActionContext() {
      return this.nextAction.context || "";
    },
    nextActionFocus() {
      return this.nextAction.focus;
    },
    nextActionStepLabel() {
      return this.nextAction.step === 0 ? "Blocked" : `${this.nextAction.step} of 4`;
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
      this.configuredReleaseRepository = state.configured_release_repository || "";
      this.releaseRepositorySource = state.release_repository_source || "";
      this.releaseRepositoryOverride = state.release_repository_override || "";
      this.releaseRepositoryCandidates = state.release_repository_candidates || [];
      this.releaseRepositoryDraft = state.configured_release_repository || state.release_repository || "";
      this.writable = !!state.writable;
      this.source = state.source || "";
      this.currentTopRelease = state.top_release || {};
      this.currentReleasePayload = state.release_payload || {};
      this.documentValidationErrors = state.validation_errors || [];
      AppEnv.setVersion(this.packageVersion);
      AppEnv.setReleaseRepository(this.releaseRepository);
      this.reviewedPayload = false;
      this.reviewedHomepagePreview = false;
    },
    workflowStepClass(step) {
      return {
        "workflow-step-complete": step.complete,
        "workflow-step-current": this.nextAction.step === parseInt(step.number, 10),
        "workflow-step-pending": !step.complete && this.nextAction.step !== parseInt(step.number, 10)
      };
    },
    stepIndicatorLabel(step) {
      if (this.nextAction.step === step) {
        return "Next";
      }
      if (step === 4 && this.isReadyToSave) {
        return "Ready";
      }
      if (step === 1 && this.versionStepComplete) {
        return "Done";
      }
      if (step === 2 && this.hasDraftBody && this.editorValidationErrors.length === 0) {
        return "Done";
      }
      if (step === 3 && this.reviewedPayload && this.reviewedHomepagePreview) {
        return "Done";
      }
      return "Pending";
    },
    stepIndicatorClass(step) {
      if (this.nextAction.step === step) {
        return "guided-step-current";
      }
      if (this.stepIndicatorLabel(step) === "Done" || this.stepIndicatorLabel(step) === "Ready") {
        return "guided-step-done";
      }
      return "guided-step-pending";
    },
    sectionStateClass(section) {
      return {
        "guided-section-active": this.nextActionFocus === section ||
          (section === "version" && this.nextActionFocus === "repository"),
        "guided-section-complete": section === "version" ? this.versionStepComplete :
          section === "draft" ? this.hasDraftBody && this.editorValidationErrors.length === 0 :
            section === "review" ? this.reviewedPayload && this.reviewedHomepagePreview :
              section === "save" ? this.isReadyToSave : false
      };
    },
    actionRowClass(section) {
      return {
        "action-row-active": this.nextActionFocus === section
      };
    },
    buttonHighlightClass(section) {
      return {
        "action-highlight": this.nextActionFocus === section
      };
    },
    fieldHighlightClass(section) {
      return {
        "field-highlight": this.nextActionFocus === section
      };
    },
    handleDraftInputChange() {
      this.reviewedPayload = false;
      this.reviewedHomepagePreview = false;
    },
    normalizeRepository(value) {
      const repo = (value || "").trim();
      if (!repo) {
        return "";
      }

      const shortMatch = repo.match(/^([^/\s]+)\/([^/\s]+?)(?:\.git)?$/);
      if (shortMatch) {
        return `${shortMatch[1]}/${shortMatch[2]}`.replace(/\.git$/, "");
      }

      const urlMatch = repo.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/);
      if (urlMatch) {
        return `${urlMatch[1]}/${urlMatch[2]}`.replace(/\.git$/, "");
      }

      return "";
    },
    startNewRelease() {
      this.draftStarted = true;
      this.version = this.packageVersion || this.version;
      this.releaseDate = todaysDate();
      this.body = "";
      this.handleDraftInputChange();
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
    async applyReleaseRepository() {
      const repository = this.normalizedReleaseRepositoryDraft;
      if (!repository) {
        this.error = "Release repository must use owner/repo format or a GitHub repository URL.";
        return false;
      }

      this.repositoryActionPending = true;
      this.error = "";

      try {
        const response = await SpireApi.v1().post("spirechangelog/repository", {
          repository
        });

        this.applyState(response.data.data);
        this.notification = this.releaseRepositoryOverride ?
          `Saved ${repository} into package.json. The active repo is still overridden by SPIRE_RELEASE_REPO.` :
          `Release repository saved to ${repository}.`;
        return true;
      } catch (e) {
        this.error = e.response?.data?.error || "Failed to update package.json release repository.";
        return false;
      } finally {
        this.repositoryActionPending = false;
      }
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
        this.handleDraftInputChange();
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
        this.handleDraftInputChange();
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

.workflow-step-current {
  border-color: rgba(255, 210, 79, 0.7);
  box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.25);
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

.guided-callout {
  border: 1px solid rgba(255, 210, 79, 0.2);
}

.guided-callout-active {
  box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.25);
}

.guided-section {
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.12);
}

.guided-section-active {
  border-color: rgba(255, 210, 79, 0.75);
  box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.3);
}

.guided-section-complete {
  border-color: rgba(40, 167, 69, 0.45);
}

.guided-step-indicator {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
}

.guided-step-current {
  background: rgba(255, 210, 79, 0.15);
  color: #ffd24f;
}

.guided-step-done {
  background: rgba(40, 167, 69, 0.15);
  color: #87d596;
}

.guided-step-pending {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.65);
}

.action-row-active {
  padding: 0.5rem 0.5rem 0.25rem;
  margin-left: -0.5rem;
  margin-right: -0.5rem;
  border-radius: 8px;
  background: rgba(255, 210, 79, 0.08);
}

.action-highlight {
  box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.45), 0 0 16px rgba(255, 210, 79, 0.12);
  animation: pulse-action 1.8s ease-in-out infinite;
}

.field-highlight {
  padding: 0.75rem;
  margin-left: -0.75rem;
  margin-right: -0.75rem;
  border-radius: 8px;
  background: rgba(255, 210, 79, 0.08);
  box-shadow: inset 0 0 0 1px rgba(255, 210, 79, 0.25);
}

.review-checklist {
  padding: 0.75rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.14);
}

@keyframes pulse-action {
  0% {
    box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.35), 0 0 0 rgba(255, 210, 79, 0);
  }
  50% {
    box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.7), 0 0 18px rgba(255, 210, 79, 0.18);
  }
  100% {
    box-shadow: 0 0 0 1px rgba(255, 210, 79, 0.35), 0 0 0 rgba(255, 210, 79, 0);
  }
}
</style>
