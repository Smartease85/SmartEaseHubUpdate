# IndexedDB test dependency

`fake-indexeddb` 6.2.4 is a development-only dependency under Apache-2.0. Its license is retained at `docs/licenses/fake-indexeddb-Apache-2.0.txt` and its exact registry integrity is pinned in package-lock.json. It is not included in the browser application or service-worker cache. Browser production code uses the platform IndexedDB API.

The package was inspected as dependency-free JavaScript and installed with lifecycle scripts disabled. Automated fake IndexedDB tests are not evidence of iPhone storage capacity, persistence or eviction behavior; actual browser checks remain separate.
