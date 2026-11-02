# Third-party dependency notices

This is a source-only project release. node_modules, Cargo registry sources, target outputs, compiled Wasm, external fonts/images and other dependency implementations are not bundled. Demo HTML/CSS/JS and project Rust/scripts are project-authored AI-assisted code; the recordings are public/synthetic chain observations. The owner authorized MIT adoption for original project work with attribution Copyright (c) 2026 onchainbuilds. The project MIT grant does not relicense third-party work.

[Full pinned dependency declaration inventory](docs/evidence/dependency-licenses.json): 406 Cargo package records (including local crates) and 68 npm dependencies. Dependencies retain their own licenses; a project MIT license does not replace them. Source metadata came from installed manifests/Cargo metadata and official crates.io version metadata. No dependency was installed for this review.

Production direct libraries: borsh 1.8.1, near-account-id 2.6.0 and near-sdk 5.29.1. Test-only infrastructure includes near-workspaces 0.23.0; optional operator tooling uses near-api-js 7.4.0. Node built-ins are provided by the user's Node installation, not copied into this repository.

The inventory includes MIT/Apache alternatives, BSD, ISC, Zlib, Unicode-3.0, CDLA-Permissive-2.0, composite expressions and MPL-2.0 (memory_units, wee_alloc). Retain upstream notices and satisfy applicable file/source obligations when distributing their code or linked binaries. No binary redistribution compliance claim is made by this source-only package.

The earlier simple notice-filename check missed borsh's LICENSE-MIT.txt and LICENSE-APACHE and isarray's README license text. bs58 declares MIT in its README/package metadata; near-seed-phrase declares MIT in package metadata. Their implementation sources are not included here. If node_modules or a bundle/binary is later distributed, collect exact upstream copyright/license texts for every distributed component, including bs58 and near-seed-phrase; that distribution is outside this source-only approval package.

Canonical upstream records: https://crates.io/ and https://www.npmjs.com/; consult the exact versions in the lockfiles/inventory. Do not remove copyright notices from any subsequently bundled source.
