import os, json
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
client = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])
res = client.table('listings').select('name,address,price,bedrooms').ilike('description', '%Drew University%').limit(5).execute()
with open('test_out.json', 'w') as f:
    json.dump(res.data, f, indent=2)
