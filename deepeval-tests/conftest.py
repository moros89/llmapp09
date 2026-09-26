"""
Shared fixtures and configuration for deepeval LLM evaluation tests.
"""

from typing import Callable, List

import pytest
from deepeval.dataset import EvaluationDataset
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams


def lazy_evaluation_dataset(
    build_fn: Callable[[], List[LLMTestCase]],
) -> Callable[[], EvaluationDataset]:
    """Build the dataset on first use (after the backend is up in CI)."""
    cache: dict[str, EvaluationDataset] = {}

    def get_dataset() -> EvaluationDataset:
        if "dataset" not in cache:
            dataset = EvaluationDataset()
            for test_case in build_fn():
                dataset.add_test_case(test_case)
            cache["dataset"] = dataset
        return cache["dataset"]

    return get_dataset


def parametrize_test_cases(metafunc: pytest.Metafunc, get_dataset: Callable[[], EvaluationDataset]) -> None:
    if "test_case" in metafunc.fixturenames:
        cases = list(get_dataset().test_cases)
        metafunc.parametrize(
            "test_case",
            cases,
            ids=[f"case{i}" for i in range(len(cases))],
        )


# ---------------------------------------------------------------------------
# Reusable GEval metric factories
# ---------------------------------------------------------------------------

def json_schema_metric(schema_description: str):
    """Creates a GEval metric that checks JSON schema compliance."""
    return GEval(
        name="JSON Schema Compliance",
        criteria=(
            "Evaluate whether the actual output is valid JSON that conforms to "
            "the required schema. Only check structure, key names, and data "
            "types — do NOT penalize for specific values. "
            + schema_description
        ),
        evaluation_params=[
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.5,
    )


def output_correctness_metric():
    """Creates a GEval metric that checks factual/logical correctness."""
    return GEval(
        name="Output Correctness",
        criteria=(
            "Determine whether the actual output is logically correct and "
            "reasonable given the input text. The analysis should make sense "
            "for the provided input."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.5,
    )


def answer_relevancy_metric():
    """Creates a GEval metric that checks whether the output is topically
    relevant to the input.  Unlike AnswerRelevancyMetric (which assumes a
    Q&A format), this works for classification and analysis endpoints where
    the output is structured metadata about the input text."""
    return GEval(
        name="Answer Relevancy",
        criteria=(
            "Evaluate whether the actual output is topically relevant to the "
            "input text. The labels, categories, or analysis in the output "
            "should directly relate to the subject matter of the input. "
            "Structured metadata (labels, categories, confidence scores) that "
            "accurately describes the input text should be considered relevant."
        ),
        evaluation_params=[
            LLMTestCaseParams.INPUT,
            LLMTestCaseParams.ACTUAL_OUTPUT,
        ],
        threshold=0.5,
    )
