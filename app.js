'use strict';
// Burnarater (Version B of Mood Bricks): a private mood journal. Check in with a feeling word and a reason.
// Everything is saved only in this browser (localStorage). Nothing is sent anywhere, and there is no team view.

const STORE = 'mbb-'; // A and B share a web address, so B's browser storage gets its own prefix
const WEEKS_BACK = 2; // the wall shows 2 weeks back, this week and 2 weeks ahead
const WEEKS_AHEAD = 2;
const SAMPLE_WEEKS = 5;
const WEEKS_ANALYSED = 12; // patterns look at the last 12 weeks
const MIN_FOR_INSIGHT = 3; // check-ins in a week before the insight says anything

// Each word counts as a level from 1 to 5, so the wall can be coloured and averaged.
const FEELINGS = [
  ['Happy', 5], ['Excited', 5], ['Proud', 5],
  ['Content', 4], ['Focused', 4], ['Calm', 4],
  ['Distracted', 3], ['Tired', 3], ['Bored', 3],
  ['Anxious', 2], ['Stressed', 2], ['Disappointed', 2], ['Frustrated', 2], ['Overwhelmed', 2],
  ['Angry', 1], ['Hopeless', 1],
].map(([word, level]) => ({ word, level }));
const LEVELS = [
  { level: 1, label: 'Very low' }, { level: 2, label: 'Low' }, { level: 3, label: 'So-so' },
  { level: 4, label: 'Good' }, { level: 5, label: 'Great' },
];
const LOW_REASONS = ['Too much work', 'Too many meetings', 'Technical difficulties', 'Noise in the office', 'Poor tooling',
  'Deadline pressure', 'Unclear priorities', 'Waiting on others', 'Personal reasons', 'Other'];
const GOOD_REASONS = ['Great teamwork', 'Finished something', 'Learning something new', 'Focus time', 'Good feedback',
  'Personal reasons', 'Other'];
const MAX_NOTE = 80; // "Other" comes with a short typed reason
const levelOf = (word) => FEELINGS.find((f) => f.word === word)?.level;
const reasonsFor = (word) => (levelOf(word) >= 4 ? GOOD_REASONS : LOW_REASONS); // "Too many meetings" makes no sense after "Happy"

const HEADS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, ...children) => {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
};
const shuffle = (xs) => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};

// ---------- dates (in your local time) ----------
const pad = (n) => String(n).padStart(2, '0');
const dayStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDay = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;
const mondayOf = (d) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));
const prevWorkday = (d) => { let x = addDays(d, -1); while (isWeekend(x)) x = addDays(x, -1); return x; };
const daysBetween = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
// Week numbers as used in Denmark (ISO 8601): weeks start on Monday, week 1 holds the first Thursday.
function weekNumber(d) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
}
const analysedFrom = () => dayStr(addDays(mondayOf(new Date()), -7 * (WEEKS_ANALYSED - 1)));

// ---------- your journal (stored only in this browser) ----------
const read = (name) => { try { return JSON.parse(localStorage.getItem(`${STORE}${name}`)) || []; } catch { return []; } };
const write = (name, value) => {
  try {
    localStorage.setItem(`${STORE}${name}`, JSON.stringify(value));
  } catch {
    throw new Error('Couldn’t save in this browser. Is it in private mode, or full?');
  }
};
const myEntries = () => read('entries').map((a) => ({ ...a, score: levelOf(a.word) })).filter((a) => a.score);
const myEvents = () => read('events');
const myDays = () => read('days');

function streakFor(days) {
  const set = new Set(days);
  const today = startOfDay(new Date());
  let d = set.has(dayStr(today)) ? today : prevWorkday(today);
  let n = 0;
  while (set.has(dayStr(d))) { n++; d = prevWorkday(d); }
  return n;
}

function checkIn(word, reason, note) {
  const now = new Date();
  const today = dayStr(now);
  write('entries', [...read('entries'), { date: today, hour: now.getHours(), word, reason, ...(note ? { note } : {}) }]);
  const days = myDays();
  if (!days.includes(today)) write('days', [...days, today]);
  return streakFor([...days, today]);
}

