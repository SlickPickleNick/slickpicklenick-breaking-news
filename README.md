# SlickPickleNick Breaking News Overlay

A Streamer.bot-controlled breaking news ticker for OBS. The overlay is hosted through GitHub Pages and connects to your local Streamer.bot WebSocket server, so you do not need to host the overlay yourself.

## Links

- **Customizer:** https://slickpicklenick.github.io/slickpicklenick-breaking-news/
- **Overlay base URL:** https://slickpicklenick.github.io/slickpicklenick-breaking-news/overlay/

Use the customizer to build your OBS Browser Source URL. The customizer lets you adjust layout, colors, font sizes, connection settings, scroll speed, and default preview text.

## What this system does

- Displays a lower-third breaking news ticker in OBS.
- Uses a static left label, a static subtitle row, and scrolling headline text.
- Connects to Streamer.bot through the Streamer.bot WebSocket Server.
- Supports queued messages, forced messages, hide/reset actions, chat commands, channel point redemptions, and Stream Deck buttons.
- Shows a red **Connecting...** status bar while waiting for Streamer.bot.
- Shows a green **Connected!** status bar briefly after the WebSocket connects.

## Requirements

- OBS Studio
- Streamer.bot
- Twitch account connected to Streamer.bot, if using chat commands or channel point rewards
- Streamer.bot WebSocket Server enabled

## Quick setup

### 1. Enable Streamer.bot WebSocket Server

In Streamer.bot, open:

```text
Servers/Clients → WebSocket Server
```

Recommended local settings:

```text
Auto Start: Enabled
Address: 127.0.0.1
Port: 8080
Endpoint: /
Authentication: Disabled for first-time testing
```

Start the WebSocket Server.

### 2. Create your overlay URL

Open the customizer:

```text
https://slickpicklenick.github.io/slickpicklenick-breaking-news/
```

Use **Preview Mode** to style the overlay without connecting to Streamer.bot.

Use **Live Mode** to test the real WebSocket connection and incoming Streamer.bot messages.

When finished, copy the generated OBS Browser Source URL.

### 3. Add the OBS Browser Source

In OBS:

```text
Sources → + → Browser
```

Use:

```text
Width: 1920
Height: 1080
URL: generated customizer URL
Custom CSS: leave empty unless intentionally overriding the overlay
```

### 4. Add the Streamer.bot C# API

Create a Streamer.bot action:

```text
Name: BN - Breaking News API
Group: Breaking News Overlay
```

Add this sub-action:

```text
Core → C# → Execute C# Code
```

Set the C# sub-action **Name** to:

```text
BreakingNewsApi
```

Paste the Breaking News Overlay C# code into this sub-action and compile it.

The C# sub-action name is important. Other actions call methods from this named C# code block.

### 5. Run a test message

Create a Streamer.bot action:

```text
Name: BN - Test Message
Group: Breaking News Overlay
```

Add this sub-action:

```text
Core → C# → Execute C# Method
C# Code: BreakingNewsApi
Method: SendTestBreakingNews
```

Run the action. The overlay should show a test message.

## Recommended Streamer.bot actions

These actions provide the basic system.

| Action name | Purpose |
|---|---|
| `BN - Breaking News API` | Stores the C# methods used by all other actions. |
| `BN - Configure Defaults` | Sets saved default label, subtitle, duration, and debug logging. |
| `BN - Test Message` | Sends a test message to confirm the overlay works. |
| `BN - Queue Breaking News` | Adds a message to the queue. |
| `BN - Force Breaking News` | Replaces the current message immediately. |
| `BN - Hide Breaking News` | Hides the current bar. |
| `BN - Clear Queue` | Clears pending queued messages. |
| `BN - Clear and Hide` | Clears queued messages and hides the bar. |
| `BN - Chat Command News` | Lets chat trigger the ticker using `!news`. |
| `BN - Channel Point News` | Lets channel point redemptions trigger the ticker. |

## Configure defaults

Defaults are stored as Streamer.bot persisted global variables. This lets users adjust defaults without editing the C# code.

Recommended defaults:

| Global variable | Purpose | Example |
|---|---|---|
| `bnDefaultSubtitle` | Default subtitle for normal/manual messages | `STREAM UPDATE` |
| `bnDefaultDurationSeconds` | Default message duration | `12` |
| `bnDefaultLabel` | Left-side label text | `BREAKING NEWS` |
| `bnEnableDebugLogs` | Logs outgoing WebSocket payloads | `true` |

Create an action named:

```text
BN - Configure Defaults
```

Add these sub-actions:

```text
Core → Globals → Set Global Variable
```

Use persisted global variables:

```text
bnDefaultSubtitle = STREAM UPDATE
bnDefaultDurationSeconds = 12
bnDefaultLabel = BREAKING NEWS
bnEnableDebugLogs = true
```

Run this action once after setup. Values can be changed and the action can be re-run at any time.

## Main message variables

Use these with **Set Argument** sub-actions before calling a C# method.

