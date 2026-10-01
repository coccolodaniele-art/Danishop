/* Solitario: disegno delle carte classiche in SVG (semi, disposizione dei semi, figure Fante/Donna/Re, dorso).
   Usato da gioco.js. Le figure sono disegnate a metà e ripetute capovolte, come nelle carte vere. */
(function () {
  'use strict';

  const NERO = '#1a1a1a';
  const ORO = '#f2b705';
  const PELLE = '#f7d9b5';

  // Semi (viewBox 0 0 100 100), colorati con currentColor
  const SEMI = [
    // picche
    '<path d="M50 3C62 22 97 39 97 63C97 79 85 87 72 87C63 87 56 82 53 75C54 86 58 92 67 97H33C42 92 46 86 47 75C44 82 37 87 28 87C15 87 3 79 3 63C3 39 38 22 50 3Z"/>',
    // cuori
    '<path d="M50 93C21 68 3 51 3 30C3 14 15 3 29 3C39 3 46 9 50 17C54 9 61 3 71 3C85 3 97 14 97 30C97 51 79 68 50 93Z"/>',
    // quadri
    '<path d="M50 2Q68 28 90 50Q68 72 50 98Q32 72 10 50Q32 28 50 2Z"/>',
    // fiori
    '<circle cx="50" cy="27" r="21"/><circle cx="26" cy="58" r="21"/><circle cx="74" cy="58" r="21"/><circle cx="50" cy="52" r="12"/><path d="M45 56C45 76 41 88 32 97H68C59 88 55 76 55 56Z"/>'
  ];

  const tratto = `stroke="${NERO}" stroke-width="1.3" stroke-linejoin="round"`;
  const c1 = 'style="fill:var(--c1)"';
  const c2 = 'style="fill:var(--c2)"';

  // Metà superiore delle figure (riquadro 126 x 266, metà = 133)
  const META = {
    K: `
      <path d="M3 133V98Q10 80 34 74H92Q116 80 123 98V133Z" ${c1} ${tratto}/>
      <path d="M14 106Q24 97 34 106Q24 115 14 106ZM92 106Q102 97 112 106Q102 115 92 106Z" fill="${ORO}" ${tratto}/>
      <path d="M51 76H75L79 133H47Z" fill="${ORO}" ${tratto}/>
      <path d="M50 96H76M49 112H77M48 126H78" ${tratto} fill="none"/>
      <circle cx="63" cy="104" r="3.2" ${c2}/><circle cx="63" cy="119" r="3.2" ${c2}/>
      <path d="M27 76Q63 98 99 76L101 87Q63 110 25 87Z" fill="#fff" ${tratto}/>
      <circle cx="38" cy="87" r="1.8" fill="${NERO}"/><circle cx="52" cy="94" r="1.8" fill="${NERO}"/><circle cx="74" cy="94" r="1.8" fill="${NERO}"/><circle cx="88" cy="87" r="1.8" fill="${NERO}"/>
      <path d="M41 40Q37 66 46 76H80Q89 66 85 40Z" fill="#b8862b" ${tratto}/>
      <ellipse cx="63" cy="48" rx="16" ry="19" fill="${PELLE}" ${tratto}/>
      <path d="M47 52Q49 79 63 83Q77 79 79 52Q72 62 63 62Q54 62 47 52Z" fill="#ece6da" ${tratto}/>
      <path d="M53 59Q63 53 73 59" fill="none" stroke="${NERO}" stroke-width="1.6"/>
      <circle cx="57" cy="45" r="1.9" fill="${NERO}"/><circle cx="69" cy="45" r="1.9" fill="${NERO}"/>
      <path d="M63 46L61 53H64.5" fill="none" stroke="${NERO}" stroke-width="1.1"/>
      <path d="M44 34L42 11L51 21L57 5L63 17L69 5L75 21L84 11L82 34Z" fill="${ORO}" ${tratto}/>
      <rect x="44" y="27" width="38" height="7" ${c1} ${tratto}/>
      <circle cx="57" cy="6" r="2.6" ${c2}/><circle cx="69" cy="6" r="2.6" ${c2}/><circle cx="63" cy="22" r="2.6" ${c2}/>
      <rect x="104" y="4" width="7" height="78" fill="#dfe4ea" ${tratto}/>
      <path d="M107.5 8V78" stroke="#9aa3ad" stroke-width="1"/>
      <rect x="95" y="81" width="25" height="6" rx="2" fill="${ORO}" ${tratto}/>
      <rect x="104" y="87" width="7" height="14" fill="#7a4a1a" ${tratto}/>
      <circle cx="107.5" cy="99" r="7" fill="${PELLE}" ${tratto}/>`,
    Q: `
      <path d="M3 133L5 100Q13 82 36 78H90Q113 82 121 100L123 133Z" ${c1} ${tratto}/>
      <path d="M43 80H83L77 133H49Z" ${c2} ${tratto}/>
      <path d="M50 92L76 104M76 92L50 104M51 108L75 120M75 108L51 120" stroke="${ORO}" stroke-width="2.2"/>
      <path d="M12 112Q20 104 28 112Q20 120 12 112ZM98 112Q106 104 114 112Q106 120 98 112Z" fill="${ORO}" ${tratto}/>
      <path d="M38 38Q28 70 38 86H88Q98 70 88 38Q63 22 38 38Z" fill="#e2b23a" ${tratto}/>
      <path d="M44 80Q63 94 82 80" fill="none" stroke="#fff" stroke-width="4"/>
      <ellipse cx="63" cy="50" rx="15" ry="18" fill="${PELLE}" ${tratto}/>
      <circle cx="57" cy="47" r="1.8" fill="${NERO}"/><circle cx="69" cy="47" r="1.8" fill="${NERO}"/>
      <path d="M57 44.5Q57 42.5 54 43M69 44.5Q69 42.5 72 43" fill="none" stroke="${NERO}" stroke-width=".9"/>
      <path d="M63 48L61.5 55H64.5" fill="none" stroke="${NERO}" stroke-width="1"/>
      <path d="M58.5 60Q63 63.5 67.5 60Q63 61 58.5 60Z" fill="#c8102e" stroke="#9b0c22" stroke-width=".8"/>
      <path d="M45 34Q49 18 55 27Q59 11 63 22Q67 11 71 27Q77 18 81 34Z" fill="${ORO}" ${tratto}/>
      <rect x="45" y="30" width="36" height="6" ${c1} ${tratto}/>
      <circle cx="49" cy="22" r="2" fill="#fff" stroke="${NERO}" stroke-width=".8"/><circle cx="63" cy="13" r="2.4" fill="#fff" stroke="${NERO}" stroke-width=".8"/><circle cx="77" cy="22" r="2" fill="#fff" stroke="${NERO}" stroke-width=".8"/>
      <path d="M22 98Q18 70 20 42" fill="none" stroke="#2f8a3a" stroke-width="2.6"/>
      <path d="M21 72Q10 64 8 54Q19 58 21 72ZM20 60Q30 52 32 44Q22 48 20 60Z" fill="#3fa34d" ${tratto}/>
      <circle cx="20" cy="31" r="5.5" ${c1} ${tratto}/><circle cx="12" cy="37" r="5.5" ${c1} ${tratto}/><circle cx="28" cy="37" r="5.5" ${c1} ${tratto}/><circle cx="15" cy="45" r="5.5" ${c1} ${tratto}/><circle cx="25" cy="45" r="5.5" ${c1} ${tratto}/>
      <circle cx="20" cy="39" r="4" fill="${ORO}" ${tratto}/>
      <circle cx="23" cy="100" r="7" fill="${PELLE}" ${tratto}/>`,
    J: `
      <path d="M3 133V100Q10 82 34 76H92Q116 82 123 100V133Z" ${c2} ${tratto}/>
      <path d="M18 133L40 78H52L30 133ZM74 78H86L108 133H96Z" ${c1}/>
      <path d="M53 78H73V133H53Z" fill="${ORO}" ${tratto}/>
      <path d="M53 94H73M53 110H73M53 124H73" ${tratto} fill="none"/>
      <path d="M32 78Q63 96 94 78L96 86Q63 106 30 86Z" fill="${ORO}" ${tratto}/>
      <path d="M42 40Q38 66 47 74H79Q88 66 84 40Z" fill="#7a4a1a" ${tratto}/>
      <ellipse cx="63" cy="50" rx="15" ry="18" fill="${PELLE}" ${tratto}/>
      <circle cx="57" cy="48" r="1.8" fill="${NERO}"/><circle cx="69" cy="48" r="1.8" fill="${NERO}"/>
      <path d="M63 49L61.5 56H64.5" fill="none" stroke="${NERO}" stroke-width="1"/>
      <path d="M58 61Q63 64 68 61" fill="none" stroke="${NERO}" stroke-width="1.2"/>
      <path d="M40 38Q41 16 63 13Q87 13 88 36Z" ${c1} ${tratto}/>
      <rect x="40" y="31" width="48" height="7" fill="${ORO}" ${tratto}/>
      <path d="M82 24Q102 2 116 18Q102 13 88 30Z" fill="#fff" ${tratto}/>
      <path d="M86 26Q100 12 112 16" fill="none" stroke="${NERO}" stroke-width=".9"/>
      <rect x="14" y="16" width="5" height="96" fill="#7a4a1a" ${tratto}/>
      <path d="M16.5 2L24 13L16.5 20L9 13Z" fill="#dfe4ea" ${tratto}/>
      <path d="M19 22Q34 26 32 40Q26 34 19 36Z" fill="#dfe4ea" ${tratto}/>
      <circle cx="16.5" cy="98" r="7" fill="${PELLE}" ${tratto}/>`
  };

  // Simboli condivisi da tutte le carte (inseriti una volta sola nella pagina).
  function definizioni() {
    const semi = SEMI.map((p, s) => `<symbol id="seme-${s}" viewBox="0 0 100 100"><g fill="currentColor">${p}</g></symbol>`).join('');
    const figure = Object.entries(META).map(([k, meta]) => `
      <g id="meta-${k}">${meta}</g>
      <symbol id="figura-${k}" viewBox="0 0 126 266" preserveAspectRatio="none">
        <rect x="0.7" y="0.7" width="124.6" height="264.6" rx="5" fill="#fffaf0"/>
        <g clip-path="url(#taglio-figura)">
          <use href="#meta-${k}"/>
          <use href="#meta-${k}" transform="rotate(180 63 133)"/>
        </g>
        <path d="M2 133H124" stroke="${NERO}" stroke-width="1.2"/>
        <rect x="0.7" y="0.7" width="124.6" height="264.6" rx="5" fill="none" stroke="${NERO}" stroke-width="1.4"/>
      </symbol>`).join('');
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      <clipPath id="taglio-figura"><rect x="0.7" y="0.7" width="124.6" height="264.6" rx="5"/></clipPath>
      ${semi}${figure}</defs></svg>`;
  }

  // Posizioni dei semi sulle carte numerate (carta 250 x 350): colonne 83/125/167.
  const L = 83, C = 125, Rr = 167;
  const R4 = [70, 140, 210, 280];
  const POS = {
    2: [[C, 70], [C, 280]],
    3: [[C, 70], [C, 175], [C, 280]],
    4: [[L, 70], [Rr, 70], [L, 280], [Rr, 280]],
    5: [[L, 70], [Rr, 70], [C, 175], [L, 280], [Rr, 280]],
    6: [[L, 70], [Rr, 70], [L, 175], [Rr, 175], [L, 280], [Rr, 280]],
    7: [[L, 70], [Rr, 70], [C, 122], [L, 175], [Rr, 175], [L, 280], [Rr, 280]],
    8: [[L, 70], [Rr, 70], [C, 122], [L, 175], [Rr, 175], [C, 228], [L, 280], [Rr, 280]],
    9: [...R4.map((y) => [L, y]), ...R4.map((y) => [Rr, y]), [C, 175]],
    10: [...R4.map((y) => [L, y]), ...R4.map((y) => [Rr, y]), [C, 105], [C, 245]]
  };

  function seme(s, x, y, d, capovolto) {
    const rot = capovolto ? ` transform="rotate(180 ${x} ${y})"` : '';
    return `<use href="#seme-${s}" x="${x - d / 2}" y="${y - d / 2}" width="${d}" height="${d}"${rot}/>`;
  }

  // Figura nel suo riquadro, con il piccolo seme negli angoli del riquadro.
  function riquadro(k, s, x, y, scala) {
    const w = 140 * scala, h = 278 * scala, d = 24 * scala;
    return `<use href="#figura-${k}" x="${x}" y="${y}" width="${w}" height="${h}"/>` +
      seme(s, x + 5 * scala + d / 2, y + 5 * scala + d / 2, d, false) +
      seme(s, x + w - 5 * scala - d / 2, y + h - 5 * scala - d / 2, d, true);
  }

  // Disegno centrale di una carta: due versioni, "pieno" (carte grandi) e "compatto" (carte piccole, telefono).
  function arte(v, s) {
    let pieno, compatto;
    if (v === 1) {
      const d = s === 0 ? 120 : 84;
      pieno = seme(s, 125, 175, d, false);
      compatto = seme(s, 148, 232, 128, false);
    } else if (v > 10) {
      const k = ['J', 'Q', 'K'][v - 11];
      pieno = riquadro(k, s, 55, 36, 1);
      compatto = riquadro(k, s, 116, 104, 0.84);
    } else {
      pieno = POS[v].map(([x, y]) => seme(s, x, y, 46, y > 175)).join('');
      compatto = seme(s, 148, 232, 128, false);
    }
    return `<svg class="arte" viewBox="0 0 250 350" preserveAspectRatio="none" aria-hidden="true"><g class="pieno">${pieno}</g><g class="compatto">${compatto}</g></svg>`;
  }

  const VALORI = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const COLORI = { rosso: ['#c8102e', '#1d4f91'], nero: ['#1d4f91', '#c8102e'] };

  // Faccia completa della carta (id 0..51: seme = id / 13, valore = id % 13 + 1)
  function faccia(id) {
    const s = Math.floor(id / 13), v = (id % 13) + 1;
    const rossa = s === 1 || s === 2;
    const [a, b] = COLORI[rossa ? 'rosso' : 'nero'];
    const indice = (cls) => `<div class="idx${cls}"><b${v === 10 ? ' class="dieci"' : ''}>${VALORI[v - 1]}</b><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#seme-${s}"/></svg></div>`;
    return `<div class="face ${rossa ? 'rossa' : 'nera'}" style="--c1:${a};--c2:${b}">${arte(v, s)}${indice('')}${indice(' basso')}</div>`;
  }

  window.Carte = { definizioni, faccia };
})();
