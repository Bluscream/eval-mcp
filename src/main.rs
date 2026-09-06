//! eval-mcp — run short scripts in many languages over MCP.

mod args;
mod policy;
mod tools;

use std::sync::Arc;

use clap::Parser;
use mcp_toolkit::ServerOptions;

use policy::Policy;
use tools::EvalTools;

#[derive(Parser, Debug)]
#[command(
    name = "eval-mcp",
    version,
    about = "Run short scripts in 30+ languages as an MCP server",
    long_about = "Runs caller-supplied code as the user who started the server. \
                  Execution is refused unless --allow-execution is passed."
)]
struct Cli {
    #[command(flatten)]
    server: ServerOptions,

    /// Permit running code. Without this every call is refused.
    #[arg(long, env = "EVAL_MCP_ALLOW_EXECUTION")]
    allow_execution: bool,

    /// Restrict to these languages. Repeatable. All are allowed if unset.
    #[arg(long = "language", value_name = "NAME", env = "EVAL_MCP_LANGUAGES")]
    languages: Vec<String>,
}

#[tokio::main]
async fn main() -> std::process::ExitCode {
    let cli = Cli::parse();
    let policy = Policy::new(cli.allow_execution, &cli.languages);
    let group = Arc::new(EvalTools::new(policy));

    match mcp_toolkit::run("eval", env!("CARGO_PKG_VERSION"), group, cli.server).await {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(err) => {
            eprintln!("eval-mcp: {err}");
            std::process::ExitCode::FAILURE
        }
    }
}
