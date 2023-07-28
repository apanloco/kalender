use chrono::Datelike;
use serde::de::Unexpected;
use serde::{de, Deserializer};
use std::fmt::Display;
use std::str::FromStr;

use crate::faboul;
use serde::Deserialize;

// deserialize_number_from_string is taken from: https://github.com/vityafx/serde-aux/blob/master/src/field_attributes.rs
pub fn deserialize_number_from_string<'de, T, D>(deserializer: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: FromStr + serde::Deserialize<'de>,
    <T as FromStr>::Err: Display,
{
    #[derive(Deserialize)]
    #[serde(untagged)]
    enum StringOrInt<T> {
        String(String),
        Number(T),
    }

    match StringOrInt::<T>::deserialize(deserializer)? {
        StringOrInt::String(s) => s.parse::<T>().map_err(serde::de::Error::custom),
        StringOrInt::Number(i) => Ok(i),
    }
}

pub fn deserialize_swedish_bool_from_string<'de, D>(deserializer: D) -> Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    let s: &str = de::Deserialize::deserialize(deserializer)?;

    match s {
        "Ja" => Ok(true),
        "Nej" => Ok(false),
        _ => Err(de::Error::unknown_variant(s, &["Ja", "Nej"])),
    }
}

pub fn deserialize_date_from_string<'de, D>(deserializer: D) -> Result<faboul::Datum, D::Error>
where
    D: Deserializer<'de>,
{
    let s: &str = de::Deserialize::deserialize(deserializer)?;

    let d = chrono::naive::NaiveDate::parse_and_remainder(s, "%Y-%m-%d");

    match d {
        Ok(d) => Ok(faboul::Datum {
            år: d.0.year() as usize,
            månad: d.0.month() as usize,
            dag: d.0.day() as usize,
        }),
        Err(_) => Err(de::Error::invalid_value(
            Unexpected::Str(s),
            &"YEAR:MONTH:DAY",
        )),
    }
}

pub fn is_false(b: &bool) -> bool {
    !(*b)
}

pub fn empty_string_is_none<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: Deserializer<'de>,
{
    let s = String::deserialize(deserializer)?;
    if s.is_empty() {
        Ok(None)
    } else {
        Ok(Some(s))
    }
}
