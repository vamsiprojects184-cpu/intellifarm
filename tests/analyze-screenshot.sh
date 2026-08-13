#!/bin/bash
# Screenshot analyzer — takes a screenshot path and returns UI/UX analysis
# Usage: ./analyze-screenshot.sh <screenshot-path> [context]
IMG="$1"
CONTEXT="${2:-web page}"
z-ai vision -p "Analyze this ${CONTEXT} screenshot for UI/UX issues. Report concisely:
1) LAYOUT: overlapping, misaligned, cut-off, overflow issues
2) CONTRAST: text readability problems
3) SPACING: inconsistent paddings/margins/gaps
4) BROKEN: empty sections, missing images, error states visible
5) MOBILE: if mobile viewport, check touch target sizes & overflow
6) SCORE: overall visual quality /10
Be specific with element names. Ignore dev-only overlays (Next.js dev tools badge)." -i "$IMG" 2>&1 | tail -1 | bun -e 'let d="";process.stdin.on("data",c=>d+=c);process.stdin.on("end",()=>{try{const j=JSON.parse(d);console.log(j.choices[0].message.content)}catch{console.log(d)}})'
