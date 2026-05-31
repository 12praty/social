import type { BrandVoice } from "@prisma/client";

export type PlatformKey = "LINKEDIN" | "TWITTER" | "INSTAGRAM";

const sanitize = (s: string) => s.replace(/```/g, "").trim();

export function systemPrompt(brand: BrandVoice | null) {
  if (!brand || !brand.businessName) {
    return `You are an expert social media copywriter. Match each platform's native style. Be specific, vivid, and useful — never generic. Avoid em-dashes and corporate jargon.`;
  }
  const tone = brand.toneKeywords.length ? brand.toneKeywords.join(", ") : "professional, helpful";
  const avoid = brand.avoidWords.length ? brand.avoidWords.join(", ") : "(none)";
  const example = brand.examplePost ? sanitize(brand.examplePost).slice(0, 1200) : "(no example provided)";
  return `You are an expert social media copywriter writing for the brand below.

Business: ${sanitize(brand.businessName)}
Industry: ${sanitize(brand.industry || "general")}
Target audience: ${sanitize(brand.targetAudience || "general professional audience")}
Tone keywords: ${tone}
Words/phrases to NEVER use: ${avoid}

Style reference (write similarly in tone, rhythm, and vocabulary):
"""
${example}
"""

Always match the platform's native style. Be specific, vivid, and useful — never generic. Avoid em-dashes and corporate jargon.`;
}

export function platformPrompt(p: PlatformKey, topic: string, tone: string) {
  const t = sanitize(topic);
  const tn = sanitize(tone || "professional");
  if (p === "LINKEDIN") {
    return `Write a LinkedIn post about: "${t}"
Tone: ${tn}

Rules:
- 150-300 words.
- Open with a powerful hook (a bold claim, contrarian take, or specific question).
- Short paragraphs, 1-3 sentences each, with line breaks between them.
- Make it feel personal and concrete; use a small story, stat, or example.
- End with a clear call-to-action or question.
- Add 3-5 relevant hashtags on the final line.
- Do NOT use em-dashes. Do NOT use the word "delve" or "tapestry". No corporate fluff.

Output ONLY the post body. No preamble, no commentary.`;
  }
  if (p === "TWITTER") {
    return `Write a single, high-impact Twitter/X post about: "${t}"
Tone: ${tn}

Rules:
- The entire post MUST be strictly between 140 and 220 characters in total length. This is an absolute hard constraint.
- Open with a powerful hook.
- High value per word. Concrete, highly readable, and extremely punchy. No filler or fluff.
- Include exactly 1 or 2 relevant hashtags at the end (the hashtags count towards the character limit).
- Do NOT use emojis.

Output ONLY the post body. No preamble, no quotes around the output, no commentary.`;
  }
  return `Write an Instagram caption about: "${t}"
Tone: ${tn}

Rules:
- 100-150 words.
- Story-driven opening line that draws the reader in.
- Conversational, warm, emoji-friendly (2-4 well-placed emojis).
- End with a question that invites comments.
- After the caption, output a line containing exactly: [HASHTAGS]
- Then list 12 relevant hashtags separated by spaces.

Output ONLY the caption + hashtags block. No preamble, no commentary.`;
}

export function imagePromptInstructions(topic: string, content: string, platform: PlatformKey) {
  return `You are a creative director suggesting visuals for a ${platform} post.

Post topic: "${sanitize(topic)}"
Post content: """
${sanitize(content).slice(0, 1200)}
"""

Suggest exactly 3 detailed image prompts that would make stunning, on-brand visuals for this post. Each prompt should be:
- 1-2 sentences, vivid and specific.
- Production-ready for DALL·E / Midjourney / Stable Diffusion.
- Include style hints (e.g. "editorial photography", "flat illustration", "3D render").

Return ONLY a JSON array of 3 strings. No markdown, no commentary. Example:
["prompt 1...", "prompt 2...", "prompt 3..."]`;
}
