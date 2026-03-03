import os
import requests
import time
import random
import urllib.request
from urllib.request import Request, urlopen
from urllib.error import URLError
import concurrent.futures
from threading import Lock
import argparse
import io
from PIL import Image
import hashlib

# List of fish types to include (excluding mackerel and skipjack tuna)
FISH_TYPES = [
    "salmon", "trout", "cod", "haddock", "bass", "catfish", "tilapia",
    "snapper", "grouper", "halibut", "flounder", "perch", "walleye",
    "carp", "pike", "barramundi", "sea bream", "red snapper", 
    "yellowtail", "amberjack", "pollock", "hake", "whiting", 
    "sablefish", "lingcod", "rockfish", "sole", "turbot",
    "mahi mahi", "dorado", "wahoo", "pompano", "bonefish", "tarpon",
    "barracuda", "cobia", "kingfish", "albacore tuna", "yellowfin tuna"
]

# Excluded fish patterns
EXCLUDED_PATTERNS = ['mackerel', 'skipjack tuna']

# Multiple image sources for redundancy
IMAGE_SOURCES = [
    "https://images.unsplash.com/photo-{}/800x600/?{}",
    "https://source.unsplash.com/800x600/?{}",
    "https://loremflickr.com/800/600/{},fish",
    "https://placekitten.com/800/600",  # Fallback for testing
]

# Common Unsplash photo IDs for fish (as fallback)
UNSPLASH_FISH_IDS = [
    "1559489282-4b8a1b50b8a0",  # Generic fish
    "1560365163-3bfb38dae1a0",  # Koi fish
    "1524706160-6f6a9672e5c4",  # Tropical fish
    "1544551272-6e5f5e6d5b5a",  # Goldfish
    "1535595305-6e5f5e6d5b5a",  # Betta fish
]

