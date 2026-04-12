import numpy as np

# Cognitive category mapping for HCP Glasser atlas regions.
# Maps brain function categories to their constituent Glasser parcels.
REGION_CATEGORIES: dict[str, dict] = {
    "visual_processing": {
        "regions": [
            "V1", "V2", "V3", "V3A", "V3B", "V4", "V6", "V6A", "V7", "V8",
            "MT", "MST", "FST", "V3CD", "LO1", "LO2", "LO3", "PIT", "VVC",
        ],
        "label": "Visual Processing",
        "description": "Primary and secondary visual cortex processing visual features",
    },
    "face_recognition": {
        "regions": ["FFC", "VVC", "PIT", "TE2p"],
        "label": "Face Recognition",
        "description": "Fusiform face area and related regions for face processing",
    },
    "scene_processing": {
        "regions": ["PHA1", "PHA2", "PHA3", "VMV1", "VMV2", "VMV3"],
        "label": "Scene & Place Processing",
        "description": "Parahippocampal place area for scene/environment recognition",
    },
    "social_cognition": {
        "regions": ["TPOJ1", "TPOJ2", "TPOJ3", "STV", "STS"],
        "label": "Social & Emotional Processing",
        "description": "Temporoparietal junction - social cognition, theory of mind",
    },
    "reward_motivation": {
        "regions": ["OFC", "pOFC", "10v", "10r", "10pp", "a10p"],
        "label": "Reward & Motivation",
        "description": "Orbitofrontal regions linked to reward evaluation and motivation",
    },
    "language_semantic": {
        "regions": [
            "44", "45", "47l", "IFSa", "IFSp", "IFJa", "IFJp",
            "STSva", "STSvp", "STSda", "STSdp", "A4", "A5",
            "PSL", "SFL", "SCEF",
        ],
        "label": "Language & Semantics",
        "description": "Language comprehension and semantic processing areas",
    },
    "attention": {
        "regions": [
            "FEF", "PEF", "7AL", "7Am", "7PL", "7Pm", "IP0", "IP1", "IP2",
            "IPS1", "MIP", "LIPv", "LIPd", "VIP", "AIP",
        ],
        "label": "Attention & Spatial Awareness",
        "description": "Frontoparietal attention networks for focus and spatial processing",
    },
    "memory": {
        "regions": ["EC", "PreS", "H", "ProS", "PeEc"],
        "label": "Memory Encoding",
        "description": "Hippocampal and parahippocampal regions for memory formation",
    },
    "emotional_regulation": {
        "regions": [
            "a24", "p24", "a32pr", "p32pr", "d32", "s32", "25", "s6-8", "8BM",
        ],
        "label": "Emotional Regulation",
        "description": "Anterior cingulate and medial prefrontal cortex for emotion regulation",
    },
    "body_motion": {
        "regions": ["MT", "MST", "FST", "PH"],
        "label": "Body & Motion Processing",
        "description": "Processing of body movements and biological motion",
    },
}

