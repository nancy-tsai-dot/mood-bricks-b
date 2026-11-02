# 🧭 Mood Journey · Version B

Version B of an A/B test of Mood Bricks (Version B is called Mood Journey), made at the LEGO Imaginarium workshop on Creative Dividends.

**Try it:** https://nancy-tsai-dot.github.io/mood-bricks-b/
**Version A (emoji, team wall):** https://nancy-tsai-dot.github.io/mood-bricks/

## What's different from Version A

**It's your own private journal, not a team tool.** Everything is saved only in your browser. Nothing is sent anywhere, and there is no team view.

Instead of five emoji, you check in with two word clouds:

1. **How do you feel about your work right now?** Pick one of 16 feeling words (Happy, Focused, Stressed, Anxious…).
2. **What's making you feel that way?** Pick one reason. Low and so-so words get work reasons (Too many meetings, Poor tooling, Noise in the office…); good words get good reasons (Great teamwork, Finished something…). **Other** opens a text box for your own reason (up to 80 characters).

Every word sits in a box of the same size and style, in a shuffled order, so no word is more suggestive than another.

- **Insight**, at the top: one short sentence about your week, built from your reasons, e.g. "Too many meetings dragged this week down." It needs 3 check-ins in a week; early in the week it looks at last week. More patterns from the last 12 weeks are listed below it.
- **My wall**: each brick is one of your workdays, coloured by how you felt and labelled with the word you picked most. Click a brick to see that day's feelings, reasons, typed reasons and week.
- **Events**: add your own (releases, deadlines, holidays). They show on your wall and feed the patterns.

There are no surprises (no gift box, no memes), no team goal and no team wall.

## What's the same

The random daily ping, the private streak, week rows on the wall, and patterns.

## How it works

A plain static website (`index.html`, `style.css`, `app.js`) on GitHub Pages. Your check-ins, events and streak are kept in your browser's storage (localStorage) under `mbb-` names, so they don't mix with Version A. Clearing your browser data erases them, and they don't sync between browsers or devices.

`firestore.rules` is the rule set for the shared Firebase project. Version B no longer uses the database; the file is kept because the rules cover Version A too.

## Run it locally

Open the folder with any static web server, e.g. `python3 -m http.server 8000`, then go to http://localhost:8000.