| Argument | Purpose | Example |
|---|---|---|
| `headline` | Scrolling ticker text | `Nick forgot to unmute again.` |
| `subtitle` | Static subtitle text | `STREAM UPDATE` |
| `durationSeconds` | Display duration in seconds | `15` |
| `label` | Left label text | `BREAKING NEWS` |

Duration behavior:

```text
durationSeconds = 15
```

Shows the message for 15 seconds.

```text
durationSeconds = 0
```

Keeps the message visible until it is hidden or replaced.

If `durationSeconds` is not provided, the saved default duration is used.

## Basic manual message actions

### Queue a message

Create an action:

```text
BN - Queue Breaking News
```

Sub-actions:

```text
1. Core → Arguments → Set Argument
   Variable Name: headline
   Value: Your scrolling message here

2. Core → C# → Execute C# Method
   C# Code: BreakingNewsApi
   Method: QueueBreakingNews
```

Optional sub-actions before the method:

```text
Set Argument: subtitle = STREAM UPDATE
Set Argument: durationSeconds = 15
Set Argument: label = BREAKING NEWS
```

### Force a message

Create an action:

```text
BN - Force Breaking News
```

Sub-actions:

```text
1. Set Argument
   Variable Name: headline
   Value: Urgent scrolling message here

2. Execute C# Method
   C# Code: BreakingNewsApi
   Method: ForceBreakingNews
```

Use this when a new message should interrupt the current ticker.

### Hide the bar

Create an action:

```text
BN - Hide Breaking News
```

Sub-action:

```text
Execute C# Method
C# Code: BreakingNewsApi
Method: HideBreakingNews
```

### Clear queued messages

Create an action:

```text
BN - Clear Queue
```

Sub-action:

```text
Execute C# Method
C# Code: BreakingNewsApi
Method: ClearBreakingNewsQueue
```

### Clear and hide everything

Create an action:

```text
BN - Clear and Hide
```

Sub-action:

```text
Execute C# Method
C# Code: BreakingNewsApi
Method: ClearAndHideBreakingNews
```

## Chat command setup

The chat command format is:

```text
!news Scrolling Text | Duration Seconds
```

Examples:

```text
!news Nick forgot to unmute again
!news Nick forgot to unmute again | 15
!news This message should stay up | 0
```

The subtitle is generated automatically:

```text
STREAM UPDATE FROM [username]
```

### Create the action

Create an action:

```text
BN - Chat Command News
```

Add a trigger:

```text
Core → Commands → Command Triggered
```

Recommended command settings:

```text
Command: !news
Mode: Starts With
```

Add one sub-action:

```text
Core → C# → Execute C# Method
C# Code: BreakingNewsApi
Method: QueueBreakingNewsFromChatCommand
```

Use `ForceBreakingNewsFromChatCommand` instead if chat messages should replace the current ticker immediately.

## Channel point redemption setup

Channel point redemptions use the viewer's reward input as the scrolling text.

The subtitle is generated automatically:

```text
STREAM UPDATE FROM [username]
```

### Create the action

Create an action:

```text
BN - Channel Point News
```

Add a trigger:

```text
Twitch → Channel Reward → Reward Redemption
```

Select or create a reward, such as:

```text
Breaking News Update
```

Recommended reward setting:

```text
User Input Required: Enabled
```

Add one sub-action:

```text
Core → C# → Execute C# Method
C# Code: BreakingNewsApi
Method: QueueBreakingNewsFromChannelPoint
```

### Optional channel point duration

To set a custom duration for the channel point action, add this before the C# method:

```text
Core → Arguments → Set Argument
Variable Name: durationSeconds
Value: 20
```

For a persistent channel point message:

```text
Variable Name: durationSeconds
Value: 0
```

Then call:

```text
Method: QueueBreakingNewsFromChannelPoint
```

Use `ForceBreakingNewsFromChannelPoint` instead if channel point messages should replace the current ticker immediately.

## Stream Deck button examples

Stream Deck buttons should usually run Streamer.bot actions that use the regular message methods.

### Standard queued message

```text
1. Set Argument
   headline = Nick will be right back. Do not go anywhere.

2. Set Argument
   subtitle = STREAM UPDATE

3. Set Argument
   durationSeconds = 15

4. Execute C# Method
   C# Code: BreakingNewsApi
   Method: QueueBreakingNews
```

### Persistent status message

```text
1. Set Argument
   headline = Nick is currently locked in. Hydration reminders are welcome.

2. Set Argument
   subtitle = ACTIVE STATUS

3. Set Argument
   durationSeconds = 0

4. Execute C# Method
   C# Code: BreakingNewsApi
   Method: ForceBreakingNews
```

Run `BN - Hide Breaking News` or `BN - Clear and Hide` to remove a persistent message.

## C# method reference

### Setup and defaults

| Method | Purpose |
|---|---|
| `InstallBreakingNewsDefaults` | Creates missing persisted global defaults. |
| `SaveBreakingNewsDefaults` | Saves defaults from provided arguments. |
| `ResetBreakingNewsDefaults` | Resets defaults to built-in fallback values. |
| `ShowBreakingNewsDefaults` | Logs current default settings. |

### General overlay control

