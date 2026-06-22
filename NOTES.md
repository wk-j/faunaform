# Notes

## Teaching preferences
- **Language**: Teach in **Thai** (ภาษาไทย). Lessons, explanations, quizzes — all in Thai. Technical terms (FFT, frequency, Web Audio API names) may stay in English with a Thai gloss.
- The user is building **Faunaform** (this repo) — a browser sound visualizer. Teaching must stay grounded in this project, not generic DSP theory.

## Established context (from the codebase, not yet confirmed as "learned")
- User can already use the Web Audio API: `getUserMedia`, `AnalyserNode`, `fftSize 2048`, `getByteFrequencyData`, `getByteTimeDomainData`, `smoothingTimeConstant`, decibel range.
- "Signature" = frozen, loudness-normalized spectral-shape snapshot for comparing two sounds visually (does NOT classify/name the source). See CONTEXT.md.
