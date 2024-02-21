use std::collections::hash_map::Entry;
use std::collections::HashMap;

use serde::Serialize;
use tokio::sync::Mutex;
use tracing::info;

use crate::error::Error;
use crate::faboul;
use crate::faboul::Datum;

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
    pub year: usize,
    pub year_prev: usize,
    pub year_next: usize,
    pub month: usize,
    pub month_prev: usize,
    pub month_next: usize,
}

#[derive(Serialize, Clone)]
pub struct CalendarWeek {
    pub week: usize,
    pub days: Vec<CalendarDay>,
}

#[derive(Serialize, Clone)]
pub struct CalendarDate {
    pub year: usize,
    pub month: usize,
    pub day: usize,
}

impl From<&Datum> for CalendarDate {
    fn from(v: &Datum) -> Self {
        Self {
            year: v.år,
            month: v.månad,
            day: v.dag,
        }
    }
}

#[derive(Serialize, Clone)]
pub struct CalendarDay {
    pub date: CalendarDate,
    pub off: bool,
    pub name: Option<String>,
    pub flagday: Option<String>,
    pub name_days: Vec<String>,
}

impl From<&faboul::Dag> for CalendarDay {
    fn from(d: &faboul::Dag) -> Self {
        let mut name: Option<String> = None;
        if let Some(helgdag) = &d.helgdag {
            name = Some(helgdag.into());
        }
        if let Some(afton) = &d.helgdagsafton {
            name = Some(afton.into());
        }
        CalendarDay {
            date: (&d.datum).into(),
            off: d.arbetsfri_dag,
            name,
            flagday: d.flaggdag.clone(),
            name_days: d.namnsdag.clone(),
        }
    }
}

fn verify_date(year: usize, month: usize) -> Result<(), Error> {
    const MIN_YEAR: usize = 1903;
    const MAX_YEAR: usize = 2998;

    const MIN_MONTH: usize = 1;
    const MAX_MONTH: usize = 12;

    if !(MIN_YEAR..=MAX_YEAR).contains(&year) {
        return Err(Error::InvalidDate);
    }
    if !(MIN_MONTH..=MAX_MONTH).contains(&month) {
        return Err(Error::InvalidDate);
    }
    Ok(())
}

async fn get_needed_days_from_api(year: usize, month: usize) -> Result<Vec<faboul::Dag>, Error> {
    let months = [
        YearMonth::new(year, month - 1),
        YearMonth::new(year, month),
        YearMonth::new(year, month + 1),
    ];

    let (a, b, c) = tokio::try_join!(
        faboul::get_month_from_api(months[0].year, months[0].month),
        faboul::get_month_from_api(months[1].year, months[1].month),
        faboul::get_month_from_api(months[2].year, months[2].month),
    )?;

    let Some(first_day) = b.dagar.first() else {
        return Err(Error::InvalidCalendarApiData("no days for month"));
    };

    let Some(last_day) = b.dagar.last() else {
        return Err(Error::InvalidCalendarApiData("no days for month"));
    };

    let extra_days_begin = first_day.dag_i_vecka - 1;
    let extra_days_end = 7 - last_day.dag_i_vecka;

    let pre = a.dagar.iter().skip(a.dagar.len() - extra_days_begin);
    let post = c.dagar.iter();

    let dagar: Vec<faboul::Dag> = pre
        .take(extra_days_begin)
        .chain(b.dagar.iter().chain(post.take(extra_days_end)))
        .cloned()
        .collect();

    if dagar.len() % 7 != 0 {
        return Err(Error::InvalidCalendarApiData("no days for month"));
    }

    Ok(dagar)
}

async fn generate_calendar_data(year: usize, month: usize) -> Result<CalendarData, Error> {
    info!("generating cache");

    let dagar = get_needed_days_from_api(year, month).await?;

    info!("dagar: {:?}", &dagar);

    let mut calendar_data = CalendarData {
        weeks: Vec::with_capacity(dagar.len() / 7),
        year,
        year_prev: if month == 1 { year - 1 } else { year },
        year_next: if month == 12 { year + 1 } else { year },
        month,
        month_prev: if month == 1 { 12 } else { month - 1 },
        month_next: if month == 12 { 1 } else { month + 1 },
    };

    for week in dagar.chunks(7) {
        let week_number = week.first().unwrap().vecka;
        let days: Vec<CalendarDay> = week.iter().map(|d| d.into()).collect();
        calendar_data.weeks.push(CalendarWeek {
            week: week_number,
            days,
        });
    }

    Ok(calendar_data)
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
        verify_date(year, month)?;

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
