#!/usr/bin/env python3
"""
Test script to create and approve training candidates for CSV export demo.
"""

import requests
import json
from datetime import datetime

BACKEND_URL = 'http://localhost:5000'
API_V1 = f'{BACKEND_URL}/api/v1'

# Admin credentials
ADMIN_EMAIL = 'sjayaweera@gmail.com'
ADMIN_PASSWORD = 'your_password'  # Change this!

def login():
    """Login and return access token."""
    print("\n📝 Logging in...")
    url = f'{API_V1}/auth/signin'
    payload = {
        'email': ADMIN_EMAIL,
        'password': ADMIN_PASSWORD
    }
    
    try:
        response = requests.post(url, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        token = data.get('data', {}).get('access_token')
        
        if token:
            print(f"✅ Logged in successfully")
            return token
        else:
            print(f"❌ No token in response: {data}")
            return None
    except Exception as e:
        print(f"❌ Login failed: {e}")
        return None

def get_pending_candidates(token):
    """Get list of pending candidates."""
    print("\n📋 Checking pending candidates...")
    url = f'{API_V1}/training-candidates/pending'
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        candidates = response.json()
        print(f"✅ Found {len(candidates)} pending candidates")
        return candidates
    except Exception as e:
        print(f"⚠️  Error: {e}")
        return []

def approve_candidate(token, candidate_id):
    """Approve a pending candidate."""
    print(f"\n✅ Approving candidate: {candidate_id}")
    url = f'{API_V1}/training-candidates/{candidate_id}/approve'
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.post(url, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()
        print(f"   Status: {result.get('status')}")
        print(f"   Boat Type: {result.get('boatType')}")
        return True
    except Exception as e:
        print(f"❌ Approval failed: {e}")
        return False

def export_csv(token, boat_type=None):
    """Download CSV export."""
    if boat_type:
        endpoint = f'/training-candidates/export/csv/{boat_type}'
        print(f"\n📥 Exporting CSV for: {boat_type}")
    else:
        endpoint = '/training-candidates/export/csv'
        print(f"\n📥 Exporting all training data CSV")
    
    url = f'{API_V1}{endpoint}'
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        csv_content = response.text
        lines = csv_content.strip().split('\n')
        
        print(f"✅ CSV downloaded!")
        print(f"   Rows: {len(lines) - 1} (excluding header)")
        
        # Show first few rows
        for i, line in enumerate(lines[:4]):
            if i == 0:
                print(f"\n   Header: {line[:80]}...")
            else:
                print(f"   Row {i}: {line[:80]}...")
        
        return csv_content
    except Exception as e:
        print(f"❌ Export failed: {e}")
        return None

def main():
    print("=" * 70)
    print("Training Candidates CSV Export - Complete Workflow Test")
    print("=" * 70)
    
    # Login
    token = login()
    if not token:
        print("\n❌ Cannot proceed without token")
        return
    
    # Check pending candidates
    candidates = get_pending_candidates(token)
    
    if not candidates:
        print("\n⚠️  No pending candidates found!")
        print("\nYou need to:")
        print("1. Create trips with predictions")
        print("2. Log actual values (fuel, cost)")
        print("3. They'll appear as pending candidates here")
        print("\nFor now, check the admin panel to approve candidates.")
    else:
        # Show candidates
        print("\n📊 Pending Candidates:")
        for i, candidate in enumerate(candidates[:3], 1):
            boat_type = candidate.get('boatType', 'Unknown')
            print(f"   {i}. Boat: {boat_type} | ID: {candidate['_id'][:12]}...")
        
        # Approve first few
        approved_count = 0
        for candidate in candidates[:3]:
            if approve_candidate(token, candidate['_id']):
                approved_count += 1
        
        print(f"\n✅ Approved {approved_count} candidates")
    
    # Export CSV
    print("\n" + "=" * 70)
    csv_data = export_csv(token)
    
    # Export by boat type
    if csv_data:
        export_csv(token, 'Fiber Boat (small)')
    
    print("\n" + "=" * 70)
    print("✅ Test complete!")
    print("=" * 70)

if __name__ == '__main__':
    main()
