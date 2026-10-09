# Office worker sprite review

Provider: Bumi, `openai/gpt-image-2`. One accepted full-body base and six independent component rows. Both identity reference and prepare-generated layout guide attached to every row. Provider prompts compact the skill's generated spec to fit Bumi's 4,000-character limit; numeric choices remain in `sprite-request.json`. No additional motion reference.

Native sprite-gen extraction, atlas composition, inspection, and deterministic palette bake completed. Runtime consumes absolute manifest rectangles. Five clothing colorways share the same geometry. Left-facing motion mirrors the right-facing row; this worker has no side-specific accessory.

Visual atlas review: complete bodies, feet visible, all 24 cells populated, no visible magenta. Idle has a subtle blink; work has a tablet/tap gesture; celebration is a short non-loop gesture. These are **best-effort demo assets**. Idle motion score is low because the intended motion is subtle. Extraction reports pitch disagreement and capping to the 48px physical cell. The declared 32px logical-height setting does not divide the 48px cell and is reported as ineffective by the extractor.

Directional walks are **experimental**: distinct readable foot poses, but exact contact continuity and loop symmetry are not certified. Three walking rows provide down/up/right views, with left mirrored. Do not describe them as production-ready locomotion. Review motion in the running office and the exported GIFs before further asset expansion. Future polish should use consistent directional anchors and native-height normalization.

Demo identities are currently a common character base with team clothing palettes and name/role badges. Individual hair/accessory silhouettes remain an art-polish milestone.
