# OxVM Rust module

An OxVM module for Rust programs compiled to WebAssembly (`wasm32-wasip1`): each run is a real Linux process of the
VM, with the caller's arguments, environment and standard streams, the VM's live files, and, through a small bridge
crate, native Linux programs and VM sockets.

Experimental: 0.2.x needs OxVM SDK and CLI 0.0.27 or later.

## Use it

```sh
oxvm wasm add github:spacia-ai/oxvm-rust@v0.2.0
```

The command shows what the module declares and asks before it installs anything. A module is code that runs in a worker of
your page with that authority, so review it as you would a dependency. It needs a self-hosted runtime on a cross-origin
isolated page. After it is added, `rust-wasi` and `rust-bridge-demo` are commands in the VM's terminal.

This module is a thin command layer. The WASI Preview1 implementation is the SDK's
[`host.kit.wasi`](https://oxvm.dev/docs/reference/wasi-kit/), and the Rust crate programs link is
[`oxvm-bridge`](https://oxvm.dev/docs/reference/wasi-bridge/), which lives in the SDK repository
(`crates/oxvm-bridge`) and is published on [crates.io](https://crates.io/crates/oxvm-bridge). Any module can run Rust programs the same way;
see the guide [Run Rust programs](https://oxvm.dev/docs/guides/rust-programs/).

## Commands

- `rust-wasi [--dir <path>[:ro]]... <program.wasm> [--] [args...]` reads a `.wasm` file from the VM (at most 32 MiB),
  checks it before any of its code runs, and starts it as a Linux process with its own arguments. Without `--dir` the
  program may use the whole VM tree under the caller's permissions; `--dir` grants only the named directories, and
  `:ro` grants one read-only.
- `rust-bridge-demo` is a pinned example program (`examples/bridge-demo`) that exercises standard streams, files, native
  children and sockets; `rust-bridge-demo summarize <in.csv> <out.csv>` is the end-to-end example used by the
  `oxvm-pyodide-test` sample.

Programs see standard streams, arguments, the environment, the VM's live files, its clocks and entropy through plain
Rust `std`. Native Linux programs, sockets, the process identity and the working directory come from `oxvm-bridge`.
An exit status from 0 to 119 is reported exactly; a larger one is reported as 1 with a line naming the original.

## Network

The module declares `net.vm`: programs reach the VM's own TCP and Unix sockets through `oxvm-bridge`, and nothing
outside the VM. The module itself makes no network requests.

## Develop

`oxvm-bridge` comes from crates.io. To try an unreleased change to it, set
`OXVM_BRIDGE_PATH=<oxvm-sdk checkout>/crates/oxvm-bridge`; `scripts/cargo.ts` and `pnpm run build:rust` then
use that checkout.

```sh
rustup target add wasm32-wasip1
pnpm install --frozen-lockfile
pnpm run build:rust
cargo clippy --locked --workspace --all-targets --target wasm32-wasip1 -- -D warnings
pnpm run inspect:fixtures
pnpm run check
pnpm test
pnpm run test:conformance
```

Real-engine browser suites (`test/browser/suites`) need a signed Userspace image with a POSIX shell and coreutils-style
tools:

```sh
OXVM_TEST_USERSPACE_IMAGE=<image reference JSON> OXVM_TEST_USERSPACE_IMAGE_DIR=<bundle directory> \
  pnpm run test:browser stdio --browser chromium
```

## License

Apache-2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

## OxVM migration

This source prepares module `oxvm-rust` 0.2.0 with the matched `@oxvm/sdk`
and `@oxvm/cli` 0.0.40 packages. The workspace uses the actual
`oxvm-bridge = "0.1"` crate. Rust code imports `oxvm_bridge::`, and the bridge
emits `oxvm_bridge_v1`. This is a package identity change, with unchanged v1
records and permissions.

The matching SDK also admits the retained v1 namespace through the same
implementation. Earlier locked modules keep their recorded identity and
artifacts. Install this canonical module as a new identity and review the
module and capability changes before replacing an earlier locked installation.

The matched SDK/CLI 0.0.40 and bridge crate 0.1.0 are published. Registry locks
resolve these packages. Before tagging a module release, rebuild the demonstration
program and complete the browser conformance and reproducibility checks. Use
`OXVM_BRIDGE_PATH` only to qualify an unreleased bridge change locally.
