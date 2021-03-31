func DeferRollbackDir(t *testing.T, srcDir string) {
	t.Helper()

	memo := setup(t, srcDir)

	t.Cleanup(func() { teardown(t, memo) })
}
