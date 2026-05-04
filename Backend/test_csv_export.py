#!/usr/bin/env python3
"""
Test script for FishAI training-candidates CSV export.
Shows how to login, get JWT token, and download training CSVs.
"""

import requests
import json
from pathlib import Path

# Configuration
BACKEND_URL = 'http://localhost:5000'
API_V1 = f'{BACKEND_URL}/api/v1'

# Admin credentials (adjust as needed)
ADMIN_USERNAME = 'fishadmin'
ADMIN_PASSWORD = 'your_password_here'  # Change this!

def login_admin(username: str, password: str) -> str:
    """
    Login with admin credentials and return JWT token.
    """
    print(f"\n📝 Logging in as: {username}")
    
    url = f'{API_V1}/auth/signin'
    payload = {
        'email': username,
        'password': password
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        token = data.get('access_token') or data.get('token')
        
        if not token:
            print(f"✗ Login failed: No token in response")
            print(f"  Response: {data}")
            return None
        
        print(f"✅ Login successful!")
        print(f"   Token: {token[:50]}...")
        return token
    
    except requests.exceptions.RequestException as e:
        print(f"✗ Login failed: {e}")
        return None

def test_csv_export(token: str, boat_type: str = None) -> bool:
    """
    Test CSV export endpoint with JWT token.
    """
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    if boat_type:
        endpoint = f'/training-candidates/export/csv/{boat_type}'
        print(f"\n📥 Fetching CSV for boat type: {boat_type}")
    else:
        endpoint = '/training-candidates/export/csv'
        print(f"\n📥 Fetching all training data CSV")
    
    url = f'{API_V1}{endpoint}'
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        csv_content = response.text
        lines = csv_content.count('\n')
        
        print(f"✅ CSV downloaded successfully!")
        print(f"   Size: {len(csv_content)} bytes")
        print(f"   Lines: {lines}")
        
        # Show first few rows
        first_rows = '\n'.join(csv_content.split('\n')[:3])
        print(f"\n   Preview:")
        for line in first_rows.split('\n'):
            print(f"   {line}")
        
        return True
    
    except requests.exceptions.RequestException as e:
        print(f"✗ CSV export failed: {e}")
        if hasattr(e.response, 'text'):
            print(f"  Response: {e.response.text}")
        return False

def test_pending_candidates(token: str) -> bool:
    """
    Test the pending candidates endpoint (admin only).
    """
    print(f"\n👨‍💼 Testing admin-only endpoint: /pending")
    
    headers = {
        'Authorization': f'Bearer {token}'
    }
    
    url = f'{API_V1}/training-candidates/pending'
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        count = len(data) if isinstance(data, list) else 1
        
        print(f"✅ Admin endpoint accessible!")
        print(f"   Pending candidates: {count}")
        return True
    
    except requests.exceptions.RequestException as e:
        print(f"⚠️  Admin endpoint failed (expected if not admin): {e}")
        return False

def main():
    """
    Main test workflow.
    """
    print("=" * 70)
    print("FishAI Training Candidates CSV Export - Test Script")
    print("=" * 70)
    
    # Step 1: Login
    token = login_admin(ADMIN_USERNAME, ADMIN_PASSWORD)
    if not token:
        print("\n❌ Cannot proceed without token. Check credentials.")
        return
    
    # Step 2: Test CSV export (all data)
    test_csv_export(token)
    
    # Step 3: Test CSV export (specific boat type)
    test_csv_export(token, 'Fiber Boat (small)')
    
    # Step 4: Test admin endpoint
    test_pending_candidates(token)
    
    print("\n" + "=" * 70)
    print("✅ Test complete!")
    print("=" * 70)
    
    # Print Postman instructions
    print("\n📌 POSTMAN INSTRUCTIONS:")
    print("-" * 70)
    print("1. Login (POST):")
    print(f"   URL: {API_V1}/auth/signin")
    print("   Body (JSON):")
    print('   {"')
    print(f'     "email": "{ADMIN_USERNAME}",')
    print('     "password": "your_password"')
    print('   }')
    print("   → Copy the 'access_token' from response")
    print()
    print("2. Download CSV (GET):")
    print(f"   URL: {API_V1}/training-candidates/export/csv")
    print("   Headers:")
    print('     Authorization: Bearer YOUR_TOKEN_HERE')
    print("   → Response will be CSV file")
    print()
    print("3. Download CSV by Boat Type (GET):")
    print(f"   URL: {API_V1}/training-candidates/export/csv/Fiber%20Boat%20(small)")
    print("   Headers:")
    print('     Authorization: Bearer YOUR_TOKEN_HERE')
    print("-" * 70)

if __name__ == '__main__':
    main()
