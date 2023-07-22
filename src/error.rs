use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};

pub enum Error {
    FailedToGetCalendarData(reqwest::Error),
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let body = match self {
            Error::FailedToGetCalendarData(e) => {
                format!("{:?}", e)
            }
        };
        (StatusCode::INTERNAL_SERVER_ERROR, body).into_response()
    }
}
