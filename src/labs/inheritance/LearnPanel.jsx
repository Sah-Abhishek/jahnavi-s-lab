/* ============================================================
   Inheritance — the explanation.
   Written to be read beside the square, so every section ends
   with something to go and try.
   ============================================================ */
import { memo } from 'react';

function LearnPanel() {
  return (
    <div className="card tabpanel learn">
      <h2 className="learn-title">Where a 3 : 1 comes from</h2>

      <p>Gregor Mendel spent seven years crossing pea plants in a monastery garden, and counted
        every single seed. Nobody had thought to count before. What the counting showed was that
        inheritance is not a blending of parents but a shuffling of whole units — and that the
        shuffle follows arithmetic simple enough to do on a scrap of paper.</p>

      <h3>Two copies of everything</h3>
      <p>Every ordinary body cell carries two copies of each gene, one from each parent. The
        different versions a gene can come in are its <strong>alleles</strong> — R and r here.
        The pair you carry is your <strong>genotype</strong>; what you actually look like is your
        <strong> phenotype</strong>.</p>
      <div className="rule">genotype is what you have · phenotype is what you show</div>
      <p>Those are not the same list, and the gap between them is where most of the confusion in
        this topic lives.</p>

      <h3>Dominant and recessive</h3>
      <p>A <strong>dominant</strong> allele shows whenever it is present, even in a single copy.
        A <strong>recessive</strong> one only shows when there is nothing else to hide behind —
        when both copies are recessive. So RR and Rr look identical, and only rr looks different.</p>
      <p>Three genotypes, two appearances. That is the whole trick.</p>

      <h3>Gametes, and why the square works</h3>
      <p>Sex cells get one copy of each gene, not two. An Rr parent therefore makes two kinds of
        gamete in equal numbers — half carrying R, half carrying r. A RR parent makes only one
        kind, but the square still shows it twice, because it really does turn up twice as often
        as either gamete from a heterozygote.</p>
      <div className="formula">
        <span className="fsym">Rr × Rr</span>
        gametes R, r  ×  R, r → RR, Rr, Rr, rr
        <span className="funit">four equally likely ways for the gametes to meet</span>
      </div>
      <p>Line one parent's gametes down the side and the other's across the top, and every box is
        one equally likely meeting. Count the boxes and you have the answer:</p>
      <div className="example">
        <p className="step">genotypes 1 RR : 2 Rr : 1 rr</p>
        <p className="step">shows as  3 round : 1 wrinkled</p>
      </div>
      <p>Notice the 3 : 1 is not a fact about peas. It is a fact about counting four boxes.</p>

      <h3>The test cross</h3>
      <p>Here is a real problem. You have a round pea. Is it RR or Rr? You cannot tell by looking —
        that is the point of dominance.</p>
      <p>So cross it with a wrinkled one, rr. If your plant is RR, every offspring is Rr and every
        one is round. If it is Rr, half come out wrinkled. One cross, and a question that looks
        unanswerable has a clean answer. Try <strong>Test cross</strong> and switch the round
        parent between RR and Rr.</p>

      <h3>Two genes at once</h3>
      <p>Mendel's second great result was that separate genes are shuffled separately. Seed shape
        does not care what seed colour is doing, so an RrYy parent makes four kinds of gamete —
        RY, Ry, rY, ry — in equal numbers, and the square becomes 4 × 4.</p>
      <div className="example">
        <p className="step">9 round yellow : 3 round green : 3 wrinkled yellow : 1 wrinkled green</p>
      </div>
      <p>And 9 : 3 : 3 : 1 is just (3 : 1) × (3 : 1). Two independent coins, not one strange
        sixteen-sided die. Open <strong>Two genes at once</strong> and click a colour in the key
        to pick its nine squares out of the sixteen.</p>

      <h3>When neither allele gives way</h3>
      <p>Dominance is common, not compulsory. Cross a red snapdragon with a white one and you get
        pink — <strong>incomplete dominance</strong>, where one copy makes half as much pigment
        and half is visibly less. Cross two pinks and red and white reappear, which is how you
        know nothing was ever blended away.</p>
      <p>In <strong>codominance</strong> both alleles show fully and at once. A roan cow is not
        pink; it is red hairs and white hairs side by side, and up close you can see both.</p>
      <p>In both cases the phenotype ratio is <strong>1 : 2 : 1</strong> — the same as the
        genotype ratio, because now every genotype looks different. Compare that with 3 : 1 and
        you can read the mode of inheritance straight off the offspring.</p>

      <h3>Genes that sit on the X</h3>
      <p>Everything so far assumed both parents carry two copies of the gene. For genes on the
        <strong> X chromosome</strong> that stops being true. A daughter is XX and has two copies.
        A son is XY, and the Y is a much smaller chromosome that carries almost nothing — for
        these genes he has <em>one</em> copy, not two.</p>
      <div className="rule">a son has nothing for a faulty allele to hide behind</div>
      <p>That single asymmetry is the whole of sex linkage, and it explains a pattern people
        noticed centuries before anyone knew what a chromosome was: red–green colour blindness
        and haemophilia run in families, and they turn up overwhelmingly in the men.</p>
      <p>A woman with one faulty allele is a <strong>carrier</strong> — unaffected, because her
        other X covers for it, but able to pass it on. A man with one faulty allele is simply
        affected.</p>

      <h3>Reading a sex-linked square</h3>
      <p>Open <strong>Carrier mother, normal father</strong>. The mother makes two kinds of egg,
        X<sup>B</sup> and X<sup>b</sup>. The father makes two kinds of sperm — but they are not
        two versions of the gene, they are X<sup>B</sup> and <em>Y</em>. Which one arrives decides
        the child's sex.</p>
      <div className="example">
        <p className="step">1 in 4 unaffected daughter    1 in 4 carrier daughter</p>
        <p className="step">1 in 4 unaffected son         1 in 4 colour-blind son</p>
      </div>
      <p>So a quarter of her children are affected — and every one of them is a boy. Half her
        daughters carry it without ever knowing. Now switch the father to X<sup>b</sup>Y and
        watch affected daughters become possible for the first time.</p>
      <p>Then try <strong>Haemophiliac father</strong> and look hard at the sons. A father gives
        his sons a Y, never his X. <strong>He cannot pass an X-linked condition to a son at
        all</strong> — but every one of his daughters is a carrier. Queen Victoria's family tree
        is that square, drawn across four generations of European royalty.</p>

      <h3>More than two alleles</h3>
      <p>A gene can have more than two versions in a population, even though any one person still
        carries just two of them. The ABO blood group has three: I<sup>A</sup>, I<sup>B</sup>
        and i.</p>
      <div className="example">
        <p className="step">I<sup>A</sup> and I<sup>B</sup> are codominant — carry both and you are AB</p>
        <p className="step">i is recessive to both — you are only O with two copies of it</p>
      </div>
      <p>Six genotypes, four blood groups. Try <strong>Group AB × group O</strong>: every child
        is group A or group B, and not one is like either parent. Then set both parents to
        I<sup>A</sup>i and I<sup>B</sup>i and watch all four groups appear from two parents who
        are neither AB nor O.</p>

      <h3>Conditions that run in families</h3>
      <p><strong>Cystic fibrosis</strong> is recessive. Two healthy carriers have a 1 in 4 chance
        with every child — and because carriers show nothing at all, the first anyone knows is
        usually an affected baby born to parents with no family history. Two in every three of
        their unaffected children are carriers themselves.</p>
      <p><strong>Huntington's disease</strong> is dominant, which changes everything about the
        square. One copy is enough, so an affected parent passes it to half their children on
        average, and it appears in every generation rather than skipping. Because symptoms
        usually begin after 35, it is often passed on before anyone knows it is there.</p>
      <p>This is where a Punnett square stops being a school exercise. A genetic counsellor draws
        exactly this square, and the number in it is what a family is actually asking for.</p>

      <h3>Why a real family never gives exactly 3 : 1</h3>
      <p>The square gives a <em>chance</em>, not a promise. Each offspring is an independent
        throw: three-in-four round, one-in-four wrinkled. Four offspring will very often not be
        3 and 1 — the commonest single outcome is, but it happens less than a third of the time.</p>
      <p>Breed ten in this lab, then a hundred, then a thousand, and watch the observed ratio
        walk in towards the predicted one. Nothing about the odds changed; there is just less
        room for luck to show.</p>
      <p>This matters most where it matters most. Two carriers of cystic fibrosis face a 1 in 4
        chance <em>with every child, independently</em>. Having one affected child does not use
        the risk up, and having three unaffected ones does not store it up. The coin has no
        memory.</p>
      <p>Mendel counted 556 seeds in his dihybrid cross and got 315 : 101 : 108 : 32 against an
        expected 312.75 : 104.25 : 104.25 : 34.75. To ask whether a gap that size matters,
        biologists add up</p>
      <div className="example"><p className="step">χ² = Σ (observed − expected)² ÷ expected</p></div>
      <p>For Mendel's numbers that comes to 0.47, against a 5% threshold of 7.81 for three
        degrees of freedom. Nowhere near. The lab works out the same figure for whatever you
        breed.</p>

      <h3>Where you meet it</h3>
      <ul className="examples">
        <li><strong>Plant and animal breeding</strong> — test crosses are still how you find out
          what an animal is carrying.</li>
        <li><strong>Genetic counselling</strong> — two carriers of a recessive condition face
          exactly the 3 : 1 square, and a 1 in 4 chance.</li>
        <li><strong>Blood groups</strong> — A and B are codominant, O recessive to both.</li>
        <li><strong>Sickle-cell trait</strong> — carriers show both normal and sickle
          haemoglobin: codominance, and it protects against malaria.</li>
        <li><strong>Colour blindness</strong> — about 1 man in 12 and 1 woman in 200, and the
          square above is exactly why those two numbers are so far apart.</li>
        <li><strong>Haemophilia in the royal families of Europe</strong> — one carrier, Queen
          Victoria, and affected sons in Spain, Prussia and Russia.</li>
      </ul>

      <h3>Watch out for these</h3>
      <ul className="mistakes">
        <li>Reading 3 : 1 as "3 out of 3" — it is 3 out of <em>4</em>.</li>
        <li>Thinking the ratio applies to each birth. Every offspring is an independent
          throw; four children can all be affected.</li>
        <li>Quoting the genotype ratio when asked for the phenotype ratio.</li>
        <li>Assuming a dominant allele is the common one, or the "strong" or "better" one.
          Dominant only means it shows in a heterozygote. Polydactyly is dominant and rare.</li>
        <li>Writing rR. Convention is the dominant allele first: Rr.</li>
        <li>Expecting pink snapdragons to breed true. Cross two and you get 1 : 2 : 1.</li>
        <li>Writing a father's X-linked genotype as X<sup>B</sup>X<sup>b</sup>. He has one X and
          a Y: X<sup>B</sup>Y or X<sup>b</sup>Y, never both alleles.</li>
        <li>Calling a colour-blind man a carrier. Carriers are unaffected; he is affected.</li>
        <li>Saying "1 in 4 of the children are affected" when you mean each child has a 1 in 4
          chance. In a family of four, all four could be.</li>
        <li>Thinking a dominant condition must be common. Huntington's is dominant and rare;
          cystic fibrosis is recessive and far commoner.</li>
      </ul>

      <h3>Investigate</h3>
      <ol className="investigate">
        <li>Cross RR × rr. Where has the wrinkled allele gone? Now cross two of the offspring.</li>
        <li>Which crosses give offspring that all look alike? There is more than one.</li>
        <li>Set up a cross where exactly half the offspring are wrinkled.</li>
        <li>Breed 10 offspring from Rr × Rr five times over, clearing in between. How often do
          you actually get 3 : 1?</li>
        <li>Now breed 1000. How close does it come, and what does χ² say?</li>
        <li>In the two-gene cross, pick out the single wrinkled green square. What must both
          parents have passed on for it?</li>
        <li>Compare snapdragons with peas. Which one lets you read the genotype straight off the
          flower, and why?</li>
        <li>Two roan cattle are crossed. What fraction of the calves are roan — and can you ever
          breed a herd of roans that stays roan?</li>
        <li>A colour-blind father and a mother who is not a carrier. How many of their children
          are colour-blind? How many of their daughters carry it?</li>
        <li>Set up the only cross that can give a colour-blind daughter. What must both parents be?</li>
        <li>Can two group O parents have a group A child? Try every cross that gives group O
          parents and see.</li>
        <li>A group AB parent and a group O parent. Which groups are possible in their children,
          and which are impossible?</li>
        <li>Two healthy people have a child with cystic fibrosis. What must both parents be, and
          what is the chance their next child is a carrier?</li>
        <li>Huntington's: an affected parent and an unaffected one. Breed 100 children — how
          close to half are affected, and how far off does it get?</li>
      </ol>
    </div>
  );
}

export default memo(LearnPanel);
