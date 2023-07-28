use crate::error::Error::InvalidFaboulJson;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

#[derive(Debug)]
pub enum Error {
    InvalidCalendarApiData(&'static str),
    FailedToRetrieveCalendarApiData(reqwest::Error),
    InvalidFaboulJson(String),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let body = match self {
            Error::InvalidCalendarApiData(e) => e.into(),
            Error::FailedToRetrieveCalendarApiData(e) => {
                format!("{:?}", e)
            }
            InvalidFaboulJson(s) => s,
        };
        (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        InvalidFaboulJson(e.to_string())
    }
}
