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

func ResolveRepository(override string, packageJSONRaw []byte) string {
	if repo := NormalizeGitHubRepository(override); repo != "" {
		return repo
	}

	if repo := RepositoryFromPackageJSON(packageJSONRaw); repo != "" {
		return repo
	}

	return DefaultRepository
}
