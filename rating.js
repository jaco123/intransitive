/* RPS 9x9 — Glicko-2 rating wrapper.
 * Rating period = one game. Returns rounded values ready for storage.
 */
'use strict';

const { Glicko2 } = require('glicko2');

const SETTINGS = { rating: 1500, rd: 350, vol: 0.06, tau: 0.5 };

/**
 * Apply a single-game Glicko-2 update.
 * @param {{rating:number, rd:number, vol:number}} blue
 * @param {{rating:number, rd:number, vol:number}} red
 * @param {number} outcome  1 = blue wins, 0 = red wins, 0.5 = draw
 * @returns {{blue:{rating,rd,vol}, red:{rating,rd,vol}}}
 */
function apply(blue, red, outcome) {
  const ranking = new Glicko2(SETTINGS);
  const match = ranking.addMatch(
    { rating: blue.rating, rd: blue.rd, vol: blue.vol, id: 'b' },
    { rating: red.rating, rd: red.rd, vol: red.vol, id: 'r' },
    outcome
  );
  ranking.calculatePlayersRatings();

  const round = (p) => ({
    rating: Math.round(p.getRating()),
    rd: Math.round(p.getRd()),
    vol: Number(p.getVol().toFixed(6)),
  });

  return { blue: round(match.pl1), red: round(match.pl2) };
}

module.exports = { apply, SETTINGS };
