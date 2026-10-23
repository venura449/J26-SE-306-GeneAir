from adapters.bundle_adapter import BundleModelAdapter

a = BundleModelAdapter()
print(a.stream_feature_map().keys(), a.platt_params())
record = {}                      # all-missing row is enough to test the plumbing
c1_like = a.stream_probabilities(record)   # replace with a real C1 response later
for s, r in a.check_against_c1(record, c1_like).items():
    print(s, r)