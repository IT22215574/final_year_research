import requests
import time

print('Waiting for API to start...')
time.sleep(3)
print('=== TESTING MODEL API ===')
try:
    # Test fish list
    response = requests.get('http://localhost:8000/fish', timeout=5)
    if response.status_code == 200:
        fish_data = response.json()
        print(f'✅ Fish species loaded: {len(fish_data)}')
        print('Sample fish:')
        for fish in fish_data[:3]:
            print(f'  ID: {fish["fish_id"]} - {fish["sinhala_name"]}')
        
        # Test prediction
        print('\n=== TESTING PREDICTION ===')
        test_data = {'fish_id': 2, 'date': '2026-02-25'}
        pred_response = requests.post('http://localhost:8000/predict', json=test_data, timeout=10)
        
        if pred_response.status_code == 200:
            pred_data = pred_response.json()
            print('✅ Prediction successful!')
            print(f'✅ Predicted Price: Rs. {pred_data["predicted"]:.2f}')
            print(f'✅ Series data points: {len(pred_data["series"])}')
        else:
            print(f'❌ Prediction failed: {pred_response.status_code}')
    else:
        print(f'❌ API error: {response.status_code}')
except Exception as e:
    print(f'❌ Connection error: {e}')