import pickle

# Test loading the complete bundle
bundle = pickle.load(open('model_bundle_complete.pkl', 'rb'))
print('✅ COMPLETE BUNDLE LOADED SUCCESSFULLY')
print(f'   Model Type: {type(bundle["model"]).__name__}')
print(f'   Scaler: {type(bundle["scaler"]).__name__}')
print(f'   Encoders: {len(bundle["encoders"])} encoders')
print(f'   Saved: {bundle["timestamp"]}')