| Method | Purpose | Common arguments |
|---|---|---|
| `QueueBreakingNews` | Adds a message to the overlay queue. | `headline`, `subtitle`, `durationSeconds`, `label` |
| `ForceBreakingNews` | Replaces the current message immediately. | `headline`, `subtitle`, `durationSeconds`, `label` |
| `ShowBreakingNews` | Shows a message normally. | `headline`, `subtitle`, `durationSeconds`, `label` |
| `UpdateBreakingNews` | Updates the currently visible message. | `headline`, `subtitle`, `durationSeconds`, `label` |
| `HideBreakingNews` | Hides the visible bar. | none |
| `ClearBreakingNewsQueue` | Clears waiting messages without hiding the current one. | none |
| `ClearAndHideBreakingNews` | Clears waiting messages and hides the current bar. | none |
| `SendTestBreakingNews` | Sends a default test message. | optional `headline`, `subtitle`, `durationSeconds`, `label` |

### Trigger-specific methods

| Method | Purpose |
|---|---|
| `QueueBreakingNewsFromChatCommand` | Queues a message from `!news Scrolling Text \| Duration`. Subtitle becomes `STREAM UPDATE FROM [username]`. |
| `ForceBreakingNewsFromChatCommand` | Forces a message from `!news Scrolling Text \| Duration`. Subtitle becomes `STREAM UPDATE FROM [username]`. |
| `QueueBreakingNewsFromChannelPoint` | Queues a channel point message from reward user input. Subtitle becomes `STREAM UPDATE FROM [username]`. |
| `ForceBreakingNewsFromChannelPoint` | Forces a channel point message from reward user input. Subtitle becomes `STREAM UPDATE FROM [username]`. |

### Visual/settings methods

| Method | Purpose |
|---|---|
| `SetBreakingNewsSettings` | Applies visual overrides from `bn...` arguments. |
| `SetBreakingNewsSpeed` | Updates scroll speed using `scrollSpeed` or `bnScrollSpeed`. |
| `SyncBreakingNewsOverlay` | Sends a sync command to the overlay. |

## Visual override arguments

These can be set with **Set Argument** before calling `SetBreakingNewsSettings`, `QueueBreakingNews`, `ForceBreakingNews`, or another message method.

| Argument | Purpose | Example |
|---|---|---|
| `bnLabelBg` | Left label background color | `#b00020` |
| `bnLabelText` | Left label text color | `#ffffff` |
| `bnSubtitleBg` | Subtitle row background color | `#101010` |
| `bnSubtitleText` | Subtitle row text color | `#ffffff` |
| `bnTickerBg` | Scrolling ticker background color | `#f5f5f5` |
| `bnTickerText` | Scrolling ticker text color | `#111111` |
| `bnFontFamily` | Overlay font family | `Arial, Helvetica, sans-serif` |
| `bnBarHeight` | Bar height in pixels | `92` |
| `bnBarBottom` | Bottom offset in pixels | `36` |
| `bnBarSideMargin` | Side margin in pixels | `50` |
| `bnLabelWidth` | Left label width in pixels | `390` |
| `bnBarRadius` | Bar corner radius in pixels | `0` |
| `bnLabelSize` | Left label font size | `34` |
| `bnSubtitleSize` | Subtitle font size | `24` |
| `bnHeadlineSize` | Scrolling headline font size | `30` |
| `bnScrollSpeed` | Scrolling speed | `180` |
| `bnDefaultDuration` | Overlay default duration override | `12` |

## Troubleshooting

### The overlay only says Connecting...

Check:

```text
Streamer.bot WebSocket Server is running
OBS Browser Source URL uses the same host, port, and endpoint as Streamer.bot
Authentication is disabled, or the URL includes the correct password
OBS Browser Source was refreshed after starting the WebSocket Server
```

### The overlay connects but messages do not show

Check:

```text
The Streamer.bot action is running
The C# code compiled successfully
The C# sub-action is named BreakingNewsApi
The helper action is using Execute C# Method, not Execute C# Code
The selected method matches the intended action
```

### Custom channel point duration is ignored

Make sure the `durationSeconds` argument is set **before** the `Execute C# Method` sub-action.

Correct order:

```text
1. Set Argument: durationSeconds = 20
2. Execute C# Method: QueueBreakingNewsFromChannelPoint
```

### Persistent messages block the queue

A message with:

```text
durationSeconds = 0
```

will stay visible until hidden or replaced. If the persistent message was queued, later queued messages will not play until the persistent message is cleared.

For persistent messages, `ForceBreakingNews` is usually cleaner than `QueueBreakingNews`.

### GitHub Pages overlay loads, but remote/LAN connection does not work

The hosted overlay is intended for normal same-computer OBS + Streamer.bot setups using:

```text
127.0.0.1:8080
```

If connecting from another computer, Streamer.bot's WebSocket bind address and browser security behavior need to be configured separately.

## Security note

Do not expose the Streamer.bot WebSocket Server publicly unless you understand the security implications. For most setups, keep it bound to:

```text
127.0.0.1
```

Enable Streamer.bot WebSocket authentication if other software or devices can access your WebSocket server.

## Credits

Created by SlickPickleNick.
