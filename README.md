# eval-mcp

> ## ⚠️ Superseded by [common-mcp](https://github.com/Bluscream/common-mcp)
>
> These tools now live in **[common-mcp](https://github.com/Bluscream/common-mcp)**,
> which serves them alongside the rest of the family from one process. The tool
> names and arguments are unchanged, so switching is only a change of command:
>
> ```diff
> - "command": "/path/to/eval"
> + "command": "/path/to/common-mcp"
> ```
>
> Beyond what this server did, common-mcp **preserves oversized output**: anything past the inline cap is streamed to a file and the result names it, instead of being discarded and forcing you to re-run a script that may have had side effects.
>
> This repository is archived and will not receive further changes. The release
> below remains downloadable.

Run short scripts in 30+ languages, as an MCP server.

> **Rust rewrite.** This branch replaces the earlier JavaScript implementation,
> which remains on `main`.

```bash
eval-mcp --allow-execution                        # every installed language
eval-mcp --allow-execution --language python \
         --language node                          # restricted
eval-mcp --list-tools                             # inspect without enabling
```

## ⚠️ What this is

This server **runs caller-supplied code as the user who started it**. There is
no container, no seccomp filter and no user separation — a script can read and
write anything that user can.

Execution is therefore refused unless `--allow-execution` is passed, and
`--language` restricts which runtimes are reachable. Run it as a dedicated
unprivileged user, or inside a container, if the caller is not fully trusted.

## Tool

| Tool | Does |
| --- | --- |
| `eval_code` | Runs a script and returns stdout, stderr and the exit code. A non-zero exit is flagged as a tool error with stderr intact. |

## Languages

python, node, bash, sh, ruby, perl, php, lua, go, typescript, rust,
rust-script, csharp, dotnet-script, java, c, cpp, deno, bun, awk, tcl, r,
julia, elixir, powershell, zig, kotlin, swift, scala, dart, haskell, ocaml,
fortran.

Each runs only if its toolchain is installed; `--list-tools` shows the full set
regardless. Compiled languages (rust, c, cpp, fortran, csharp) compile and run
in one step.

## Isolation

Each call gets a fresh private scratch directory, removed afterwards. Toolchain
caches are redirected into it — `XDG_CACHE_HOME`, `GOCACHE`, `GOMODCACHE`,
`DENO_DIR`, `JULIA_DEPOT_PATH`, `PUB_CACHE`, `COURSIER_CACHE`, and the .NET and
NuGet directories — so running a script does not litter `$HOME`.

`HOME` and `XDG_DATA_HOME` are deliberately **not** redirected: on systems where
interpreters are distrobox-exported wrappers, overriding either makes them fail
with `no such container`.

Output is capped at 256 KiB per stream with truncation reported, and the process
is killed at the deadline rather than being left to run.

## Options

Everything from [`mcp-toolkit`](https://github.com/Bluscream/mcp-toolkit), plus:

| Flag | Env | Default |
| --- | --- | --- |
| `--allow-execution` | `EVAL_MCP_ALLOW_EXECUTION` | off |
| `--language NAME` | `EVAL_MCP_LANGUAGES` | all |

## Development

```bash
./scripts/build.sh --release
```

## License

[Unlicense](LICENSE) (public domain).
