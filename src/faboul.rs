use crate::error::Error;
use serde::Deserialize;

#[derive(Deserialize)]
pub(crate) struct Data {
    // pub(crate) cachetid: String,
    // pub(crate) version: String,
    // pub(crate) uri: String,
    pub(crate) startdatum: String,
    pub(crate) slutdatum: String,
    pub(crate) dagar: Vec<Dag>,
}

#[derive(Deserialize, Debug)]
pub(crate) struct Dag {
    // pub(crate) datum: String,
    pub(crate) veckodag: String,
    #[serde(rename = "arbetsfri dag")]
    pub(crate) arbetsfri_dag: String,
    #[serde(rename = "röd dag")]
    pub(crate) rod_dag: String,
    pub(crate) vecka: String,
    #[serde(rename = "dag i vecka")]
    pub(crate) dag_i_vecka: String,
    // pub(crate) namnsdag: Vec<String>,
    // pub(crate) flaggdag: String,
}

pub(crate) async fn get_month_from_api(year: usize, month: usize) -> Result<Data, Error> {
    // https://sholiday.faboul.se/:year
    // https://sholiday.faboul.se/:year/:month
    // https://sholiday.faboul.se/:year/:month/:day

    let url = format!(
        "https://sholiday.faboul.se/dagar/v2.1/{}/{:0>2}",
        year, month
    );

    reqwest::get(url)
        .await
        .map_err(Error::FailedToGetCalendarData)?
        .json::<Data>()
        .await
        .map_err(Error::FailedToGetCalendarData)
}
