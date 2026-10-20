import numpy as np
from stub_pipeline.schema import RECONCILIATION_CONFIG, STREAMS

def cross_level_reconcil ( phi_i, u_i, S_i ):
    phi_i = np.asarray(phi_i, dtype=float )
    diagnostics= {}

    # Check whether all the features are 0
    abs_sum = np.sum(np.abs(phi_i))
    if abs_sum == 0:
        diagnostics["all_zero"] = True
        diagnostics["unallocated"] = u_i
        return np.zeros_like(phi_i), diagnostics

    # Check for near zero 
    eps_i = max(RECONCILIATION_CONFIG["eps_abs"], RECONCILIATION_CONFIG["rel_floor"] * abs_sum )
    denom = S_i if abs(S_i) > eps_i else np.copysign(eps_i,S_i or 1.0)
    diagnostics["near_zero"] = (abs(S_i) <= eps_i)

    # Ensure k_i is not too large
    k_i = u_i / denom
    capped = abs(k_i) > RECONCILIATION_CONFIG["cap_K"]
    k_i = np.clip(k_i,-RECONCILIATION_CONFIG["cap_K"],RECONCILIATION_CONFIG["cap_K"] )
    diagnostics["capped"] = capped

    # Check for sign mismatch
    diagnostics["sign_mismatch"] = ( np.sign(u_i) != np.sign(S_i) )

    # Claculate the reconciled value for stream
    r_i = np.sign(phi_i) * np.abs(phi_i) * abs(k_i)

    # Redistribution of the difference
    delta_i = u_i - sum(r_i)
    if (sum(abs(r_i)) == 0):
        diagnostics["unallocated"] = delta_i
    else:
        r_i_before = r_i.copy()
        r_i = r_i + ( delta_i * abs(r_i) / sum(abs(r_i)) ) 
        diagnostics["sign_flipped"] = np.array(np.sign(r_i_before) != np.sign(r_i) )
        diagnostics["unallocated"] = 0.0
    
    diagnostics["residual_before_redistribution"] = delta_i
    
    return r_i,diagnostics

def reconcile_streams( phi_stream, u_stream, S_stream):
    results = {}

    # Outer looper 
    for stream in STREAMS:
        r_i, diagnostics = cross_level_reconcil(
            phi_stream[stream], u_stream[stream], S_stream[stream]
        )

        results[stream] = { "r_i": r_i, "diagnostics": diagnostics }
    
    return results