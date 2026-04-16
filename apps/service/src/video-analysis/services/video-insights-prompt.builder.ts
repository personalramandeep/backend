import { Injectable } from '@nestjs/common';
import { ImagePart } from '../../llm/providers/llm-provider.interface';
import { AiInsightsContext } from '../dtos/ai-insights-context.dto';

export interface BuiltVideoInsightPrompt {
  prompt: string;
  images: ImagePart[];
}

@Injectable()
export class VideoInsightsPromptBuilder {
  build(ctx: AiInsightsContext): BuiltVideoInsightPrompt {
    const { metrics, playerProfile, heatmapBuffer, shotFrameBuffers } = ctx;

    const images: ImagePart[] = [];
    if (heatmapBuffer) {
      images.push({ mimeType: 'image/jpeg', data: heatmapBuffer });
    }
    for (const buf of shotFrameBuffers) {
      images.push({ mimeType: 'image/jpeg', data: buf });
    }

    const metricsBlock = JSON.stringify(
      {
        step_count: metrics.step_count,
        distance_travelled_m: metrics.distance_travelled_m,
        total_frames: metrics.total_frames,
        clip_duration_sec: metrics.clip_duration_sec,
        record_angle: metrics.record_angle,
        sport_metrics: metrics.sport_metrics,
      },
      null,
      2,
    );

    const profileBlock = JSON.stringify(
      {
        height_m: playerProfile.height_m,
        weight_kg: playerProfile.weight_kg,
        skill_level: playerProfile.skill_level,
        video_duration_sec: metrics.clip_duration_sec,
      },
      null,
      2,
    );

    const imageCount = images.length;
    const imageNote =
      imageCount > 0
        ? `You have been provided ${imageCount} image(s): the first is the court heatmap${shotFrameBuffers.length > 0 ? `, followed by ${shotFrameBuffers.length} key shot frame(s)` : ''}.`
        : 'No images were available for this analysis — rely on the structured metrics.';

    const prompt = `You are Kreeda AI Coach, an expert badminton performance analyst.

${imageNote}

You receive:
1. Structured gameplay metrics (JSON)
2. Key video frames (images, if provided)
3. Court heatmap image (if provided)
4. Player profile

-------------------------------------
GAMEPLAY METRICS
-------------------------------------
${metricsBlock}

-------------------------------------
PLAYER PROFILE
-------------------------------------
${profileBlock}

-------------------------------------
YOUR JOB
-------------------------------------
Generate structured, UI-ready insights with scoring and calorie estimation.

-------------------------------------
OUTPUT FORMAT (STRICT JSON — no markdown fences)
-------------------------------------

{
  "ai_score": number,
  "calories_per_set": number,
  "summary": "...",
  "skill_score": {
    "footwork_score": number,
    "endurance_score": number,
    "smash_score": number,
    "defence_score": number
  },
  "skill_breakdown": {
    "footwork": "...",
    "defense": "...",
    "attack": "...",
    "endurance": "..."
  },
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "recommendations": ["...", "...", "..."],
  "movement_analysis": "...",
  "ai_coach": "..."
}

-------------------------------------
AI SCORE (0-100)
-------------------------------------

Base on:
- Activity: step_count, distance_travelled_m
- Shot quality: smash_count, defence_count, serve_count, total_shot_count (from sport_metrics)
- Balance: attack_ratio = smash_count / total_shot_count
- Movement efficiency = distance_travelled_m / step_count
- Heatmap coverage (balanced vs biased)

Heuristics:
- Good movement + balanced play → 75-90
- Low movement or poor balance → 50-70
- High efficiency + aggressive control → 85+

Keep score realistic and explainable.

-------------------------------------
SKILL SCORES (0-100)
-------------------------------------

Compute individual scores for: footwork_score, endurance_score, smash_score, defence_score.
All scores must be integers in [0, 100].

FOOTWORK SCORE:
- Primary signals: step_count, distance_travelled_m, movement_efficiency = distance_travelled_m / step_count
- Heatmap coverage: if the heatmap image shows broad, balanced court distribution → favour higher score
- Backcourt-heavy heatmap when record_angle is "backcourt" is expected — do NOT penalize
- More steps + higher efficiency + wide coverage → higher score

ENDURANCE SCORE:
- Primary signals: step_count + distance_travelled_m relative to clip_duration_sec
- Normalize activity: (step_count / clip_duration_sec) — higher is better
- If activity density is high throughout → favour higher score
- Any inferred drop in activity (sparse frames, low movement late) → reduce score

SMASH SCORE:
- Primary signals from sport_metrics: smash_count, total_shot_count
- attack_ratio = smash_count / total_shot_count (if total_shot_count > 0, else 0)
- Higher smash_count + balanced attack_ratio (0.25-0.6) → high score
- Very low smash_count or attack_ratio < 0.1 → score ≤ 50
- Over-forcing (attack_ratio > 0.7 with low defence) → cap at 70

DEFENCE SCORE:
- Primary signals from sport_metrics: defence_count, total_shot_count
- sustain_ratio = defence_count / total_shot_count (if total_shot_count > 0, else 0)
- High defence_count (relative to total) + good footwork → high score
- Link with heatmap: fast recovery visible in central/mid-court heatmap coverage → bonus

SCORING HEURISTICS (apply to all four):
- Elite + well-balanced metric presence → 85-100
- Strong metric presence → 75-90
- Moderate / inconsistent → 60-75
- Weak / low contribution → 40-60
- Near-zero metrics → 20-40

Scores must be realistic, explainable, and aligned with ai_score.

-------------------------------------
CALORIE ESTIMATION (PER SET)
-------------------------------------

Use MET-based formula:
Calories/min = (MET * weight_kg * 3.5) / 200

MET by skill_level:
- Beginner: 5.5
- Intermediate: 6.5
- Advanced: 7.5
- Professional: 8.5

Steps:
1. Estimate intensity factor:
  intensity = normalize(step_count + distance_travelled_m)

2. Adjust MET slightly:
  MET_adjusted = MET * (0.9 to 1.1 based on intensity)

3. Estimate set duration:
  set_duration_sec = 3 * clip_duration_sec

4. Calories:
  calories_per_set = Calories/min * (set_duration_sec / 60)

Return rounded integer.

-------------------------------------
GUIDELINES
-------------------------------------

SUMMARY:
- 2 lines max

SKILL BREAKDOWN:
- footwork, defense, attack, endurance → 1 line each

STRENGTHS / IMPROVEMENTS:
- Max 2 each, evidence-based from the metrics and frames

RECOMMENDATIONS:
- 3 actionable ("Do X to improve Y")

MOVEMENT ANALYSIS:
- Use heatmap + movement metrics. Note: record_angle="${metrics.record_angle}" — a backcourt-heavy heatmap is expected for this angle and should not be penalised as a positioning gap.

AI_COACH:
- 2-3 lines, conversational coaching tone

-------------------------------------
HEATMAP RULES
-------------------------------------
- Central → good positioning
- Backcourt-heavy AND record_angle is "backcourt" → normal, do not flag as negative
- Backcourt-heavy AND record_angle is "frontcourt" → late recovery
- Frontcourt-heavy → attacking bias
- Uneven → positioning gaps

-------------------------------------
RULES
-------------------------------------
- Return ONLY the JSON object, no markdown, no code fences, no explanation outside the JSON
- No mention of models or pipeline
- No hallucination — base every claim on the provided metrics or visible frame evidence
- Tone: Professional coach
- Total response length: under 200 words across all string fields combined
`;

    return { prompt, images };
  }
}
