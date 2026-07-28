# Style signature map

Map `project.stylePreset` / genre keywords → short English **styleSignature** blocks.  
Not a copy of any commercial book — derived from manga-gong-bang STYLE_PRESETS + 7-axis method.

| stylePreset / keyword | styleSignature (seed) |
|----------------------|------------------------|
| 셀 애니 | 90s cel animation, clean line art, vibrant cel shading |
| 다크 누아르 | dark noir, high contrast B&W with selective color, rain, deep shadows |
| 파스텔 수채화 | soft pastel watercolor, gentle washes, dreamy diffusion |
| 사이버네온 | cyberpunk neon, wet streets, magenta-cyan glow, holographic accents |
| 판타지 에픽 | epic fantasy cinematic lighting, grand scale, painterly detail |
| 웹툰 클린 | Korean webtoon clean digital, bright colors, expressive faces |
| 공포 하이콘 | horror manga, heavy ink shadows, unsettling angles |
| 레트로 SF | retro pulp sci-fi, bold colors, vintage space-age poster look |
| 동양화 풍 | ink wash sumi-e atmosphere, elegant negative space |
| 치비 코미디 | chibi SD proportions, exaggerated comic motion |

## Genre boost (append lightly)
| genre contains | extra tokens |
|----------------|--------------|
| 사이버펑크 / 네온 | rain reflections, LED signage bokeh |
| 판타지 | volumetric god rays, ancient stone |
| 호러 | oppressive negative space, cold key light |
| 로맨스 | soft key, warm rim, shallow DOF |

If `stylePrompt` exists in meta, prefer it as the signature core and only add missing camera/lighting grammar in axes.
