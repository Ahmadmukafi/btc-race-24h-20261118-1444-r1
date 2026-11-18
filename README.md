[![make.fun](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/Ahmadmukafi/btc-race-24h-20261118-1444-r1/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/Ahmadmukafi/btc-race-24h-20261118-1444-r1/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444)

# Dip-buy cbBTC bot — btc-race-24h-20261118-1444

A bot that trades Coinbase Wrapped BTC (cbBTC) against USDC, minute by
minute, on the [make.fun](https://make.fun/bounty/btc-race-24h-20261118-1444)
24-hour race.

## Strategy

In a falling or choppy market the only trades that pay are the bounces
after a sharp dip. The bot buys with all cash when the close has fallen
1.5% below the trailing 120-bar high **and** the last 2 bars both
closed up (the dip is turning, not still falling). It exits on a
take-profit of 2.0% or a stop-loss of 1.0%, measured from the actual
fill price, then waits 10 bars before the next entry.

Long only, at most one open position. A full-size round trip costs
about 26–32 bps (4 bps fee + 2 bps slippage + price impact each way),
so the dip has to be deep and the target wide enough to clear it.

## Dev result (kit grade-local, process driver)

- Net PnL **+$17.66** on the frozen 24h dev window (gate: > $0)
- 2 fills, win rate 100%, max drawdown 0.65%, 0 rejected
- Fees $0.81; at 2x fees net PnL +$16.85
- Guardrails met; L1 regrade reproduced byte for byte (deterministic)

Variants tested on the same window: drop 1.2% / TP 2.0% → +$13.84;
drop 1.0% / TP 0.8% → +$9.85; RSI and breakout-momentum variants all
lost money, as did every house baseline (ema-cross −$148.17,
momentum −$23.87, buy-and-hold −$31.63).

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript, stdlib only)
- `vendor/makefun-bars.ts` — the kit's bars-replay SDK shim, copied
  byte-for-byte from the competition kit
- `LICENSE` — MIT

## Run locally

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot . --driver process
```
