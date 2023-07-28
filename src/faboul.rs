use crate::error::Error;
use crate::serde_util::*;
use serde::Deserialize;

#[derive(Clone, Debug, PartialEq)]
pub struct Datum {
    pub år: usize,
    pub månad: usize,
    pub dag: usize,
}

#[derive(Deserialize, Clone, Debug)]
pub struct Dag {
    /// "datum": "2021-02-22"
    #[serde(deserialize_with = "deserialize_date_from_string")]
    pub datum: Datum,

    /// "veckodag": "Måndag"
    // NOTE: superfluous, "dag i vecka" replaces it
    pub veckodag: String,

    /// "arbetsfri dag": "Nej"
    #[serde(
        default,
        rename = "arbetsfri dag",
        deserialize_with = "deserialize_swedish_bool_from_string"
    )]
    pub arbetsfri_dag: bool,

    /// "röd dag": "Nej"
    #[serde(
        default,
        rename = "röd dag",
        deserialize_with = "deserialize_swedish_bool_from_string"
    )]
    pub rod_dag: bool,

    /// "vecka": "08"
    #[serde(deserialize_with = "deserialize_number_from_string")]
    pub vecka: usize,

    /// "dag i vecka": "2"
    #[serde(deserialize_with = "deserialize_number_from_string")]
    #[serde(rename = "dag i vecka")]
    pub dag_i_vecka: usize,

    /// "helgdag": "Långfredagen"
    pub helgdag: Option<String>,

    /// "helgdagsafton": "Skärtorsdagen"
    pub helgdagsafton: Option<String>,

    /// "dag före arbetsfri helgdag": "Ja"
    #[serde(
        default,
        rename = "dag före arbetsfri helgdag",
        deserialize_with = "deserialize_swedish_bool_from_string"
    )]
    pub dag_fore_arbetsfri_helgdag: bool,

    /// "namnsdag": [
    //         "Torsten",
    //         "Torun"
    //       ]
    #[serde(default)]
    pub namnsdag: Vec<String>,

    /// "flaggdag": ""
    /// "flaggdag": "Kronprinsessan Victorias namnsdag"
    #[serde(default)]
    #[serde(deserialize_with = "crate::serde_util::empty_string_is_none")]
    pub flaggdag: Option<String>,
}

#[derive(Deserialize)]
pub(crate) struct Data {
    // pub(crate) cachetid: String,
    // pub(crate) version: String,
    // pub(crate) uri: String,
    // pub(crate) startdatum: String,
    // pub(crate) slutdatum: String,
    pub(crate) dagar: Vec<Dag>,
}

fn parse_api_data(data: &str) -> Result<Data, Error> {
    Ok(serde_json::from_str(data)?)
}

pub(crate) async fn get_month_from_api(year: usize, month: usize) -> Result<Data, Error> {
    // https://sholiday.faboul.se/:year
    // https://sholiday.faboul.se/:year/:month
    // https://sholiday.faboul.se/:year/:month/:day

    let url = format!(
        "http://sholiday.faboul.se/dagar/v2.1/{}/{:0>2}",
        year, month
    );

    let s = reqwest::get(url)
        .await
        .map_err(Error::FailedToRetrieveCalendarApiData)?
        .text()
        .await
        .map_err(Error::FailedToRetrieveCalendarApiData)?;

    parse_api_data(&s)
}

#[test]
fn test_basic() -> Result<(), Error> {
    let input = r#"
{
  "cachetid": "2023-07-28 14:42:05",
  "version": "2.1",
  "uri": "/dagar/v2.1/2021/01/01",
  "startdatum": "2021-01-01",
  "slutdatum": "2021-01-01",
  "dagar": [
    {
      "datum": "2021-01-01",
      "veckodag": "Fredag",
      "arbetsfri dag": "Ja",
      "röd dag": "Ja",
      "vecka": "53",
      "dag i vecka": "5",
      "helgdag": "Nyårsdagen",
      "namnsdag": [],
      "flaggdag": "Nyårsdagen"
    }
  ]
}
    "#;

    let d: Data = parse_api_data(input)?;

    assert_eq!(d.dagar.len(), 1);

    let d = d.dagar.first().unwrap();

    assert_eq!(
        d.datum,
        Datum {
            år: 2021,
            månad: 1,
            dag: 1,
        }
    );
    assert_eq!(d.vecka, 53);
    assert_eq!(d.dag_i_vecka, 5);
    assert_eq!(d.helgdag, Some("Nyårsdagen".into()));
    assert!(d.namnsdag.is_empty());
    assert_eq!(d.flaggdag, Some("Nyårsdagen".into()));

    Ok(())
}

#[test]
fn test_missing_fields() -> Result<(), Error> {
    let input = r#"
{
  "dagar": [
    {
      "datum": "2021-01-01",
      "vecka": "53",
      "dag i vecka": "5",
      "veckodag": "Fredag"
    }
  ]
}
    "#;

    let d: Data = parse_api_data(input)?;

    assert_eq!(d.dagar.len(), 1);

    let d = d.dagar.first().unwrap();

    assert!(!d.arbetsfri_dag);
    assert!(!d.rod_dag);
    assert_eq!(d.vecka, 53);
    assert_eq!(d.dag_i_vecka, 5);
    assert_eq!(d.helgdag, None);
    assert_eq!(d.helgdagsafton, None);
    assert!(!d.dag_fore_arbetsfri_helgdag);
    assert!(d.namnsdag.is_empty());
    assert_eq!(d.flaggdag, None);

    Ok(())
}
