#!/usr/bin/env python3
"""
tokenizer-worker.py — Persistent jieba tokenizer worker for obsidian_search.

Communication: stdin/stdout JSON line protocol.
Input:  JSON array of strings to tokenize, one request per line.
Output: JSON array of token arrays (one per input string), one response per line.

On error, outputs: {"error": "<message>"}

Usage:
  echo '["牌组构筑", "引擎构筑"]' | python3 tokenizer-worker.py
  # => [["牌组","构筑"],["引擎","构筑"]]
"""

import sys
import json

try:
    import jieba
    # Suppress jieba initialization log
    jieba.setLogLevel(jieba.logging.INFO)
except ImportError:
    # Signal error to parent and exit
    print(json.dumps({"error": "jieba not installed. Run: pip install jieba"}), flush=True)
    sys.exit(1)

# Pre-load dictionary (happens once at startup, ~240ms)
_jieba_initialized = False

def ensure_initialized():
    global _jieba_initialized
    if not _jieba_initialized:
        # Force dictionary load by tokenizing a dummy string
        list(jieba.cut("初始化"))
        _jieba_initialized = True

def tokenize(text):
    """Tokenize a single string using jieba default mode (with HMM)."""
    ensure_initialized()
    tokens = list(jieba.cut(text))
    # Filter empty tokens and whitespace
    return [t for t in tokens if t.strip()]

def main():
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            inputs = json.loads(line)
            if not isinstance(inputs, list):
                raise ValueError("Expected JSON array of strings")
            results = []
            for text in inputs:
                if isinstance(text, str):
                    results.append(tokenize(text))
                else:
                    results.append([])
            print(json.dumps(results), flush=True)
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    main()
