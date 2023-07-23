use crate::error::Error;
use crate::faboul;
use serde::Serialize;
use std::collections::hash_map::Entry;
use std::collections::HashMap;
use tokio::sync::Mutex;
use tracing::info;

pub struct Calendar {
    cache: Mutex<HashMap<YearMonth, CalendarData>>,
}

#[derive(Copy, Clone, Eq, PartialEq, Hash)]
struct YearMonth {
    year: usize,
    month: usize,
}

impl YearMonth {
    pub fn new(mut year: usize, mut month: usize) -> YearMonth {
        while month < 1 {
            month += 12;
            year -= 1;
        }
        while month > 12 {
            month -= 12;
            year += 1;
        }
        YearMonth { year, month }
    }
}

#[derive(Serialize, Clone)]
pub struct CalendarData {
    pub weeks: Vec<CalendarWeek>,
}

#[derive(Serialize, Clone)]
pub struct CalendarWeek {
    pub days: Vec<CalendarDay>,
}

#[derive(Serialize, Clone)]
pub struct CalendarDay {
    pub date: String,
    pub is_red: bool,
    pub week: usize,
}

async fn generate_calendar_data(year: usize, month: usize) -> Result<CalendarData, Error> {
    info!("generating cache");

    let months = vec![
        YearMonth::new(year, month - 1),
        YearMonth::new(year, month),
        YearMonth::new(year, month + 1),
    ];

    let (a, b, c) = tokio::try_join!(
        faboul::get_month_from_api(months[0].year, months[0].month),
        faboul::get_month_from_api(months[1].year, months[1].month),
        faboul::get_month_from_api(months[2].year, months[2].month),
    )?;

    let dagar: Vec<faboul::Dag> = a
        .dagar
        .into_iter()
        .chain(b.dagar.into_iter().chain(c.dagar.into_iter()))
        .collect();

    info!("dagar: {:?}", &dagar);

    Ok(CalendarData { weeks: vec![] })
}

impl Calendar {
    pub fn new() -> Self {
        Self {
            cache: Default::default(),
        }
    }

    pub async fn get_calendar_data_for_month(
        &self,
        year: usize,
        month: usize,
    ) -> Result<CalendarData, Error> {
        let mut cache = self.cache.lock().await;

        let data = match cache.entry(YearMonth::new(year, month)) {
            Entry::Occupied(e) => e.get().clone(),
            Entry::Vacant(e) => {
                let data = generate_calendar_data(year, month).await?;
                e.insert(data.clone());
                data
            }
        };

        Ok(data)
    }
}
