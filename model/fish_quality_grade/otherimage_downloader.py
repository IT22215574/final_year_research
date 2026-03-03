import os
import requests
import time
import random
from threading import Lock
import concurrent.futures

# Object categories to download
OBJECT_CATEGORIES = {
    "vehicles": ["car", "truck", "bus", "motorcycle", "bicycle"],
    "humans": ["person", "people", "crowd", "pedestrian"],
    "buildings": ["building", "house", "skyscraper", "office building"],
    "books": ["book", "bookshelf", "library", "reading"],
    "pens": ["pen", "pencil", "stationery", "writing instrument"]
}

# Excluded categories (if any)
EXCLUDED = []

class MultiObjectDownloader:
    def __init__(self, base_dir="object_datasets", max_workers=3):
        self.base_dir = base_dir
        self.max_workers = max_workers
        self.lock = Lock()
        self.downloaded = 0
        self.failed = 0
        
        # Create category directories
        for category in OBJECT_CATEGORIES.keys():
            os.makedirs(os.path.join(base_dir, category), exist_ok=True)
    
    def download_image(self, category, object_type, index):
        """Download image for specific object type"""
        try:
            # Try multiple sources
            sources = [
                f"https://source.unsplash.com/800x600/?{object_type}",
                f"https://loremflickr.com/800/600/{object_type}",
            ]
            
            url = random.choice(sources)
            headers = {'User-Agent': 'Mozilla/5.0'}
            
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code == 200 and len(response.content) > 5000:
                filename = f"{object_type}_{int(time.time())}_{index}.jpg"
                filepath = os.path.join(self.base_dir, category, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                with self.lock:
                    self.downloaded += 1
                    print(f"✓ [{category}] {filename} ({self.downloaded}/total)")
                return True
        except Exception as e:
            pass
        
        with self.lock:
            self.failed += 1
        return False
    
    def download_batch(self, images_per_category=100):
        """Download images for all categories"""
        total_target = len(OBJECT_CATEGORIES) * images_per_category
        print(f"Downloading {total_target} images across {len(OBJECT_CATEGORIES)} categories")
        print("-" * 60)
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = []
            
            for category, object_types in OBJECT_CATEGORIES.items():
                for i in range(images_per_category):
                    object_type = random.choice(object_types)
                    future = executor.submit(self.download_image, category, object_type, i)
                    futures.append(future)
                    time.sleep(0.2)
            
            for future in concurrent.futures.as_completed(futures):
                if self.downloaded >= total_target:
                    executor.shutdown(wait=False, cancel_futures=True)
                    break
    
    def print_stats(self):
        print("\n" + "=" * 60)
        print("DOWNLOAD COMPLETE")
        print("=" * 60)
        print(f"Successfully downloaded: {self.downloaded}")
        print(f"Failed: {self.failed}")
        
        for category in OBJECT_CATEGORIES.keys():
            cat_path = os.path.join(self.base_dir, category)
            if os.path.exists(cat_path):
                count = len([f for f in os.listdir(cat_path) 
                            if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
                print(f"  {category}: {count} images")

if __name__ == "__main__":
    downloader = MultiObjectDownloader(base_dir="multi_object_dataset")
    downloader.download_batch(images_per_category=100)  # 500 total images
    downloader.print_stats()