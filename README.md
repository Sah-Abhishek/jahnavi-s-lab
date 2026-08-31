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
son's X coming from his mother. Light is checked the same way its rays are drawn:
the tracer knows only the law of reflection and Snell's law, so the mirror and lens
formulas have to be *earned* — the traced focus is held against the exact geometry
`R − R/(2 cos θ)` to a part in 10⁹, and against the paraxial formula only in the
limit, where the error is confirmed to fall as h². The whole-bench invariant is the
principle of reversibility: reverse the ray that came out of any trace, on any
bench, and it retraces its own path — 1245 of them do, through reflection,
refraction and total internal reflection alike. 146 assertions in all, including a
sweep that fires every control to both of its limits and checks that nothing
reaching the drawing is ever a NaN. Reflection is checked against its
definition rather than a table of answers — over every point and mirror in the suite, reflecting twice
returns the start, the foot is the midpoint and lies on the mirror, and the join meets
it at right angles — and the claim that a mirror plane and a half-turn about a line are
different things is settled by the determinant of each: −1 for the plane, +1 for the
line. They also generate a few hundred challenges apiece and confirm every one is
answerable, and feed each lab's saved-state reader deliberately corrupted storage.

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
    reflection/           and again, with a second scene for three dimensions
      Scene.jsx             the flat graph
      Scene3D.jsx           the same lab, seen in space
      EquationField.jsx     the box a mirror can be written into
    optics/               and again, with four benches on one pair of laws
      engine.js             the tracer AND the formulas, kept apart on purpose
      Scene.jsx             the bench: viewport, graph paper, pointer handling
      BenchImaging.jsx      mirrors and lenses, which are one apparatus
      BenchRefraction.jsx   a surface, a slab, a prism
      BenchEye.jsx          the one lens whose image distance cannot move
      SceneParts.jsx        arrows, rays, handles, screens
```

Reflection and Light lay their pages out differently from the other three. The
drawing takes the whole width and as much height as the window can spare, the panels
float over it and can be put away, and **Full screen** hands it the entire display.
That arrangement lives in `styles/lab-shell.css` under `full-bleed`, and any lab
whose apparatus really is the width of the window can ask for it. Both scenes are drawn
in real pixels — the viewBox is the measured size of the box they are given — which
lets the graph take whatever shape the window has: the scale is set by the shorter
side, so a unit across stays a unit up and a wide screen simply shows more of x. The
drawing centres itself on the part of the box no panel is over, so opening a panel
never strands the space opposite it.

The graph is a window on the plane rather than a frame around it: it has a centre it
is looking at and a reach, and both move freely. Drag the paper or scroll to travel,
pinch or ctrl+scroll to zoom towards the pointer, and neither runs out — there are
eight orders of magnitude between the two ends of the zoom, and the graph paper
regenerates for wherever you have arrived on squares of 1, 2 or 5 times a power of ten,
so the count of lines drawn stays about the same however far out you go. The wheel
belongs to the graph outright and never moves the page behind it, including the
ctrl+wheel a trackpad pinch sends, which the browser would otherwise use to zoom the
whole website.

In space the three axes are drawn as far as the drawing goes rather than only as far
as the axes box, so scrolling away from the middle still leaves something to steer by —
each one numbered, and coarsened onto tidy steps as the view widens. Travel far enough
and no axis crosses the view at all, which is a blank screen with no way of telling
which way is back; the drawing says so, and names the way home.

Moving about is a change of view and nothing else: nothing on the graph moves with you,
so a point that leaves the window is exactly where you left it, and **Reset view** comes
back to the origin without touching the maths. The mirror is stored as the line itself
rather than as two points on the screen — the two ends you drag are worked out at
drawing time from where the line crosses the window, so they are always somewhere you
can reach however far the graph has been scrolled.

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

**Light** — an optical bench with every ray traced rather than remembered. Four
benches on one pair of laws:

- *Mirrors* — plane, concave and convex, with the four construction rays and an
  honest fan you can turn on beside them. A screen you slide along the bench catches
  a real image at exactly one place and a virtual one nowhere at all.
- *Lenses* — the same apparatus with the light going through instead of back, plus
  power in dioptres and the lens maker's formula. The lab grinds the lens you ask
  for, and refuses to grind one whose two faces would have crossed.
- *Refraction* — a flat surface where the critical angle is not a special case
  anybody wrote but simply where Snell's law runs out of an answer; a slab that
  moves a ray sideways without turning it; and a prism with its deviation, its
  minimum, and white light coming apart into a spectrum.
- *The eye* — the one lens whose image distance cannot move, so the focal length
  has to. Give it myopia and the light focuses short of the retina; put the
  spectacles on and watch it collapse back to a point.

The construction rays are drawn as what they are. The parallel one crosses the
element at h and the one through the focus crosses it at h′, so magnify hard enough
and that second one is crossing well outside any glass there is — at which point it
is not light, and the lab draws it dashed, marks how far the element would have to
reach, and offers to widen it. The image forms regardless, which is the actual
lesson: a small lens gathers less light, not less picture.

Two of the graphs in the working out are really experiments. **1/v against 1/u** is
how a focal length is measured in a school laboratory: take half a dozen readings —
there is a button — and the line through them cuts both axes at 1/f, which the lab
reads back without ever being told it. **Deviation against incidence** shows the
prism's minimum as a place on a curve rather than a fact to be learnt, and shows why
it is the measurement worth taking: the curve is flat there. Beside them the six
standard positions are tabulated by working each one out, and every row is a button
that puts the object where it says.

The pole sits at x = 0 and stays there, so the drawing's x axis **is** the number
line of the New Cartesian convention: u is drawn to the left of zero because u is
negative, and every signed number in the working out is glossed in plain English —
"v = −24 cm, which is 24 cm in front of the mirror, so it is real and a screen will
catch it".

And then the point of the whole thing. 1/v + 1/u = 1/f is not a law; it is what the
law of reflection becomes if every ray stays near the axis. Widen the mirror and the
traced rays stop meeting at a point — 0.25% out at 7 cm of ray height, a full 1% at
14 cm, and the error falling as h² all the way down. The formula has something to
answer to on every bench in the lab.

## Notes

- **Themes.** Three states — light, dark, and "match my system". The choice is stamped
  on `<html>` and applied by a small inline script in `index.html` before the first
  paint, so there is no flash of the wrong theme.
- **`legacy/`** holds the original single-file version of the Moment of Force lab
  (plain HTML/CSS/JS) that this project was ported from. Kept for reference only;
  nothing builds from it.
