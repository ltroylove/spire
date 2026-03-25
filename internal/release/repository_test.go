package release

import "testing"

func TestNormalizeGitHubRepository(t *testing.T) {
	cases := map[string]string{
		"EQEmuTools/spire":                          "EQEmuTools/spire",
		"https://github.com/EQEmuTools/spire":       "EQEmuTools/spire",
		"https://github.com/EQEmuTools/spire.git":   "EQEmuTools/spire",
		"git@github.com:EQEmuTools/spire.git":       "EQEmuTools/spire",
		"ssh://git@github.com/EQEmuTools/spire.git": "EQEmuTools/spire",
	}

	for input, expected := range cases {
		if got := NormalizeGitHubRepository(input); got != expected {
			t.Fatalf("NormalizeGitHubRepository(%q) = %q, want %q", input, got, expected)
		}
	}
}

func TestResolveRepositoryFallsBackToPackageJSON(t *testing.T) {
	raw := []byte(`{"repository":{"url":"https://github.com/Valorith/spire.git"}}`)
	if got := ResolveRepository("", raw, nil); got != "Valorith/spire" {
		t.Fatalf("ResolveRepository() = %q, want %q", got, "Valorith/spire")
	}
}

func TestResolveRepositoryFallsBackToGitRemotes(t *testing.T) {
	lookup := func(name string) (string, error) {
		if name == "upstream" {
			return "git@github.com:ExampleOrg/spire.git", nil
		}
		return "", nil
	}

	details := ResolveRepositoryDetails("", nil, lookup)
	if details.Repository != "ExampleOrg/spire" {
		t.Fatalf("ResolveRepositoryDetails().Repository = %q, want %q", details.Repository, "ExampleOrg/spire")
	}
	if details.Source != "git_remote_upstream" {
		t.Fatalf("ResolveRepositoryDetails().Source = %q, want %q", details.Source, "git_remote_upstream")
	}
}

func TestResolveRepositoryPrefersEnvOverride(t *testing.T) {
	raw := []byte(`{"repository":{"url":"https://github.com/Valorith/spire.git"}}`)
	lookup := func(name string) (string, error) {
		return "git@github.com:ExampleOrg/spire.git", nil
	}

	details := ResolveRepositoryDetails("CustomOrg/custom-spire", raw, lookup)
	if details.Repository != "CustomOrg/custom-spire" {
		t.Fatalf("ResolveRepositoryDetails().Repository = %q, want %q", details.Repository, "CustomOrg/custom-spire")
	}
	if details.Source != "env" {
		t.Fatalf("ResolveRepositoryDetails().Source = %q, want %q", details.Source, "env")
	}
}
