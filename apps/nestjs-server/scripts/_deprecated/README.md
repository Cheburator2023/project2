# Deprecated generators

These scripts previously regenerated factory data from CSV in `llm/v2_new_docs/`.
The factory bundle is now **self-contained in committed snapshot JSON**:

| Data | File |
|------|------|
| Schema / UI / logic | `src/modules/anketa-v2/constants/v2-default-anketa.snapshot.json` |
| Typical works + methodology params | `src/modules/anketa-v2/constants/v2-factory-typical-works.snapshot.json` |
| System scaffold | `packages/api-contract/src/v2-anketa-system-scaffold.snapshot.json` |

Edit snapshots directly in the repo. Refresh schema snapshot from admin export:

```bash
cd apps/nestjs-server && npm run sync:factory-snapshot -- /path/to/export.json
```

Deprecated scripts (kept for reference only):

- `build-v2-doc-catalog.ts` — was: CSV → `v2-doc-catalog.generated.json`
- `../../scripts/sync-v2-params-from-csv.mjs` — was: CSV → arch/localParams in factory schema snapshot
