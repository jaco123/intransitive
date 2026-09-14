'use strict';

const rating = require('./rating.js');

function roundedDelta(after, before) {
  return Math.round(after.rating) - Math.round(before.rating);
}

/**
 * Return W/D/L changes from each player's own perspective. Each value comes
 * from that player's Glicko-2 result, never from negating the opponent's.
 */
function buildRatingPreview(blue, red) {
  const calculate = (blueOutcome) => {
    const result = rating.apply(blue, red, blueOutcome);
    return {
      blue: roundedDelta(result.blue, blue),
      red: roundedDelta(result.red, red),
    };
  };

  const blueWin = calculate(1);
  const draw = calculate(0.5);
  const redWin = calculate(0);
  return {
    blue: { win: blueWin.blue, draw: draw.blue, loss: redWin.blue },
    red: { win: redWin.red, draw: draw.red, loss: blueWin.red },
  };
}

module.exports = { buildRatingPreview, roundedDelta };
