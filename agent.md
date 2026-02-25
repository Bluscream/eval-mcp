# eval-mcp — Agent Notes

Developer notes for AI agents (and humans) working on this codebase.
Documents the non-obvious decisions, deprecation migrations, and gotchas
encountered during development.

---

## MCP SDK Deprecation Migration

### `Server` → `McpServer`

The original `Server` class from `@modelcontextprotocol/sdk/server/index.js` is
**deprecated**. Replace with `McpServer` from the `mcp` subpath:

```ts
// ❌ Deprecated
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
const server = new Server({ name: "...", version: "..." });

// ✅ Current
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
const server = new McpServer({ name: "...", version: "..." });
```

### `server.tool()` → `server.registerTool()`

All short-form methods (`tool()`, `resource()`, `prompt()`) are **deprecated**.
Use the explicit `register*` counterparts:

| Deprecated | Current |
|---|---|
| `server.tool(name, schema, cb)` | `server.registerTool(name, config, cb)` |
| `server.resource(name, uri, cb)` | `server.registerResource(name, uri, config, cb)` |
| `server.prompt(name, schema, cb)` | `server.registerPrompt(name, config, cb)` |

### `registerTool` Signature

The config object wraps the Zod schema inside `inputSchema`. The schema **must**
be a full `z.object({})`, not a raw shape:

```ts
// ❌ Old style (deprecated server.tool with raw shape)
server.tool("eval_python", { code: z.string() }, async ({ code }) => { ... });

// ✅ New style (registerTool with z.object wrapper)
server.registerTool(
    "eval_python",
    {
        description: "Evaluates Python code.",
        inputSchema: z.object({
            code: z.string().describe("The source code to execute.")
        })
    },
    async ({ code }) => { ... }
);
```

The callback receives the **parsed and validated** input directly as the first
argument (not `args.code`, just `code`).

---

## Language-Specific Gotchas

### C# — `Add-Type` limitation

`Add-Type` in PowerShell compiles a **library DLL**, not an executable.
This means:
- C# 9+ **top-level statements** (`CS8805`) are rejected
- `using` directives inside the class body cause `CS1001`/`CS0118` errors

**Fix**: Use `dotnet run` with a proper `.csproj`:

```ts
await fs.writeFile(csprojFile, `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>
</Project>`);
return await runCommand(`dotnet run --project "${csprojFile}"`);
```

This supports top-level statements, `ImplicitUsings`, modern C# features, and
all standard `Console.Write*` output.

### VB.NET — PowerShell here-string `$` expansion

When embedding VB.NET code in a PowerShell here-string (`@'...'@`), PowerShell
expands `$"..."` interpolated strings **before** the VB compiler sees them,
causing `Character is not valid` errors.

Additionally, `Add-Type -Language VisualBasic` uses an older compiler feature
set that may not support modern VB syntax.

**Fix**: Same as C# — use `dotnet run` with a `.vbproj`.

### Python — `-c` flag and multiline code

`python -c "..."` breaks on multiline code with newlines or embedded quotes in
the shell command. Use a temporary `.py` file instead:

```ts
return await withTempFile(".py", code, async (filePath) =>
    runCommand(`python "${filePath}"`)
);
```

### Lua — Not pre-installed on Windows

Lua is not available by default. Install via:
```
winget install DEVCOM.Lua
```

This installs Lua 5.4 and adds it to the system PATH.

---

## Auto-Install Mechanism

The server automatically installs missing language runtimes via `winget` on
first use. The mapping lives in `WINGET_PACKAGES` in `index.ts`:

```ts
const WINGET_PACKAGES = {
    lua:    { id: "DEVCOM.Lua",             exe: "lua" },
    kotlin: { id: "Kotlin.Kotlin",          exe: "kotlinc" },
    // ...
};
```

`ensureInstalled(lang)` is called before every eval. If the executable is not
found in the current PATH + `EXTRA_PATHS`, it runs:

```
winget install --id <package-id> --silent --accept-package-agreements --accept-source-agreements
```

After install it discovers the new binary path via `cmd /c where <exe>` (fresh
subprocess that inherits the updated system PATH) and adds it to `EXTRA_PATHS`
for the lifetime of the current server process.

---

## CLI Flags

| Flag | Behaviour |
|---|---|
| *(none)* | Registers a single `eval` tool with a `language` enum parameter |
| `--split` / `-s` | Registers individual `eval_powershell`, `eval_python`, … tools instead |

Configure via MCP client args, e.g.:
```json
{ "command": "node", "args": ["dist/index.js", "--split"] }
```
