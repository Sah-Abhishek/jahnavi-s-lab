/* ============================================================
   Moment of Force Lab
   A rod on a movable fulcrum with hanging masses.
   Everything is measured from the fulcrum:  moment = F x d
   ============================================================ */
(function () {
  'use strict';

  /* ---------- the rod is always 10 m; the drawing is not always 900 wide ----------
     A phone that scales a 900-unit drawing down to 360 px renders 10-unit type at
     4 px. So the scene keeps two geometries and picks one from its measured width:
     the compact one is a smaller drawing whose type is proportionally larger.      */
  const DIVS = 10;                       // the rod always carries 10 numbered divisions
  const PROFILES = {
    wide: {
      name: 'wide',
      W: 900, H: 515, X0: 60, DIV: 78, ROD_Y: 245, ROD_H: 8,
      PLATE: 373, GRID_Y: 11, MAX_TILT: 18,
      hang: 22, dim: 34, boxMin: 20, boxSpan: 22, arrowMax: 46, arrowK: 0.32,
      reactTail: 78, capY: 505, hitPad: 16
    },
    compact: {
      name: 'compact',
      W: 520, H: 372, X0: 40, DIV: 44, ROD_Y: 160, ROD_H: 6,
      PLATE: 250, GRID_Y: 28, MAX_TILT: 13,
      hang: 18, dim: 26, boxMin: 20, boxSpan: 22, arrowMax: 34, arrowK: 0.22,
      reactTail: 56, capY: 362, hitPad: 32
    }
  };
  let P = PROFILES.wide;

  /* Both of these are moments, so they scale with the rod: a 1 m rod tilts by the
     same amount as a 10 m one for the same *proportional* imbalance. */
  const tiltScale = () => 12 * state.rodLength / 10;
  const balancedTol = () => 0.05 * state.rodLength / 10;
  const MAX_MASSES = 6;
  const PALETTE = ['#c8452e', '#3272be', '#b4771a', '#7a55cc',
                   '#128a96', '#b94a85', '#63862a', '#c4631f'];

  /* ---------- state ---------- */
  const state = {
    rodLength: 10,     // metres from end to end; changes the markings, not the drawing
    fulcrum: 5,
    g: 9.8,
    masses: [],
    showForces: true,
    showDistances: true,
    snap: true,
    useRodWeight: false,
    rodMass: 2,
    mode: 'explore',   // 'explore' | 'challenge'
    frozen: false,     // rod held level while a prediction is pending
    nextId: 1
  };

  let angle = 0, vel = 0, dirty = true;
  let dragging = null;
  let exploreSnapshot = null;

  /* ---------- elements ---------- */
  const $ = (id) => document.getElementById(id);
  const scene = $('scene'), overlay = $('overlay'), rodGroup = $('rodGroup');
  const fulcrumGroup = $('fulcrumGroup'), groundG = $('ground'), sceneWrap = scene.parentNode;

  /* ---------- helpers ---------- */
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = (n, d) => (Math.abs(n) < 5e-3 ? 0 : n).toFixed(d === undefined ? 1 : d);

  const RL = () => state.rodLength;                    // rod length, in metres
  const ppm = () => P.DIV * DIVS / state.rodLength;    // drawing units per metre

  /** Decimals a number actually needs (0.05 -> 2, 1 -> 0). */
  function decimalsOf(v) {
    const t = Number(v).toPrecision(12).replace(/0+$/, '').replace(/\.$/, '');
    const i = t.indexOf('.');
    return i < 0 ? 0 : t.length - i - 1;
  }
  /** A tidy spacing for the rod's numbered marks: about 8 of them, on a 1/2/5 grid.
      10 m -> every 1 m,  1 m -> every 0.1 m,  7.3 m -> every 1 m. */
  function niceStep() {
    const raw = state.rodLength / 8;
    const pow = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / pow;
    return (n <= 1.5 ? 1 : n <= 3.5 ? 2 : n <= 7.5 ? 5 : 10) * pow;
  }
  const snapStep = () => niceStep() / 4;               // 0.25 m on a 10 m rod
  const fineStep = () => niceStep() / 20;
  const posDp = () => Math.max(decimalsOf(snapStep()), decimalsOf(fineStep()));
  const tickDp = () => decimalsOf(niceStep());
  const round2 = (v) => Math.round(v * 100) / 100;
  /** A mass written without a tail of zeros: 0.8, not 0.800000000000001. */
  const kgOf = (v) => (Math.round(v * 1000) / 1000).toFixed(3)
                        .replace(/0+$/, '').replace(/\.$/, '');
  const toDp = (v) => { const p = Math.pow(10, posDp()); return Math.round(v * p) / p; };
  const snapPos = (v) => {
    const st = state.snap ? snapStep() : fineStep();
    return Math.round(v / st) * st;
  };
  const onGrid = (v) => Math.round(v / fineStep()) * fineStep();
  const pivotX = () => P.X0 + state.fulcrum * ppm();

  function el(tag, attrs, text) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  /* ============================================================
     PHYSICS
     ============================================================ */

  /** Every object on the rod. Switched-off masses are listed but contribute nothing. */
  function getItems() {
    const list = state.masses.map((m) =>
      makeItem(m.id, m.m, m.x, m.color, m.locked, false, m.enabled !== false));
    addRodSegments(list);
    return list;
  }

  /* The pivot cuts the rod in two. Each piece carries the share of the rod's mass that
     matches its share of the length, and its weight acts at the middle of THAT piece —
     so both sides of the rod turn it, instead of the whole rod counting on one side.
     The two moments always net to the same answer as "all the weight at the centre":
        W(L-f)^2/2L  -  W f^2/2L  =  W(L/2 - f)
     which is why the centre-of-mass shortcut is allowed in the first place. */
  function addRodSegments(list) {
    const f = state.fulcrum, len = RL(), M = state.rodMass;
    if (!state.useRodWeight || M <= 0 || len <= 0) return;
    [
      { id: 'rodL', span: f,       mid: f / 2,             from: 0, to: f,
        label: 'Rod, left of the pivot',  short: 'left part' },
      { id: 'rodR', span: len - f, mid: f + (len - f) / 2, from: f, to: len,
        label: 'Rod, right of the pivot', short: 'right part' }
    ].forEach(function (seg) {
      if (seg.span <= 1e-9) return;
      const it = makeItem(seg.id, M * seg.span / len, seg.mid, '#7c8b9c', true, true, true);
      it.label = seg.label;
      it.short = seg.short;
      it.span = seg.span;
      it.from = seg.from;
      it.to = seg.to;
      list.push(it);
    });
  }

  function makeItem(id, m, x, color, locked, isRod, active) {
    const dSigned = x - state.fulcrum;          // + is right of the pivot
    const force = m * state.g;                  // weight, in newtons
    return {
      id: id, m: m, x: x, color: color,
      locked: !!locked, isRod: !!isRod, active: !!active,
      dSigned: dSigned,
      d: Math.abs(dSigned),
      force: force,
      moment: Math.abs(dSigned) * force,
      dir: !active ? 0 : (dSigned > 1e-9 ? 1 : (dSigned < -1e-9 ? -1 : 0))  // 1 = clockwise
    };
  }

  function getTotals(items) {
    let cw = 0, acw = 0;
    items.forEach((it) => { if (it.dir > 0) cw += it.moment; else if (it.dir < 0) acw += it.moment; });
    return { cw: cw, acw: acw, net: cw - acw, balanced: Math.abs(cw - acw) < balancedTol() };
  }

  /** The rod may only swing until its long arm reaches the stand. */
  function maxTilt() {
    const armPx = Math.max(state.fulcrum, RL() - state.fulcrum) * ppm();
    const geometric = Math.asin(clamp((P.PLATE - P.ROD_Y) / Math.max(armPx, 1), 0, 1)) * 180 / Math.PI;
    return Math.min(P.MAX_TILT, geometric);
  }

  function targetAngle() {
    if (state.frozen) return 0;
    const net = getTotals(getItems()).net;
    if (Math.abs(net) < balancedTol()) return 0;
    return maxTilt() * Math.tanh(net / tiltScale());   // + tips clockwise
  }

  /* ============================================================
     SCENE GEOMETRY
     ============================================================ */

  function applyProfile(next) {
    if (next === P && rodGroup.childNodes.length) return false;
    P = next;
    scene.setAttribute('viewBox', '0 0 ' + P.W + ' ' + P.H);
    scene.classList.toggle('compact', P.name === 'compact');
    buildScene();
    return true;
  }

  /** Rod, scale marks and graph paper: rebuilt only when the profile changes. */
  function buildScene() {
    /* graph paper, with its major lines on the rod's metre marks */
    const cell = niceStep() * ppm();        // one numbered division, in drawing units
    const q = cell / 4;
    $('grid').setAttribute('x', P.X0);
    $('grid').setAttribute('y', P.ROD_Y - 2 * cell);
    $('grid').setAttribute('width', cell);
    $('grid').setAttribute('height', cell);
    $('gridMinor').setAttribute('d',
      'M' + q + ' 0V' + cell + 'M' + (2 * q) + ' 0V' + cell + 'M' + (3 * q) + ' 0V' + cell +
      'M0 ' + q + 'H' + cell + 'M0 ' + (2 * q) + 'H' + cell + 'M0 ' + (3 * q) + 'H' + cell);
    $('gridMajor').setAttribute('d', 'M0 0V' + cell + 'M0 0H' + cell);

    /* caption */
    groundG.textContent = '';
    groundG.appendChild(el('text', {
      class: 'scene-caption', x: P.W / 2, y: P.capY, 'text-anchor': 'middle'
    }, 'Rod length ' + RL() + ' m — every distance that counts is measured from the pivot.'));

    /* the rod: drawn once, then only rotated */
    rodGroup.textContent = '';
    rodGroup.appendChild(el('rect', {
      class: 'rod-face', x: P.X0, y: P.ROD_Y - P.ROD_H,
      width: DIVS * P.DIV, height: P.ROD_H * 2, rx: 3, 'stroke-width': 1,
      filter: 'url(#softShadow)'
    }));
    const step = niceStep(), half = step / 2;
    let lastLabel = -Infinity;
    for (let i = 0; i * half <= RL() + 1e-9; i++) {
      const v = i * half;
      const x = P.X0 + v * ppm();
      const major = i % 2 === 0;
      rodGroup.appendChild(el('line', {
        class: 'tick', x1: x, y1: P.ROD_Y - P.ROD_H, x2: x,
        y2: P.ROD_Y - P.ROD_H + (major ? 7 : 4),
        'stroke-width': major ? 1.3 : 1, opacity: major ? .85 : .45
      }));
      if (major) {
        rodGroup.appendChild(el('text', {
          class: 'tick-label', x: x, y: P.ROD_Y - P.ROD_H - 5, 'text-anchor': 'middle'
        }, v.toFixed(tickDp())));
        lastLabel = v;
      }
    }
    /* a custom length rarely ends on a mark, so label the far end too */
    if (RL() - lastLabel > step * 0.35) {
      rodGroup.appendChild(el('line', {
        class: 'tick', x1: P.X0 + RL() * ppm(), y1: P.ROD_Y - P.ROD_H,
        x2: P.X0 + RL() * ppm(), y2: P.ROD_Y - P.ROD_H + 7, 'stroke-width': 1.3, opacity: .85
      }));
      rodGroup.appendChild(el('text', {
        class: 'tick-label', x: P.X0 + RL() * ppm(), y: P.ROD_Y - P.ROD_H - 5,
        'text-anchor': 'middle'
      }, RL().toFixed(posDp())));
    }
    drawFulcrum();
  }

  /** The wedge and its stand. Redrawn whenever the pivot moves. */
  function drawFulcrum() {
    const px = pivotX(), base = P.PLATE, half = P.name === 'compact' ? 20 : 26;
    fulcrumGroup.textContent = '';
    fulcrumGroup.appendChild(el('polygon', {
      class: 'fwedge', filter: 'url(#softShadow)',
      points: [px, P.ROD_Y + P.ROD_H - 1, px - half, base, px + half, base].join(' ')
    }));
    fulcrumGroup.appendChild(el('rect', {
      class: 'fplate', x: px - half * 1.7, y: base, width: half * 3.4, height: 10, rx: 2
    }));
    /* a short bench under the stand, so far-out masses never cross a ground line */
    const bw = half * 2.7;
    fulcrumGroup.appendChild(el('line', {
      class: 'ground-line', x1: px - bw, y1: base + 10, x2: px + bw, y2: base + 10,
      'stroke-width': 1.5, opacity: .45
    }));
    for (let x = px - bw + 4; x < px + bw; x += 11) {
      fulcrumGroup.appendChild(el('line', {
        class: 'ground-hatch', x1: x, y1: base + 10, x2: x - 6, y2: base + 16,
        'stroke-width': 1, opacity: .3
      }));
    }
    fulcrumGroup.appendChild(el('circle', {
      class: 'fpin', cx: px, cy: P.ROD_Y, r: P.name === 'compact' ? 3.5 : 4.5, 'stroke-width': 2
    }));
    fulcrumGroup.appendChild(el('text', {
      class: 'pivot-label', x: px, y: base + 32, 'text-anchor': 'middle'
    }, 'PIVOT ' + state.fulcrum.toFixed(posDp()) + ' m'));
    fulcrumGroup.classList.toggle('locked', state.mode === 'challenge');
  }

  /** A point on the rod, in world coordinates, allowing for the tilt. */
  function toWorld(posM, offsetPx, rad) {
    const dx = (posM - state.fulcrum) * ppm();
    const c = Math.cos(rad), s = Math.sin(rad);
    return [pivotX() + dx * c - offsetPx * s, P.ROD_Y + dx * s + offsetPx * c];
  }

  /** paint = {color:'#hex'} for a mass's own colour, or {cls:'reaction'} for a themed one. */
  function downArrow(x, yTop, len, paint, label) {
    const yEnd = yTop + len;
    const line = paint.cls ? 'class="' + paint.cls + '-line"' : 'stroke="' + paint.color + '"';
    const head = paint.cls ? 'class="' + paint.cls + '-head"' : 'fill="' + paint.color + '"';
    const lab  = paint.cls ? 'class="arrow-label ' + paint.cls + '-label"'
                           : 'class="arrow-label" fill="' + paint.color + '"';
    let s = '<line ' + line + ' x1="' + x + '" y1="' + yTop + '" x2="' + x + '" y2="' + (yEnd - 8) +
            '" stroke-width="2.2" stroke-linecap="round"/>' +
            '<polygon ' + head + ' points="' + x + ',' + yEnd + ' ' + (x - 5) + ',' + (yEnd - 8.5) +
            ' ' + (x + 5) + ',' + (yEnd - 8.5) + '"/>';
    if (label) {
      s += '<text ' + lab + ' x="' + (x + 8) + '" y="' + (yTop + len / 2 + 4) + '">' + label + '</text>';
    }
    return s;
  }

  function render() {
    const rad = angle * Math.PI / 180;
    rodGroup.setAttribute('transform',
      'rotate(' + angle.toFixed(3) + ' ' + pivotX() + ' ' + P.ROD_Y + ')');

    const items = getItems();
    let svg = '';

    /* distance markers, parallel to the rod */
    if (state.showDistances) {
      items.forEach((it) => {
        if (!it.active || it.d < 0.12) return;
        const a = toWorld(state.fulcrum, -P.dim, rad);
        const b = toWorld(it.x, -P.dim, rad);
        const c = it.dir > 0 ? 'cw' : 'acw';
        const tick = (p) => '<line class="dim-tick ' + c + '" x1="' + p[0] + '" y1="' + (p[1] - 4.5) +
                            '" x2="' + p[0] + '" y2="' + (p[1] + 4.5) + '" stroke-width="1.4"/>';
        svg += '<g><line class="dim-line ' + c + '" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] +
               '" y2="' + b[1] + '" stroke-width="1.4" stroke-dasharray="5 3"/>' + tick(a) + tick(b) +
               '<text class="dim-label ' + c + '" x="' + ((a[0] + b[0]) / 2) + '" y="' +
               ((a[1] + b[1]) / 2 - 7) + '" text-anchor="middle">' + it.d.toFixed(posDp()) + ' m</text></g>';
      });
    }

    /* upward reaction at the pivot */
    if (state.showForces) {
      const totalW = items.reduce((s, it) => s + (it.active ? it.force : 0), 0);
      if (totalW > 0) {
        const px = pivotX(), yTail = P.ROD_Y + P.reactTail, yHead = P.ROD_Y + 16;
        svg += '<g><line class="reaction-line" x1="' + px + '" y1="' + yTail + '" x2="' + px +
               '" y2="' + (yHead + 8) + '" stroke-width="2.2" stroke-linecap="round"/>' +
               '<polygon class="reaction-head" points="' + px + ',' + yHead + ' ' + (px - 5) + ',' +
               (yHead + 8.5) + ' ' + (px + 5) + ',' + (yHead + 8.5) + '"/>' +
               '<text class="reaction-label arrow-label" x="' + (px + 9) + '" y="' + (yTail - 18) +
               '">R = ' + fmt(totalW) + ' N</text></g>';
      }
    }

    /* the masses, hung from the rod and always upright */
    items.forEach((it) => {
      if (it.isRod) { svg += rodWeightMarker(it, rad); return; }
      const anchor = toWorld(it.x, P.ROD_H, rad);
      const size = P.boxMin + P.boxSpan * Math.sqrt(clamp(it.m, 0, 25) / 10);
      const top = anchor[1] + P.hang;
      const cx = anchor[0];
      const fs = Math.max(9.5, size * 0.31);
      const hitW = Math.max(size + P.hitPad, P.hitPad * 2);

      svg += '<g class="mass-grp' + (it.locked ? ' locked' : '') + (it.active ? '' : ' off') +
             '" data-mass-id="' + it.id + '" tabindex="0" role="button" aria-label="' + it.m +
             ' kilogram mass at ' + it.x.toFixed(posDp()) + ' metres' + (it.active ? '' : ', switched off') + '">';
      /* generous invisible target so a fingertip can grab it */
      svg += '<rect class="hit" x="' + (cx - hitW / 2) + '" y="' + (anchor[1] - 6) + '" width="' + hitW +
             '" height="' + (top + size + 16 - anchor[1]) + '" fill="none" pointer-events="all"/>';
      svg += '<line class="hanger" x1="' + cx + '" y1="' + anchor[1] + '" x2="' + cx + '" y2="' + top +
             '" stroke-width="1.6"/>';
      svg += '<circle class="hook" cx="' + cx + '" cy="' + anchor[1] + '" r="3.5"/>';
      svg += '<rect class="mbox' + (it.locked ? ' fixed' : '') + (it.active ? '' : ' idle') +
             '" x="' + (cx - size / 2) + '" y="' + top + '" width="' + size + '" height="' + size +
             '" rx="3" fill="' + it.color + '" stroke-width="2" filter="url(#softShadow)"/>';
      svg += '<text class="mbox-label" x="' + cx + '" y="' + (top + size / 2 + fs * 0.36) +
             '" text-anchor="middle" font-size="' + fs.toFixed(1) +
             '" font-weight="500" pointer-events="none">' + it.m + '</text>';
      svg += '<text class="mass-cap" x="' + cx + '" y="' + (top + size + 13) +
             '" text-anchor="middle" pointer-events="none">' + it.m + ' kg' +
             (it.active ? '' : ' · off') + '</text>';
      if (state.showForces && it.active) {
        svg += downArrow(cx, top + size + 18, Math.min(P.arrowMax, 16 + it.force * P.arrowK),
                         { color: it.color }, fmt(it.force) + ' N');
      }
      svg += '</g>';
    });

    overlay.innerHTML = svg;
  }

  function rodWeightMarker(it, rad) {
    const p = toWorld(it.x, 0, rad);
    const len = Math.min(P.arrowMax, 16 + it.force * P.arrowK);
    /* a bar under the rod showing how far this piece reaches */
    const a = toWorld(it.from, P.ROD_H + 5, rad), b = toWorld(it.to, P.ROD_H + 5, rad);
    let s = '<g><line class="seg-span" x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] +
            '" y2="' + b[1] + '" stroke-width="3" stroke-linecap="round"/>' +
            '<circle class="rod-cog" cx="' + p[0] + '" cy="' + p[1] + '" r="5.5" stroke-width="2"/>' +
            '<circle class="rod-cog-dot" cx="' + p[0] + '" cy="' + p[1] + '" r="1.8"/>';
    if (state.showForces) {
      s += downArrow(p[0], p[1] + 10, len, { cls: 'rodw' }, fmt(it.force) + ' N');
    }
    s += '<text class="rod-cog-label" x="' + p[0] + '" y="' +
         (p[1] + 10 + (state.showForces ? len : 0) + 14) + '" text-anchor="middle">' +
         it.short + '</text>';
    return s + '</g>';
  }

  /* ============================================================
     THE WORKING OUT
     ============================================================ */

  const term = (it) => fmt(it.force) + ' × ' + it.d.toFixed(posDp());

  function updateReadout() {
    const items = getItems().slice().sort((a, b) => a.x - b.x);
    const t = getTotals(items);
    const body = $('calcBody');

    if (!items.length) {
      body.innerHTML = '<tr class="empty-row"><td colspan="6">No masses on the rod — add one to begin.</td></tr>';
    } else {
      body.innerHTML = items.map(function (it) {
        const tag = !it.active ? '<span class="dir-tag idle">switched off</span>'
                  : it.dir > 0 ? '<span class="dir-tag cw">clockwise ↻</span>'
                  : it.dir < 0 ? '<span class="dir-tag acw">anticlockwise ↺</span>'
                               : '<span class="dir-tag none">on the pivot</span>';
        const col = it.dir > 0 ? 'var(--cw)' : it.dir < 0 ? 'var(--acw)' : 'var(--ink-faint)';
        const moment = it.active
          ? '<span class="calc-exp">' + term(it) + ' =</span> <b>' + fmt(it.moment) + ' N·m</b>'
          : '<span class="calc-exp">counts as 0</span>';
        const name = it.isRod ? it.label : kgOf(it.m) + ' kg mass';
        return '<tr' + (it.active ? '' : ' class="idle"') + '>' +
          '<td class="obj"><span class="swatch" style="background:' + it.color + '"></span>' + name + '</td>' +
          '<td data-label="Mass">' + kgOf(it.m) + ' kg</td>' +
          '<td data-label="Weight F = m g">' + fmt(it.force) + ' N</td>' +
          '<td data-label="Distance d">' + it.d.toFixed(posDp()) + ' m</td>' +
          '<td data-label="Turning effect">' + tag + '</td>' +
          '<td class="moment" data-label="Moment F × d" style="color:' + col + '">' + moment + '</td></tr>';
      }).join('');
    }

    /* the sum each side, written out the way it would be on paper */
    const acwTerms = items.filter((it) => it.dir < 0).map(term);
    const cwTerms  = items.filter((it) => it.dir > 0).map(term);
    $('acwExpr').textContent = acwTerms.length ? acwTerms.join('  +  ') : 'nothing turning this way';
    $('cwExpr').textContent  = cwTerms.length  ? cwTerms.join('  +  ')  : 'nothing turning this way';
    $('acwTotal').textContent = '= ' + fmt(t.acw) + ' N·m';
    $('cwTotal').textContent  = '= ' + fmt(t.cw) + ' N·m';
    $('cmpSign').textContent  = t.balanced ? '=' : (t.cw > t.acw ? '<' : '>');
    $('netVal').textContent   = fmt(Math.abs(t.net)) + ' N·m';

    const pill = $('statusPill'), verdict = $('verdict');
    pill.classList.remove('cw', 'acw', 'wait');
    verdict.classList.remove('ok');
    const live = items.filter((it) => it.active).length;

    if (state.frozen) {
      pill.classList.add('wait');
      pill.textContent = 'Make your prediction';
    } else if (t.balanced) {
      pill.textContent = live ? 'Balanced' : 'Nothing on the rod';
      verdict.classList.add('ok');
      verdict.innerHTML = live
        ? 'The rod is in <strong>equilibrium</strong>: total anticlockwise = total clockwise = ' +
          fmt(t.cw) + ' N·m.'
        : 'Hang a mass on the rod, or switch one back on, and watch what happens.';
    } else if (t.net > 0) {
      pill.classList.add('cw');
      pill.textContent = 'Tipping right ↻';
      verdict.innerHTML = 'Clockwise wins by <strong>' + fmt(t.net) +
        ' N·m</strong>, so the right-hand side goes down. Move a mass, switch one off, or slide the pivot right.';
    } else {
      pill.classList.add('acw');
      pill.textContent = 'Tipping left ↺';
      verdict.innerHTML = 'Anticlockwise wins by <strong>' + fmt(-t.net) +
        ' N·m</strong>, so the left-hand side goes down. Move a mass, switch one off, or slide the pivot left.';
    }
    $('calcCard').classList.toggle('masked', state.frozen);
  }

  /* ============================================================
     CONTROL PANEL
     ============================================================ */

  /** A number field flanked by its own − and + keys: precise on a desktop,
      tappable on a phone, and free of the browser's tiny native spinners. */
  function stepper(o) {
    return '<div class="stepper mini">' +
      '<button type="button" class="step-btn" data-step="-1" tabindex="-1" aria-label="' +
        o.less + '">−</button>' +
      '<span class="step-field"><input type="number" inputmode="decimal" data-num="' + o.num +
        '" data-id="' + o.id + '" min="' + o.min + '" max="' + o.max + '" step="' + o.step +
        '"><span class="unit">' + o.unit + '</span></span>' +
      '<button type="button" class="step-btn" data-step="1" tabindex="-1" aria-label="' +
        o.more + '">+</button></div>';
  }

  /* The list is rebuilt only when the set of masses changes. Everything else is
     updated in place, so typing in a field or dragging a slider is never interrupted
     by the element being replaced underneath. */
  let listSig = '';
  const setVal = (n, v) => { if (n && n !== document.activeElement) n.value = v; };

  function renderMassList() {
    const editable = state.mode === 'explore';
    const sig = state.masses.map((m) => m.id).join(',') + '|' + editable;
    if (sig !== listSig) { buildMassList(editable); listSig = sig; }
    updateMassList();
    $('addMass').disabled = state.masses.length >= MAX_MASSES || !editable;
  }

  function buildMassList(editable) {
    const box = $('massList');
    if (!state.masses.length) {
      box.innerHTML = '<p class="micro">No masses yet — press “Add mass”.</p>';
      return;
    }
    box.innerHTML = state.masses.map(function (m, i) {
      return '<div class="mass-row" data-row="' + m.id + '">' +
        '<span class="dot" style="background:' + m.color + '"></span>' +
        '<span class="row-title">Mass ' + (i + 1) +
          '<span class="newtons"></span></span>' +
        (editable
          ? '<span class="row-btns">' +
            '<button class="toggle" data-toggle="' + m.id + '"></button>' +
            '<button class="del" data-del="' + m.id + '" title="Remove this mass">✕</button></span>'
          : '') +
        '<div class="fields">' +
          stepper({ num: 'm', id: m.id, min: 0.1, max: 1000, step: 0.5, unit: 'kg',
                    less: 'Lighter', more: 'Heavier' }) +
          stepper({ num: 'x', id: m.id, min: 0, max: RL(), step: snapStep(), unit: 'm',
                    less: 'Move left', more: 'Move right' }) +
        '</div></div>';
    }).join('');
  }

  function updateMassList() {
    const box = $('massList');
    state.masses.forEach(function (m) {
      const row = box.querySelector('[data-row="' + m.id + '"]');
      if (!row) return;
      const on = m.enabled !== false;
      row.classList.toggle('idle', !on);

      const mn = row.querySelector('[data-num="m"]');
      const xn = row.querySelector('[data-num="x"]');
      if (xn) { xn.max = RL(); xn.step = snapStep(); }
      if (mn) { mn.step = m.m >= 50 ? 5 : 0.5; }
      setVal(mn, m.m);
      setVal(xn, m.x.toFixed(posDp()));

      const w = row.querySelector('.newtons');
      if (w) w.textContent = '= ' + fmt(m.m * state.g) + ' N';
      const tg = row.querySelector('[data-toggle]');
      if (tg) {
        tg.textContent = on ? 'On' : 'Off';
        tg.classList.toggle('on', on);
        tg.setAttribute('aria-pressed', String(on));
        tg.title = on ? 'Switch this mass off — it stays on the rod but stops counting'
                      : 'Switch this mass back on';
      }
    });
  }

  function syncControls() {
    const fr = $('fulcrumRange'), fn = $('fulcrumInput');
    fr.min = 0; fr.max = RL(); fr.step = fineStep();                  /* bounds before value */
    setVal(fr, state.fulcrum);
    fn.min = 0; fn.max = RL(); fn.step = snapStep();
    setVal(fn, state.fulcrum.toFixed(posDp()));
    $('snapOut').textContent = snapStep().toFixed(posDp());
    $('lengthUnit').textContent = RL() === 1 ? 'metre' : 'metres';
    const li = $('lengthInput');
    li.step = RL() >= 20 ? 1 : (RL() >= 5 ? 0.5 : 0.1);   /* stepping stays proportional */
    setVal(li, RL());

    const rr = $('rodMassRange'), rn = $('rodMassInput');
    rr.max = Math.max(10, state.rodMass);
    rn.step = state.rodMass >= 50 ? 5 : 0.5;
    setVal(rr, state.rodMass);
    setVal(rn, state.rodMass);
    $('chkRod').checked = state.useRodWeight;
    $('rodMassWrap').classList.toggle('hidden', !state.useRodWeight);

    const locked = state.mode === 'challenge';
    fr.disabled = locked; fn.disabled = locked;
    $('lengthInput').disabled = locked;
    document.querySelectorAll('.chip[data-len]').forEach((c) => { c.disabled = locked; });
    document.querySelectorAll('.stepper').forEach(function (st) {
      const i = st.querySelector('input');
      st.classList.toggle('off', !!(i && i.disabled));
    });
  }

  /** Anything that changes the physics goes through here. */
  function changed() {
    dirty = true;
    renderMassList();
    syncControls();
    updateReadout();
    drawFulcrum();
  }

  /* ============================================================
     MASSES
     ============================================================ */

  function addMass(m, x, locked) {
    if (state.masses.length >= MAX_MASSES) return null;
    const used = state.masses.map((k) => k.color);
    const color = PALETTE.find((c) => used.indexOf(c) === -1) ||
                  PALETTE[state.masses.length % PALETTE.length];
    const obj = {
      id: state.nextId++,
      m: m === undefined ? 2 : m,
      x: x === undefined ? freeSpot() : clamp(x, 0, RL()),
      color: color, locked: !!locked, enabled: true
    };
    state.masses.push(obj);
    return obj;
  }

  function freeSpot() {
    const u = RL() / 10;                       // work in tenths of the rod
    for (let x = u; x <= 9 * u; x += u / 2) {
      if (!state.masses.some((k) => Math.abs(k.x - x) < u / 2)) return onGrid(x);
    }
    return RL() / 2;
  }

  function setScene(fulcrum, list) {
    state.fulcrum = fulcrum;
    state.masses = [];
    state.nextId = 1;
    list.forEach((d) => addMass(d[0], d[1], d[2]));
    angle = 0; vel = 0;
    changed();
  }

  /* ============================================================
     POINTER AND KEYBOARD
     ============================================================ */

  function svgPoint(evt) {
    const pt = scene.createSVGPoint();
    pt.x = evt.clientX; pt.y = evt.clientY;
    return pt.matrixTransform(scene.getScreenCTM().inverse());
  }

  /** Project the pointer onto the tilted rod and read off its position in metres. */
  function pointerToRodPos(evt) {
    const p = svgPoint(evt);
    const rad = angle * Math.PI / 180;
    const d = ((p.x - pivotX()) * Math.cos(rad) + (p.y - P.ROD_Y) * Math.sin(rad)) / ppm();
    return clamp(state.fulcrum + d, 0, RL());
  }

  scene.addEventListener('pointerdown', function (e) {
    const massEl = e.target.closest('[data-mass-id]');
    if (massEl) {
      const mo = state.masses.find((k) => k.id === Number(massEl.dataset.massId));
      if (!mo || mo.locked) return;
      dragging = { kind: 'mass', id: mo.id };
    } else if (fulcrumGroup.contains(e.target)) {
      if (state.mode === 'challenge') return;
      dragging = { kind: 'fulcrum' };
    } else {
      return;
    }
    scene.setPointerCapture(e.pointerId);
    scene.classList.add('dragging');
    e.preventDefault();
  });

  scene.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    if (dragging.kind === 'mass') {
      const mo = state.masses.find((k) => k.id === dragging.id);
      if (mo) { mo.x = snapPos(pointerToRodPos(e)); changed(); }
    } else {
      const p = svgPoint(e);
      state.fulcrum = clamp(snapPos((p.x - P.X0) / ppm()), 0, RL());
      changed();
    }
  });

  function endDrag(e) {
    if (!dragging) return;
    dragging = null;
    scene.classList.remove('dragging');
    if (e && scene.hasPointerCapture && scene.hasPointerCapture(e.pointerId)) {
      scene.releasePointerCapture(e.pointerId);
    }
  }
  scene.addEventListener('pointerup', endDrag);
  scene.addEventListener('pointercancel', endDrag);

  scene.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const step = snapStep() * (e.shiftKey ? 4 : 1) * (e.key === 'ArrowRight' ? 1 : -1);
    const massEl = e.target.closest && e.target.closest('[data-mass-id]');
    let handled = false;
    if (massEl) {
      const mo = state.masses.find((k) => k.id === Number(massEl.dataset.massId));
      if (mo && !mo.locked) { mo.x = clamp(mo.x + step, 0, RL()); handled = true; }
    } else if (e.target === fulcrumGroup && state.mode !== 'challenge') {
      state.fulcrum = clamp(state.fulcrum + step, 0, RL());
      handled = true;
    }
    if (handled) { e.preventDefault(); changed(); }
  });

  /* ============================================================
     CONTROL WIRING
     ============================================================ */

  $('fulcrumRange').addEventListener('input', function () {
    state.fulcrum = parseFloat(this.value); changed();
  });
  $('fulcrumInput').addEventListener('input', function () {
    const v = parseFloat(this.value);
    if (!isFinite(v)) return;
    state.fulcrum = clamp(toDp(v), 0, RL());
    changed();
  });
  $('fulcrumInput').addEventListener('change', function () {
    this.value = state.fulcrum.toFixed(posDp());
  });
  $('addMass').addEventListener('click', function () { addMass(); changed(); });

  $('massList').addEventListener('input', function (e) {
    const inp = e.target;
    if (!inp.dataset || !inp.dataset.id) return;
    const mo = state.masses.find((k) => k.id === Number(inp.dataset.id));
    if (!mo || mo.locked) return;
    const v = parseFloat(inp.value);
    if (!isFinite(v)) return;                       // mid-edit, e.g. "" or "1."
    const what = inp.dataset.kind || inp.dataset.num;
    if (what === 'm') mo.m = clamp(round2(v), 0.1, 1000);
    else mo.x = clamp(inp.dataset.num ? toDp(v) : v, 0, RL());
    changed();
  });
  /* tidy the typed value once the field is left */
  $('massList').addEventListener('change', function (e) {
    const inp = e.target;
    if (!inp.dataset || !inp.dataset.num) return;
    const mo = state.masses.find((k) => k.id === Number(inp.dataset.id));
    if (!mo) return;
    inp.value = inp.dataset.num === 'm' ? mo.m : mo.x.toFixed(posDp());
  });
  $('massList').addEventListener('click', function (e) {
    const off = e.target.closest('[data-toggle]');
    if (off) {
      const mo = state.masses.find((k) => k.id === Number(off.dataset.toggle));
      if (mo && !mo.locked) { mo.enabled = mo.enabled === false; changed(); }
      return;
    }
    const btn = e.target.closest('[data-del]');
    if (!btn) return;
    state.masses = state.masses.filter((k) => k.id !== Number(btn.dataset.del));
    changed();
  });

  /* ---------- steppers ---------- */
  function doStep(btn) {
    const inp = btn.parentNode.querySelector('input');
    if (!inp || inp.disabled) return;
    const st = parseFloat(inp.step) || 1;
    const lo = parseFloat(inp.min), hi = parseFloat(inp.max);
    const now = parseFloat(inp.value);
    const from = isFinite(now) ? now : (isFinite(lo) ? lo : 0);
    let v = clamp(Math.round((from + st * Number(btn.dataset.step)) / st) * st,
                  isFinite(lo) ? lo : -Infinity, isFinite(hi) ? hi : Infinity);
    v = Number(v.toFixed(Math.min(6, decimalsOf(st))));
    if (v === now) return;
    inp.value = String(v);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let holdWait = null, holdRun = null, steppedByPointer = false;
  function stopHold() {
    clearTimeout(holdWait); clearInterval(holdRun);
    holdWait = holdRun = null;
  }
  document.addEventListener('pointerdown', function (e) {
    const btn = e.target.closest && e.target.closest('.step-btn');
    if (!btn || btn.disabled) return;
    steppedByPointer = true;
    doStep(btn);
    stopHold();
    holdWait = setTimeout(function () { holdRun = setInterval(function () { doStep(btn); }, 80); }, 420);
  });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
    document.addEventListener(ev, stopHold);
  });
  window.addEventListener('blur', stopHold);
  document.addEventListener('click', function (e) {
    const btn = e.target.closest && e.target.closest('.step-btn');
    if (!btn) return;
    if (steppedByPointer) { steppedByPointer = false; return; }   /* keyboard activation only */
    doStep(btn);
  });

  $('chkForces').addEventListener('change', function () { state.showForces = this.checked; dirty = true; });
  $('chkDist').addEventListener('change', function () { state.showDistances = this.checked; dirty = true; });
  $('chkSnap').addEventListener('change', function () { state.snap = this.checked; });
  $('chkRod').addEventListener('change', function () { state.useRodWeight = this.checked; changed(); });
  $('rodMassRange').addEventListener('input', function () {
    state.rodMass = parseFloat(this.value); changed();
  });
  $('rodMassInput').addEventListener('input', function () {
    const v = parseFloat(this.value);
    if (isFinite(v)) { state.rodMass = clamp(round2(v), 0, 1000); changed(); }
  });
  $('rodMassInput').addEventListener('change', function () { this.value = state.rodMass; });
  /* ---------- gravity: a custom listbox, so it looks and behaves the same everywhere ---------- */
  const gravWrap = $('gravSelect'), gravBtn = $('gravTrigger'), gravList = $('gravList');
  const gravOpts = () => [].slice.call(gravList.querySelectorAll('[role="option"]'));

  function setGravity(v, quiet) {
    state.g = parseFloat(v);
    gravOpts().forEach(function (o) {
      const on = Math.abs(parseFloat(o.dataset.value) - state.g) < 1e-9;
      o.setAttribute('aria-selected', String(on));
      if (on) {
        $('gravName').textContent = o.dataset.name;
        gravBtn.querySelector('.cselect-sub').textContent = o.dataset.sub;
        $('gravNum').textContent = o.querySelector('.cselect-num').textContent;
      }
    });
    if (!quiet) changed();
  }

  function openGrav(open) {
    gravWrap.classList.toggle('open', open);
    gravBtn.setAttribute('aria-expanded', String(open));
    gravList.hidden = !open;
    if (open) {
      const sel = gravList.querySelector('[aria-selected="true"]') || gravOpts()[0];
      if (sel) sel.focus();
    }
  }

  gravBtn.addEventListener('click', function () { openGrav(gravList.hidden); });
  gravBtn.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openGrav(true); }
  });
  gravList.addEventListener('click', function (e) {
    const o = e.target.closest('[role="option"]');
    if (!o) return;
    setGravity(o.dataset.value);
    openGrav(false);
    gravBtn.focus();
  });
  gravList.addEventListener('keydown', function (e) {
    const opts = gravOpts(), i = opts.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = opts[clamp(i + (e.key === 'ArrowDown' ? 1 : -1), 0, opts.length - 1)];
      if (next) next.focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      opts[e.key === 'Home' ? 0 : opts.length - 1].focus();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (i >= 0) { setGravity(opts[i].dataset.value); openGrav(false); gravBtn.focus(); }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      openGrav(false);
      if (e.key === 'Escape') { e.preventDefault(); gravBtn.focus(); }
    }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!gravList.hidden && !gravWrap.contains(e.target)) openGrav(false);
  });

  /* Changing the length re-marks the rod. Every mass keeps its distance from the
     pivot as a fraction of the rod, so the picture does not jump and — because the
     distances are rounded, not the positions — a balanced rod stays balanced. */
  function setRodLength(next) {
    if (!isFinite(next)) return;
    next = clamp(next, 0.1, 100);
    const k = next / state.rodLength;
    const offsets = state.masses.map((m) => (m.x - state.fulcrum) * k);
    const pivot = state.fulcrum * k;
    state.rodLength = next;
    state.fulcrum = clamp(onGrid(pivot), 0, next);
    state.masses.forEach((m, i) => {
      m.x = clamp(state.fulcrum + onGrid(offsets[i]), 0, next);
    });
    document.querySelectorAll('.chip[data-len]').forEach((c) =>
      c.classList.toggle('active', Math.abs(parseFloat(c.dataset.len) - next) < 1e-9));
    buildScene();
    changed();
  }

  $('lengthInput').addEventListener('change', function () {
    setRodLength(parseFloat(this.value));
    this.value = RL();
  });
  document.querySelectorAll('.chip[data-len]').forEach(function (c) {
    c.addEventListener('click', function () {
      setRodLength(parseFloat(c.dataset.len));
      $('lengthInput').value = RL();
    });
  });

  /* Written as a pivot fraction plus each mass's offset from it, as fractions of the
     rod. Rounding the offsets (not the positions) keeps the intended distances exact,
     so a preset means the same thing on a 10 m rod and on a 0.8 m one. */
  const PRESETS = {
    equal:     { f: 0.5, list: [[3, -0.3], [3, 0.3]] },
    seesaw:    { f: 0.5, list: [[6, -0.15], [3, 0.2]] },
    offcentre: { f: 0.3, list: [[4, -0.2], [2, 0.3]] },
    crowbar:   { f: 0.2, list: [[8, -0.1], [1, 0.7]] },
    three:     { f: 0.5, list: [[2, -0.4], [3, 0.2], [1, 0.4]] }
  };
  document.querySelectorAll('.preset').forEach(function (b) {
    b.addEventListener('click', function () {
      leaveChallenge();
      const p = PRESETS[b.dataset.preset];
      const f = clamp(onGrid(p.f * RL()), 0.1 * RL(), 0.9 * RL());
      setScene(f, p.list.map((d) => [d[0], clamp(f + onGrid(d[1] * RL()), 0, RL())]));
    });
  });
  $('resetBtn').addEventListener('click', function () {
    leaveChallenge();
    setGravity(9.8, true);
    setRodLength(10); $('lengthInput').value = '10';
    state.useRodWeight = false; state.rodMass = 2;
    buildScene();
    setScene(5, [[2, 2], [3, 8]]);
  });

  /* ============================================================
     TABS
     ============================================================ */
  document.querySelectorAll('.tab').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach((b) => b.classList.remove('active'));
      document.querySelectorAll('.tabpanel').forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      $('tab-' + btn.dataset.tab).classList.add('active');
      if (btn.dataset.tab === 'challenge') enterChallenge();
      else leaveChallenge();
    });
  });

  /* ============================================================
     CHALLENGES
     ============================================================ */
  const ch = { task: null, score: 0, attempts: 0, answered: false };

  function enterChallenge() {
    if (state.mode === 'challenge') return;
    exploreSnapshot = {
      fulcrum: state.fulcrum, masses: state.masses.map((m) => Object.assign({}, m)),
      useRodWeight: state.useRodWeight, rodMass: state.rodMass, nextId: state.nextId
    };
    state.mode = 'challenge';
    changed();
  }

  function leaveChallenge() {
    if (state.mode !== 'challenge') return;
    state.mode = 'explore';
    state.frozen = false;
    ch.task = null;
    $('predictBtns').classList.add('hidden');
    $('checkTask').disabled = true;
    $('showAnswer').disabled = true;
    setFeedback('', '');
    if (exploreSnapshot) {
      state.fulcrum = exploreSnapshot.fulcrum;
      state.masses = exploreSnapshot.masses;
      state.useRodWeight = exploreSnapshot.useRodWeight;
      state.rodMass = exploreSnapshot.rodMass;
      state.nextId = exploreSnapshot.nextId;
      exploreSnapshot = null;
    }
    changed();
  }

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const isQuarter = (v) => Math.abs(v * 4 - Math.round(v * 4)) < 1e-9;

  /** Somewhere on the target arm that is clearly NOT the correct answer. */
  function startingSpot(f, dirToTarget, arm, answerD, N) {
    let best = 0.5, bestGap = -1;
    for (let d = 0.5; d <= arm - 0.25; d += 0.25) {
      const gap = Math.abs(d - answerD);
      if (gap > bestGap) { bestGap = gap; best = d; }
    }
    return clamp(f + dirToTarget * best, 0, N);
  }

  /** Whole numbered divisions on the rod, and the pivot positions worth using.
      Working in divisions keeps the numbers tidy and every answer on the snap grid. */
  function divisions() {
    const step = niceStep();
    const N = Math.floor(RL() / step + 1e-9);
    const lo = Math.max(1, Math.round(N * 0.3)), hi = Math.min(N - 1, Math.round(N * 0.7));
    const fs = [];
    for (let v = lo; v <= hi; v++) fs.push(v);
    return { step: step, N: N, fs: fs };
  }

  function makePlacementTask(nFixed) {
    const D = divisions();
    if (D.N < 4 || !D.fs.length) return null;
    for (let tries = 0; tries < 400; tries++) {
      const f = pick(D.fs);
      const fixedLeft = Math.random() < 0.5;
      const fixedArm  = fixedLeft ? f : D.N - f;
      const targetArm = fixedLeft ? D.N - f : f;

      const fixed = [];
      let momentSum = 0, ok = true;
      for (let i = 0; i < nFixed; i++) {
        const m = pick([1, 2, 2, 3, 4, 5]);
        const d = pick([0.5, 1, 1.5, 2, 2.5, 3]);
        if (d > fixedArm - 0.25) { ok = false; break; }
        if (fixed.some((k) => Math.abs(k.d - d) < 0.5)) { ok = false; break; }
        fixed.push({ m: m, d: d });
        momentSum += m * d;
      }
      if (!ok) continue;

      const tm = pick([1, 2, 3, 4, 5, 6]);
      const td = momentSum / tm;
      if (!isQuarter(td) || td < 0.5 || td > targetArm - 0.25) continue;

      const sign = fixedLeft ? -1 : 1;
      const s = D.step;                            // divisions -> metres
      return {
        type: 'place', f: f * s,
        fixed: fixed.map((k) => ({ m: k.m, x: (f + sign * k.d) * s, d: k.d * s })),
        target: { m: tm, d: td * s, x: (f - sign * td) * s },
        startX: startingSpot(f, -sign, targetArm, td, D.N) * s
      };
    }
    return null;
  }

  function makePredictTask() {
    const D = divisions();
    if (D.N < 4 || !D.fs.length) return null;
    for (let tries = 0; tries < 400; tries++) {
      const f = pick(D.fs);
      const a = { m: pick([1, 2, 3, 4, 5]), x: f - pick([1, 1.5, 2, 2.5, 3]) };
      const b = { m: pick([1, 2, 3, 4, 5]), x: f + pick([1, 1.5, 2, 2.5, 3]) };
      if (a.x < 0.25 || b.x > D.N - 0.25) continue;
      const diff = b.m * (b.x - f) - a.m * (f - a.x);
      if (Math.abs(diff) > 0 && Math.abs(diff) < 0.5) continue;   // too close to call
      const s = D.step;
      return {
        type: 'predict', f: f * s,
        fixed: [{ m: a.m, x: a.x * s }, { m: b.m, x: b.x * s }],
        answer: Math.abs(diff) < 1e-9 ? 'bal' : (diff > 0 ? 'cw' : 'acw')
      };
    }
    return null;
  }

  function newChallenge(depth) {
    enterChallenge();
    setFeedback('', '');
    ch.answered = false;
    const roll = Math.random();
    let task = roll < 0.34 ? makePredictTask() : makePlacementTask(roll < 0.75 ? 1 : 2);
    if (!task && (depth || 0) < 5) { newChallenge((depth || 0) + 1); return; }
    if (!task) task = makePlacementTask(1) || makePredictTask();
    if (!task) return;
    ch.task = task;

    state.useRodWeight = false;
    state.masses = [];
    state.nextId = 1;
    state.fulcrum = task.f;
    task.fixed.forEach((k) => addMass(k.m, k.x, true));

    const given = '<span class="given">Pivot at ' + task.f.toFixed(posDp()) + ' m<br>' +
      task.fixed.map((k) => k.m + ' kg at ' + k.x.toFixed(posDp()) + ' m').join('<br>') +
      '<br>g = ' + state.g + ' N/kg</span>';

    if (task.type === 'predict') {
      state.frozen = true;
      $('predictBtns').classList.remove('hidden');
      $('checkTask').disabled = true;
      $('showAnswer').disabled = true;
      $('taskTitle').textContent = 'Which way will it tip?';
      $('taskText').innerHTML = 'The rod is being held level. Work out both moments in your head, ' +
        'then choose.' + given;
    } else {
      task.targetId = addMass(task.target.m, task.startX, false).id;
      state.frozen = false;
      $('predictBtns').classList.add('hidden');
      $('checkTask').disabled = false;
      $('showAnswer').disabled = false;
      $('taskTitle').textContent = 'Balance the rod';
      $('taskText').innerHTML = 'Drag the <strong>' + task.target.m + ' kg</strong> mass — the solid one — ' +
        'until the rod balances. The dashed masses are fixed.' + given;
    }
    angle = 0; vel = 0;
    changed();
  }

  function setFeedback(html, cls) {
    const f = $('feedback');
    f.className = 'feedback' + (html ? ' show ' + cls : '');
    f.innerHTML = html;
  }

  function updateScore(correct) {
    ch.attempts++;
    if (correct) ch.score++;
    $('scoreVal').textContent = ch.score + ' / ' + ch.attempts;
  }

  function workingOut(task) {
    const g = state.g;
    const parts = task.fixed.map((k) => '(' + k.m + ' × ' + g + ') × ' + Math.abs(k.x - task.f).toFixed(posDp()));
    const sum = task.fixed.reduce((s, k) => s + k.m * g * Math.abs(k.x - task.f), 0);
    return '<span class="work">' + parts.join(' + ') + ' = ' + fmt(sum) + ' N·m<br>' +
           '(' + task.target.m + ' × ' + g + ') × d = ' + fmt(sum) + ' N·m<br>d = ' +
           task.target.d.toFixed(posDp()) + ' m</span>';
  }

  $('newTask').addEventListener('click', function () { newChallenge(0); });

  $('checkTask').addEventListener('click', function () {
    const task = ch.task;
    if (!task || task.type !== 'place' || ch.answered) return;
    const mo = state.masses.find((k) => k.id === task.targetId);
    const t = getTotals(getItems());
    ch.answered = true;
    $('checkTask').disabled = true;
    if (t.balanced) {
      updateScore(true);
      setFeedback('<span class="verdict-word">Balanced</span>' + task.target.m + ' kg at ' +
        mo.x.toFixed(posDp()) + ' m is exactly ' + task.target.d.toFixed(posDp()) + ' m from the pivot.' +
        workingOut(task), 'good');
    } else {
      updateScore(false);
      setFeedback('<span class="verdict-word">Not yet</span>There is still <strong>' +
        fmt(Math.abs(t.net)) + ' N·m</strong> too much ' + (t.net > 0 ? 'clockwise' : 'anticlockwise') +
        ' moment. It needs to be <strong>' + task.target.d.toFixed(posDp()) + ' m</strong> from the pivot.' +
        workingOut(task), 'bad');
      if (mo) { mo.x = task.target.x; changed(); }
    }
  });

  $('showAnswer').addEventListener('click', function () {
    const task = ch.task;
    if (!task || task.type !== 'place') return;
    const mo = state.masses.find((k) => k.id === task.targetId);
    if (mo) { mo.x = task.target.x; changed(); }
    if (!ch.answered) { ch.answered = true; updateScore(false); $('checkTask').disabled = true; }
    setFeedback('<span class="verdict-word">Answer</span>The ' + task.target.m + ' kg mass belongs at <strong>' +
      task.target.x.toFixed(posDp()) + ' m</strong> — that is ' + task.target.d.toFixed(posDp()) +
      ' m from the pivot.' + workingOut(task), 'info');
  });

  document.querySelectorAll('.predict').forEach(function (b) {
    b.addEventListener('click', function () {
      const task = ch.task;
      if (!task || task.type !== 'predict' || ch.answered) return;
      ch.answered = true;
      state.frozen = false;
      const guess = b.dataset.pred, right = task.answer, g = state.g;
      const names = { cw: 'tipped to the right (clockwise)',
                      acw: 'tipped to the left (anticlockwise)', bal: 'stayed balanced' };
      const acw = task.fixed.filter((k) => k.x < task.f)
                            .reduce((s, k) => s + k.m * g * (task.f - k.x), 0);
      const cw  = task.fixed.filter((k) => k.x > task.f)
                            .reduce((s, k) => s + k.m * g * (k.x - task.f), 0);
      const work = '<span class="work">anticlockwise = ' + fmt(acw) + ' N·m<br>clockwise = ' +
                   fmt(cw) + ' N·m</span>';
      updateScore(guess === right);
      setFeedback((guess === right
        ? '<span class="verdict-word">Correct</span>It ' + names[right] + '.'
        : '<span class="verdict-word">Not quite</span>It ' + names[right] + '.') + work,
        guess === right ? 'good' : 'bad');
      $('predictBtns').classList.add('hidden');
      changed();
    });
  });

  /* ============================================================
     RESPONSIVE SCENE
     ============================================================ */
  function checkLayout() {
    const w = sceneWrap.getBoundingClientRect ? sceneWrap.getBoundingClientRect().width : 0;
    /* below this the wide drawing's furniture is too small to touch or read */
    const wanted = (!w || w >= 760) ? PROFILES.wide : PROFILES.compact;
    const swapped = applyProfile(wanted);
    /* user units per CSS pixel: lets the stylesheet size labels in real pixels */
    scene.style.setProperty('--u', (w ? P.W / w : 1).toFixed(4));
    if (swapped) { dirty = true; changed(); }
  }
  if (window.ResizeObserver) {
    new ResizeObserver(checkLayout).observe(sceneWrap);
  }
  window.addEventListener('resize', checkLayout);
  window.addEventListener('orientationchange', function () { setTimeout(checkLayout, 120); });

  /* ============================================================
     ANIMATION  (a lightly damped spring towards the target tilt)
     ============================================================ */
  function frame() {
    const target = targetAngle();
    vel += (target - angle) * 0.12;
    vel *= 0.82;
    const before = angle;
    angle += vel;
    if (Math.abs(angle - before) > 0.002 || dirty) { render(); dirty = false; }
    requestAnimationFrame(frame);
  }

  /* ============================================================
     START
     ============================================================ */
  checkLayout();
  setScene(5, [[2, 2], [3, 8]]);
  requestAnimationFrame(frame);
})();
