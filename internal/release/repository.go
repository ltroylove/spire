package release

import (
	"encoding/json"
	"regexp"
	"strings"
)

const DefaultRepository = "EQEmuTools/spire"

var githubRepoRegexp = regexp.MustCompile(`github\.com[/:]([^/]+)/([^/]+?)(?:\.git)?$`)

type packageJSON struct {
	Repository struct {
		URL string `json:"url"`
	} `json:"repository"`
}

type RemoteLookup func(name string) (string, error)

type Resolution struct {
	Repository string
	Source     string
}

func NormalizeGitHubRepository(value string) string {
	repo := strings.TrimSpace(value)
	if repo == "" {
		return ""
	}

	if strings.Count(repo, "/") == 1 && !strings.Contains(repo, "://") && !strings.Contains(repo, "@") {
		return strings.TrimSuffix(repo, ".git")
	}

	match := githubRepoRegexp.FindStringSubmatch(repo)
	if len(match) != 3 {
		return ""
	}

	return strings.TrimSuffix(match[1]+"/"+match[2], ".git")
}

func RepositoryFromPackageJSON(raw []byte) string {
	if len(raw) == 0 {
		return ""
	}

	var pkg packageJSON
	if err := json.Unmarshal(raw, &pkg); err != nil {
		return ""
	}

	return NormalizeGitHubRepository(pkg.Repository.URL)
}

func ResolveRepositoryDetails(override string, packageJSONRaw []byte, remoteLookup RemoteLookup) Resolution {
	if repo := NormalizeGitHubRepository(override); repo != "" {
		return Resolution{
			Repository: repo,
			Source:     "env",
		}
	}

	if repo := RepositoryFromPackageJSON(packageJSONRaw); repo != "" {
		return Resolution{
			Repository: repo,
			Source:     "package_json",
		}
	}

	if remoteLookup != nil {
		for _, remoteName := range []string{"upstream", "origin"} {
			remoteURL, err := remoteLookup(remoteName)
			if err != nil {
				continue
			}

			if repo := NormalizeGitHubRepository(remoteURL); repo != "" {
				return Resolution{
					Repository: repo,
					Source:     "git_remote_" + remoteName,
				}
			}
		}
	}

	return Resolution{
		Repository: DefaultRepository,
		Source:     "default",
	}
}

func ResolveRepository(override string, packageJSONRaw []byte, remoteLookup RemoteLookup) string {
	return ResolveRepositoryDetails(override, packageJSONRaw, remoteLookup).Repository
}