# Emotion predictions derived from weighted combinations of cognitive engagement scores.
# Based on neuroscience literature mapping brain region activations to emotional states.
# Each emotion uses all 10 cognitive categories (weights sum to 1.0).
# Organised by Feelings Wheel families: Happy, Surprise, Bad, Afraid, Angry, Disgust, Sad.
EMOTION_MAPPINGS: dict[str, dict[str, float]] = {
    # ── Happy family ─────────────────────────────────────────────────────
    "Happy": {
        "Visual Processing": 0.10, "Face Recognition": 0.15, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.20,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.05, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.04,
    },
    "Joy": {
        "Visual Processing": 0.12, "Face Recognition": 0.15, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.22,
        "Language & Semantics": 0.04, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.04, "Emotional Regulation": 0.10, "Body & Motion Processing": 0.06,
    },
    "Playful": {
        "Visual Processing": 0.10, "Face Recognition": 0.06, "Scene & Place Processing": 0.03, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.20,
        "Language & Semantics": 0.04, "Attention & Spatial Awareness": 0.12, "Memory Encoding": 0.04, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.18,
    },
    "Content": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.12, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.04, "Memory Encoding": 0.12, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.05,
    },
    "Curiosity": {
        "Visual Processing": 0.12, "Face Recognition": 0.04, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.06, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.18, "Attention & Spatial Awareness": 0.20, "Memory Encoding": 0.15, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.03,
    },
    "Proud": {
        "Visual Processing": 0.06, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.18, "Reward & Motivation": 0.20,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.06, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.04,
    },
    "Care": {
        "Visual Processing": 0.08, "Face Recognition": 0.18, "Scene & Place Processing": 0.02, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.04, "Memory Encoding": 0.08, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.05,
    },
    "Gratitude": {
        "Visual Processing": 0.06, "Face Recognition": 0.10, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.18, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.08, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.12, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.03,
    },
    "Inspiration": {
        "Visual Processing": 0.12, "Face Recognition": 0.03, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.07, "Reward & Motivation": 0.20,
        "Language & Semantics": 0.15, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.08, "Emotional Regulation": 0.10, "Body & Motion Processing": 0.05,
    },
    "Arousal": {
        "Visual Processing": 0.12, "Face Recognition": 0.05, "Scene & Place Processing": 0.03, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.15,
        "Language & Semantics": 0.03, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.04, "Emotional Regulation": 0.10, "Body & Motion Processing": 0.22,
    },
    "Confident": {
        "Visual Processing": 0.07, "Face Recognition": 0.10, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.05, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.05,
    },
    "Powerful": {
        "Visual Processing": 0.08, "Face Recognition": 0.04, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.05, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.18,
    },
    "Creative": {
        "Visual Processing": 0.18, "Face Recognition": 0.04, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.06, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.15, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.10, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.04,
    },
    "Trust": {
        "Visual Processing": 0.06, "Face Recognition": 0.15, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.08, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.10, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.03,
    },
    "Tenderness": {
        "Visual Processing": 0.08, "Face Recognition": 0.18, "Scene & Place Processing": 0.03, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.03, "Memory Encoding": 0.08, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.05,
    },
    # ── Surprise family ──────────────────────────────────────────────────
    "Surprise": {
        "Visual Processing": 0.15, "Face Recognition": 0.12, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.07, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.04, "Attention & Spatial Awareness": 0.22, "Memory Encoding": 0.08, "Emotional Regulation": 0.10, "Body & Motion Processing": 0.12,
    },
    "Excitement": {
        "Visual Processing": 0.12, "Face Recognition": 0.05, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.05, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.06, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.15,
    },
    "Confusion": {
        "Visual Processing": 0.10, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.03,
        "Language & Semantics": 0.18, "Attention & Spatial Awareness": 0.20, "Memory Encoding": 0.12, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.04,
    },
    "Shock": {
        "Visual Processing": 0.15, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.04, "Attention & Spatial Awareness": 0.22, "Memory Encoding": 0.10, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.12,
    },
    "Eager": {
        "Visual Processing": 0.10, "Face Recognition": 0.04, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.20,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.06, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.12,
    },
    "Awe": {
        "Visual Processing": 0.20, "Face Recognition": 0.05, "Scene & Place Processing": 0.12, "Social & Emotional Processing": 0.06, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.05, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.12, "Emotional Regulation": 0.10, "Body & Motion Processing": 0.04,
    },
    # ── Bad family ────────────────────────────────────────────────────────
    "Stressed": {
        "Visual Processing": 0.06, "Face Recognition": 0.04, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.10, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.12,
    },
    "Apathy": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.15, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.05,
    },
    "Overwhelmed": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.12, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.10,
    },
    "Boredom": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.06, "Social & Emotional Processing": 0.06, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.12, "Memory Encoding": 0.18, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.05,
    },
    "Helpless": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.12, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.10,
    },
    # ── Afraid family ─────────────────────────────────────────────────────
    "Afraid": {
        "Visual Processing": 0.10, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.10, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.15,
    },
    "Anxious": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.10, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.12,
    },
    "Insecure": {
        "Visual Processing": 0.05, "Face Recognition": 0.15, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.18, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.12, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.04,
    },
    "Mistrust": {
        "Visual Processing": 0.06, "Face Recognition": 0.12, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.12, "Memory Encoding": 0.10, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.04,
    },
    "Worry": {
        "Visual Processing": 0.08, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.18, "Attention & Spatial Awareness": 0.12, "Memory Encoding": 0.12, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.06,
    },
    "Empty": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.06, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.18, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.04,
    },
    "Embarrassment": {
        "Visual Processing": 0.04, "Face Recognition": 0.18, "Scene & Place Processing": 0.03, "Social & Emotional Processing": 0.20, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.06, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.12,
    },
    # ── Angry family ──────────────────────────────────────────────────────
    "Angry": {
        "Visual Processing": 0.04, "Face Recognition": 0.08, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.06, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.12,
    },
    "Jealous": {
        "Visual Processing": 0.05, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.20, "Reward & Motivation": 0.15,
        "Language & Semantics": 0.07, "Attention & Spatial Awareness": 0.12, "Memory Encoding": 0.08, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.04,
    },
    "Irritation": {
        "Visual Processing": 0.08, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.18, "Memory Encoding": 0.05, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.12,
    },
    "Frustration": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.06, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.08,
    },
    "Bitter": {
        "Visual Processing": 0.05, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.15, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.05,
    },
    "Shame": {
        "Visual Processing": 0.05, "Face Recognition": 0.15, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.20, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.12, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.06,
    },
    "Withdrawn": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.15, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.05,
    },
    "Numb": {
        "Visual Processing": 0.10, "Face Recognition": 0.05, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.08, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.12, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.15,
    },
    # ── Disgust family ────────────────────────────────────────────────────
    "Disgust": {
        "Visual Processing": 0.15, "Face Recognition": 0.12, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.10, "Memory Encoding": 0.05, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.15,
    },
    "Disdain": {
        "Visual Processing": 0.06, "Face Recognition": 0.12, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.20, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.15, "Attention & Spatial Awareness": 0.10, "Memory Encoding": 0.08, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.05,
    },
    "Horror": {
        "Visual Processing": 0.18, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.08, "Reward & Motivation": 0.04,
        "Language & Semantics": 0.05, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.12, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.10,
    },
    # ── Sad family ────────────────────────────────────────────────────────
    "Sad": {
        "Visual Processing": 0.08, "Face Recognition": 0.06, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.10,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.15, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.04,
    },
    "Lonely": {
        "Visual Processing": 0.06, "Face Recognition": 0.10, "Scene & Place Processing": 0.06, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.15, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.04,
    },
    "Vulnerable": {
        "Visual Processing": 0.05, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.12, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.15,
    },
    "Guilty": {
        "Visual Processing": 0.05, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.18, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.12, "Emotional Regulation": 0.20, "Body & Motion Processing": 0.05,
    },
    "Depression": {
        "Visual Processing": 0.08, "Face Recognition": 0.06, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.15, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.06,
    },
    "Hurt": {
        "Visual Processing": 0.06, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.18, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.08, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.12, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.12,
    },
    "Disappointment": {
        "Visual Processing": 0.06, "Face Recognition": 0.06, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.12, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.05,
    },
    "Longing": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.12, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.15,
        "Language & Semantics": 0.08, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.22, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.05,
    },
    "Grief": {
        "Visual Processing": 0.06, "Face Recognition": 0.10, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.12, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.20, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.05,
    },
    "Regret": {
        "Visual Processing": 0.06, "Face Recognition": 0.05, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.08, "Memory Encoding": 0.20, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.05,
    },
    # ── Extra (not on wheel, kept from original set) ──────────────────────
    "Empathy": {
        "Visual Processing": 0.08, "Face Recognition": 0.18, "Scene & Place Processing": 0.04, "Social & Emotional Processing": 0.22, "Reward & Motivation": 0.05,
        "Language & Semantics": 0.10, "Attention & Spatial Awareness": 0.06, "Memory Encoding": 0.10, "Emotional Regulation": 0.12, "Body & Motion Processing": 0.05,
    },
    "Nostalgia": {
        "Visual Processing": 0.08, "Face Recognition": 0.05, "Scene & Place Processing": 0.12, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.12,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.22, "Emotional Regulation": 0.15, "Body & Motion Processing": 0.05,
    },
    "Desire": {
        "Visual Processing": 0.12, "Face Recognition": 0.06, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.22,
        "Language & Semantics": 0.05, "Attention & Spatial Awareness": 0.15, "Memory Encoding": 0.05, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.12,
    },
    "Calm": {
        "Visual Processing": 0.12, "Face Recognition": 0.05, "Scene & Place Processing": 0.15, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.08,
        "Language & Semantics": 0.06, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.12, "Emotional Regulation": 0.22, "Body & Motion Processing": 0.05,
    },
    "Melancholy": {
        "Visual Processing": 0.08, "Face Recognition": 0.06, "Scene & Place Processing": 0.12, "Social & Emotional Processing": 0.10, "Reward & Motivation": 0.06,
        "Language & Semantics": 0.12, "Attention & Spatial Awareness": 0.05, "Memory Encoding": 0.18, "Emotional Regulation": 0.18, "Body & Motion Processing": 0.05,
    },
    "Humor": {
        "Visual Processing": 0.06, "Face Recognition": 0.12, "Scene & Place Processing": 0.05, "Social & Emotional Processing": 0.15, "Reward & Motivation": 0.18,
        "Language & Semantics": 0.15, "Attention & Spatial Awareness": 0.10, "Memory Encoding": 0.05, "Emotional Regulation": 0.08, "Body & Motion Processing": 0.06,
    },
}

