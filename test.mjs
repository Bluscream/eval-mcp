#!/usr/bin/env node
/**
 * eval-mcp test runner
 * Spawns the server in generic mode and calls every language with a
 * version-info + datetime snippet, printing a formatted results table.
 *
 * Usage:
 *   node test.mjs          # generic mode (single eval tool)
 *   node test.mjs --split  # split mode  (individual eval_* tools)
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverPath = path.join(__dirname, "dist", "index.js");
const splitMode = process.argv.includes("--split");

// ── Language test snippets ──────────────────────────────────────────────────
// Each snippet should print a single line:
//   Language | Version | Path | DateTime
const TESTS = [
    {
        lang: "powershell",
        code: `Write-Output "PowerShell|$($PSVersionTable.PSVersion)|$((Get-Process -Id $PID).Path)|$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"`
    },
    {
        lang: "cmd",
        code: `echo CMD|Windows %OS%|%ComSpec%|%DATE% %TIME%`
    },
    {
        lang: "python",
        code: `import sys,datetime\nprint(f"Python|{sys.version.split()[0]}|{sys.executable}|{datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")`
    },
    {
        lang: "node",
        code: `console.log(\`Node|\${process.version}|\${process.execPath}|\${new Date().toISOString().replace('T',' ').slice(0,19)}\`);`
    },
    {
        lang: "ruby",
        code: `require 'rbconfig'\nputs "Ruby|\#{RUBY_VERSION}|\#{RbConfig.ruby}|\#{Time.now.strftime('%Y-%m-%d %H:%M:%S')}"`
    },
    {
        lang: "perl",
        code: `use POSIX qw(strftime);\nprintf "Perl|%s|%s|%s\\n", $], $^X, strftime("%Y-%m-%d %H:%M:%S", localtime);`
    },
    {
        lang: "php",
        code: `<?php echo "PHP|" . PHP_VERSION . "|" . PHP_BINARY . "|" . date("Y-m-d H:i:s") . "\\n";`
    },
    {
        lang: "go",
        code: `package main\nimport ("fmt";"os";"runtime";"time")\nfunc main() {\n    p, _ := os.Executable()\n    fmt.Printf("Go|%s|%s|%s\\n", runtime.Version(), p, time.Now().Format("2006-01-02 15:04:05"))\n}`
    },
    {
        lang: "rust",
        code: `fn main() {\n    let exe = std::env::current_exe().map(|p| p.display().to_string()).unwrap_or_else(|_| "?".into());\n    let secs = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();\n    println!("Rust|(compiled with rustc)|{}|unix:{}", exe, secs);\n}`
    },
    {
        lang: "java",
        code: `public class Main {\n    public static void main(String[] args) {\n        System.out.printf("Java|%s|%s|%s%n",\n            System.getProperty("java.version"),\n            System.getProperty("java.home"),\n            new java.util.Date());\n    }\n}`
    },
    {
        lang: "cpp",
        code: `#include <iostream>\n#include <ctime>\nint main() {\n    time_t t = time(nullptr); char buf[64];\n    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", localtime(&t));\n    std::cout << "C++|GCC " << __VERSION__ << "|(compiled)|" << buf << std::endl;\n}`
    },
    {
        lang: "c",
        code: `#include <stdio.h>\n#include <time.h>\nint main() {\n    time_t t = time(NULL); char buf[64];\n    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", localtime(&t));\n    printf("C|GCC " __VERSION__ "|(compiled)|%s\\n", buf);\n}`
    },
    {
        lang: "csharp",
        code: `using System;\nConsole.WriteLine($"C#|.NET {Environment.Version}|{Environment.ProcessPath}|{DateTime.Now:yyyy-MM-dd HH:mm:ss}");`
    },
    {
        lang: "vb",
        code: `Imports System\nModule Program\n    Sub Main()\n        Console.WriteLine($"VB.NET|.NET {Environment.Version}|{Environment.ProcessPath}|{DateTime.Now:yyyy-MM-dd HH:mm:ss}")\n    End Sub\nEnd Module`
    },
    {
        lang: "lua",
        code: `print(string.format("Lua|%s|%s|%s", _VERSION, arg and arg[-1] or "lua", os.date("%Y-%m-%d %H:%M:%S")))`
    },
    {
        lang: "kotlin",
        code: `fun main() {\n    val jv = System.getProperty("java.version")\n    val exe = ProcessHandle.current().info().command().orElse("?")\n    println("Kotlin|\${KotlinVersion.CURRENT} (JVM \${jv})|\${exe}|\${java.time.LocalDateTime.now()}")\n}`
    },
];

// ── Connect ─────────────────────────────────────────────────────────────────
const serverArgs = [serverPath];
if (splitMode) serverArgs.push("--split");

const transport = new StdioClientTransport({ command: "node", args: serverArgs });
const client = new Client({ name: "eval-test", version: "1.0.0" }, { capabilities: {} });
await client.connect(transport);

// ── Run tests ────────────────────────────────────────────────────────────────
const PAD = 10;
const SEP = "─".repeat(90);
let passed = 0, failed = 0;

console.log(`\neval-mcp test runner  [${splitMode ? "split" : "generic"} mode]\n${SEP}`);
console.log(`${"LANGUAGE".padEnd(PAD)} ${"VERSION / INFO".padEnd(30)} ${"PATH".padEnd(30)} DATETIME`);
console.log(SEP);

for (const { lang, code } of TESTS) {
    const toolName = splitMode ? `eval_${lang}` : "eval";
    const toolArgs = splitMode ? { code } : { language: lang, code };

    try {
        const result = await client.callTool({ name: toolName, arguments: toolArgs });
        const text = result.content
            .filter(c => c.type === "text")
            .map(c => c.text.trim())
            .join(" ")
            .replace(/\r?\n.*$/s, ""); // first line only

        if (result.isError) {
            console.log(`${"✗ " + lang.toUpperCase().padEnd(PAD - 2)} ERROR: ${text.slice(0, 70)}`);
            failed++;
        } else {
            const [, version, exePath, datetime] = text.split("|");
            console.log(
                `${"✓ " + lang.padEnd(PAD - 2)} ${(version ?? "").padEnd(30)} ${(exePath ?? "").padEnd(30)} ${datetime ?? ""}`
            );
            passed++;
        }
    } catch (err) {
        console.log(`${"✗ " + lang.toUpperCase().padEnd(PAD - 2)} EXCEPTION: ${err.message.slice(0, 70)}`);
        failed++;
    }
}

console.log(SEP);
console.log(`Results: ${passed} passed, ${failed} failed out of ${TESTS.length} languages\n`);

await client.close().catch(() => {});
process.exit(failed > 0 ? 1 : 0);
