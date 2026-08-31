/* ============================================================
   The catalogue.
   One entry per lab. A lab becomes real by writing its component
   and switching `status` to 'ready' — nothing else in the site
   needs to know it exists.
   ============================================================ */
import { lazy } from 'react';

export const SUBJECTS = [
  { id: 'physics',   name: 'Physics',   blurb: 'Forces, motion, light and electricity.' },
  { id: 'chemistry', name: 'Chemistry', blurb: 'Reactions, solutions and the periodic table.' },
  { id: 'maths',     name: 'Maths',     blurb: 'Shape, number, graphs and chance.' },
  { id: 'biology',   name: 'Biology',   blurb: 'Cells, bodies and living systems.' },
];

export const subjectById = (id) => SUBJECTS.find((s) => s.id === id);

export const LABS = [
  {
    slug: 'moment-of-force',
    title: 'Moment of Force',
    topic: 'The turning effect of a force',
    subject: 'physics',
    level: 'Class 8–10',
    status: 'ready',
    blurb: 'Move the fulcrum, hang the masses, and find the rule that balances the rod.',
    summary: 'A rod on a movable wedge with masses you can drag along it. Every distance is ' +
             'measured from the pivot, the working is set out the way you would write it, and ' +
             'the beam really swings — so an unbalanced rod goes over instead of sitting still.',
    tags: ['levers', 'equilibrium', 'torque', 'seesaw'],
    teaches: [
      'Why a force further from the pivot turns harder',
      'The principle of moments: clockwise = anticlockwise',
      'Turning mass into weight with F = m g',
      "Handling a rod that has weight of its own",
    ],
    component: lazy(() => import('../labs/moment-of-force/MomentOfForceLab')),
  },

  {
    slug: 'simple-pendulum',
    title: 'Simple Pendulum',
    topic: 'Period, length and gravity',
    subject: 'physics',
    level: 'Class 8–10',
    status: 'ready',
    blurb: 'Swing a bob and find what its period really depends on — and what it does not.',
    summary: 'A bob on a string that obeys the real equation of motion, not the textbook ' +
             'shortcut — and a lab that times its own swings, so the famous formula always ' +
             'has something to answer to. Hang two side by side to settle an argument.',
    tags: ['oscillation', 'gravity', 'period', 'galileo', 'timekeeping', 'energy'],
    teaches: [
      'Why the mass of the bob makes no difference at all',
      'Why four times the length gives only twice the period',
      'Reading T = 2π√(L/g) backwards to design a clock',
      'Where the small-angle approximation quietly stops being true',
    ],
    component: lazy(() => import('../labs/simple-pendulum/SimplePendulumLab')),
  },

  {
    slug: 'inheritance',
    title: 'Inheritance',
    topic: 'Genes, alleles and ratios',
    subject: 'biology',
    level: 'Class 9–10',
    status: 'ready',
    blurb: 'Cross two parents and watch the 3 : 1 ratio come out of the square.',
    summary: 'A Punnett square you can rebuild by clicking any allele, from a single gene to ' +
             "Mendel's two-gene cross — and a litter you can actually breed from it, so the " +
             'ratio the square predicts always has real offspring to answer to.',
    tags: ['genetics', 'punnett', 'mendel', 'alleles', 'dominance', 'probability', 'dna'],
    teaches: [
      'Why three genotypes can show only two appearances',
      'Where 3 : 1 and 9 : 3 : 3 : 1 actually come from',
      'Using a test cross to find what an organism is carrying',
      'Why a real litter never lands exactly on the ratio',
    ],
    component: lazy(() => import('../labs/inheritance/InheritanceLab')),
  },

  {
    slug: 'reflection',
    title: 'Reflection',
    topic: 'Mirror lines, and mirror planes',
    subject: 'maths',
    level: 'Class 8–12',
    status: 'ready',
    blurb: 'Write the mirror down or draw it on the graph — the image finds its own place.',
    summary: 'A point, or a whole shape, held up to a mirror you can define either way: ' +
             'type y = 2x + 1 and the mirror moves onto it, or drag the mirror across the ' +
             'graph and the equation rewrites itself. Then the same thing in space, where ' +
             'the mirror is a plane — and a line, which turns out not to be a mirror at all.',
    tags: ['reflection', 'coordinate geometry', 'symmetry', 'transformations',
           'perpendicular bisector', '3d geometry', 'vectors'],
    teaches: [
      'Why the mirror is the perpendicular bisector of the join',
      'Reflecting in any line, not just the friendly ones',
      'Reading a mirror off a graph and writing it as an equation',
      'How a mirror plane in space is the very same formula',
      'Why turning about a line in space is not a reflection at all',
    ],
    component: lazy(() => import('../labs/reflection/ReflectionLab')),
  },

  {
    slug: 'optics',
    title: 'Light',
    topic: 'Rays, mirrors and lenses',
    subject: 'physics',
    level: 'Class 8–12',
    status: 'ready',
    blurb: 'Trace the rays for real, and let the mirror formula answer for itself.',
    summary: 'An optical bench with every ray traced rather than remembered — mirrors, ' +
             'lenses, a prism and an eye. The mirror and lens formulas are not laws but ' +
             'the paraxial limit of Snell and the law of reflection, so widen the mirror ' +
             'and you can watch the approximation come apart.',
    tags: ['light', 'reflection', 'refraction', 'mirrors', 'lenses', 'prism', 'snell',
           'total internal reflection', 'dispersion', 'the eye', 'dioptres', 'ray diagram'],
    teaches: [
      'Reading the New Cartesian sign convention off the bench itself',
      'Why a virtual image can never be caught on a screen',
      'Where total internal reflection begins, and why it has to',
      'Why the mirror and lens formulas differ by one sign',
      'Where the paraxial approximation quietly stops being true',
    ],
    component: lazy(() => import('../labs/optics/OpticsLab')),
  },

  /* ---------- the shelf ahead ----------
     Placeholders, marked so, so the catalogue shows where each subject is going.
     Delete an entry or give it a component and status:'ready' when its lab lands. */
  { slug: 'ohms-law', title: "Ohm's Law", topic: 'Current, voltage and resistance',
    subject: 'physics', level: 'Class 9–10', status: 'soon',
    blurb: 'Build a circuit, turn the dial, and watch V = I R hold.' },

  { slug: 'ph-titration', title: 'Acids, Bases & pH', topic: 'Neutralisation and the pH scale',
    subject: 'chemistry', level: 'Class 8–10', status: 'soon',
    blurb: 'Drip base into acid and watch the indicator turn at exactly the right drop.' },
  { slug: 'periodic-trends', title: 'Periodic Trends', topic: 'Reading the periodic table',
    subject: 'chemistry', level: 'Class 9–11', status: 'soon',
    blurb: 'Colour the table by any property and watch the pattern appear down a group.' },

  { slug: 'sine-explorer', title: 'Sine & Cosine', topic: 'The unit circle and waves',
    subject: 'maths', level: 'Class 9–11', status: 'soon',
    blurb: 'Drag a point round the circle and watch the wave it draws.' },
  { slug: 'probability-dice', title: 'Dice & Chance', topic: 'Probability and the long run',
    subject: 'maths', level: 'Class 7–9', status: 'soon',
    blurb: 'Roll ten times, then ten thousand, and see where the shape settles.' },

  { slug: 'photosynthesis', title: 'Photosynthesis Rate', topic: 'What limits a plant',
    subject: 'biology', level: 'Class 8–10', status: 'soon',
    blurb: 'Change the light, the CO₂ and the temperature, and count the bubbles.' },
];

export const labBySlug = (slug) => LABS.find((l) => l.slug === slug);
export const readyLabs = () => LABS.filter((l) => l.status === 'ready');
