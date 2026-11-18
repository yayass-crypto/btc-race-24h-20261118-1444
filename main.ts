// btc race bot v2b (K1-tight) — dip-buy with a slow-trend gate, one trade,
// tight 0.5% take-profit / 0.5% stop.
//
// Why this shape — measured on SIX one-minute windows, not one:
//   DEV0603 (kit dev, +0.49% net), RACE0603 (the race just run, -0.91%),
//   DEV0828 (kit dev, -4.00% grind down), RACE0828 (-2.17%), RACE2314 (-3.32%),
//   DEV1444 (this race's dev window, -2.80% grind down),
//   all with the harness cost model (4 bps fee + 2 bps slippage + impact,
//   ~26 bps a full-size round trip). Net PnL in USDC, $1,000 start:
//
//     strategy                       worst    mean    best   wins/6
//     v2 shipped (TP1.5 SL1.0)      -18.32   -7.23  +11.31    1
//     v2b (this bot, TP0.5 SL0.5)    -8.44   -0.87   +1.45    4
//     hold-cash (0 trades)            0.00    0.00    0.00    0
//
// v2b is the best of a 252-combination dip grid plus the 36-variant library,
// selected by worst window first, then mean — never by the dev window alone.
// Its DEV1444 sim margin is only +0.07 USDC, inside the sim's model error,
// so the grade-local result below is the real gate verdict: submit only if
// it is above $0, otherwise skip this race (a failing entry does not race).
//
// Rules, decided on each bar's close and filled at the next bar's open:
//   - Warmup: need 240 closes before any order.
//   - Gate: the 60-bar average must be strictly above the 240-bar average.
//   - Buy the full cash balance when the close is within 0.5% above the
//     240-bar low AND at least 0.3% above that low (it bounced off the low)
//     AND the close is above the previous close. One trade ever.
//   - Sell the whole position when the close is 0.5% or more above the
//     entry close (take profit) or 0.5% or more below it (hard stop).
//     Otherwise hold to the end of the window.
//
// All arithmetic is integer (bigint) on the harness's raw price units,
// so two runs produce the same orders byte for byte. No clock, no
// randomness, no network, no environment reads. Warm-up bars, when the
// harness sends them, build history but never take orders.

import { runBars, type BarsState, type Batch, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const WARMUP = 240;
const GATE_SHORT = 60;
const GATE_LONG = 240;
const MAX_SLIPPAGE_BPS = 100;
// Entry: close within +0.5% of the 240-bar low and at least +0.3% above it:
//   close * 1000 <= low * 1005  and  close * 1000 >= low * 1003.
// Exit: take profit +0.5% (close * 1000 >= entry * 1005),
//       hard stop   -0.5% (close * 1000 <= entry * 995).

const closes: bigint[] = [];
let entry: bigint | null = null;
let done = false;

function sumLast(n: number): bigint {
  let sum = 0n;
  const start = Math.max(0, closes.length - n);
  for (let i = start; i < closes.length; i++) sum += closes[i];
  return sum;
}

function minLast(n: number): bigint {
  let m = closes[closes.length - 1];
  const start = Math.max(0, closes.length - n);
  for (let i = start; i < closes.length; i++) if (closes[i] < m) m = closes[i];
  return m;
}

await runBars({
  onBatch(state: BarsState, _batch: Batch): OrderInput[] {
    const close = state.close(SYMBOL);
    if (close === null) return [];
    closes.push(close);
    if (state.warmingUp) return [];
    const pos = state.positions.get(SYMBOL);
    const holding = pos !== undefined && pos.qty > 0n;
    if (!holding) {
      entry = null;
      // One position ever: after the exit there is no re-entry.
      if (done || closes.length < WARMUP) return [];
      // Gate: 60-bar average strictly above 240-bar average.
      // sum60/60 > sum240/240  <=>  sum60 * 4 > sum240.
      if (sumLast(GATE_SHORT) * 4n <= sumLast(GATE_LONG)) return [];
      const low = minLast(GATE_LONG);
      const prev = closes[closes.length - 2];
      if (
        close * 1000n <= low * 1005n &&
        close * 1000n >= low * 1003n &&
        close > prev
      ) {
        entry = close;
        done = true;
        const notional = state.cash;
        if (notional <= 0n) return [];
        return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
      return [];
    }
    // Holding: exit only on take-profit or hard stop. The entry is cleared
    // only once the position is gone, so a refused sell is retried next bar.
    if (entry !== null && pos !== undefined) {
      if (close * 1000n >= entry * 1005n || close * 1000n <= entry * 995n) {
        return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
      }
    }
    return [];
  },
});
