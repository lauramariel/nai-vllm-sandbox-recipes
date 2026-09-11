---
model: org/bad-model
submitted_by: laura-m
submitted_at: '2026-09-01'
nai_version: '2.8'
engine_source: nai
engine_tag: v0.28.0
kv_cache_aware_routing: false
hardware:
  gpu_model: H100-80GB
  gpu_count: 0
---

## Notes

This file is deliberately invalid: engine_tag is forbidden when
engine_source is nai, and gpu_count must be positive.
