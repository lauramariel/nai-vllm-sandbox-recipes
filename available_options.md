These are the options available when a user selects different engine sources in NAI 2.8. For non-validated models or any model imported via Hugging Face URL (not taken from the model catalog)

If Engine Source = NAI:
    1. Enable KV Cache Aware Routing - True or False
    2. Enable KV Cache Offloading - True or False
        If True:
            Offloading Tier = CPU Memory (hard coded in 2.8)
            Memory Per Accelerator = USER INPUT in GiB (amount of CPU memory dedicated to offload the KV Cache)
    3. Enable Speculative Token Generaetion - True or False
        If True:
            Method: n-gram (hardcoded in 2.8)
            Speculation Length (Tokens): USER INPUT in GiB (Default: 5)
            Maximum Prompt Lookup (Tokens): USER INPUT in GiB (Default: 4)

    4. Configure Engine Parameters - Only Platform-Provided OR Custom Arguments and Environment Variables
        If Custom Arguments and Environment Variables:
            Arguments:
                e.g.: 
                    --dtype bfloat16
                    --max-model-len 25600
                    --speculative-config {"method":"mtp","num_speculative_tokens":2}
            Environment Variables:
                e.g.: 
                    VLLM_CPU_KVCACHE_SPACE=8
                    TIKTOKEN_ENCODINGS_BASE=/path/to/your/encodings
    5. Compute Configuration:
       1. Instances: number of inference pods (Default: 1)
       2. Node allocation per instance:
          1. Single Node - Serve endpoint using accelerators on one node
          2. Multi-Node - Serve the endpoint through accelerators spread across nodes with some network overhead.
       3. Accelerators per instance 
       4. vCPUS per Instance
       5. Host Memory per Instance
    
If Engine Source = Import from community vLLM registry:
    1. User specifies "Engine Tag": v0.28.0 (uses docker.io/vllm/vllm-openai)
    2. Enable KV Cache Aware Routing - True or False
    3. Configure Engine Parameters - Only Custom Arguments and Environment Variables are available
        Arguments:
            e.g.: 
                --dtype bfloat16
                --max-model-len 25600
                --speculative-config {"method":"mtp","num_speculative_tokens":2}
        Environment Variables:
            e.g.: 
                VLLM_CPU_KVCACHE_SPACE=8
                TIKTOKEN_ENCODINGS_BASE=/path/to/your/encodings

If Engine Source = Import from other registry is selected:
    1. User specifies "Engine Image URL"
    2. Enable KV Cache Aware Routing - True or False
    3. Configure Engine Parameters - Only Custom Arguments and Environment Variables are available
        Arguments:
            e.g.: 
                --dtype bfloat16
                --max-model-len 25600
                --speculative-config {"method":"mtp","num_speculative_tokens":2}
        Environment Variables:
            e.g.: 
                VLLM_CPU_KVCACHE_SPACE=8
                TIKTOKEN_ENCODINGS_BASE=/path/to/your/encodings


