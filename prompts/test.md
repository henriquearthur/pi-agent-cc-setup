---
description: Find and run the most relevant tests for a change
argument-hint: "[target]"
---
Determine the project test commands and run the smallest relevant test set for ${1:-the current change}. Report the exact commands, results, failures, and any coverage gaps. Do not modify production code unless required to make a failing test pass and the user asked for a fix.
