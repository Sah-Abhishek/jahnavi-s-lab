/* ============================================================
   Reflection — the explanation.
   One idea, said once, then followed everywhere it goes.
   ============================================================ */
export default function LearnPanel() {
  return (
    <div className="card tabpanel learn">
      <h2 className="learn-title">Reflection</h2>

      <p>
        Stand a mirror on a line and look at a point. Its image is not somewhere vague
        behind the glass — it is at an exact place, and there is only one rule that puts
        it there.
      </p>

      <div className="rule">The mirror is the perpendicular bisector of the join.</div>

      <p>
        Everything else follows from that one sentence. Draw the line from the point to
        its image: the mirror cuts it <strong>at right angles</strong>, and cuts it{' '}
        <strong>exactly in half</strong>. Those two conditions are enough to fix the image
        completely, which is why there is never more than one answer.
      </p>

      <h3>Doing it with numbers</h3>

      <p>
        Write the mirror as <code>a x + b y + c = 0</code>. That form matters: it can say{' '}
        <code>x = 3</code>, which <code>y = m x + c</code> can never say, and every vertical
        mirror needs it. The pair <code>(a, b)</code> is the <strong>normal</strong> — the
        direction straight out of the mirror.
      </p>

      <div className="formula">
        the step out to the mirror
        <span className="fsym">t = (a x + b y + c) / (a² + b²)</span>
        <span className="funit">one step lands on the mirror · two steps land on the image</span>
      </div>

      <p>
        Put the point into the left-hand side of the equation. If the answer is zero the
        point is already on the mirror and does not move. Otherwise the number tells you
        how far off you are, and which side you are on — and dividing by <code>a² + b²</code>{' '}
        turns it into a step you can actually take along the normal.
      </p>

      <div className="example">
        <p>Reflect P(5, −2) in the mirror 3x − 4y + 5 = 0.</p>
        <p className="step">
          n = (3, −4), so n·n = 9 + 16 = 25<br />
          3(5) − 4(−2) + 5 = 15 + 8 + 5 = 28<br />
          t = 28 ÷ 25 = 1.12<br />
          M = (5, −2) − 1.12(3, −4) = (1.64, 2.48) &nbsp;← on the mirror<br />
          P′ = (5, −2) − 2.24(3, −4) = (−1.72, 6.96)
        </p>
        <p>
          Check it the lazy way: the midpoint of P and P′ is (1.64, 2.48), which is M. It
          had to be.
        </p>
      </div>

      <h3>The mirrors worth memorising</h3>

      <p>
        A handful of mirrors come up again and again, and for these you should never need
        the formula at all.
      </p>

      <div className="table-wrap">
        <table className="mirror-table">
          <thead>
            <tr><th>Mirror</th><th>(x, y) becomes</th><th>What happens</th></tr>
          </thead>
          <tbody>
            <tr><td><b>y = 0</b></td><td>(x, −y)</td><td>the x-axis: y changes sign</td></tr>
            <tr><td><b>x = 0</b></td><td>(−x, y)</td><td>the y-axis: x changes sign</td></tr>
            <tr><td><b>y = x</b></td><td>(y, x)</td><td>the coordinates swap</td></tr>
            <tr><td><b>y = −x</b></td><td>(−y, −x)</td><td>swap, then both change sign</td></tr>
            <tr><td><b>x = k</b></td><td>(2k − x, y)</td><td>fold across a vertical line</td></tr>
            <tr><td><b>y = k</b></td><td>(x, 2k − y)</td><td>fold across a horizontal line</td></tr>
          </tbody>
        </table>
      </div>

      <p>
        <code>y = x</code> swapping the coordinates is worth pausing on. It is the reason
        the graph of an inverse function is the graph of the original held up to that
        mirror — the same picture, with x and y trading places.
      </p>

      <h3>Into three dimensions</h3>

      <p>
        In space, the thing that behaves like a mirror is a <strong>plane</strong>, not a
        line. Write it as <code>a x + b y + c z + d = 0</code> and the method does not change
        by a single character — the normal simply has three components instead of two.
      </p>

      <div className="formula">
        <span className="fsym">P′ = P − 2 · ((n·P + d) / (n·n)) · n</span>
        <span className="funit">n = (a, b, c) · the same formula that did the flat case</span>
      </div>

      <p>
        So reflecting (3, 2, 4) in the floor <code>z = 0</code> gives (3, 2, −4): only the
        coordinate along the normal changes sign, and the two lying in the mirror are left
        alone. That is the signature of a real mirror — <strong>one</strong> direction is
        reversed, and only one.
      </p>

      <h3>Why a line in space is not a mirror</h3>

      <p>
        You can still "reflect" a point in a line in space, and the arithmetic is friendly:
        find the foot of the perpendicular M on the line, then go the same distance past it,
        so P′ = 2M − P. But look at what it does. Turn (4, 2, 3) about the z-axis and you
        get (−4, −2, 3): <strong>two</strong> directions have flipped, not one.
      </p>

      <p>
        Two flips make a turn. What you have done is spin the point half a revolution about
        the line — and a rotation, however far it goes, can never turn a left hand into a
        right hand. That is the difference the lab is trying to show you: switch the mirror
        between <strong>a plane</strong> and <strong>a line</strong> with the same point in
        place, and watch the image land somewhere else entirely.
      </p>

      <h3>What reflection never changes</h3>

      <p>
        Reflect a whole shape by reflecting each vertex, and every length in it survives
        untouched — so the image is congruent to the object, always. What does not survive
        is the <strong>way round</strong> it goes. Label a triangle A, B, C anticlockwise
        and its image reads clockwise. In the working out below, that shows up as the signed
        area changing sign while its size stays put.
      </p>

      <h3>Watch out for</h3>
      <ul className="mistakes">
        <li>
          Reflecting in <code>y = 3</code> by changing the sign of y. It is not the x-axis:
          (5, 1) goes to (5, 5), not (5, −1). Use 2k − y, or count the squares.
        </li>
        <li>
          Forgetting that <code>a² + b²</code> is on the bottom. Without it you take a step
          the length of the normal vector rather than a step to the mirror — right direction,
          wrong distance.
        </li>
        <li>
          Reaching for <code>y = m x + c</code> when the mirror is vertical. There is no
          gradient to write down. <code>a x + b y + c = 0</code> never has this problem.
        </li>
        <li>
          Expecting a line in space to act like a mirror. It gives a half-turn instead,
          and the two are only the same thing back in the flat case.
        </li>
      </ul>

      <h3>Things to try in the lab</h3>
      <ol className="investigate">
        <li>
          Put a point exactly on the mirror. Where does it go, and why does the working out
          go quiet?
        </li>
        <li>
          Reflect a point, then reflect the image in the same mirror. Predict what you will
          get before you look.
        </li>
        <li>
          Drag the mirror until it passes through the point itself. Watch t fall to zero.
        </li>
        <li>
          Set a triangle and read the vertices round. Do the same for the image. Which way
          does each go?
        </li>
        <li>
          In space, reflect (3, 2, 4) in <code>z = 0</code> and then turn the same point
          about the z-axis. Two images, two rules — write down what each one did to the
          three coordinates.
        </li>
        <li>
          Type a mirror that misses the graph entirely, like <code>y = 40</code>. What does
          the lab do, and is the image still where it should be?
        </li>
      </ol>
    </div>
  );
}
