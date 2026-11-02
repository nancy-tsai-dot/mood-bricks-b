# 🧱 Mood Bricks · Version B

Version B of an A/B test of Mood Bricks, an anonymous check-in game for a team, made at the LEGO Imaginarium workshop on Creative Dividends.

**Try it:** https://nancy-tsai-dot.github.io/mood-bricks-b/
**Version A (emoji):** https://nancy-tsai-dot.github.io/mood-bricks/

## What's different from Version A

Instead of five emoji, you check in with two word clouds:

1. **How do you feel about your work right now?** Pick one of 16 feeling words (Happy, Focused, Stressed, Anxious…).
2. **What's making you feel that way?** Pick one reason. Low and so-so words get work reasons (Too many meetings, Poor tooling, Noise in the office…); good words get good reasons (Great teamwork, Finished something…).

Each word counts as a level from 1 (very low) to 5 (great), so the wall can be coloured just like in A. Each brick also shows the day's most picked word. Click a brick to see that day's feelings, reasons and week.

The design is new too: one scrolling page with a dark blue header instead of tabs.

## What's the same

The random daily ping, the gift box with a teammate's meme, the private streak, the 80% team goal and minifig badge, week rows on the wall, patterns, and the rule that days with fewer than 3 answers stay grey.

## How it works

A plain static website (`index.html`, `style.css`, `app.js`) on GitHub Pages, using the same Firebase Firestore database as Version A.

- B saves answers in `b_answers` (date, hour, word, reason) and check-ins in `b_checkins`, so A's and B's numbers stay apart.
- Surprises (`memes`) and work events (`events`) are shared with Version A.
- Your streak is kept in your browser under its own `mbb-` names, so it doesn't mix with A's.
- `firestore.rules` is the full rule set for both versions. Only words and reasons from the fixed lists are accepted. No edits, no deletes.

## Run it locally

Open the folder with any static web server, e.g. `python3 -m http.server 8000`, then go to http://localhost:8000.