class FishImageDownloader:
    def __init__(self, download_dir="fish_images", max_workers=3):
        self.download_dir = download_dir
        self.max_workers = max_workers
        self.lock = Lock()
        self.downloaded_count = 0
        self.failed_count = 0
        self.excluded_count = 0
        self.downloaded_urls = set()  # Track downloaded URLs to avoid duplicates
        
        # Create download directory
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
    
    def is_excluded(self, fish_name):
        """Check if a fish name should be excluded"""
        fish_lower = fish_name.lower()
        return any(excluded in fish_lower for excluded in EXCLUDED_PATTERNS)
    
    def download_from_fish_api(self, fish_type):
        """Try to download from FishWatch.gov API"""
        try:
            # FishWatch API endpoint
            url = f"https://www.fishwatch.gov/api/species/{fish_type.replace(' ', '-')}"
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data and isinstance(data, list) and len(data) > 0:
                    # Try to get image from the response
                    if 'Image Gallery' in data[0]:
                        for image in data[0]['Image Gallery']:
                            if 'src' in image:
                                img_url = image['src']
                                if self.download_single_image(img_url, fish_type):
                                    return True
            return False
        except Exception as e:
            return False
    
    def download_from_fish_base(self, fish_type):
        """Try to download from FishBase"""
        try:
            # Construct FishBase image URL
            scientific_name = fish_type.replace(' ', '_').lower()
            url = f"https://fishbase.org/images/species/{scientific_name}_u0.jpg"
            
            if self.download_single_image(url, fish_type):
                return True
            
            # Try alternative naming
            url = f"https://fishbase.org/images/species/{scientific_name}_m0.jpg"
            return self.download_single_image(url, fish_type)
        except Exception as e:
            return False
    
    def download_from_flickr(self, fish_type):
        """Try to download from Flickr (using public feeds)"""
        try:
            # Use Flickr's public feed
            url = f"https://www.flickr.com/services/feeds/photos_public.gne?tags={fish_type.replace(' ', ',')},fish&format=json&nojsoncallback=1"
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'items' in data and len(data['items']) > 0:
                    # Try to get a medium-sized image
                    for item in data['items']:
                        if 'media' in item and 'm' in item['media']:
                            img_url = item['media']['m'].replace('_m.jpg', '_b.jpg')  # Try for larger image
                            if self.download_single_image(img_url, fish_type):
                                return True
            return False
        except Exception as e:
            return False
    
    def download_from_unsplash_fallback(self, fish_type):
        """Use Unsplash with known photo IDs as fallback"""
        try:
            # Use random known Unsplash photo IDs for fish
            photo_id = random.choice(UNSPLASH_FISH_IDS)
            url = f"https://images.unsplash.com/photo-{photo_id}?w=800&h=600&fit=crop&auto=format"
            
            if self.download_single_image(url, fish_type):
                return True
            return False
        except Exception as e:
            return False
    
    def download_single_image(self, url, fish_type, retries=2):
        """Download a single image from URL"""
        if url in self.downloaded_urls:
            return False
        
        for attempt in range(retries):
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Connection': 'keep-alive',
                }
                
                req = Request(url, headers=headers)
                with urlopen(req, timeout=15) as response:
                    if response.status == 200:
                        image_data = response.read()
                        
                        # Verify it's actually an image
                        try:
                            img = Image.open(io.BytesIO(image_data))
                            img.verify()  # Verify it's a valid image
                            
                            # Check minimum size
                            if len(image_data) < 5000:
                                return False
                            
                            # Generate unique filename
                            timestamp = int(time.time())
                            random_id = random.randint(1000, 9999)
                            url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                            filename = f"{fish_type.replace(' ', '_')}_{timestamp}_{random_id}_{url_hash}.jpg"
                            filepath = os.path.join(self.download_dir, filename)
                            
                            # Save the image
                            with open(filepath, 'wb') as f:
                                f.write(image_data)
                            
                            with self.lock:
                                self.downloaded_count += 1
                                self.downloaded_urls.add(url)
                                print(f"✓ Downloaded: {filename} ({self.downloaded_count}/400)")
                            
                            return True
                            
                        except Exception as e:
                            return False
                            
            except Exception as e:
                if attempt < retries - 1:
                    time.sleep(2 ** attempt)  # Exponential backoff
                continue
        
        return False
    
    def download_image(self, fish_type):
        """Try multiple sources to download an image"""
        if self.is_excluded(fish_type):
            with self.lock:
                self.excluded_count += 1
            return False
        
        # Try sources in order
        sources = [
            self.download_from_fish_api,
            self.download_from_fish_base,
            self.download_from_flickr,
            self.download_from_unsplash_fallback,
        ]
        
        # Shuffle sources for variety
        random.shuffle(sources)
        
        for source in sources:
            try:
                if source(fish_type):
                    return True
                time.sleep(0.5)  # Small delay between sources
            except Exception as e:
                continue
        
        with self.lock:
            self.failed_count += 1
            if self.failed_count <= 20:  # Show first 20 failures
                print(f"✗ Failed to download {fish_type} from all sources")
        
        return False
    
    def download_batch(self, target_count=400):
        """Download multiple images"""
        print(f"Starting download of {target_count} fish images to '{self.download_dir}'")
        print(f"Excluding: {', '.join(EXCLUDED_PATTERNS)}")
        print("-" * 60)
        
        # Filter out excluded fish
        valid_fish = [f for f in FISH_TYPES if not self.is_excluded(f)]
        
        if not valid_fish:
            print("Error: No valid fish types after exclusions!")
            return
        
        print(f"Will attempt to download images for {len(valid_fish)} fish types")
        print("-" * 60)
        
        # Create a queue of download tasks
        download_queue = []
        
        # Generate download tasks
        attempts_per_fish = target_count // len(valid_fish) + 5  # Add buffer
        
        for fish_type in valid_fish:
            for i in range(attempts_per_fish):
                download_queue.append(fish_type)
        
        # Shuffle for randomness
        random.shuffle(download_queue)
        
        # Download using thread pool
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            
            for fish_type in download_queue:
                if self.downloaded_count >= target_count:
                    break
                
                future = executor.submit(self.download_image, fish_type)
                futures.append(future)
                time.sleep(0.3)  # Delay between submissions
            
            # Wait for completion
            for future in concurrent.futures.as_completed(futures):
                if self.downloaded_count >= target_count:
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
    
    def get_stats(self):
        """Print download statistics"""
        print("\n" + "=" * 60)
        print("DOWNLOAD COMPLETE")
        print("=" * 60)
        print(f"Target: 400 images")
        print(f"Successfully downloaded: {self.downloaded_count} images")
        print(f"Failed downloads: {self.failed_count}")
        print(f"Excluded fish (skipped): {self.excluded_count}")
        print(f"Images saved in: {os.path.abspath(self.download_dir)}")
        
        # List files in directory
        if os.path.exists(self.download_dir):
            files = [f for f in os.listdir(self.download_dir) 
                    if f.lower().endswith(('.jpg', '.jpeg', '.png', '.gif'))]
            print(f"\nTotal image files in directory: {len(files)}")
            
            if len(files) > 0:
                print("\nSample of downloaded files:")
                for f in sorted(files)[:5]:
                    print(f"  - {f}")
                
                # Check fish variety
                fish_types_downloaded = set()
                for f in files:
                    parts = f.split('_')
                    if len(parts) > 0:
                        fish_types_downloaded.add(parts[0])
                
                print(f"\nUnique fish types downloaded: {len(fish_types_downloaded)}")
                
                if len(files) < 400:
                    print(f"\n⚠ Only downloaded {len(files)} images. Try running again for more.")
                    print("Tip: Different fish types might work better at different times")
                else:
                    print(f"\n✓ Successfully downloaded at least 400 images!")
        else:
            print(f"\n⚠ Download directory not found!")

def main():
    parser = argparse.ArgumentParser(description='Download random fish images')
    parser.add_argument('--count', type=int, default=400,
                       help='Number of images to download (default: 400)')
    parser.add_argument('--dir', type=str, default='fish_images',
                       help='Directory to save images (default: fish_images)')
    parser.add_argument('--workers', type=int, default=3,
                       help='Number of concurrent downloads (default: 3 - be gentle with servers)')
    
    args = parser.parse_args()
    
    print("Fish Image Downloader")
    print("=" * 60)
    print("This script will attempt to download fish images from multiple sources")
    print("Please be patient as this may take 10-20 minutes")
    print("=" * 60)
    
    # Create downloader and start download
    downloader = FishImageDownloader(
        download_dir=args.dir,
        max_workers=args.workers
    )
    
    try:
        downloader.download_batch(target_count=args.count)
    except KeyboardInterrupt:
        print("\n\nDownload interrupted by user")
    finally:
        downloader.get_stats()
        
        # Provide instructions for CSV creator
        print("\n" + "=" * 60)
        print("NEXT STEPS:")
        print("=" * 60)
        print("1. After downloading images, run your CSV creator script again")
        print("2. The CSV creator will now have fish images to work with")
        print("3. If you still get 'not_fish' errors, you need to:")
        print("   - Create a 'not_fish' folder with non-fish images")
        print("   - Or modify the CSV creator to work without non-fish images")

if __name__ == "__main__":
    main()