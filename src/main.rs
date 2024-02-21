use std::net::SocketAddr;
use std::sync::Arc;

use askama::Template;
use axum::{Json, Router, routing::get};
use axum::extract::{Path, State};
use axum::response::Html;
use chrono::{Datelike, Utc};
use chrono_tz::Europe::Stockholm;
use clap::Parser;
use tokio::net::TcpListener;
use tokio::sync::Mutex;
use tower_http::compression::{CompressionLayer, predicate::SizeAbove};
use tracing::info;
use tower_http::{
    services::{ServeDir},
};

use crate::calendar::{Calendar, CalendarData};
use crate::error::Error;

mod calendar;
mod error;
mod faboul;
mod serde_util;

const MONTHS: [&str; 12] = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December",
];

const DAYS: [&str; 7] = [
    "Måndag", "Tisdag", "Onsdag", "Torsdag", "Fredag", "Lördag", "Söndag",
];

#[derive(Clone)]
struct AppState {
    pub calendar: Arc<Mutex<Calendar>>,
}

#[derive(Template)]
#[template(path = "main.html")]
struct CalendarTemplate {
    data: CalendarData,
    months: &'static [&'static str; 12],
    days: &'static [&'static str; 7],
    today_year: usize,
    today_month: usize,
    today_day: usize,
    selected_month: usize,
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

    tracing_subscriber::fmt().with_max_level(get_log_level(args.verbose)).init();

    let app_state = AppState {
        calendar: Arc::new(Mutex::new(Calendar::new())),
    };

    let app = Router::new()
        .nest_service("/static", ServeDir::new("static"))
        .route("/api/:year/:month", get(handler_json))
        .route("/:year/:month", get(handler_html))
        .route("/", get(handler_root))
        .layer(CompressionLayer::new().compress_when(SizeAbove::new(0)))
        .with_state(app_state);

    let addr: SocketAddr = format!("{}:{}", args.listen, args.port).parse().expect("Failed to parse SocketAddr");

    info!("starting server on {:?}", &addr);

    let listener = TcpListener::bind(addr).await.unwrap();

    axum::serve(listener, app).await.unwrap();
}

async fn handler_json(
    Path((year, month)): Path<(usize, usize)>,
    State(app_state): State<AppState>,
) -> Result<Json<CalendarData>, Error> {
    info!("year: {}, month: {}", year, month);
    let data = app_state.calendar.lock().await.get_calendar_data_for_month(year, month).await?;
    Ok(Json(data))
}

async fn handler_html(
    Path((year, month)): Path<(usize, usize)>,
    State(app_state): State<AppState>,
) -> Result<Html<String>, Error> {
    info!("year: {}, month: {}", year, month);
    let data = app_state.calendar.lock().await.get_calendar_data_for_month(year, month).await?;
    Ok(Html(generate_page(month, data)))
}

async fn handler_root(
    State(app_state): State<AppState>,
) -> Result<Html<String>, Error> {
    let now_utc = Utc::now();
    let now_sweden = now_utc.with_timezone(&Stockholm);
    let year = now_sweden.year() as usize;
    let month = now_sweden.month() as usize;
    let data = app_state.calendar.lock().await.get_calendar_data_for_month(year, month).await?;
    Ok(Html(generate_page(month, data)))
}

fn generate_page(month: usize, data: CalendarData) -> String {
    let now_utc = Utc::now();
    let now_sweden = now_utc.with_timezone(&Stockholm);
    let calendar = CalendarTemplate {
        data,
        months: &MONTHS,
        days: &DAYS,
        today_year: now_sweden.year() as usize,
        today_month: now_sweden.month() as usize,
        today_day: now_sweden.day() as usize,
        selected_month: month,
    };
    calendar.render().unwrap()
}

#[tokio::test]
async fn test_template() -> Result<(), Error> {
    let cal = crate::calendar::Calendar::new();
    let data_for_month = cal.get_calendar_data_for_month(2024, 2).await?;
    let page = generate_page(2, data_for_month);
    println!("{}", page);
    Ok(())
}
