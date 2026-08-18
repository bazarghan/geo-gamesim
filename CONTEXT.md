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
