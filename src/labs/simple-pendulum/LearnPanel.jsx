/* ============================================================
   Simple Pendulum — the explanation.
   Written to be read beside the apparatus, so every section ends
   with something to go and try.
   ============================================================ */
import { memo } from 'react';

function LearnPanel() {
  return (
    <div className="card tabpanel learn">
      <h2 className="learn-title">What sets the beat of a pendulum</h2>

      <p>A bob on a string, pulled aside and let go, keeps astonishingly steady time. Galileo is
        said to have noticed it watching a lamp swing in Pisa cathedral and timing it against his
        own pulse. Within a lifetime that observation had become the clock.</p>

      <div className="formula">
        period = 2π × the square root of (length ÷ gravity)<br />
        <span className="fsym">T = 2π √(L / g)</span>
        <span className="funit">metres ÷ newtons per kilogram → seconds</span>
      </div>

      <h3>What is not in the formula</h3>
      <p>Look at the right-hand side. There is no <em>m</em>. The mass of the bob does not appear,
        which means a lead weight and a cork keep exactly the same time on the same string.</p>
      <p>That feels wrong, and the reason it is not is worth having. A heavier bob is pulled harder
        by gravity — but it is also harder to get moving, by precisely the same factor. The two
        cancel, exactly as they do for a falling stone. Turn on <strong>Air resistance</strong> and
        the spell breaks, because drag depends on size rather than mass.</p>
      <p>Try it: set two pendulums the same length with very different bobs, release them together,
        and watch them stay in step. Then change the mass <em>while one is swinging</em>. Nothing
        happens.</p>

      <h3>What is in it</h3>
      <div className="rule">longer string → slower swing · stronger gravity → faster swing</div>
      <p>Both sit under a square root, and that changes the arithmetic in a way people rarely
        expect. To make a pendulum swing <strong>twice</strong> as slowly you need <strong>four
        times</strong> the length, not twice.</p>
      <div className="example">
        <p className="step">L = 0.5 m → T = 1.42 s</p>
        <p className="step">L = 2.0 m → T = 2.84 s   (four times as long, twice as slow)</p>
      </div>

      <h3>The seconds pendulum</h3>
      <p>A pendulum whose period is exactly two seconds ticks once per second at each end of its
        swing. That takes a string of about <strong>0.994 m</strong> on Earth — which is very nearly
        a metre, and not by accident: in 1660 the seconds pendulum was seriously proposed as the
        definition of the metre.</p>
      <p>It was rejected for a reason this lab can show you. Set gravity to the Moon and watch what
        happens to the timing. Gravity is not the same everywhere, not even across one planet, so a
        metre defined this way would have been a different length in Paris than in Lima.</p>

      <h3>Where the formula stops telling the truth</h3>
      <p>The real equation of motion for a pendulum is</p>
      <div className="example"><p className="step">θ″ = −(g / L) sin θ</p></div>
      <p>and nobody can solve that with school algebra. The trick — the one every textbook makes
        quietly — is to say that for small angles <strong>sin θ ≈ θ</strong>, which turns a hard
        equation into an easy one and hands you T = 2π√(L/g).</p>
      <p>It is a very good approximation, and it is still an approximation. This lab solves the
        real equation and times the result, so you can catch the formula out:</p>
      <div className="example">
        <p className="step">at 5°   the formula is 0.05% fast</p>
        <p className="step">at 20°  it is 0.8% fast</p>
        <p className="step">at 45°  it is 4.0% fast</p>
        <p className="step">at 80°  it is 14% fast</p>
      </div>
      <p>Open <strong>Small swing against big swing</strong> and watch the two drift apart. They
        start together and, after a dozen swings, are visibly out of step — from nothing but the
        size of the swing.</p>

      <h3>Energy, going round in circles</h3>
      <p>At the ends of the swing the bob is still and high: all the energy is height. At the
        bottom it is low and fast: all of it is motion. In between it is trading one for the other,
        and the total never changes.</p>
      <div className="example">
        <p className="step">energy of height = m g L (1 − cos θ)</p>
        <p className="step">energy of motion = ½ m (L ω)²</p>
      </div>
      <p>Tick <strong>Energy</strong> and watch the two colours slide back and forth. Switch on the
        air and the whole bar shrinks — that is the energy leaving as heat and sound.</p>

      <h3>Why the string pulls harder than the bob weighs</h3>
      <p>At the bottom of the swing the string is not just holding the bob up, it is also bending
        its path into a curve. Both need force, so</p>
      <div className="example"><p className="step">T = m g cos θ + m L ω²</p></div>
      <p>Tick <strong>Forces</strong> and watch the tension arrow at the lowest point of a big
        swing. It can reach three times the bob's weight — which is why a swing's chains are far
        stronger than they look like they need to be.</p>

      <h3>Where you meet it</h3>
      <ul className="examples">
        <li><strong>A pendulum clock</strong> — the swing counts, the escapement tops up what
          friction takes.</li>
        <li><strong>A child on a swing</strong> — the period depends on the chains, not the child.</li>
        <li><strong>A metronome</strong> — a pendulum with a sliding weight to change its beat.</li>
        <li><strong>Surveying gravity</strong> — time a pendulum precisely and you have measured
          <em> g</em>, and with it what lies under your feet.</li>
        <li><strong>A wrecking ball or a crane load</strong> — the same physics, at a size where
          getting the timing wrong is expensive.</li>
      </ul>

      <h3>Watch out for these</h3>
      <ul className="mistakes">
        <li>Thinking a heavier bob swings slower. It does not — mass is not in the formula.</li>
        <li>Doubling the length and expecting twice the period. You get √2 ≈ 1.41 times.</li>
        <li>Measuring the string only. The length runs to the <em>centre of the bob</em>.</li>
        <li>Timing one swing with a stopwatch. Your reaction time is bigger than the error you
          are chasing — time twenty and divide.</li>
        <li>Calling a half swing a period. One period is all the way over <em>and back</em>.</li>
        <li>Trusting T = 2π√(L/g) for a big swing. Past about 15° it starts to matter.</li>
      </ul>

      <h3>Investigate</h3>
      <ol className="investigate">
        <li>Hang two pendulums the same length with bobs of 1 kg and 8 kg. Predict, then release.</li>
        <li>Find the length that gives a period of exactly 1 second. Now check your answer against
          L = g(T/2π)².</li>
        <li>Quadruple the length. By what factor does the period change, and why that factor?</li>
        <li>Set both to 1.5 m, one released from 8° and one from 80°. How many swings before they
          are visibly out of step?</li>
        <li>Switch gravity to Jupiter. Does the pendulum speed up or slow down? By roughly how much?</li>
        <li>Turn on air resistance and watch the measured period as the swing dies away. Does the
          timing change? Should it?</li>
        <li>With Forces on, pause the bob at the very bottom and at the very end of its swing.
          Where is the tension greatest, and where is the restoring force greatest?</li>
        <li>Could you use a pendulum to work out the gravity of a planet you had never visited,
          knowing only the length and a stopwatch?</li>
      </ol>
    </div>
  );
}

export default memo(LearnPanel);