// ---------- sample data, so the page shows what a few weeks look like ----------
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSampleData() {
  const rand = seededRandom(42);
  const pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const firstMonday = addDays(mondayOf(new Date()), -7 * (SAMPLE_WEEKS - 1));
  const releases = [addDays(firstMonday, 7 + 3), addDays(firstMonday, 21 + 3)]; // Thursdays of weeks 2 and 4
  const events = releases.map((d) => ({ date: dayStr(d), label: 'Release' }));
  events.push({ date: dayStr(addDays(firstMonday, 14)), label: 'Sprint start' });

  const answers = [];
  const today = startOfDay(new Date());
  for (let w = 0; w < SAMPLE_WEEKS; w++) {
    for (let wd = 0; wd < 5; wd++) {
      const d = addDays(firstMonday, w * 7 + wd);
      if (d >= today) continue; // up to yesterday, so today is yours
      const untilRelease = Math.min(99, ...releases.map((r) => daysBetween(d, r)).filter((n) => n >= 0));
      let base = 4.0;
      if (untilRelease === 0) base -= 2.3;
      else if (untilRelease <= 2) base -= 1.3;
      if (wd === 0) base -= 0.3;
      if (wd === 4) base += 0.5;
      const r = rand();
      const count = r < 0.12 ? 0 : r < 0.3 ? 2 : 1; // like a real person: mostly once a day, sometimes skipped
      for (let i = 0; i < count; i++) {
        const hour = 9 + Math.floor(rand() * 8);
        const mood = base - (hour >= 15 ? 0.5 : 0) + (rand() - 0.5) * 1.0;
        const score = Math.max(1, Math.min(5, Math.round(mood)));
        const word = pick(FEELINGS.filter((f) => f.level === score)).word;
        let reason;
        if (score >= 4) reason = pick(GOOD_REASONS);
        else if (untilRelease <= 2 && rand() < 0.6) reason = pick(['Deadline pressure', 'Too much work']);
        else if (wd === 0 && rand() < 0.6) reason = 'Too many meetings';
        else reason = pick(LOW_REASONS);
        const notes = score >= 4 ? SAMPLE_GOOD_NOTES : SAMPLE_LOW_NOTES;
        const note = reason === 'Other' ? notes[(w * 5 + wd + i) % notes.length] : undefined; // no extra rand(), so the wall stays the same
        answers.push({ date: dayStr(d), hour, word, reason, note, score });
      }
    }
  }
  return { answers, events };
}
const SAMPLE_GOOD_NOTES = ['Sunny walk at lunch', 'Nice chat with a colleague', 'Fixed a bug that bugged me for weeks'];
const SAMPLE_LOW_NOTES = ['Laptop is slow again', 'Waiting for a decision from above', 'Back pain from my chair'];
const SAMPLE = makeSampleData();

