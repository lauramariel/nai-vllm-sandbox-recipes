---
model: Qwen/Qwen2.5-32B-Instruct
title: Qwen2.5 32B Instruct on 2x A100
submitted_by: someone-else
submitted_at: '2026-08-22'
nai_version: '2.8'
engine_source: community-vllm-registry
engine_tag: v0.28.0
kv_cache_aware_routing: false
vllm_args:
  - '--dtype bfloat16'
  - '--max-model-len 16384'
env_vars: {}
hardware:
  gpu_model: A100-80GB
  gpu_count: 2
  node_allocation: single
  instances: 1
  vcpus_per_instance: 16
  host_memory_per_instance_gib: 64
---

## Notes

Used the community vLLM registry image directly since we needed a vLLM
patch release ahead of what NAI 2.8 ships. No NAI-specific tuning applied;
this is close to vLLM upstream defaults with a reduced max-model-len to
fit comfortably on 2x A100-80GB.
