"""Helpers for evaluating semantic tags efficiently."""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from typing import Callable, Dict, Iterable, List, Mapping, MutableMapping, Sequence, Tuple
import re

__all__ = [
    "KeywordRule",
    "PhraseRule",
    "RegexRule",
    "RuleResult",
    "SemanticEvaluator",
    "preprocess_text",
]

_TOKEN_RE = re.compile(r"\b[\w']+\b", re.UNICODE)
_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


@dataclass(frozen=True)
class PreprocessedDocument:
    """Representation of a document that has been tokenized once."""

    text: str
    lower_text: str
    tokens: Tuple[str, ...]
    token_set: frozenset[str]
    token_counts: Mapping[str, int]
    sentences: Tuple[str, ...]


def preprocess_text(text: str) -> PreprocessedDocument:
    """Tokenize and normalize *text* once so rules can re-use the data.

    The preprocessing keeps track of:
    - the original and lower-cased document
    - normalized word tokens and their counts
    - a unique set of tokens for fast membership checks
    - a lightweight sentence split for context-aware rules
    """

    lower_text = text.lower()
    tokens = tuple(_TOKEN_RE.findall(lower_text))
    token_counts: MutableMapping[str, int] = Counter(tokens)
    token_set = frozenset(token_counts)
    sentences = tuple(filter(None, _SENTENCE_RE.split(text)))
    return PreprocessedDocument(
        text=text,
        lower_text=lower_text,
        tokens=tokens,
        token_set=token_set,
        token_counts=token_counts,
        sentences=sentences,
    )


@dataclass(frozen=True)
class RuleResult:
    """Represents the outcome of evaluating a rule."""

    tag: str
    matched: bool
    score: float = 0.0
    metadata: Mapping[str, object] = field(default_factory=dict)


class SemanticRule:
    """Base class for all semantic rules."""

    tag: str
    description: str

    def evaluate(self, document: PreprocessedDocument) -> RuleResult:  # pragma: no cover - interface
        raise NotImplementedError


@dataclass
class KeywordRule(SemanticRule):
    """Marks a tag when a portion of keywords exist in the document."""

    tag: str
    description: str
    keywords: Sequence[str]
    threshold: float = 1.0
    weight: float = 1.0

    def __post_init__(self) -> None:
        normalized = tuple(keyword.lower() for keyword in self.keywords)
        object.__setattr__(self, "_normalized_keywords", normalized)

    def evaluate(self, document: PreprocessedDocument) -> RuleResult:
        keyword_count = len(self._normalized_keywords)
        if keyword_count == 0:
            return RuleResult(tag=self.tag, matched=False, score=0.0, metadata={})

        matches = sum(1 for keyword in self._normalized_keywords if keyword in document.token_set)
        coverage = matches / keyword_count
        score = coverage * self.weight
        metadata = {"matches": matches, "required": keyword_count, "coverage": coverage}
        return RuleResult(tag=self.tag, matched=coverage >= self.threshold, score=score, metadata=metadata)


@dataclass
class PhraseRule(SemanticRule):
    """Matches when specific phrases appear inside the document."""

    tag: str
    description: str
    phrases: Sequence[str]
    weight: float = 1.0

    def __post_init__(self) -> None:
        normalized = tuple(phrase.lower() for phrase in self.phrases)
        object.__setattr__(self, "_normalized_phrases", normalized)

    def evaluate(self, document: PreprocessedDocument) -> RuleResult:
        haystack = document.lower_text
        matches = sum(1 for phrase in self._normalized_phrases if phrase and phrase in haystack)
        score = matches * self.weight
        metadata = {"phrase_matches": matches, "phrases": len(self._normalized_phrases)}
        return RuleResult(tag=self.tag, matched=matches > 0, score=score, metadata=metadata)


@dataclass
class RegexRule(SemanticRule):
    """Uses a compiled regular expression to detect a semantic signal."""

    tag: str
    description: str
    pattern: re.Pattern | str
    weight: float = 1.0

    def __post_init__(self) -> None:
        compiled = re.compile(self.pattern, flags=re.IGNORECASE) if isinstance(self.pattern, str) else self.pattern
        object.__setattr__(self, "_pattern", compiled)

    def evaluate(self, document: PreprocessedDocument) -> RuleResult:
        match_count = sum(1 for _ in self._pattern.finditer(document.text))
        score = match_count * self.weight
        metadata = {"matches": match_count}
        return RuleResult(tag=self.tag, matched=bool(match_count), score=score, metadata=metadata)


@dataclass
class EvaluationResult:
    """Holds the results of running all configured rules."""

    document: PreprocessedDocument
    rule_results: List[RuleResult]

    @property
    def tags(self) -> Dict[str, RuleResult]:
        return {result.tag: result for result in self.rule_results if result.matched}


class SemanticEvaluator:
    """Evaluate text against a set of semantic rules using shared preprocessing."""

    def __init__(
        self,
        rules: Iterable[SemanticRule],
        preprocess: Callable[[str], PreprocessedDocument] = preprocess_text,
    ) -> None:
        self._rules = list(rules)
        self._preprocess = preprocess

    def evaluate(self, text: str) -> EvaluationResult:
        document = self._preprocess(text)
        results = [rule.evaluate(document) for rule in self._rules]
        return EvaluationResult(document=document, rule_results=results)
