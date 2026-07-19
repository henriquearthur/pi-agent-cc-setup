---
description: Audit code or changes for security vulnerabilities
argument-hint: "[scope]"
---
Perform a security-focused review of ${1:-the current working-tree changes}. Inspect authentication and authorization, input validation, injection, secrets, cryptography, filesystem and command execution, data exposure, dependency risk, and unsafe defaults. Return concrete findings with severity, file/line references, impact, and a remediation; do not invent findings.
