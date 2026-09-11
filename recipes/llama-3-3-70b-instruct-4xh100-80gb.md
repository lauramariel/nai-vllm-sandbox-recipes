---
model: meta-llama/Llama-3.3-70B-Instruct
title: Llama 3.3 70B Instruct on 4x H100
submitted_by: laura-m
submitted_at: '2026-09-10'
nai_version: '2.8'
engine_source: nai
kv_cache_aware_routing: true
vllm_args:
  - '--dtype bfloat16'
  - '--max-model-len 25600'
env_vars:
  VLLM_CPU_KVCACHE_SPACE: '8'
hardware:
  gpu_model: H100-80GB
  gpu_count: 4
  node_allocation: single
  instances: 1
  vcpus_per_instance: 32
  host_memory_per_instance_gib: 256
nai_advanced:
  kv_cache_offloading:
    enabled: true
    offloading_tier: cpu-memory
    memory_per_accelerator_gib: 8
  speculative_decoding:
    enabled: true
    method: n-gram
    speculation_length_tokens: 5
    max_prompt_lookup_tokens: 4
---

## Notes

Ran without issues on 4x H100-80GB in a single-node NAI sandbox. The
default max-model-len was too small for our longer-context prompts, so we
bumped it to 25600 and switched to bfloat16 to keep memory headroom for KV
cache offloading.

Speculative decoding with n-gram gave a modest throughput bump on
repetitive completion workloads; didn't help much on open-ended chat.
