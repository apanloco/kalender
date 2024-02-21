#!/usr/bin/env bash

YEAR_MIN=1903
YEAR_MAX=2998

for year in $(seq $YEAR_MIN $YEAR_MAX); do
    for month in {1..12}; do
        echo "Fetching $year/$month"
        mkdir -p $year
        curl -s https://sholiday.faboul.se/dagar/v2.1/$year/$month > $year/$month.json
    done
done
