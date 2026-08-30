# Jahnavi's Lab

Interactive science and maths labs you can pick up and move. Each lab is a working
apparatus, not a video: drag the pieces, predict what happens, then check the working.

Built with React + Vite. Everything a visitor sets up is kept in their own browser —
there is no backend and nothing leaves the device.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/
npm run preview    # serve the built files
npm test           # check the physics headlessly — no browser needed
```

`npm test` runs the suites in `test/`. They import each lab's `engine.js` and
`labState.js` directly and check the science against known results: moments and the
centre-of-mass identity; the simulated pendulum period against the elliptic-integral
solution at half a dozen amplitudes; every Punnett square the inheritance lab can
build, plus Mendel's own 556 seeds coming out at χ² = 0.470 and the structural laws
sex linkage has to obey — no YY 'person', exactly half of every square sons, and every
son's X coming from his mother. They also generate a few
hundred challenges apiece and confirm every one is answerable, and feed each lab's
saved-state reader deliberately corrupted storage.

The app uses `HashRouter`, so `dist/` can be dropped on any static host — or opened
straight off disk — without needing server rewrite rules.

## Layout

```
src/
  data/labs.js            the catalogue: one entry per lab
  pages/                  landing, catalogue, lab shell, 404
  components/             site chrome + form controls every lab shares
  styles/
    tokens.css            the whole palette, light and dark
    global.css            the shell and the shared controls
    lab-shell.css         the furniture every lab gets for free
  labs/
    moment-of-force/      one self-contained lab
      engine.js           the physics — pure functions of state, no DOM
      labState.js         the reducer, and what the browser remembers
      challenges.js       the problem generator
      Scene.jsx           the apparatus, as SVG
      CalcTable.jsx       the working out
      ExplorePanel.jsx    the controls
      ChallengePanel.jsx  challenge mode
      LearnPanel.jsx      the explanation
      lab.css             only what is this lab's own
    simple-pendulum/      the same shape, a different experiment
    inheritance/          and again
```

Every lab follows that shape. The rule that keeps them honest: **`engine.js` never
touches the DOM**, so the physics can be run and checked headlessly, and the React
layer only decides how to draw it.

## Adding a lab

1. Make `src/labs/<your-lab>/` with a component that renders the whole lab.
2. Add an entry to `LABS` in `src/data/labs.js`:

```js
{
  slug: 'simple-pendulum',
  title: 'Simple Pendulum',
  topic: 'Period, length and gravity',
  subject: 'physics',              // physics | chemistry | maths | biology
  level: 'Class 8–10',
  status: 'ready',                 // 'soon' shows a placeholder card instead
  blurb: 'One line for the catalogue card.',
  summary: 'A longer line for the lab page header.',
  tags: ['oscillation', 'gravity'],
  teaches: ['...'],                // optional, shown on the landing page
  component: lazy(() => import('../labs/simple-pendulum/SimplePendulumLab')),
}
```

Routing, filtering, search, the subject badge and the footer all pick it up from
there. Entries with `status: 'soon'` and no component render as "coming soon" cards —
they are placeholders for labs not built yet, so delete or fill them in as you go.

A lab gets a great deal for nothing. From `global.css`: `.btn`, `.chip`, `.stepper`,
`.cselect`, `.toggle`, ranges and checkboxes, and every colour token. From
`lab-shell.css`: the three-part `.lab-layout`, the `.stage-head` status bar, the
`.sheet-card` working-out panel (including the blur-until-you-answer mask and the
`.sums` comparator), the `.tabs`, the table styles, and all the challenge and learn
furniture. Keep only what is genuinely this lab's own — its scene ink and its
readout — in the lab's own CSS file.

## The labs

**Moment of Force** — a rod on a movable wedge with masses you drag along it. MKS and
CGS units, an optional rod that has weight of its own (split at the pivot into two
pieces, which is *why* the centre-of-mass shortcut works), a counterweight that solves
for its own mass, and a beam that really swings: unbalanced, it goes over and meets
the stand.

**Simple Pendulum** — a bob obeying θ″ = −(g/L)·sin θ, integrated with RK4 rather than
the small-angle shortcut, so the lab can time its own swings and catch T = 2π√(L/g)
out. Hang a second pendulum beside the first to settle whether a heavier bob swings
slower (it does not). The exact period comes from the elliptic integral K, by the
arithmetic–geometric mean; at 45° the textbook formula is 4.0% fast, and the lab's
own clock agrees to a fraction of a millisecond.

**Inheritance** — a Punnett square rebuilt live from two parents, with every allele a
button. Ten crosses across three shelves:

- *Classic* — pea seed shape and colour (one gene or two, 3 : 1 and 9 : 3 : 3 : 1),
  snapdragons (incomplete dominance) and shorthorn cattle (codominance), both 1 : 2 : 1.
- *Human* — cystic fibrosis (recessive: two healthy carriers, 1 in 4), Huntington's
  (dominant: one affected parent, 1 in 2), and ABO blood groups, where three alleles
  and codominance let an AB parent and an O parent have children like neither of them.
- *Sex-linked* — colour blindness and haemophilia on the X chromosome. Here the two
  parents stop being interchangeable: the mother has two X chromosomes and the father
  one X and a Y, and the controls only ever offer each of them what they could be. The
  square then shows why a carrier mother's affected children are all sons, and why a
  haemophiliac father cannot pass it to a son at all.

Every cross reports its **genotypic ratio**, its **phenotypic ratio**, and the chance
of each outcome three ways — "1 in 4", 25%, 1/4. Then breed an actual family from it
and watch the observed ratio walk in towards the predicted one as the numbers climb,
with chi-squared to say whether the gap is the sort of thing chance produces.

## Notes

- **Themes.** Three states — light, dark, and "match my system". The choice is stamped
  on `<html>` and applied by a small inline script in `index.html` before the first
  paint, so there is no flash of the wrong theme.
- **`legacy/`** holds the original single-file version of the Moment of Force lab
  (plain HTML/CSS/JS) that this project was ported from. Kept for reference only;
  nothing builds from it.
