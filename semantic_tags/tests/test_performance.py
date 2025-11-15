from __future__ import annotations

from time import perf_counter

from semantic_tags import KeywordRule, PhraseRule, RegexRule, SemanticEvaluator

MAX_RUNTIME_SECONDS = 0.3


def _build_rules() -> list:
    return [
        KeywordRule(
            tag="family_friendly",
            description="Highlights content suitable for families",
            keywords=["family", "playground", "kids", "picnic"],
            threshold=0.5,
        ),
        KeywordRule(
            tag="nightlife",
            description="Mentions destinations ideal for nightlife",
            keywords=["cocktail", "rooftop", "dj", "late-night"],
            threshold=0.25,
            weight=1.5,
        ),
        PhraseRule(
            tag="sustainability",
            description="Looks for explicit sustainability programs",
            phrases=["protected bike lanes", "solar-powered lighting", "community garden"],
        ),
        RegexRule(
            tag="accessibility",
            description="Detects ADA-related amenities",
            pattern=r"ADA (?:ramps|access)",
        ),
    ]


def _large_document() -> str:
    paragraph = (
        "Families visiting the waterfront adore the new playground, expansive picnic lawn, and kids museum exhibits. "
        "Late-night crowds drift toward the craft cocktail bars, rooftop lounges with resident DJs, and underground clubs. "
        "Protected bike lanes, solar-powered lighting, and a thriving community garden underscore the district's sustainability pledges. "
        "Transit officials added ADA ramps along every block so visitors using mobility devices can access the river trail."
    )
    return "\n".join(paragraph for _ in range(400))


def test_large_document_runtime() -> None:
    evaluator = SemanticEvaluator(_build_rules())
    document = _large_document()

    start = perf_counter()
    result = evaluator.evaluate(document)
    elapsed = perf_counter() - start

    assert elapsed < MAX_RUNTIME_SECONDS, f"Evaluator took {elapsed:.3f}s which exceeds {MAX_RUNTIME_SECONDS:.3f}s"

    tags = result.tags
    assert tags["family_friendly"].matched
    assert tags["nightlife"].matched
    assert tags["sustainability"].matched
    assert tags["accessibility"].matched
