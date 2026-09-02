/* ============================================================
   Moment of Force — the explanation.
   Written to be read alongside the apparatus, so every section
   ends with something to go and try rather than a summary.
   ============================================================ */
import { U } from './engine';

export default function LearnPanel({ state: s }) {
  const u = U(s);
  return (
    <div className="card tabpanel learn">
      <h2 className="learn-title">The turning effect of a force</h2>

      <p>Push a door near its hinge and it hardly moves. Push just as hard at the handle and
        it swings open. The force is the same — what changed is the <strong>distance from the
        pivot</strong>. That turning effect is called the <strong>moment of a force</strong>.</p>

      <div className="formula">
        moment = force × perpendicular distance from the pivot<br />
        <span className="fsym">M = F × d</span>
        <span className="funit">
          {u.name === 'MKS'
            ? 'newton (N) × metre (m) = newton metre (N·m)'
            : 'dyne × centimetre (cm) = dyne centimetre (dyne·cm)'}
        </span>
      </div>

      <h3>The pivot</h3>
      <p>The fulcrum is the point the rod turns about, and <em>every distance is measured from
        it</em> — which is why the rod is marked <strong>0</strong> where it sits, counting
        negative to the left and positive to the right. Slide the pivot in the diagram: no mass
        moves, yet the markings travel with the pivot, so every distance — and so every
        moment — changes.</p>

      <h3>The principle of moments</h3>
      <p>A rod that balances obeys one neat rule:</p>
      <div className="rule">total clockwise moments = total anticlockwise moments</div>
      <p>So a small weight far from the pivot balances a large weight close to it. That is
        exactly why a small child can seesaw with an adult — the child just sits further back.
        It is also what holds up every tower crane on the skyline: the <strong>Real world</strong> tab
        builds one and walks you round it.</p>

      <h3>A rod that weighs something</h3>
      <p>A rod is not a point — it is spread out, so every centimetre of it pulls down. Put the
        pivot off-centre and there is rod on <em>both</em> sides of it, each side turning the
        beam its own way.</p>
      <p>The neat way to handle that is to cut the rod at the pivot and treat each piece as one
        mass:</p>
      <div className="example">
        <p className="step">each piece's mass = rod mass × (its length ÷ whole length)</p>
        <p className="step">and that weight acts at the <strong>middle of that piece</strong></p>
      </div>
      <p>A 100 kg, 100 m rod on a pivot at 80 m becomes 80 kg acting at 40 m (so 40 m to the
        left of the pivot) and 20 kg acting at 90 m (10 m to the right) — an anticlockwise
        moment and a clockwise one, not a single lopsided force.</p>
      <p>Work out the difference and you get exactly the same answer as putting the whole weight
        at the rod's centre. That is <em>why</em> the centre-of-mass shortcut works — but the two
        pieces show you where the answer comes from. Tick <strong>Rod has weight</strong> and
        slide the pivot to watch the two moments trade places.</p>

      <h3>Why it leans the way it does</h3>
      <p>A weight on a string always pulls straight down, so when the beam tilts by θ its lever
        arm becomes <em>d</em> cos θ. Every moment shrinks by the same factor — which means an
        unbalanced beam never finds a tilt where the moments agree. It keeps going until it hits
        the stand.</p>
      <p>What stops a real balance doing that is the pivot sitting a whisker <em>above</em> the
        beam's centre of gravity. That gives a restoring pull, and the beam settles where</p>
      <div className="example"><p className="step">tan θ = net moment ÷ (total weight × h)</p></div>
      <p>with <em>h</em> the height of the pivot above the centre of gravity — what a balance
        maker calls the beam's <strong>sensitivity</strong>. Notice the size of the masses
        cancels: halve every mass and the total weight halves too, so the lean is unchanged. A
        gram leans exactly like a kilogram, which is why a sensitive balance works with tiny
        riders.</p>

      <h3>Worked example</h3>
      <div className="example">
        <p>A 4 kg mass hangs 1.5 m to the <em>left</em> of the pivot (take g = 10 N/kg). Where
          must a 3 kg mass hang on the right to balance the rod?</p>
        <p className="step">anticlockwise = (4 × 10) × 1.5 = <strong>60 N·m</strong></p>
        <p className="step">for balance, clockwise must also be 60 N·m</p>
        <p className="step">(3 × 10) × d = 60 → 30 d = 60 → d = <strong>2.0 m</strong></p>
        <p>The lighter mass sits further out. Set it up in the lab and check.</p>
      </div>

      <h3>Where you meet it</h3>
      <ul className="examples">
        <li><strong>Seesaw</strong> — pivot in the middle, riders change their distance.</li>
        <li><strong>Spanner</strong> — a longer handle gives a bigger moment for the same push.</li>
        <li><strong>Crowbar</strong> — pivot close to the load, so a small effort lifts a lot.</li>
        <li><strong>Wheelbarrow</strong> — the wheel is the pivot; the load rides near it.</li>
        <li><strong>Scissors and pliers</strong> — two levers sharing one pivot.</li>
        <li><strong>Door handle</strong> — set as far from the hinge as possible, never beside it.</li>
      </ul>

      <h3>Watch out for these</h3>
      <ul className="mistakes">
        <li>Measuring from the <em>end of the rod</em> instead of from the pivot.</li>
        <li>Forgetting to turn mass into weight: <strong>F = m g</strong>, not F = m.</li>
        <li>Mixing centimetres and metres — pick one unit and stay with it.</li>
        <li>Ignoring the rod's own weight when the pivot is <em>not</em> at its centre.</li>
        <li>Thinking the overhanging end of a rod does nothing. Every part of a rod has weight,
          and the part beyond the pivot turns the beam the other way.</li>
      </ul>

      <h3>Investigate</h3>
      <ol className="investigate">
        <li>Balance two equal masses on a central pivot, then move the pivot 1 m right. Which way
          does it tip?</li>
        <li>Balance 5 kg at 1 m against 1 kg. How far out must the 1 kg go?</li>
        <li>Switch gravity to the Moon. Does a balanced rod become unbalanced? Explain why not.</li>
        <li>Switch one mass off, rebalance, then switch it back on. What has to change?</li>
        <li>Add a balancer, then drag it slowly towards the pivot. Watch its mass climb — why
          must it, and what happens as the distance approaches zero?</li>
        <li>Balance the rod, then change its length from 10 m to 1 m. Every moment shrinks to a
          tenth — so why is the rod still balanced?</li>
        <li>Turn on the rod's weight and put the pivot at 3 m. What must change to rebalance it?</li>
        <li>With only the rod's weight on, slide the pivot to the exact centre. Why do the two
          parts cancel? Now slide it slightly right — which part's moment grows, and which
          shrinks?</li>
      </ol>
    </div>
  );
}
