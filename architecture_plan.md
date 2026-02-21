# Real Estate Story: A Ghibli-Inspired Rental Journey

## 1. Overview & Prize Strategy
This project transforms a standard real estate dashboard into a beautiful, emotionally engaging storytelling experience inspired by Studio Ghibli. We target maximum impact by aiming for:
- **Best Overall & Best UI/UX**: Cinematic, narrative-driven interface.
- **Financial Solutions / AI & Analytics**: Multi-agent time-series analysis (ZORI/ZORDI) to predict fair value and true living costs.
- **ADP Challenge (Hack the Sales Journey)**: Negotiation engine to find fair compromise between buyer and seller.
- **MLH Special Prizes**: Vultr (Hosting), Gemini (Unstructured data analysis), ElevenLabs (Voiceovers).

## 2. Technical Architecture
- **Frontend Layer**: Next.js / React (styled with soft, watercolor CSS glassmorphism: Spirited Meadow `#A6D784`, Castle Sky `#8FB1E9`). Custom Ghibli-inspired UI.
- **Backend Layer**: FastAPI hosted on Vultr cloud instance. Exposes a single analysis endpoint.
- **Multi-Agent Layer**: Modular Python components orchestrating the analysis.
- **Data Layer**: Zillow (historical market data) and Kaggle (NJ property listings) stored on Vultr server.

## 3. Data Sources Needed
- **Rental Listings**: ~500 NJ properties (Middlesex & Monmouth counties) from Kaggle.
- **Zillow Observed Rent Index (ZORI)**: Typical market rate to assess if property is over/undervalued.
- **Zillow Observed Renter Demand Index (ZORDI)**: Market engagement to assess negotiation room.
- **Zillow Observed Rent Forecast (ZORF)**: Future rent forecasts.
- **Affordability Metrics**: New Renter Income Needed (< 30% monthly income), New Renter Affordability.

## 4. The Cinematic User Journey (User Flow)
1. **Landing Page**: Soft pastel screen. Prompt: *"Enter a New Jersey address to begin your journey."*
2. **Analysis**: User types address (e.g., `123 Main St, Edison, NJ`), clicks *"Begin the Journey."*
3. **The Agents Reveal**: The frontend stitches insights into a cohesive, magical experience, presenting 5 distinct characters.
4. **Conclusion**: Final verdict and synthesis from the main conductor character.

## 5. Multi-Agent Intelligence Layer
Each agent evaluates a different aspect of the property and is personified by a unique Ghibli-inspired character.

### 1. The Commute Agent (The Train Conductor)
* **Role**: Computes travel time and converts to a Commute Score (0-100).
* **Vibe**: Punctual, rhythmic, slightly obsessed with clocks (Spirited Away / Polar Express).
* **Quote**: *"Tickets, please! The iron horse waits for no one. I’ve calculated your trek to campus—it’s a brisk 20-minute whistle-stop. Any longer and you’d be better off flying a broomstick! Here is your punctuality rating."*

### 2. The Budget Fit Agent (The Star-Steward)
* **Role**: Compares rent to budget, outputs a Budget Score (0-100).
* **Vibe**: Practical, no-nonsense manager, protective of your "gold" (Lin from Spirited Away).
* **Quote**: *"Listen, kid—you can't live on roasted newts alone. I’ve looked at your coin purse and compared it to this rent. It’s a tight squeeze, but we can make it work if you're frugal. Don't let the shiny lights fool you; stick to the budget score I’ve set."*

### 3. The Market Fairness Agent (The Antique Shop Keeper)
* **Role**: Evaluates ZORI/ZORDI for expected rent and percentile position. Outputs Fairness Score (0-100).
* **Vibe**: Sophisticated, incredibly knowledgeable about true value (The Baron from Whisper of the Heart).
* **Quote**: *"Many things in this world are overpriced illusions. I have consulted the Great Ledger of Zillow to see if this landlord is being truthful. This rent is [Fair/Unfair]. A true craftsman knows the value of a roof; don't pay for gold when they're selling you brass."*

### 4. The Neighborhood Agent (The Delivery Witch)
* **Role**: Scores crime, groceries, gyms, and walkability (0-100).
* **Vibe**: Observant, community-oriented, breezy (Kiki from Kiki's Delivery Service).
* **Quote**: *"I just did a fly-over of the block! There’s a grocery store just two streets down, and the walk to the gym is lovely this time of year. It’s a peaceful neighborhood—hardly any 'stray spirits' wandering around. Check my map for the local pulse!"*

### 5. The Hidden Cost Agent (The Boiler Room Spider)
* **Role**: Investigates parking, utilities, and fees. Outputs Transparency Score (0-100).
* **Vibe**: Detail-oriented, grumbly investigator (Kamaji's helpers in Spirited Away).
* **Quote**: *"You see the chimney, but you forget the soot! I’ve crawled through the fine print—parking fees, utility spirits, and secret taxes. They tried to hide them, but nothing escapes my six eyes. Here is the transparency score; look closely before you sign!"*

### Final Synthesis (The Boiler Man)
* **Role**: Aggregates all insights into a definitive summary and map-ready data.
* **Vibe**: Grumpy but kind-hearted, efficient, all-knowing (Kamaji from Spirited Away).
* **Quote**: *"I’ve pulled all the threads together. New Jersey is a big place, but I’ve mapped it out just for you. Here is the summary of your journey, from the deepest roots to the highest peaks. Take this map—it’s everything you need to find your way home."*

## 6. Backend / Frontend Data Flow
1. **Frontend**: Captures address input -> sends to Backend.
2. **Backend**: Looks up Kaggle property -> matches Zillow neighborhood.
3. **Backend**: Runs all Agent pipelines.
4. **Backend**: Packages scores, metrics, and character text into a single cohesive JSON object.
5. **Frontend**: Receives JSON -> Animates characters and charts sequentially -> Presents the final magical story.
