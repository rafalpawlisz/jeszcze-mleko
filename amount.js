// Pulls an amount out of a typed name: "szynka 50 dag" -> "szynka" + "50 dag".
//
// A unit is REQUIRED for the split to happen. That is the whole safety margin:
// a bare number is genuinely ambiguous ("2 mleka" — two cartons? two litres?) and
// guessing would invent information. With a unit present nothing is invented —
// the amount only moves from the name into its own field and reads the same
// either way.
//
// It also keeps the suggestion history clean: without this, "szynka 50 dag" and
// "szynka 30 dag" would pile up as two unrelated entries instead of one "szynka".

const MAX_LENGTH = 12; // must match the rules' cap on the amount field

// Longer alternatives first, or "dag" would match as "g" and "ml" as "l".
const UNIT = '(?:dkg|dag|kg|g|ml|l|szt\\.?|sztuk|opak\\.?|pcs|pack|oz|lb)';
const NUMBER = '\\d+(?:[.,]\\d+)?';

const TRAILING = new RegExp(`^(.+?)[\\s,]+(${NUMBER})\\s*(${UNIT})\\.?$`, 'i');
const LEADING = new RegExp(`^(${NUMBER})\\s*(${UNIT})\\.?[\\s,]+(.+)$`, 'i');
// "jogurt x6" — the multiplication sign says outright that a count follows.
const TIMES = new RegExp(`^(.+?)\\s*[x×]\\s*(\\d+)$`, 'i');

function tidy(number, unit) {
  // "500g" and "500 g" should end up identical, and "szt." and "szt" likewise —
  // otherwise the same amount would render two different ways on the list.
  return `${number} ${unit.replace(/\.$/, '')}`.replace(/\s+/g, ' ').trim();
}

// Returns { name, amount }. amount is '' when nothing could be split off, and
// the name is then returned unchanged.
export function splitAmount(text) {
  const input = String(text ?? '').trim().replace(/\s+/g, ' ');
  const nothing = { name: input, amount: '' };
  if (!input) return nothing;

  let name = '';
  let amount = '';

  const trailing = input.match(TRAILING);
  const leading = trailing ? null : input.match(LEADING);
  const times = trailing || leading ? null : input.match(TIMES);

  if (trailing) {
    [, name] = trailing;
    amount = tidy(trailing[2], trailing[3]);
  } else if (leading) {
    name = leading[3];
    amount = tidy(leading[1], leading[2]);
  } else if (times) {
    [, name, amount] = times;
  } else {
    return nothing;
  }

  name = name.trim().replace(/[\s,]+$/, '');

  // Nothing left to buy, or an amount too long for the field: leave the text
  // exactly as it was typed rather than mangling it.
  if (!name || amount.length > MAX_LENGTH) return nothing;

  return { name, amount };
}
