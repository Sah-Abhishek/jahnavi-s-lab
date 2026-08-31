/* ============================================================
   Light — the explanation.
   Written to be read beside the bench, so every section ends with
   something to go and try on it.
   ============================================================ */
import { memo } from 'react';

function LearnPanel() {
  return (
    <div className="card tabpanel learn">
      <h2 className="learn-title">Light, and what it does when you get in its way</h2>

      <p>Light travels in straight lines. That is not quite true — it is a wave, and it bends
        round corners by an amount too small to notice — but it is true enough that the whole of
        this lab can be built out of straight rays and two rules about what happens when one of
        them meets a surface. Everything below is those two rules, applied patiently.</p>

      <h3>The two laws of reflection</h3>
      <div className="rule">the angle of incidence = the angle of reflection · and the two rays
        and the normal all lie in one plane</div>
      <p>The <em>normal</em> is the line square to the surface where the ray lands, and both
        angles are measured from it — never from the surface itself. That single convention is
        worth more than it looks: on a curved mirror the normal points somewhere different at
        every point, which is the entire reason a curved mirror can bring light to a focus while
        a flat one cannot.</p>
      <p>Try it: put the mirror bench on <strong>plane</strong>, then on <strong>concave</strong>,
        and watch what the same fan of rays does to each.</p>

      <h3>The sign convention, done slowly</h3>
      <p>This is where the marks go. The rule is:</p>
      <div className="rule">light travels left to right · measure everything from the pole ·
        with the light is positive, against it is negative · up is positive</div>
      <p>On this bench the pole sits at zero and never moves, so a distance and its sign are the
        same fact: the object is drawn to the left of zero <em>because</em> u is negative. There
        is nothing extra to remember.</p>
      <div className="example">
        <p className="step">u = −40 cm → 40 cm in front, which is where objects always are</p>
        <p className="step">f = −15 cm → the focus is in front too, so the mirror is concave</p>
        <p className="step">v = −24 cm → the image is in front, so it is real</p>
        <p className="step">m = −0.6 → inverted, and 0.6 times as tall</p>
      </div>

      <h3>The mirror formula, and the lens formula</h3>
      <div className="formula">
        <span className="fsym">1/v + 1/u = 1/f</span>
        <span className="funit">a mirror — the light comes back the way it came</span>
      </div>
      <div className="formula">
        <span className="fsym">1/v − 1/u = 1/f</span>
        <span className="funit">a lens — the light carries on through</span>
      </div>
      <p>Every year, people lose marks swapping these two. The sign is not a typographical
        accident and it is not worth memorising as one. A mirror sends the light back the way it
        came, so the image and the object are on the <em>same</em> side and measured in the same
        direction. A lens sends it onward, so a real image lands on the <em>far</em> side, and v
        is measured the other way. Change the direction you measure in and the sign in the
        formula changes with it. It is one formula, seen from two sides.</p>
      <p>The magnifications follow the same logic: <strong>m = −v/u</strong> for a mirror and
        <strong> m = v/u</strong> for a lens, and both of them equal h′/h. The working-out panel
        shows those two routes side by side, because they must always agree.</p>

      <h3>Real and virtual, and why one of them can be caught</h3>
      <p>A <strong>real</strong> image is a place where light actually arrives and crosses. Put a
        screen there and you see it, because there is light there to see. A <strong>virtual</strong>
        image is a place the light only <em>appears</em> to have come from — the rays are
        diverging, and your eye traces them back to a meeting point behind the mirror where no
        light has ever been.</p>
      <p>Try it: tick <strong>Put a screen on the bench</strong> and slide it. With the object
        beyond F you can find the one place the spot goes sharp. Then move the object inside F and
        try again: there is now nothing to catch anywhere, and the lab says so.</p>

      <h3>The construction rays are a construction</h3>
      <p>The three rays you draw are chosen because you already know what each one does:
        one arrives parallel and leaves through the focus, one goes through the centre
        and carries straight on, one arrives through the focus and leaves parallel. Their
        crossing point is the image. But they are a <em>device</em> for finding it, not a
        census of the light.</p>
      <p>You can see the difference on the bench. The parallel ray crosses the lens at
        height <em>h</em>, and the ray through the focus crosses it at <em>h′</em> — at the
        image height, which is why it leaves parallel at that height. Magnify by four and
        that second ray is crossing four object-heights off the axis. Unless the lens is
        genuinely that big, there is no glass there and no ray there: the lab draws that
        one <strong>dashed</strong>, as pencil rather than light, and shows you how far the
        lens would have to reach.</p>
      <p>And yet the image still forms. Every point of the object sends the lens a whole
        <em>cone</em> of light, and the lens catches the middle of each cone; a small lens
        simply gathers less of it. Cover half a lens with your hand and you do not lose
        half the picture — you lose half the brightness. Try it: switch to{' '}
        <strong>a real fan</strong>, which is traced honestly and clipped at the glass, and
        watch the image survive while the rays reaching it thin out.</p>

      <h3>Why light bends at all</h3>
      <div className="formula">
        <span className="fsym">n₁ sin i = n₂ sin r</span>
        <span className="funit">Snell’s law</span>
      </div>
      <p>Light goes slower in glass than in air, and <strong>n = c/v</strong> is exactly how much
        slower: n = 1.5 means light crawls along at two-thirds of its usual pace. When a slanting
        wavefront arrives at glass, one edge of it is slowed before the other, and the whole thing
        slews round — the way a trolley slews if one wheel hits carpet first.</p>
      <div className="rule">into a denser medium → bends towards the normal · into a rarer one →
        bends away from it</div>

      <h3>Total internal reflection</h3>
      <p>Going from dense to rare, the ray bends away from the normal — and at some angle it would
        have to bend past 90°, which is to say it would have to not leave at all. It doesn’t. All
        of it reflects back inside.</p>
      <div className="example">
        <p className="step">sin C = n₂ / n₁</p>
        <p className="step">glass → air: C = 41.8°   ·   water → air: C = 48.8°</p>
        <p className="step">diamond → air: C = 24.4°, which is why diamonds sparkle</p>
      </div>
      <p>Try it: on the refraction bench, send light from glass into air and swing the angle up
        past 41.8°. Watch the refracted ray flatten, fade and vanish exactly there. Nothing in the
        lab is testing for that angle — the tracer simply runs out of an answer to Snell’s law,
        and turns the light round.</p>
      <ul className="examples">
        <li><strong>Optical fibre</strong> — light bounces the length of a glass thread and cannot
          get out, which is how this page reached your screen.</li>
        <li><strong>A mirage</strong> — hot air near the road is rarer than the air above, and the
          light from the sky turns back up before it reaches the ground.</li>
        <li><strong>Binoculars and periscopes</strong> — a right-angled prism is a better mirror
          than a mirror, because nothing is lost.</li>
      </ul>

      <h3>The prism, and why white is not a colour</h3>
      <p>A prism bends light twice the same way, so the total deviation D = i₁ + i₂ − A. Swing the
        incoming ray and D falls, reaches a least value, and rises again — and at that minimum the
        path through the prism has gone perfectly symmetric, r₁ = r₂ = A/2. That symmetry is not a
        coincidence; it is <em>why</em> it is a minimum, and it gives the neatest way there is to
        measure a refractive index:</p>
      <div className="formula">
        <span className="fsym">n = sin((A + D_min)/2) ÷ sin(A/2)</span>
        <span className="funit">two angles with a protractor, and you have n</span>
      </div>
      <p>Then the sting. n is not one number — it depends on colour. Violet light is slowed more
        than red, so it is bent more, and white light comes out fanned into a spectrum. Newton
        settled it by passing the spectrum through a second prism and getting white back:
        the prism was not colouring the light, it was separating what was already there.</p>
      <p>Try it: tick <strong>white light</strong> and find minimum deviation. Then look at a
        rainbow differently — it is raindrops doing this, with a reflection in the middle.</p>

      <h3>Where the formulas stop telling the truth</h3>
      <p>1/v + 1/u = 1/f is not a law of nature. It is what the law of reflection becomes if you
        assume every ray stays close to the axis — the <strong>paraxial</strong> assumption. This
        lab does not assume it. Switch the rays to <strong>a real fan</strong> and widen the
        mirror, and the rays stop meeting at a point: the ones near the rim cross the axis nearer
        the mirror than the ones near the middle, and the focus smears into a curved surface
        called a <strong>caustic</strong> — the bright cusp you have seen in the bottom of a mug
        of tea.</p>
      <div className="example">
        <p className="step">a 40 cm mirror, rays 7 cm out: the formula is 0.25% wrong</p>
        <p className="step">the same mirror, rays 14 cm out: 1% wrong</p>
        <p className="step">halve the aperture and the error quarters — it goes as h²</p>
      </div>
      <p>This is why a serious telescope mirror is a parabola and not a sphere, and why a decent
        camera lens has six pieces of glass in it rather than one. And because n depends on colour,
        a single lens cannot focus all colours in the same place either — <em>chromatic</em>
        aberration, the other half of the problem.</p>

      <h3>The eye — the one lens that works backwards</h3>
      <p>On every other bench here you move the image about. Your retina cannot move: it sits a
        fixed 2.5 cm behind the lens. So the eye does the only thing left and changes its own
        focal length, squeezing the lens fatter to look at something close. That is
        <strong> accommodation</strong>, and a normal eye has about four dioptres of it.</p>
      <div className="example">
        <p className="step">something far away needs 100/2.5 = 40 D</p>
        <p className="step">something at 25 cm needs 40 + 4 = 44 D</p>
        <p className="step">so the near point sits at 25 cm — that is where the 4 D runs out</p>
      </div>
      <p>A <strong>short-sighted</strong> eye is too strong: its far point has come in from
        infinity, so distant things focus in front of the retina. A <strong>concave</strong> lens
        of P = −100/(far point) spreads the light first and puts infinity back where it belongs. A
        <strong> long-sighted</strong> eye is too weak, its near point has gone out past 25 cm, and
        a <strong>convex</strong> lens of P = 4 − 100/(near point) does the missing bending for it.</p>
      <p>Try it: give the eye a defect, watch the picture on the retina go to a disc, then put the
        spectacles on and watch it collapse back to a point.</p>

      <h3>Where you meet all this</h3>
      <ul className="examples">
        <li><strong>A car’s wing mirror</strong> — convex, because it always gives a small upright
          image and a very wide view. That is also why it warns you things are closer than they look.</li>
        <li><strong>A dentist’s mirror, a shaving mirror</strong> — concave, used well inside the
          focus, where the image is virtual, erect and magnified.</li>
        <li><strong>A magnifying glass</strong> — a convex lens with the object inside f. Exactly
          the same trick, with the light going through instead of back.</li>
        <li><strong>A camera, and your eye</strong> — object far beyond 2F, so the image is real,
          inverted and small. Your brain turns it up the right way.</li>
        <li><strong>A projector</strong> — between F and 2F, so the image is real, inverted and
          magnified. The slide goes in upside down.</li>
      </ul>

      <h3>Watch out for these</h3>
      <ul className="mistakes">
        <li>Forgetting the minus on u. The object is always in front, so u is always negative.</li>
        <li>Taking f as positive for a concave mirror. Its focus is in front, so f is negative.</li>
        <li>Using 1/v + 1/u for a lens. That is the mirror’s. A lens takes the minus.</li>
        <li>Expecting to catch a virtual image on a screen. There is no light where it appears
          to be.</li>
        <li>Thinking total internal reflection can happen going <em>into</em> the denser medium.
          It cannot, at any angle at all.</li>
        <li>Measuring u from the centre of curvature. Everything is measured from the pole.</li>
        <li>Using m = −v/u for a lens. For a lens it is +v/u — the sign is already in v.</li>
        <li>Reading a construction ray as light. If it crosses the element where there is
          no glass, no such ray exists — but the image does.</li>
        <li>Believing the mirror formula exactly. It is the paraxial limit, and it is 1% out at a
          quite ordinary aperture.</li>
      </ul>

      <h3>Investigate</h3>
      <ol className="investigate">
        <li>Put the object at C on a concave mirror. Where is the image, and how big? Now explain
          why that one position is how focal lengths are actually measured.</li>
        <li>Walk the object slowly in towards F and watch v. What happens to the image as you get
          very close, and what does the lab say when you arrive exactly?</li>
        <li>Find a position where the image is the same size as the object, for a mirror and then
          for a lens. Are they in the same place? Should they be?</li>
        <li>With a convex lens of f = 20 cm, find the closest an object and its real image can
          ever be to each other. Why can they not be closer?</li>
        <li>Set the mirror to convex and try every object distance there is. Can you ever get a
          real image? Can you ever get an inverted one?</li>
        <li>Switch on a real fan, widen the mirror, and measure how far the rim rays miss the
          focus. Halve the width and measure again.</li>
        <li>On the prism, find minimum deviation by hand. Then check r₁ and r₂ in the working out.
          What do you notice, and why does it have to be so?</li>
        <li>An eye has a far point of 50 cm. Work out the spectacle power on paper before you set
          it up — then set it up.</li>
      </ol>
    </div>
  );
}

export default memo(LearnPanel);