# Human-readable full names for common Glasser regions
REGION_FULL_NAMES: dict[str, str] = {
    "V1": "Primary Visual Cortex",
    "V2": "Secondary Visual Cortex",
    "V3": "Third Visual Area",
    "V4": "Fourth Visual Area",
    "MT": "Middle Temporal Visual Area",
    "MST": "Medial Superior Temporal Area",
    "FFC": "Fusiform Face Complex",
    "VVC": "Ventral Visual Complex",
    "PIT": "Posterior Inferotemporal",
    "PHA1": "Parahippocampal Area 1",
    "PHA2": "Parahippocampal Area 2",
    "PHA3": "Parahippocampal Area 3",
    "TPOJ1": "Temporoparietal-Occipital Junction 1",
    "TPOJ2": "Temporoparietal-Occipital Junction 2",
    "TPOJ3": "Temporoparietal-Occipital Junction 3",
    "STV": "Superior Temporal Visual Area",
    "STS": "Superior Temporal Sulcus",
    "OFC": "Orbitofrontal Cortex",
    "pOFC": "Posterior Orbitofrontal Cortex",
    "FEF": "Frontal Eye Fields",
    "EC": "Entorhinal Cortex",
    "H": "Hippocampus",
    "44": "Broca's Area (BA44)",
    "45": "Broca's Area (BA45)",
    "a24": "Anterior Cingulate Area 24",
    "p24": "Posterior Cingulate Area 24",
}


