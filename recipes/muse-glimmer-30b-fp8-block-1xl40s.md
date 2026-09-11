---
model: RedHatAI/Muse-Glimmer-30B-FP8-block
submitted_by: lauramariel
submitted_at: '2026-09-11'
nai_version: '2.8'
engine_source: community-vllm-registry
engine_tag: v0.28.0
kv_cache_aware_routing: false
vllm_args:
  - '--generation-config auto'
  - '--enable-auto-tool-choice'
  - '--tool-call-parser muse_glimmer'
  - '--reasoning-parser muse_glimmer'
env_vars: {}
hardware:
  gpu_model: L40S
  gpu_count: 1
  node_allocation: single
  instances: 1
  vcpus_per_instance: 8
  host_memory_per_instance_gib: 16
---

## Notes


