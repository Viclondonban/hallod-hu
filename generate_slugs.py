import os
import re
import logging
import unicodedata
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError(
        "SUPABASE_URL and SUPABASE_KEY must be set as environment variables. "
        "Run: export SUPABASE_URL=... SUPABASE_KEY=... before executing this script."
    )

# 🛡️ THE SHIELD: Slugs that podcasts are NOT allowed to use!
RESERVED_SLUGS = {
    "admin", "api", "category", "podcast", "podcasts", 
    "about", "contact", "login", "register", "search"
}

logging.basicConfig(level=logging.INFO, format="%(message)s")

def create_slug(title):
    # 1. Remove accents (á -> a, é -> e)
    slug = unicodedata.normalize('NFKD', title).encode('ascii', 'ignore').decode('utf-8')
    # 2. Convert to lowercase
    slug = slug.lower()
    # 3. Replace anything that isn't a letter or number with a dash
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    # 4. Remove leading/trailing dashes
    slug = slug.strip('-')
    return slug

def main():
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    logging.info("🔍 Fetching all podcasts to generate root slugs...")
    response = supabase.table("Podcast").select("id, title").execute()
    podcasts = response.data
    
    if not podcasts:
        return
        
    logging.info(f"🎯 Found {len(podcasts)} podcasts. Generating ultra-clean URLs...\n")
    
    used_slugs = set(RESERVED_SLUGS) 
    
    for i, pod in enumerate(podcasts, 1):
        base_slug = create_slug(pod['title'])
        
        if not base_slug:
            base_slug = "podcast"
            
        final_slug = base_slug
        counter = 1
        
        while final_slug in used_slugs:
            if counter == 1 and base_slug in RESERVED_SLUGS:
                final_slug = f"{base_slug}-podcast" 
            else:
                final_slug = f"{base_slug}-{counter}"
            counter += 1
            
        used_slugs.add(final_slug)
        
        supabase.table("Podcast").update({"slug": final_slug}).eq("id", pod['id']).execute()
        logging.info(f"[{i}/{len(podcasts)}] ✅ {pod['title']} -> hallod.hu/{final_slug}")
        
    logging.info("🎉 All super-clean root slugs generated successfully!")

if __name__ == "__main__":
    main()