// ---------- patterns ----------
// Short names for reasons, so the insight and patterns stay short.
const SHORT = {
  'Too much work': 'Workload', 'Too many meetings': 'Meetings', 'Technical difficulties': 'Tech issues',
  'Noise in the office': 'Office noise', 'Poor tooling': 'Poor tools', 'Deadline pressure': 'Deadlines',
  'Personal reasons': 'Life outside work', 'Great teamwork': 'Teamwork', 'Finished something': 'Finishing things',
  'Learning something new': 'Learning', 'Good feedback': 'Feedback', Other: 'Something else',
};
const short = (reason) => SHORT[reason] || reason;
const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
// [[name, count], …], most picked first
const counts = (xs) => Object.entries(xs.reduce((m, x) => ({ ...m, [x]: (m[x] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);

function nearEvents(events) {
  const near = new Set();
  for (const e of events) {
    const d = parseDay(e.date);
    near.add(e.date).add(dayStr(prevWorkday(d))).add(dayStr(prevWorkday(prevWorkday(d))));
  }
  return near;
}

// Up to 3 patterns, one short sentence each, the most useful first.
function findPatterns(answers, events) {
  if (answers.length < 8) return ['Keep checking in for about 2 weeks and your patterns will show up here.'];
  const out = [];
  const overall = mean(answers.map((a) => a.score));
  const byWeekday = {};
  for (const a of answers) (byWeekday[parseDay(a.date).getDay()] ||= []).push(a);

  // What's behind your low days, and when it comes up most.
  const lows = answers.filter((a) => a.score <= 3);
  if (lows.length >= 4) {
    const [reason, n] = counts(lows.map((a) => a.reason))[0];
    out.push(`Most of your low days come down to ${lowerFirst(short(reason))}.`);
    const share = n / answers.length;
    const peak = Object.entries(byWeekday)
      .filter(([, v]) => v.length >= 3)
      .map(([wd, v]) => ({ wd: Number(wd), hits: v.filter((a) => a.reason === reason).length, total: v.length }))
      .sort((a, b) => b.hits / b.total - a.hits / a.total)[0];
    if (peak && peak.hits >= 2 && peak.hits / peak.total >= share * 1.5) out.push(`“${short(reason)}” comes up most on ${WEEKDAYS[peak.wd]}s.`);
  }

  const weekdays = Object.entries(byWeekday)
    .filter(([, v]) => v.length >= 3)
    .map(([wd, v]) => ({ wd: Number(wd), avg: mean(v.map((a) => a.score)) }));
  const low = weekdays.length >= 3 ? weekdays.reduce((a, b) => (b.avg < a.avg ? b : a)) : null;
  const high = weekdays.length >= 3 ? weekdays.reduce((a, b) => (b.avg > a.avg ? b : a)) : null;
  if (low && overall - low.avg >= 0.3) out.push(`${WEEKDAYS[low.wd]} is usually your toughest day of the week.`);

  const days = [...new Set(answers.map((a) => a.date))].sort();
  const recent = new Set(days.slice(-10));
  const before = new Set(days.slice(-20, -10));
  if (before.size >= 5) {
    const r = mean(answers.filter((a) => recent.has(a.date)).map((a) => a.score));
    const b = mean(answers.filter((a) => before.has(a.date)).map((a) => a.score));
    if (r - b >= 0.3) out.push('You’ve been feeling better over the last two weeks.');
    if (b - r >= 0.3) out.push('You’ve been feeling worse over the last two weeks.');
  }

  if (events.length) {
    const near = nearEvents(events);
    const nearOnes = answers.filter((a) => near.has(a.date)).map((a) => a.score);
    const others = answers.filter((a) => !near.has(a.date)).map((a) => a.score);
    if (nearOnes.length >= 3 && others.length >= 3) {
      const diff = mean(others) - mean(nearOnes);
      if (diff >= 0.3) out.push('You feel lower in the days around your events.');
      if (diff <= -0.3) out.push('You feel better in the days around your events.');
    }
  }

  if (high && high.avg - overall >= 0.3) out.push(`${WEEKDAYS[high.wd]} is usually your best day of the week.`);

  const morning = answers.filter((a) => a.hour < 12).map((a) => a.score);
  const afternoon = answers.filter((a) => a.hour >= 12).map((a) => a.score);
  if (morning.length >= 3 && afternoon.length >= 3) {
    const diff = mean(morning) - mean(afternoon);
    if (diff >= 0.3) out.push('You tend to feel better in the mornings than in the afternoons.');
    if (diff <= -0.3) out.push('You tend to feel better in the afternoons than in the mornings.');
  }

  out.push(`${counts(answers.map((a) => a.word))[0][0]} is the feeling you pick most often.`);
  return out.slice(0, 3);
}

// ---------- the insight: your week in one sentence, built from your reasons ----------
// "Other" is named by what you typed, so the sentence reflects your own reason.
const nameOf = (r) => (r.reason === 'Other' && r.notes.length ? `“${r.notes[r.notes.length - 1]}”` : short(r.reason));

// The reason that came up most in a group of check-ins; a tie goes to the one with the strongest feelings.
function topReason(list, stronger) {
  const byReason = {};
  for (const a of list) (byReason[a.reason] ||= []).push(a);
  return Object.entries(byReason)
    .map(([reason, xs]) => ({ reason, n: xs.length, avg: mean(xs.map((a) => a.score)), notes: xs.filter((a) => a.note).map((a) => a.note) }))
    .sort((a, b) => b.n - a.n || stronger(a.avg, b.avg))[0];
}

function insight(answers) {
  const thisMonday = mondayOf(new Date());
  const inWeek = (monday) => answers.filter((a) => a.date >= dayStr(monday) && a.date < dayStr(addDays(monday, 7)));
  let when = 'This week';
  let list = inWeek(thisMonday);
  if (list.length < MIN_FOR_INSIGHT) { // early in the week, last week says more
    const last = inWeek(addDays(thisMonday, -7));
    if (last.length >= MIN_FOR_INSIGHT) { when = 'Last week'; list = last; }
  }
  if (list.length < MIN_FOR_INSIGHT) {
    return {
      sentence: 'Your first insight is on its way.',
      evidence: `Needs ${MIN_FOR_INSIGHT} check-ins in a week · ${list.length} so far`,
    };
  }

  const lows = list.filter((a) => a.score <= 3);
  const goods = list.filter((a) => a.score >= 4);
  const drag = lows.length ? topReason(lows, (a, b) => a - b) : null; // the lowest feelings win a tie
  const lift = goods.length ? topReason(goods, (a, b) => b - a) : null;
  const week = lowerFirst(when);
  let sentence;
  if (lows.length >= 2 && goods.length >= 2) sentence = `${nameOf(lift)} lifted you, ${lowerFirst(nameOf(drag))} drained you.`;
  else if (lows.length >= goods.length) sentence = `${nameOf(drag)} drained you ${week}.`;
  else sentence = `${nameOf(lift)} lifted you ${week}.`;
  const [topWord, topN] = counts(list.map((a) => a.word))[0];
  const evidence = `${when} · ${list.length} check-ins${topN > 1 ? ` · mostly ${topWord}` : ''}`;
  return { sentence, evidence };
}

function wall(includeSample) {
  const from = analysedFrom();
  const answers = [...myEntries(), ...(includeSample ? SAMPLE.answers : [])].filter((a) => a.date >= from);
  const events = [...myEvents(), ...(includeSample ? SAMPLE.events : [])];
  const byDay = {};
  for (const a of answers) (byDay[a.date] ||= []).push(a);
  const today = dayStr(new Date());
  const thisMonday = mondayOf(new Date());

  const weeks = [];
  for (let w = -WEEKS_BACK; w <= WEEKS_AHEAD; w++) {
    const monday = addDays(thisMonday, 7 * w);
    const days = [];
    for (let i = 0; i < 5; i++) {
      const date = dayStr(addDays(monday, i));
      const list = byDay[date] || [];
      const shown = list.length > 0;
      const avg = shown ? Math.round(mean(list.map((a) => a.score)) * 10) / 10 : null;
      // Most picked first; a tie goes to the word closest to the day's average.
      const feelings = shown ? counts(list.map((a) => a.word))
        .sort((a, b) => b[1] - a[1] || Math.abs(levelOf(a[0]) - avg) - Math.abs(levelOf(b[0]) - avg)) : null;
      days.push({
        date,
        count: list.length,
        avg,
        feelings,
        reasons: shown ? counts(list.map((a) => a.reason)) : null,
        notes: shown ? list.filter((a) => a.note).map((a) => a.note) : null,
        future: date > today,
        events: events.filter((e) => e.date === date).map((e) => e.label),
      });
    }
    weeks.push({ label: `Week ${weekNumber(monday)}`, sub: `${monday.getDate()} ${MONTHS[monday.getMonth()]}`, days });
  }
  const recentEvents = events.filter((e) => e.date >= from);
  return { weeks, patterns: findPatterns(answers, recentEvents), insight: insight(answers) };
}

// ---------- your streak ----------
function loadMe() {
  const days = myDays();
  renderStreak(streakFor(days), days.includes(dayStr(new Date())));
}
function renderStreak(streak, checkedInToday) {
  $('#streak').textContent = streak > 0 ? `🔥 ${streak}-day streak` : 'No streak yet';
  $('#streakSub').textContent = checkedInToday ? 'You checked in today. Nice.' : 'Check in today to keep it going.';
}

// ---------- the random daily ping ----------
const todayKey = () => new Date().toDateString();
const isWeekendToday = () => isWeekend(new Date());

function pingTime() {
  const key = `${STORE}ping-${todayKey()}`;
  let t = Number(localStorage.getItem(key));
  if (!t) {
    const nine = new Date();
    nine.setHours(9, 0, 0, 0);
    t = nine.getTime() + Math.floor(Math.random() * 8 * 3600 * 1000); // somewhere between 9:00 and 17:00
    localStorage.setItem(key, String(t));
  }
  return t;
}
const pingDone = () => localStorage.getItem(`${STORE}pinged-${todayKey()}`) === '1';

function checkPing() {
  if (!isWeekendToday() && !pingDone() && Date.now() >= pingTime() && $('#ping').hidden) {
    localStorage.setItem(`${STORE}pinged-${todayKey()}`, '1');
    openPing();
  }
  $('#pingInfo').textContent = isWeekendToday()
    ? 'It’s the weekend. No pings today 🌴'
    : pingDone()
      ? 'Today’s ping has been. Come back tomorrow, or check in again with the button.'
      : 'Today’s ping is hiding somewhere between 9:00 and 17:00 🤫';
}

// A word cloud: identical pill buttons, in a shuffled order so no word always comes first.
// Every box gets the width of the longest word, so a short word doesn't look different.
function cloud(words, onPick) {
  const box = $('#cloud');
  box.style.removeProperty('--word-width');
  const buttons = words.map((w) => el('button', {
    type: 'button', className: 'word', textContent: w, onclick: () => onPick(w),
  }));
  box.replaceChildren(...buttons);
  const fontSize = parseFloat(getComputedStyle(buttons[0]).fontSize);
  const widest = Math.max(...buttons.map((b) => b.offsetWidth)) + 1; // offsetWidth ignores the pop-in animation; +1 covers rounding
  box.style.setProperty('--word-width', `${widest / fontSize}em`); // in em, so it scales with the phone font size
  $('#otherForm').hidden = true;
  $('#question').focus(); // not the first word, so no word looks picked already
}

function askFeeling() {
  $('#stepLabel').textContent = 'Step 1 of 2';
  $('#question').textContent = 'How do you feel about your work right now?';
  $('#backBtn').hidden = true;
  cloud(shuffle(FEELINGS.map((f) => f.word)), askReason);
}

function askReason(word) {
  $('#stepLabel').textContent = 'Step 2 of 2';
  $('#question').replaceChildren('What’s making you feel ', el('mark', { textContent: word.toLowerCase() }), '?');
  $('#backBtn').hidden = false;
  const reasons = reasonsFor(word);
  const fixedEnd = ['Personal reasons', 'Other']; // the catch-alls stay at the end
  cloud([...shuffle(reasons.filter((r) => !fixedEnd.includes(r))), ...fixedEnd], (reason) => {
    if (reason === 'Other') askOther(word);
    else answer(word, reason);
  });
}

// "Other" opens a text box; the answer is sent with the typed reason.
let otherWord = null;
function askOther(word) {
  otherWord = word;
  $('#cloud').querySelectorAll('.word').forEach((b) => b.setAttribute('aria-pressed', String(b.textContent === 'Other')));
  $('#otherText').value = '';
  $('#otherSend').disabled = true;
  $('#otherForm').hidden = false;
  $('#otherText').focus();
}
$('#otherText').maxLength = MAX_NOTE;
$('#otherText').addEventListener('input', () => { $('#otherSend').disabled = !$('#otherText').value.trim(); });
$('#otherForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const note = $('#otherText').value.trim();
  if (note) answer(otherWord, 'Other', note);
});

function openPing() {
  $('#askMsg').textContent = '';
  $('#askBlock').hidden = false;
  $('#doneBlock').hidden = true;
  $('#ping').hidden = false;
  askFeeling();
}
const closePing = () => { $('#ping').hidden = true; loadMe(); };

function answer(word, reason, note) {
  let streak;
  try {
    streak = checkIn(word, reason, note);
  } catch (err) {
    $('#askMsg').textContent = err.message;
    return;
  }
  $('#askBlock').hidden = true;
  $('#thanks').textContent = `Thanks! 🔥 ${streak}-day streak`;
  $('#picked').textContent = `You picked ${word} · ${note ? `“${note}”` : reason}`;
  $('#doneBlock').hidden = false;
  $('#doneBtn').focus();
  render();
}

$('#pingNow').addEventListener('click', openPing);
$('#pingClose').addEventListener('click', closePing);
$('#doneBtn').addEventListener('click', closePing);
$('#backBtn').addEventListener('click', askFeeling);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#ping').hidden) closePing();
  else if (!$('#day').hidden) closeDay();
});

// ---------- insight and your wall ----------
const levelFor = (avg) => LEVELS[Math.min(4, Math.max(0, Math.round(avg) - 1))];
const prettyDate = (s) => new Date(`${s}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function render() {
  const includeSample = $('#showSample').checked;
  const data = wall(includeSample);
  $('#insightText').textContent = data.insight.sentence;
  $('#insightEvidence').textContent = data.insight.evidence;
  $('#patterns').replaceChildren(...data.patterns.map((p) => el('li', { textContent: p })));

  const cells = [el('div'), ...HEADS.map((d) => el('div', { className: 'head', textContent: d }))];
  for (const week of data.weeks) {
    cells.push(el('div', { className: 'week' }, el('b', { textContent: week.label }), el('small', { textContent: week.sub })));
    for (const day of week.days) {
      let brick;
      if (day.future) {
        brick = el('div', { className: 'brick future', title: prettyDate(day.date) });
      } else if (day.avg == null) {
        brick = el('div', { className: 'brick grey', title: `${prettyDate(day.date)}: no check-in` });
      } else {
        const level = levelFor(day.avg);
        const [word] = day.feelings[0];
        const summary = `${prettyDate(day.date)}: ${day.count > 1 ? `mostly ${word}` : word}, level ${day.avg} (${level.label}) from ${day.count} ${day.count === 1 ? 'check-in' : 'check-ins'}`;
        brick = el('button', {
          type: 'button', className: `brick m${level.level}`,
          title: `${summary}. Click for details.`, ariaLabel: `${summary}. Open details`,
          onclick: () => openDay(week, day),
        }, el('span', { className: 'brick-word', textContent: word }));
      }
      cells.push(el('div', { className: 'cell' }, brick, ...day.events.map((e) => el('span', { className: 'tag', textContent: e }))));
    }
  }
  $('#wallGrid').replaceChildren(...cells);

  $('#legend').replaceChildren(
    ...[...LEVELS].reverse().map((l) => el('span', {}, el('i', { className: `m${l.level}` }),
      el('b', { textContent: l.label }), ` ${FEELINGS.filter((f) => f.level === l.level).map((f) => f.word).join(', ')}`)),
    el('span', {}, el('i', { className: 'grey' }), 'No check-in'),
  );
}

// ---------- one day, up close ----------
const SVG_NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, ...children) => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  node.append(...children);
  return node;
};
const moodColour = (level) => getComputedStyle(document.documentElement).getPropertyValue(`--mood-${level}`).trim();

function openDay(week, day) {
  const level = levelFor(day.avg);
  const [word, n] = day.feelings[0];
  $('#dayTitle').textContent = `${prettyDate(day.date)} · ${week.label}`;
  $('#dayEvents').replaceChildren(...day.events.map((e) => el('span', { className: 'tag', textContent: e })));
  $('#dayTop').replaceChildren(
    el('span', { className: 'big', textContent: word }),
    el('span', { className: 'muted', textContent: `${day.count > 1 ? `${n} of ${day.count} check-ins · ` : ''}your level ${day.avg.toFixed(1)} of 5 (${level.label})` }),
  );
  $('#day').hidden = false; // shown first, so the charts can measure their width
  $('#dayFeelings').replaceChildren(...barChart(day.feelings, (w) => `var(--mood-${levelOf(w)})`));
  $('#dayReasons').replaceChildren(...barChart(day.reasons, () => 'var(--reason)'));
  $('#dayNotes').replaceChildren(...(day.notes.length ? [
    el('p', { className: 'notes-head', textContent: 'In your own words' }),
    el('ul', { className: 'notes' }, ...day.notes.map((n) => el('li', { textContent: `“${n}”` }))),
  ] : []));
  weekChart(week, day);
  $('#dayClose').focus();
}
const closeDay = () => { $('#day').hidden = true; };
$('#dayClose').addEventListener('click', closeDay);
$('#day').addEventListener('click', (e) => { if (e.target.id === 'day') closeDay(); });

// One bar per word that was picked, most picked at the top, count at the tip.
function barChart(rows, colourOf) {
  const most = rows[0][1];
  return rows.map(([name, n]) => el('div', { className: 'mix-row', title: `${name}: ${n} ${n === 1 ? 'check-in' : 'check-ins'}` },
    el('span', { className: 'mix-label', textContent: name }),
    el('span', { className: 'mix-track' },
      el('span', { className: 'mix-bar', style: `width:calc((100% - 32px) * ${n / most});background:${colourOf(name)}` }),
      el('span', { className: 'mix-val', textContent: String(n) }))));
}

// Your level for each workday of that week. Days without a check-in are left as gaps.
function weekChart(week, selected) {
  const box = $('#dayWeek');
  const W = Math.max(260, box.clientWidth);
  const H = 180;
  const pad = { l: 28, r: 16, t: 22, b: 28 };
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / 4;
  const y = (v) => pad.t + ((5 - v) * (H - pad.t - pad.b)) / 4;
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Your level per day in ${week.label}` });

  for (const l of LEVELS) { // hairline grid, levels 1 to 5
    chart.append(
      svg('line', { x1: pad.l, x2: W - pad.r, y1: y(l.level), y2: y(l.level), class: 'grid' }),
      svg('text', { x: pad.l - 10, y: y(l.level) + 4, 'text-anchor': 'end', class: 'tick' }, String(l.level)),
    );
  }

  let path = '';
  week.days.forEach((d, i) => {
    if (d.avg == null) return;
    const prev = week.days[i - 1];
    path += `${prev && prev.avg != null ? 'L' : 'M'}${x(i)},${y(d.avg)}`;
  });
  if (path) chart.append(svg('path', { d: path, class: 'line' }));

  week.days.forEach((d, i) => {
    const isSelected = d.date === selected.date;
    chart.append(svg('text', { x: x(i), y: H - 8, 'text-anchor': 'middle', class: isSelected ? 'day sel' : 'day' }, HEADS[i]));
    if (d.avg == null) return;
    const level = levelFor(d.avg);
    const point = svg('g', { class: 'pt', tabindex: 0, role: 'button', 'aria-label': `${prettyDate(d.date)}: level ${d.avg}` },
      svg('title', {}, `${prettyDate(d.date)}: ${d.feelings[0][0]}, level ${d.avg} (${level.label}) from ${d.count} ${d.count === 1 ? 'check-in' : 'check-ins'}`),
      svg('circle', { cx: x(i), cy: y(d.avg), r: 14, class: 'hit' }),
      svg('circle', { cx: x(i), cy: y(d.avg), r: isSelected ? 7 : 5, fill: moodColour(level.level), class: 'dot' }));
    if (isSelected) point.append(svg('text', { x: x(i), y: y(d.avg) - 12, 'text-anchor': 'middle', class: 'val' }, d.avg.toFixed(1)));
    const pick = () => openDay(week, d);
    point.addEventListener('click', pick);
    point.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    chart.append(point);
  });

  // The same numbers as text, so nobody has to hover to read them.
  const table = el('p', { className: 'week-table' }, 'Your level, 1 very low to 5 great: ', ...week.days.flatMap((d, i) => [
    i ? ' · ' : '', el(d.date === selected.date ? 'b' : 'span', { className: 'nowrap', textContent: `${HEADS[i]} ${d.avg == null ? '–' : `${d.avg.toFixed(1)} ${d.feelings[0][0]}`}` }),
  ]));
  box.replaceChildren(chart, table);
}

$('#showSample').addEventListener('change', render);

$('#eventForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    const label = form.label.value.trim();
    if (!form.date.value || !label) throw new Error('Add a date and a name for the event.');
    write('events', [...myEvents(), { date: form.date.value, label }]);
    form.reset();
    $('#eventMsg').textContent = 'Added to your wall.';
    render();
  } catch (err) {
    $('#eventMsg').textContent = err.message;
  }
});

// ---------- start ----------
loadMe();
render();
checkPing();
setInterval(checkPing, 30000);
