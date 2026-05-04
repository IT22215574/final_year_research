#!/usr/bin/env python3
"""
Utility script to manage and view ocean current data archives.
"""

import os
import glob
from datetime import datetime

# Unified base data folder
BASE_DATA_FOLDER = "Fish zone daily data"


def list_archived_data():
    """List all archived ocean current data files."""
    archive_dir = os.path.join(BASE_DATA_FOLDER, "ocean_currents_archive")
    
    if not os.path.exists(archive_dir):
        print(f"Archive directory '{archive_dir}' does not exist yet.")
        print("Run fetch_ocean_currents.py first to create it.")
        return
    
    files = sorted(glob.glob(f"{archive_dir}/ocean_currents_*.nc"), reverse=True)
    
    if not files:
        print(f"No archived data found in '{archive_dir}'")
        return
    
    print(f"\n{'='*70}")
    print(f"Ocean Current Data Archive - {len(files)} file(s) found")
    print(f"{'='*70}\n")
    
    total_size = 0
    for filepath in files:
        filename = os.path.basename(filepath)
        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
        total_size += size_mb
        
        print(f"  {filename}")
        print(f"    Size: {size_mb:.2f} MB  |  Modified: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        print()
    
    print(f"{'='*70}")
    print(f"Total archive size: {total_size:.2f} MB")
    print(f"{'='*70}\n")


def check_latest_data():
    """Check if latest data file exists and show its info."""
    latest_file = os.path.join(BASE_DATA_FOLDER, "currents_latest.nc")
    
    print(f"\n{'='*70}")
    print("Latest Ocean Current Data Status")
    print(f"{'='*70}\n")
    
    if os.path.exists(latest_file):
        size_mb = os.path.getsize(latest_file) / (1024 * 1024)
        mtime = datetime.fromtimestamp(os.path.getmtime(latest_file))
        
        print(f"✓ File: {latest_file}")
        print(f"  Size: {size_mb:.2f} MB")
        print(f"  Last updated: {mtime.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Calculate age
        age_hours = (datetime.now() - mtime).total_seconds() / 3600
        if age_hours < 24:
            print(f"  Age: {age_hours:.1f} hours (fresh!)")
        else:
            age_days = age_hours / 24
            print(f"  Age: {age_days:.1f} days")
            if age_days > 2:
                print("  ⚠️  Data is more than 2 days old. Consider updating.")
    else:
        print(f"✗ Latest data file not found: {latest_file}")
        print("  Run: python3 model/fetch_ocean_currents.py")
    
    print(f"\n{'='*70}\n")


def show_logs(lines=50):
    """Show recent log entries."""
    log_file = "model/ocean_currents_fetch.log"
    
    print(f"\n{'='*70}")
    print(f"Recent Log Entries (last {lines} lines)")
    print(f"{'='*70}\n")
    
    if os.path.exists(log_file):
        with open(log_file, 'r') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]
            print(''.join(recent_lines))
    else:
        print(f"Log file not found: {log_file}")
        print("No fetch operations have been logged yet.")
    
    print(f"\n{'='*70}\n")


def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Manage and view ocean current data archives"
    )
    parser.add_argument(
        '--list', '-l',
        action='store_true',
        help='List all archived data files'
    )
    parser.add_argument(
        '--status', '-s',
        action='store_true',
        help='Check latest data status'
    )
    parser.add_argument(
        '--logs',
        type=int,
        nargs='?',
        const=50,
        metavar='N',
        help='Show last N log entries (default: 50)'
    )
    parser.add_argument(
        '--all', '-a',
        action='store_true',
        help='Show all information (status + list + logs)'
    )
    
    args = parser.parse_args()
    
    # If no arguments, show help and status by default
    if not any([args.list, args.status, args.logs, args.all]):
        parser.print_help()
        print()
        check_latest_data()
        return
    
    if args.all or args.status:
        check_latest_data()
    
    if args.all or args.list:
        list_archived_data()
    
    if args.all or args.logs is not None:
        lines = args.logs if args.logs is not None else 50
        show_logs(lines)


if __name__ == "__main__":
    main()
