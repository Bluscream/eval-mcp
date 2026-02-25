# eval-mcp

An MCP server for evaluating code in multiple languages.

## Features

Supports evaluating code in:
- PowerShell
- Batch/CMD
- Python
- Node.js
- Ruby
- Perl
- PHP
- Rust (requires `rustc`)
- Go (requires `go`)
- C# (via PowerShell `Add-Type`)
- VB.NET (via PowerShell `Add-Type`)
- Java (requires `javac` and `java`)
- C++ (requires `g++` or `cl.exe`)
- C (requires `gcc` or `cl.exe`)

## Installation

### Configuration

Add this to your `mcp_config.json`:

```json
{
  "mcpServers": {
    "eval-mcp": {
      "command": "node",
      "args": ["p:/MCPs/eval-mcp/dist/index.js"]
    }
  }
}
```

## Tools

- `eval_powershell`: Execute PowerShell code.
- `eval_cmd`: Execute Batch/CMD commands.
- `eval_python`: Execute Python code.
- `eval_node`: Execute Node.js code.
- `eval_ruby`: Execute Ruby code.
- `eval_perl`: Execute Perl code.
- `eval_php`: Execute PHP code.
- `eval_rust`: Compile and run Rust code.
- `eval_go`: Run Go code.
- `eval_csharp`: Evaluate C# code.
- `eval_vb`: Evaluate VB.NET code.
- `eval_java`: Compile and run Java code.
- `eval_cpp`: Compile and run C++ code.
- `eval_c`: Compile and run C code.
