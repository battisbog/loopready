# Adding interview questions

Three independent banks. Each is plain data, so adding a question is an edit to
one array. Run `npm run bank:coverage` afterwards to see where the gaps are.

## Coding problems

One file per pattern in `lib/coding/problems/`. Open the pattern's file, copy an
entry, change the fields.

**The test expectations are generated, not hand-written.** Add the problem to
`scripts/build-problems.py` with a reference solution, then:

```bash
npm run bank:build        # runs every solution, regenerates the .ts files
npm run verify:problems   # verify only, no writes
```

The generator executes the reference solution against every input and writes the
result as `expected`. That is the whole point: a wrong expected value cannot be
committed, because it is computed rather than typed. Statements must be written
from scratch, never copied from a problem site.

```python
problem(
    id="unique-slug", pattern="two-pointers", tiers=["mid"], title="Human Title",
    fn="function_name", companies=["Amazon", "Google"],
    statement="What the candidate is asked to do, in your own words.",
    example="input -> output",
    params="a, b",                      # becomes the python and javascript stubs
    tests=[[[1,2],3],[[],0]],           # ARGS ONLY; expected is computed
    unordered=True,                     # optional: result order does not matter
    solution="""
def function_name(a, b):
    return ...
""",
    covers="Private rubric: what a strong candidate does, and the traps.",
)
```

`tiers` drives which level sees it. `companies` biases selection when a company
is configured; it is a soft preference, not a filter.

Problems taking trees receive a level-order array with `null` for missing
children. Problems taking linked lists receive an array of values. Both keep the
tests executable over JSON while leaving the pointer discussion to the
interviewer.

## Behavioral questions

`lib/interview/questions.ts`. Add to the block for the competency:

```ts
{
  competency: "ownership",
  text: "Tell me about ...",
  tiers: ["mid", "senior"],   // optional; omit if it works at any level
  companies: ["Amazon"],      // optional
},
```

Adding a **new competency** means: extend the `Competency` union, add an entry to
`COMPETENCY_PROBES` (the private angles the interviewer digs into), and add it to
at least one company's `competencyEmphasis` in `lib/interview/companies.ts` so it
actually gets drawn.

## System design prompts

`lib/design/prompts.ts`. Copy an entry:

```ts
{
  id: "unique-slug",
  title: "Design a ...",
  statement: "One or two sentences of what to design.",
  tiers: ["mid", "senior"],
  strongAnswerCovers: "The rubric. Specific, not generic.",
  pressurePoints: ["Ask what happens when ...", "If they say X, ask ..."],
},
```

`strongAnswerCovers` feeds both the interviewer and the feedback report, so
vague text here produces vague feedback. `pressurePoints` are challenges to
raise only once the candidate has committed to something.

## What never goes in a bank

Both `strongAnswerCovers` and `pressurePoints` are **private**. The interviewer
is instructed never to read them out or steer toward them (see
`lib/interview/stance.ts`). Write them as notes to an interviewer, not as hints
to a candidate.

Do not paste verbatim text from any interview site, and do not add questions
sourced from a specific company's confidential process. Publicly discussed
question *styles* are fine; someone's NDA-covered loop is not.
