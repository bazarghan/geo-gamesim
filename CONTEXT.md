# Glossary

## Friendliness Score

A whole number 0–10 measuring how amicable the relationship between two
countries is: 0 = open hostility, 10 = deep alliance. Symmetric — one score
per pair, not one per direction. Produced by the LLM for a **Pairing**, and
cached per (model, Pairing).

## Pairing

An unordered pair of selected countries. The unit of LLM querying and of
simulation. With three selected countries there are three Pairings.

## Strategy Archetype

A country's disposition in the simulation, derived deterministically from
the Friendliness Score by threshold:

- 0–2: Aggressive
- 3–4: Suspicious
- 5–6: Reciprocator
- 7–8: Cautious Cooperator
- 9–10: Loyal Ally

## Round

One turn of the iterated Prisoner's Dilemma, in which each country in a
Pairing plays Cooperate or Defect. A simulation runs a fixed number of
Rounds.

## Drift

The algorithmic change in a Pairing's Friendliness Score as Rounds play
out: cooperation raises it, defection lowers it. Purely local — no LLM
calls mid-run.

## Verdict

The final classification of a Pairing, judged over its final 10 Rounds:

- **PEACE** — mutual cooperation
- **COLD WAR** — mixed or exploitative end state
- **WAR** — mutual defection

With three countries, an **Overall Verdict** aggregates the Pairing
Verdicts: PEACE if all pairs cooperate, WAR if any pair collapses to
mutual defection, otherwise TENSION.

## Conflict Scenario

A war context being analyzed: two belligerent parties plus a set of
other parties that may pick a side or stay out. Distinct from the
per-Pairing **Verdict** WAR, which is a simulation *outcome*, not a
scenario.

## Party

Any country participating in a Conflict Scenario — including the two
belligerents.

## Alignment

A Party's stance in a Conflict Scenario: **SIDE A**, **SIDE B**, or
**NEUTRAL**. The unit of prediction produced by the game-theoretic
analysis.

## Alignment Profile

The complete assignment of an Alignment to every Party in a Conflict
Scenario.

## Payoff Parameters

The per-Party numbers the LLM produces from its geopolitical analysis,
used as inputs to the game: affinity to Side A, affinity to Side B,
value of neutrality, and power weight. Game theory does the math on
these; the LLM does not directly pick Alignments.

## Nash Equilibrium

An Alignment Profile in which no Party can raise its payoff by
unilaterally switching Alignment. Found by exact enumeration of all
3^n profiles; a Conflict Scenario may have several.

## Equilibrium Selection

Which Nash Equilibrium a set of MARL agents actually converges to,
answering "which stable outcome is likely" when several exist.
