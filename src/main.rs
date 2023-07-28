mod calendar;
mod error;
mod faboul;
mod serde_util;

use crate::calendar::{Calendar, CalendarData};
use crate::error::Error;
use axum::extract::{Path, State};
use axum::{routing::get, Json, Router};
use axum_macros::debug_handler;
use clap::Parser;
use std::net::SocketAddr;
use std::sync::Arc;
use tokio::sync::Mutex;
use tracing::info;

#[derive(Clone)]
struct AppState {
    pub faboul: Arc<Mutex<Calendar>>,
}

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Turn on debug logs (specify twice for very verbose logs)
    #[arg(short = 'v', long, action = clap::ArgAction::Count, global = true)]
    verbose: u8,

    /// What ip to listen to (default: 127.0.0.1)
    #[arg(short, long, default_value = "0.0.0.0")]
    listen: String,

    /// What port to listen to (default: 8080)
    #[arg(short, long, default_value_t = 8080)]
    port: usize,
}

fn get_log_level(verbosity: u8) -> tracing::Level {
    match verbosity {
        0 => tracing::Level::ERROR,
        1 => tracing::Level::WARN,
        2 => tracing::Level::INFO,
        3 => tracing::Level::DEBUG,
        _ => tracing::Level::TRACE,
    }
}

#[tokio::main]
async fn main() {
    let args = Cli::parse();

    tracing_subscriber::fmt()
        .with_max_level(get_log_level(args.verbose))
        .init();

    let app_state = AppState {
        faboul: Arc::new(Mutex::new(Calendar::new())),
    };

    let app = Router::new()
        .route("/:year/:month", get(handler))
        .with_state(app_state);

    let addr: SocketAddr = format!("{}:{}", args.listen, args.port)
        .parse()
        .expect("Failed to parse SocketAddr");

    info!("starting server on {:?}", &addr);

    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

#[debug_handler]
async fn handler(
    Path((year, month)): Path<(usize, usize)>,
    State(app_state): State<AppState>,
) -> Result<Json<CalendarData>, Error> {
    info!("year: {}, month: {}", year, month);
    let data = app_state
        .faboul
        .lock()
        .await
        .get_calendar_data_for_month(year, month)
        .await?;
    info!("calendar data retrieved");
    Ok(Json(data))
}
