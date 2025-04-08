"""精确分布模块"""

import random
from typing import List, Dict

def calculate_exact_counts(options, weights, total_count):
    counts = {}
    remaining = total_count
    
    for i in range(len(options) - 1): 
        exact_count = int(weights[i] * total_count)
        counts[options[i]] = exact_count
        remaining -= exact_count
    
    counts[options[-1]] = remaining
    return counts

def create_exact_distribution(options, weights, total_count):
    counts = calculate_exact_counts(options, weights, total_count)
    
    result = []
    for option, count in counts.items():
        result.extend([option] * count)
    
    random.shuffle(result)
    return result
