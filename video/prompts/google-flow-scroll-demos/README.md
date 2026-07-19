# Google Flow — 8-Second Cinematic Website Scroll Prompts

These prompts turn the three supplied desktop hero screenshots into separate **8.0-second cinematic website-scroll showcase clips**. Each prompt is self-contained and is intended for image-to-video generation in Google Flow using its matching screenshot as the source image / first frame.

## Source-image mapping

1. `01-olympus-academy/prompt.md` → `ChatGPT Image Jul 19, 2026, 11_29_50 AM.png`
2. `02-verdant-edge-lawn-care/prompt.md` → `ChatGPT Image Jul 19, 2026, 11_43_04 AM (1).png`
3. `03-northframe-studio/prompt.md` → `ChatGPT Image Jul 19, 2026, 11_43_04 AM (2).png`

## Recommended generation setup

- Mode: image-to-video, with the screenshot used as the opening frame and strongest visual reference.
- Duration: exactly 8 seconds.
- Aspect ratio: 16:9 landscape.
- Framing: full-bleed desktop website viewport; no browser bar, monitor, phone, hands, or physical device.
- Shot structure: one continuous shot with one continuous downward scroll; no cuts and no reverse scroll.
- Camera: locked directly in front of the webpage. The viewport stays fixed while page content moves upward, exactly like a polished screen capture.
- Motion: medium-high, but controlled and premium. Use smooth trackpad easing, pinned sections, masking, parallax, and restrained micro-interactions rather than chaotic camera motion.
- Audio: none. No dialogue, voice-over, music, typing, clicks, or sound effects.
- End frame: hold the final call-to-action fully readable for the last 0.6–0.8 seconds; do not fade to black.

## Shared quality rules

- Treat the uploaded screenshot as the immutable design system: preserve the visible logo, navigation, headline, call-to-action, proportions, spacing, typography direction, image composition, and color palette.
- Existing text must remain exactly spelled and readable. Do not replace it, rewrite it, translate it, or generate random characters.
- Invent only the specified below-the-fold sections, and use only the exact new headings listed in each prompt.
- The result must look like a real premium custom website being scrolled, not a slideshow, film trailer, camera fly-through, or generic template.
- Keep UI geometry crisp and front-facing. Avoid perspective bending, liquid warping, melted letters, duplicate buttons, broken logos, or shifting alignment.
- Use subtle ambient motion inside imagery while keeping architecture, faces, statues, and brand marks stable.

Each site folder contains a paste-ready master prompt, a precise eight-second beat sheet, and a dedicated avoid/negative block.
