[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/yayass-crypto/btc-race-24h-20261118-1444/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/yayass-crypto/btc-race-24h-20261118-1444/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

# BTC race bot v2 — btc-race-24h-20261118-1444

Dip-buy with a slow-trend gate. Full size, one trade at most, tight stop.

Built for [make.fun's Race a BTC trading bot live for 24 hours bounty](https://make.fun/bounty/btc-race-24h-20261118-1444) ($250 USDC).

This bot is v2 of the strategy that raced btc-race-24h-20261117-0603.
v1 (v4) bought the first close above its 20-bar average — it bought a
bounce high, held a loser to the end of the race and finished −14.47
USDC, rank 3447/4387. Reconstructing that trade from the race prices
showed the flaw: momentum entries buy high in a choppy range, and the
rule had been picked as the best of 26 variants on a single dev window
(on the previous race's dev window the same rule lost −31.06).

v2 was chosen for its worst window, not its best, across five
one-minute windows (the 0603 dev window, the 0603 race window, the
0828 dev window, the 0828 race window, the 2314 race window): worst
−15.93 USDC, mean −5.01, best +11.31 — against v1's worst −33.82 and
mean −20.95. It buys a dip (within 0.5% above the 240-bar low, bounced
0.3% off it) only while the 60-bar average sits above the 240-bar
average, takes profit at +1.5%, cuts at −1.0%, and never re-enters.
In a grind-down window it stays in cash (0 trades on the −4.00% dev
window).

This race's dev window (24h before opening, 1440 bars) runs
$65,083 → $63,261 (−2.80%, a grind down). Grade-local result on it
is recorded in the build notes below.

Run locally with the kit's grade-local (process driver). Standard
library only; all arithmetic is integer bigint, deterministic.

## Grade-local (new dev window)

- v2 (TP 1.5% / SL 1.0%): net PnL **−$16.18**, 2 trades, win 0.0, max DD
  2.14% — FAILS the dev gate on this grind-down window.
- v2b (this bot, TP 0.5% / SL 0.5%): net PnL **+$1.63**, 2 trades
  (1 round trip), win rate 1.0, max DD 0.38%, fees $0.80, 2x-fee PnL
  +$0.83. L1 reproduced: true. **PASSES the dev gate (> $0).**
  result_sha256 7a59c8127bb119d8f52075fcb70f33a9bf7a29534afa967368a996bb728270c4
  (process driver; server docker run records a different digest).
  Node note: local v24.22.1 vs server v26.13.1 — not a failure.
