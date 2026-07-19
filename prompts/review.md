---
description: Review the current changes like a rigorous pull-request review
argument-hint: "[focus]"
---
Review the current working-tree changes. Use git diff and relevant surrounding code/tests. Report only actionable findings, ordered by severity, with file and line references. Check correctness, regressions, security, error handling, tests, and maintainability. Focus: ${1:-all relevant areas}.
