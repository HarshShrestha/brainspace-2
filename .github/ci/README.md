# CI pipeline (pending activation)

`ci.yml` is the complete GitHub Actions pipeline for this repository. It lives here, rather than in
`.github/workflows/`, only because the automation that created it was not permitted to write
workflow files (GitHub requires a token with the `workflow` scope).

To activate it, from a clone with normal maintainer access:

```bash
git mv .github/ci/ci.yml .github/workflows/ci.yml
git commit -m "ci: activate GitHub Actions pipeline"
git push
```

Jobs: backend (lint, format, types, unit + integration tests, build, runtime audit), RAG worker
(Python 3.10 and 3.12), frontend (lint, format, tests, build, runtime audit), Playwright end-to-end
against a MongoDB service, and container image builds. See docs/06_TESTING_STRATEGY.md.
