// Dip-buy cbBTC bot for make.fun btc-race-24h-20261118-1444.
//
// Idea: in a falling or choppy market the only trades that pay are the
// bounces after a sharp dip. Buy all cash when the close has fallen
// DROP_BPS below the trailing LOOKBACK-bar high AND the last
// CONFIRM_BARS bars all closed up (the dip is turning, not still
// falling). A second, shallower trigger (MID_DROP_BPS with
// SECOND_CONFIRM_BARS closes up) catches the dips the primary misses
// but demands stronger confirmation: a shallow dip with weak
// confirmation is just a falling market, the extra up close is what
// separates a bounce from a slide. The primary fired only once in the
// whole dev window and never in its second half, so without the second
// trigger the bot risks entering the live race with no trade at all.
// Exit on a take-profit or a stop-loss measured from the
// actual fill price, then wait COOLDOWN_BARS before the next entry.
// Long only, at most one open position, fully deterministic: all
// integer (bigint) math, no clock, no randomness, no network.
//
// Round-trip cost is ~26-32 bps (4 bps fee + 2 bps slippage + price
// impact each way), so the dip has to be deep and the target wide
// enough to clear it: 1.5% down, 2.0% up, 1.0% stop.

import { runBars } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const LOOKBACK = 120;
const DROP_BPS = 150n;
const MID_DROP_BPS = 120n;
const TP_BPS = 200n;
const SL_BPS = 100n;
const CONFIRM_BARS = 2;
const SECOND_CONFIRM_BARS = 3;
const COOLDOWN_BARS = 10;
const MAX_SLIPPAGE_BPS = 100;
const BPS = 10000n;

const closes: bigint[] = [];
const opens: bigint[] = [];
let entry: bigint | null = null;
let cooldown = 0;

await runBars({
  onBatch(state, batch) {
    // Learn the actual fill prices from the previous batch's fills.
    for (const f of batch.fills) {
      if (f.status !== 'filled') continue;
      if (f.side === 'buy') entry = BigInt(f.price);
      if (f.side === 'sell') {
        entry = null;
        cooldown = COOLDOWN_BARS;
      }
    }

    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) {
      closes.push(BigInt(bar.c));
      opens.push(BigInt(bar.o));
    }
    if (state.warmingUp) return [];

    if (cooldown > 0) cooldown -= 1;

    const close = state.close(SYMBOL);
    if (close === null) return [];
    const pos = state.positions.get(SYMBOL);

    if (pos !== undefined && pos.qty > 0n) {
      if (entry !== null) {
        if (close * BPS >= entry * (BPS + TP_BPS)) {
          return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
        }
        if (close * BPS <= entry * (BPS - SL_BPS)) {
          return [{ side: 'sell', symbol: SYMBOL, qty: pos.qty, max_slippage_bps: MAX_SLIPPAGE_BPS }];
        }
      }
      return [];
    }
    entry = null;
    if (cooldown > 0) return [];
    if (closes.length < LOOKBACK || closes.length < CONFIRM_BARS) return [];

    let hi = 0n;
    for (let k = closes.length - LOOKBACK; k < closes.length; k++) {
      if (closes[k]! > hi) hi = closes[k]!;
    }
    let up = true;
    for (let k = 1; k <= CONFIRM_BARS; k++) {
      if (closes[closes.length - k]! <= opens[opens.length - k]!) {
        up = false;
        break;
      }
    }
    let upStrong = up;
    for (let k = CONFIRM_BARS + 1; k <= SECOND_CONFIRM_BARS; k++) {
      if (closes[closes.length - k]! <= opens[opens.length - k]!) {
        upStrong = false;
        break;
      }
    }
    const deepDip = close * BPS <= hi * (BPS - DROP_BPS);
    const midDip = close * BPS <= hi * (BPS - MID_DROP_BPS);
    if ((deepDip && up) || (midDip && upStrong)) {
      const spend = state.cash;
      if (spend < 1000000n) return [];
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }
    return [];
  },
});
