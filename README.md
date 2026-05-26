# Breaking News Overlay for Streamer.bot

A GitHub Pages-hosted OBS browser overlay controlled by Streamer.bot's built-in WebSocket server.

## Files

```text
index.html                         Preview/customizer page
overlay/index.html                 OBS overlay page
overlay/overlay.css                Overlay styling
overlay/overlay.js                 Overlay WebSocket + queue logic
streamerbot/BreakingNewsOverlay.cs Streamer.bot C# controller code
```

## OBS setup

1. Enable the Streamer.bot WebSocket Server.
2. Add an OBS Browser Source.
3. Set width to `1920` and height to `1080`.
4. Paste the generated overlay URL from the customizer.
5. Leave OBS custom CSS empty unless you intentionally want to override the overlay.

## GitHub Pages setup

1. Create a GitHub repository.
2. Upload these files to the repository root.
3. In GitHub, go to **Settings > Pages**.
4. Deploy from the default branch root.
5. Open the GitHub Pages URL. The root page is the customizer. The actual OBS overlay is under `/overlay/`.

## Streamer.bot setup

Create one Streamer.bot action named:

```text
BN - Core Controller
```

Add an **Execute C# Code** sub-action and paste the contents of:

```text
streamerbot/BreakingNewsOverlay.cs
```

Then create helper actions that call this core action with arguments.

## Suggested helper actions

### BN - Show Test

Arguments:

```text
bnAction = test
headline = This is a test breaking news headline from Streamer.bot.
subtitle = STREAM UPDATE
durationSeconds = 12
```

### BN - Queue Message

Arguments:

```text
bnAction = queue
headline = Your headline here
subtitle = Optional static subtitle
durationSeconds = 12
```

### BN - Force Message

Arguments:

```text
bnAction = force
headline = This replaces the current message immediately.
subtitle = URGENT UPDATE
durationSeconds = 12
```

### BN - Hide

Arguments:

```text
bnAction = hide
```

### BN - Clear Queue

Arguments:

```text
bnAction = clear
```

### BN - Clear and Hide

Arguments:

```text
bnAction = clearAndHide
```

## Command payload format

Streamer.bot broadcasts JSON like this:

```json
{
  "overlay": "breaking-news",
  "type": "BREAKING_NEWS",
  "version": "1.0.0",
  "action": "queue",
  "headline": "Example headline",
  "subtitle": "STREAM UPDATE",
  "durationSeconds": 12,
  "overrides": {
    "labelBg": "#b00020",
    "labelText": "#ffffff",
    "tickerBg": "#f5f5f5",
    "tickerText": "#111111",
    "scrollSpeed": 210
  }
}
```

Supported actions:

```text
queue
show
force
update
hide
clear
clearAndHide
settings
sync
test
```

## URL parameters

Connection:

```text
host
port
endpoint
secure
password
debug
```

Visual customization:

```text
label
subtitle
barHeight
barBottom
barSideMargin
labelWidth
barRadius
labelBg
labelText
subtitleBg
subtitleText
tickerBg
tickerText
fontFamily
labelSize
subtitleSize
headlineSize
scrollSpeed
defaultDurationSeconds
```

## Notes

- The overlay is designed for a `1920 × 1080` OBS Browser Source.
- The default bar height is `96px`, which is about 8.9% of a 1080p canvas.
- `durationSeconds = 0` makes the current message persistent until hidden.
- `scrollSpeed` is pixels per second; higher values scroll faster.