class BrainMapper:
    """Maps TRIBE v2 vertex activations to named brain regions."""

    def __init__(self, mesh: str = "fsaverage5"):
        self.mesh = mesh
        self._hcp_labels: dict[str, np.ndarray] | None = None
        self._vertex_to_region: np.ndarray | None = None
        self._region_names: list[str] = []
        self._n_vertices: int = 0

    def load(self) -> None:
        """Load HCP Glasser atlas labels for the fsaverage5 mesh."""
        from tribev2.utils import get_hcp_labels

        self._hcp_labels = get_hcp_labels(
            mesh=self.mesh, combine=False, hemi="both"
        )
        self._build_vertex_lookup()

    def _build_vertex_lookup(self) -> None:
        """Build a per-vertex region name array from the HCP label dict."""
        if self._hcp_labels is None:
            raise RuntimeError("Labels not loaded")

        # Determine total vertex count from all label arrays
        all_indices: set[int] = set()
        for indices in self._hcp_labels.values():
            all_indices.update(indices.tolist())

        self._n_vertices = max(all_indices) + 1 if all_indices else 0
        self._vertex_to_region = np.full(self._n_vertices, "", dtype=object)

        for region_name, indices in self._hcp_labels.items():
            self._vertex_to_region[indices] = region_name

        self._region_names = list(self._hcp_labels.keys())

    def get_region_activations(
        self, vertex_activations: np.ndarray
    ) -> list[dict]:
        """Convert per-vertex activations to per-region summaries.

        Returns a list of dicts matching the RegionActivation schema.
        """
        if self._hcp_labels is None:
            raise RuntimeError("BrainMapper not loaded")

        # Normalize vertex activations to 0-1
        vmin, vmax = vertex_activations.min(), vertex_activations.max()
        if vmax - vmin > 0:
            normalized = (vertex_activations - vmin) / (vmax - vmin)
        else:
            normalized = np.zeros_like(vertex_activations)

        # Compute mean activation per Glasser region
        region_means: dict[str, float] = {}
        for region_name, indices in self._hcp_labels.items():
            valid = indices[indices < len(normalized)]
            if len(valid) > 0:
                region_means[region_name] = float(normalized[valid].mean())

        # Build reverse lookup: region -> category
        region_to_category: dict[str, str] = {}
        for cat_key, cat_info in REGION_CATEGORIES.items():
            for r in cat_info["regions"]:
                region_to_category[r] = cat_key

        # Build output
        results: list[dict] = []
        for region_name, activation in region_means.items():
            # Strip hemisphere prefix if present (e.g., "L_V1" -> "V1")
            base_name = region_name
            hemisphere = "bilateral"
            if region_name.startswith("L_"):
                base_name = region_name[2:]
                hemisphere = "left"
            elif region_name.startswith("R_"):
                base_name = region_name[2:]
                hemisphere = "right"

            category = region_to_category.get(base_name, "other")
            full_name = REGION_FULL_NAMES.get(
                base_name, base_name.replace("_", " ")
            )

            cat_info = REGION_CATEGORIES.get(category, {})
            description = cat_info.get("description", "")

            results.append({
                "region_name": region_name,
                "full_name": full_name,
                "hemisphere": hemisphere,
                "activation": round(activation, 4),
                "category": category,
                "description": description,
            })

        # Sort by activation descending
        results.sort(key=lambda r: r["activation"], reverse=True)
        return results

    def get_engagement_scores(
        self, vertex_activations: np.ndarray
    ) -> dict[str, float]:
        """Compute category-level engagement scores from vertex activations."""
        if self._hcp_labels is None:
            raise RuntimeError("BrainMapper not loaded")

        vmin, vmax = vertex_activations.min(), vertex_activations.max()
        if vmax - vmin > 0:
            normalized = (vertex_activations - vmin) / (vmax - vmin)
        else:
            normalized = np.zeros_like(vertex_activations)

        scores: dict[str, float] = {}
        for cat_key, cat_info in REGION_CATEGORIES.items():
            cat_activations: list[float] = []
            for region_name in cat_info["regions"]:
                # Check both hemispheres
                for prefix in ["L_", "R_", ""]:
                    full_name = f"{prefix}{region_name}"
                    if full_name in self._hcp_labels:
                        indices = self._hcp_labels[full_name]
                        valid = indices[indices < len(normalized)]
                        if len(valid) > 0:
                            cat_activations.append(float(normalized[valid].mean()))

            if cat_activations:
                scores[cat_info["label"]] = round(
                    float(np.mean(cat_activations)), 4
                )

        return scores

    def generate_summary(self, engagement_scores: dict[str, float]) -> str:
        """Generate a human-readable summary from engagement scores."""
        if not engagement_scores:
            return "No significant brain activation predicted."

        sorted_scores = sorted(
            engagement_scores.items(), key=lambda x: x[1], reverse=True
        )

        top = sorted_scores[:3]
        parts: list[str] = []

        for label, score in top:
            pct = int(score * 100)
            if pct >= 70:
                parts.append(f"strong {label.lower()} ({pct}%)")
            elif pct >= 40:
                parts.append(f"moderate {label.lower()} ({pct}%)")
            else:
                parts.append(f"mild {label.lower()} ({pct}%)")

        if len(parts) == 1:
            return f"This content primarily engages {parts[0]}."
        elif len(parts) == 2:
            return f"This content engages {parts[0]} and {parts[1]}."
        else:
            return (
                f"This content engages {parts[0]}, {parts[1]}, "
                f"and {parts[2]}."
            )

    def get_emotion_scores(
        self, engagement_scores: dict[str, float]
    ) -> dict[str, float]:
        """Predict emotional responses from cognitive engagement scores.

        Uses neuroscience-informed weighted combinations of engagement
        categories to estimate emotional state predictions.
        Returns top 4 emotions scoring above 0.25.
        """
        scores: dict[str, float] = {}
        for emotion, weights in EMOTION_MAPPINGS.items():
            score = sum(
                engagement_scores.get(category, 0.0) * weight
                for category, weight in weights.items()
            )
            score = max(0.0, min(1.0, score))
            if score >= 0.25:
                scores[emotion] = round(score, 4)

        # Return top 4 sorted by score descending
        sorted_emotions = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        return dict(sorted_emotions[:10])

    def get_vertex_region_map(self) -> list[str]:
        """Return region name for each vertex (for Three.js mesh coloring)."""
        if self._vertex_to_region is None:
            raise RuntimeError("BrainMapper not loaded")
        return self._vertex_to_region.tolist()
