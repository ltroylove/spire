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
	if got := ResolveRepository("", raw); got != "Valorith/spire" {
		t.Fatalf("ResolveRepository() = %q, want %q", got, "Valorith/spire")
	}
}
