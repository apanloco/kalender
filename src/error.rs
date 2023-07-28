use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

#[derive(Debug)]
pub enum Error {
    InvalidCalendarApiData(&'static str),
    FailedToRetrieveCalendarApiData(reqwest::Error),
    InvalidFaboulJson(String),
    InvalidDate,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        match self {
            Error::InvalidCalendarApiData(e) => {
                (StatusCode::INTERNAL_SERVER_ERROR, e).into_response()
            }
            Error::FailedToRetrieveCalendarApiData(e) => {
                (StatusCode::INTERNAL_SERVER_ERROR, format!("{:?}", e)).into_response()
            }
            Error::InvalidFaboulJson(s) => (StatusCode::INTERNAL_SERVER_ERROR, s).into_response(),
            Error::InvalidDate => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Invalid date").into_response()
            }
        }
    }
}

impl From<serde_json::Error> for Error {
    fn from(e: serde_json::Error) -> Self {
        Error::InvalidFaboulJson(e.to_string())
    }
}
