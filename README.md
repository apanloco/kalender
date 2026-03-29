# Kalender

A Swedish calendar with holidays, name days, flag days, and week numbers.
Fully client-side — no backend, no external API dependencies.

Hosted at: https://kalender.akerud.se

## Tech

- Vanilla JavaScript (ES modules)
- Vanilla CSS
- No frameworks, no build tools, no npm

## Development

Start a local server:

```
python3 -m http.server 8888
```

Open http://localhost:8888

## Testing

Unit tests (Node):

```
node test/test-engine.js
node test/test-api.js
```

Browser test suite: http://localhost:8888/test/test.html

Faboul API validation (every day, 2005-2030):

```
node -e "import { runFaboulValidation } from './test/test-against-faboul.js'; await runFaboulValidation();"
```

## Files

```
index.html              Entry point
css/calendar.css        Styles
js/calendar-engine.js   Date math, Easter, holidays, week numbers
js/namedays.js          619 Swedish name days
js/calendar-api.js      Public API: getMonth(), getDay(), getYear(), getWeek()
js/calendar-ui.js       Rendering + navigation
js/app.js               Bootstrap
test/                   Test suite
legacy/                 Previous Rust/Axum backend
```

## License

MIT
