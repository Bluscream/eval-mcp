#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const zod_1 = require("zod");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
const EXTRA_PATHS = [
    "C:\\Ruby33-x64\\bin",
    "D:\\Coding\\Go\\bin",
    "D:\\Coding\\xampp\\php",
    "P:\\vcpkg\\downloads\\tools\\perl\\5.40.2.1\\perl\\bin",
    "P:\\vcpkg\\downloads\\tools\\perl\\5.40.2.1\\c\\bin",
    "C:\\Program Files\\Java\\jdk-25\\bin",
    "P:\\Program Files\\dotnet"
];
const IS_WINDOWS = process.platform === 'win32';
const IS_MAC = process.platform === 'darwin';
const IS_LINUX = process.platform === 'linux';
// prettier-ignore
const PACKAGES = {
    //         exe         winget                                 scoop            scoopBucket  choco                apt                    dnf                    apk            pacman          brew
    lua: { exe: "lua", winget: "DEVCOM.Lua", scoop: "lua", choco: "lua", apt: "lua5.4", dnf: "lua", apk: "lua5.4", pacman: "lua", brew: "lua" },
    python: { exe: "python", winget: "Python.Python.3", scoop: "python", choco: "python3", apt: "python3", dnf: "python3", apk: "python3", pacman: "python", brew: "python@3" },
    node: { exe: "node", winget: "OpenJS.NodeJS", scoop: "nodejs", choco: "nodejs", apt: "nodejs", dnf: "nodejs", apk: "nodejs", pacman: "nodejs", brew: "node" },
    ruby: { exe: "ruby", winget: "RubyInstallerTeam.Ruby.3.3", scoop: "ruby", choco: "ruby", apt: "ruby", dnf: "ruby", apk: "ruby", pacman: "ruby", brew: "ruby" },
    perl: { exe: "perl", winget: "StrawberryPerl.StrawberryPerl", scoop: "perl", choco: "strawberryperl", apt: "perl", dnf: "perl", apk: "perl", pacman: "perl", brew: "perl" },
    php: { exe: "php", winget: "PHP.PHP.8.4", scoop: "php", choco: "php", apt: "php", dnf: "php", apk: "php84", pacman: "php", brew: "php" },
    go: { exe: "go", winget: "GoLang.Go", scoop: "go", choco: "golang", apt: "golang", dnf: "golang", apk: "go", pacman: "go", brew: "go" },
    rust: { exe: "rustc", winget: "Rustlang.Rustup", scoop: "rustup", choco: "rust-ms", apt: "rustc", dnf: "rust", apk: "rust", pacman: "rust", brew: "rust" },
    java: { exe: "java", winget: "EclipseAdoptium.Temurin.21.JDK", scoop: "temurin21-jdk", scoopBucket: "java", choco: "temurin21", apt: "default-jdk", dnf: "java-21-openjdk", apk: "openjdk21", pacman: "jdk-openjdk", brew: "openjdk@21" },
    csharp: { exe: "dotnet", winget: "Microsoft.DotNet.SDK.8", scoop: "dotnet-sdk", choco: "dotnet-sdk", apt: "dotnet-sdk-8", dnf: "dotnet-sdk-8.0", apk: "dotnet8-sdk", pacman: "dotnet-sdk", brew: "dotnet" },
    vb: { exe: "dotnet", winget: "Microsoft.DotNet.SDK.8", scoop: "dotnet-sdk", choco: "dotnet-sdk", apt: "dotnet-sdk-8", dnf: "dotnet-sdk-8.0", apk: "dotnet8-sdk", pacman: "dotnet-sdk", brew: "dotnet" },
    cpp: { exe: "g++", winget: "BrechtSanders.WinLibs.POSIX.UCRT", scoop: "gcc", choco: "mingw", apt: "g++", dnf: "gcc-c++", apk: "g++", pacman: "gcc", brew: "gcc" },
    c: { exe: "gcc", winget: "BrechtSanders.WinLibs.POSIX.UCRT", scoop: "gcc", choco: "mingw", apt: "gcc", dnf: "gcc", apk: "gcc", pacman: "gcc", brew: "gcc" },
    kotlin: { exe: "kotlinc", scoop: "kotlin", scoopBucket: "extras", choco: "kotlinc", apt: "kotlin", dnf: "kotlin", apk: "kotlin", pacman: "kotlin", brew: "kotlin" },
};
// ── Package manager bootstrappers ────────────────────────────────────────────
async function ensureScoop() {
    try {
        await execPromise('scoop --version', { timeout: 5000 });
        return;
    }
    catch { }
    console.error('[eval-mcp] Installing Scoop...');
    await execPromise(`pwsh -NoProfile -Command "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force; Invoke-RestMethod https://get.scoop.sh | Invoke-Expression"`, { timeout: 180000 });
}
async function ensureChoco() {
    try {
        await execPromise('choco --version', { timeout: 5000 });
        return;
    }
    catch { }
    console.error('[eval-mcp] Installing Chocolatey...');
    await execPromise(`pwsh -NoProfile -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; iex ((New-Object Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"`, { timeout: 180000 });
}
async function ensureBrew() {
    try {
        await execPromise('brew --version', { timeout: 5000 });
        return;
    }
    catch { }
    console.error('[eval-mcp] Installing Homebrew...');
    await execPromise('/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"', { timeout: 600000 });
}
async function detectLinuxPkgManager() {
    for (const pm of ['apt-get', 'dnf', 'yum', 'apk', 'pacman', 'zypper']) {
        try {
            await execPromise(`which ${pm}`, { timeout: 3000 });
            return pm;
        }
        catch { }
    }
    return null;
}
// ── Exe discovery ─────────────────────────────────────────────────────────────
async function findExe(exe) {
    const env = { ...process.env };
    const pathVar = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
    env[pathVar] = EXTRA_PATHS.concat(env[pathVar] ? [env[pathVar]] : []).join(IS_WINDOWS ? ';' : ':');
    const whichCmd = IS_WINDOWS ? `cmd /c where ${exe}` : `which ${exe}`;
    try {
        const { stdout } = await execPromise(whichCmd, { env, timeout: 5000 });
        return stdout.trim().split('\n')[0].trim() || null;
    }
    catch {
        return null;
    }
}
// ── Auto-install ──────────────────────────────────────────────────────────────
async function ensureInstalled(lang) {
    const pkg = PACKAGES[lang];
    if (!pkg)
        return null;
    const existing = await findExe(pkg.exe);
    if (existing)
        return existing;
    console.error(`[eval-mcp] ${pkg.exe} not found — trying to install for ${lang}...`);
    const installers = [];
    if (IS_WINDOWS) {
        if (pkg.winget) {
            installers.push({
                name: 'winget', fn: async () => {
                    await execPromise(`winget install --id "${pkg.winget}" --silent --accept-package-agreements --accept-source-agreements`, { timeout: 300000 });
                }
            });
        }
        if (pkg.scoop) {
            installers.push({
                name: 'scoop', fn: async () => {
                    await ensureScoop();
                    if (pkg.scoopBucket)
                        await execPromise(`scoop bucket add ${pkg.scoopBucket}`, { timeout: 60000 }).catch(() => { });
                    await execPromise(`scoop install ${pkg.scoop}`, { timeout: 300000 });
                }
            });
        }
        if (pkg.choco) {
            installers.push({
                name: 'choco', fn: async () => {
                    await ensureChoco();
                    await execPromise(`choco install ${pkg.choco} -y --no-progress`, { timeout: 300000 });
                }
            });
        }
    }
    else if (IS_MAC) {
        if (pkg.brew) {
            installers.push({
                name: 'brew', fn: async () => {
                    await ensureBrew();
                    await execPromise(`brew install ${pkg.brew}`, { timeout: 300000 });
                }
            });
        }
    }
    else if (IS_LINUX) {
        const pm = await detectLinuxPkgManager();
        if (pm === 'apt-get' && pkg.apt) {
            installers.push({
                name: 'apt', fn: async () => {
                    await execPromise(`sudo apt-get update -qq && sudo apt-get install -y ${pkg.apt}`, { timeout: 300000 });
                }
            });
        }
        else if ((pm === 'dnf' || pm === 'yum') && pkg.dnf) {
            installers.push({
                name: pm, fn: async () => {
                    await execPromise(`sudo ${pm} install -y ${pkg.dnf}`, { timeout: 300000 });
                }
            });
        }
        else if (pm === 'apk' && pkg.apk) {
            installers.push({
                name: 'apk', fn: async () => {
                    await execPromise(`sudo apk add --no-cache ${pkg.apk}`, { timeout: 300000 });
                }
            });
        }
        else if (pm === 'pacman' && pkg.pacman) {
            installers.push({
                name: 'pacman', fn: async () => {
                    await execPromise(`sudo pacman -Sy --noconfirm ${pkg.pacman}`, { timeout: 300000 });
                }
            });
        }
        else if (pm === 'zypper' && pkg.zypper) {
            installers.push({
                name: 'zypper', fn: async () => {
                    await execPromise(`sudo zypper install -y ${pkg.zypper}`, { timeout: 300000 });
                }
            });
        }
        // Fallback: try brew on Linux too (Linuxbrew)
        if (pkg.brew) {
            installers.push({
                name: 'brew', fn: async () => {
                    await ensureBrew();
                    await execPromise(`brew install ${pkg.brew}`, { timeout: 300000 });
                }
            });
        }
    }
    for (const { name, fn } of installers) {
        try {
            console.error(`[eval-mcp]   trying ${name}...`);
            await fn();
            const found = await findExe(pkg.exe);
            if (found) {
                const dir = path_1.default.dirname(found);
                if (dir && !EXTRA_PATHS.includes(dir)) {
                    EXTRA_PATHS.push(dir);
                    console.error(`[eval-mcp] Added ${dir} to EXTRA_PATHS`);
                }
                console.error(`[eval-mcp] Installed ${lang} via ${name} ✓`);
                return found;
            }
        }
        catch (e) {
            console.error(`[eval-mcp]   ${name} failed: ${e.message?.slice(0, 120)}`);
        }
    }
    console.error(`[eval-mcp] All installers failed for ${lang}`);
    return null;
}
const server = new mcp_js_1.McpServer({
    name: "eval-mcp",
    version: "2.1.0",
});
async function runCommand(command, envOverrides = {}) {
    try {
        const env = { ...process.env, ...envOverrides };
        const pathVar = Object.keys(env).find(k => k.toLowerCase() === 'path') || 'PATH';
        env[pathVar] = EXTRA_PATHS.concat(env[pathVar] ? [env[pathVar]] : []).join(';');
        const { stdout, stderr } = await execPromise(command, { env });
        return { stdout, stderr };
    }
    catch (error) {
        return {
            stdout: error.stdout || "",
            stderr: error.stderr || error.message,
        };
    }
}
async function withTempFile(extension, content, callback, preferredName) {
    const tempDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), "mcp-eval-"));
    const fileName = preferredName ? `${preferredName}${extension}` : `script${extension}`;
    const filePath = path_1.default.join(tempDir, fileName);
    await promises_1.default.writeFile(filePath, content);
    try {
        return await callback(filePath);
    }
    finally {
        await promises_1.default.rm(tempDir, { recursive: true, force: true });
    }
}
// --- Execution Core ---
const handlers = {
    powershell: async (code) => {
        return await withTempFile(".ps1", code, async (filePath) => {
            return await runCommand(`pwsh -NoProfile -File "${filePath}"`);
        });
    },
    cmd: async (code) => {
        return await withTempFile(".bat", code, async (filePath) => {
            return await runCommand(`cmd.exe /c "${filePath}"`);
        });
    },
    python: async (code) => {
        return await withTempFile(".py", code, async (filePath) => {
            return await runCommand(`python "${filePath}"`);
        });
    },
    node: async (code) => {
        return await runCommand(`node -e "${code.replace(/"/g, '\\"')}"`);
    },
    ruby: async (code) => {
        return await withTempFile(".rb", code, async (filePath) => {
            return await runCommand(`ruby "${filePath}"`);
        });
    },
    perl: async (code) => {
        return await withTempFile(".pl", code, async (filePath) => {
            return await runCommand(`perl "${filePath}"`);
        });
    },
    php: async (code) => {
        return await withTempFile(".php", code, async (filePath) => {
            return await runCommand(`php -n "${filePath}"`);
        });
    },
    rust: async (code) => {
        return await withTempFile(".rs", code, async (filePath) => {
            const exePath = filePath.replace(".rs", ".exe");
            const compile = await runCommand(`rustc "${filePath}" -o "${exePath}"`);
            if (compile.stderr && !compile.stdout)
                return compile;
            return await runCommand(`"${exePath}"`);
        });
    },
    go: async (code) => {
        return await withTempFile(".go", code, async (filePath) => {
            return await runCommand(`go run "${filePath}"`);
        });
    },
    csharp: async (code) => {
        const tempDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), "mcp-eval-"));
        try {
            const csFile = path_1.default.join(tempDir, "Program.cs");
            const csprojFile = path_1.default.join(tempDir, "App.csproj");
            await promises_1.default.writeFile(csFile, code);
            await promises_1.default.writeFile(csprojFile, [
                '<Project Sdk="Microsoft.NET.Sdk">',
                '  <PropertyGroup>',
                '    <OutputType>Exe</OutputType>',
                '    <TargetFramework>net8.0</TargetFramework>',
                '    <Nullable>enable</Nullable>',
                '    <ImplicitUsings>enable</ImplicitUsings>',
                '  </PropertyGroup>',
                '</Project>'
            ].join('\n'));
            return await runCommand(`dotnet run --project "${csprojFile}"`);
        }
        finally {
            await promises_1.default.rm(tempDir, { recursive: true, force: true });
        }
    },
    vb: async (code) => {
        const tempDir = await promises_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), "mcp-eval-"));
        try {
            const vbFile = path_1.default.join(tempDir, "Program.vb");
            const vbprojFile = path_1.default.join(tempDir, "App.vbproj");
            await promises_1.default.writeFile(vbFile, code);
            await promises_1.default.writeFile(vbprojFile, [
                '<Project Sdk="Microsoft.NET.Sdk">',
                '  <PropertyGroup>',
                '    <OutputType>Exe</OutputType>',
                '    <TargetFramework>net8.0</TargetFramework>',
                '  </PropertyGroup>',
                '</Project>'
            ].join('\n'));
            return await runCommand(`dotnet run --project "${vbprojFile}"`);
        }
        finally {
            await promises_1.default.rm(tempDir, { recursive: true, force: true });
        }
    },
    java: async (code) => {
        const javaClassNameMatch = code.match(/public\s+class\s+(\w+)/);
        const javaClassName = javaClassNameMatch ? javaClassNameMatch[1] : "Main";
        return await withTempFile(".java", code, async (filePath) => {
            const compile = await runCommand(`javac "${filePath}"`);
            if (compile.stderr && !compile.stdout)
                return compile;
            const fileName = path_1.default.basename(filePath, ".java");
            const dirName = path_1.default.dirname(filePath);
            return await runCommand(`java -cp "${dirName}" ${fileName}`);
        }, javaClassName);
    },
    cpp: async (code) => {
        return await withTempFile(".cpp", code, async (filePath) => {
            const exePath = filePath.replace(".cpp", ".exe");
            const compile = await runCommand(`g++ "${filePath}" -o "${exePath}"`);
            if (compile.stderr && !compile.stdout)
                return compile;
            return await runCommand(`"${exePath}"`);
        });
    },
    c: async (code) => {
        return await withTempFile(".c", code, async (filePath) => {
            const exePath = filePath.replace(".c", ".exe");
            const compile = await runCommand(`gcc "${filePath}" -o "${exePath}"`);
            if (compile.stderr && !compile.stdout)
                return compile;
            return await runCommand(`"${exePath}"`);
        });
    },
    lua: async (code) => {
        return await withTempFile(".lua", code, async (filePath) => {
            return await runCommand(`lua "${filePath}"`);
        });
    },
    kotlin: async (code) => {
        return await withTempFile(".kt", code, async (filePath) => {
            const jarPath = filePath.replace(".kt", ".jar");
            const compile = await runCommand(`kotlinc "${filePath}" -include-runtime -d "${jarPath}"`);
            if (compile.stderr && !compile.stdout)
                return compile;
            return await runCommand(`java -jar "${jarPath}"`);
        });
    },
};
const formatResponse = (result) => {
    const content = [];
    if (result.stdout)
        content.push({ type: "text", text: result.stdout });
    if (!result.stdout && !result.stderr)
        content.push({ type: "text", text: "(no output)" });
    if (result.stderr)
        content.push({ type: "text", text: `Error/Stderr: ${result.stderr}` });
    return {
        content,
        isError: !!result.stderr && !result.stdout
    };
};
// --- Tool Registration (mode-aware) ---
const splitMode = process.argv.includes("--split") || process.argv.includes("-s");
if (splitMode) {
    // Split mode: one tool per language, no generic eval
    Object.entries(handlers).forEach(([lang, handler]) => {
        server.registerTool(`eval_${lang}`, {
            description: `Evaluates ${lang} code.`,
            inputSchema: zod_1.z.object({
                code: zod_1.z.string().describe("The source code to execute.")
            })
        }, async ({ code }) => {
            await ensureInstalled(lang);
            const result = await handler(code);
            return formatResponse(result);
        });
    });
}
else {
    // Default mode: single generic eval tool only
    server.registerTool("eval", {
        description: "Evaluates source code in multiple languages.",
        inputSchema: zod_1.z.object({
            language: zod_1.z.enum([
                "powershell", "cmd", "python", "node", "ruby", "perl", "php",
                "rust", "go", "csharp", "vb", "java", "cpp", "c", "lua", "kotlin"
            ]).describe("The language to execute."),
            code: zod_1.z.string().describe("The source code to execute.")
        })
    }, async ({ language, code }) => {
        await ensureInstalled(language);
        const handler = handlers[language];
        if (!handler) {
            return {
                content: [{ type: "text", text: `Unsupported language: ${language}` }],
                isError: true
            };
        }
        const result = await handler(code);
        return formatResponse(result);
    });
}
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error(`Eval-MCP Server running in ${splitMode ? "split" : "generic"} mode`);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
