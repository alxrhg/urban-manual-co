# Urban Manual Intelligence

Algorithm-first ML platform for travel intelligence. Built on Modal for serverless GPU compute.

## Architecture

```
intelligence/
├── modal_app.py          # Modal app configuration
├── algorithms/           # Core algorithms
│   ├── base.py          # Base interface (all algorithms implement this)
│   ├── taste_dna.py     # Learn user preferences
│   ├── forecaster.py    # Demand/trend prediction (TODO)
│   └── ranker.py        # Personalized ranking (TODO)
├── api/                  # Modal web endpoints
│   └── endpoints.py     # HTTP endpoints for Next.js
├── features/            # Feature engineering (TODO)
└── training/            # Training pipelines (TODO)
```

## Algorithms

### TasteDNA
Learns a user's unique taste signature from their behavior.

**Input**: Saved places, visited places, interactions
**Output**: 128-dim taste vector + archetype + interpretable dimensions

**Archetypes**:
- The Design Connoisseur
- The Hidden Gem Hunter
- The Michelin Chaser
- The Neighborhood Explorer
- The Budget Foodie
- The Luxury Seeker
- And more...

### Forecaster (TODO)
Predicts demand and trends using Prophet.

### Ranker (TODO)
Personalized destination ranking combining TasteDNA + destination features.

## Setup

### 1. Install Modal
```bash
pip install modal
modal setup  # Login to Modal
```

### 2. Set Secrets
In Modal dashboard, create a secret named `urban-manual-secrets` with:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Create Volume
```bash
modal volume create urban-manual-models
```

## Deployment

### Deploy all endpoints
```bash
cd intelligence
modal deploy api/endpoints.py
```

### Run locally for testing
```bash
modal serve api/endpoints.py
```

## API Endpoints

After deployment, you'll get URLs like:
- `https://your-app--predict-taste.modal.run` - Predict user taste
- `https://your-app--rank-destinations.modal.run` - Personalized ranking
- `https://your-app--get-trending.modal.run` - Trending destinations
- `https://your-app--health.modal.run` - Health check

### Example: Predict Taste
```bash
curl -X POST https://your-app--predict-taste.modal.run \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid-here"}'
```

### Example: Rank Destinations
```bash
curl -X POST https://your-app--rank-destinations.modal.run \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user-uuid-here",
    "destinations": ["narisawa", "blue-bottle-aoyama", "aman-tokyo"]
  }'
```

## Training

### Train TasteDNA model
```bash
curl -X POST https://your-app--train-taste-dna.modal.run \
  -H "Content-Type: application/json" \
  -d '{"days": 90}'
```

This will:
1. Fetch all user behavior from Supabase
2. Train the TasteDNA model
3. Save to Modal volume for persistence

## Integration with Next.js

Set environment variable:
```env
INTELLIGENCE_API_URL=https://your-app.modal.run
```

Then call from API routes:
```typescript
const response = await fetch(`${process.env.INTELLIGENCE_API_URL}/predict-taste`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ user_id: userId }),
});
```

## Adding New Algorithms

1. Create new file in `algorithms/`
2. Implement the `Algorithm` base class
3. Add Modal endpoint in `api/endpoints.py`
4. Deploy

```python
from algorithms.base import Algorithm, AlgorithmType

class MyAlgorithm(Algorithm[MyInput, MyOutput]):
    @property
    def algorithm_type(self) -> AlgorithmType:
        return AlgorithmType.MY_TYPE

    def train(self, data, **kwargs):
        # Training logic
        pass

    def predict(self, input_data):
        # Prediction logic
        pass

    def explain(self, input_data, prediction):
        # Explanation logic
        pass
```

## Cost Estimates

Modal pricing (pay-per-second):
- CPU: ~$0.000015/second
- GPU T4: ~$0.00045/second

Estimated monthly costs:
- Light usage (1000 predictions/day): ~$5-10
- Medium usage (10000 predictions/day): ~$30-50
- Heavy usage (100000 predictions/day): ~$200-300

## Future Algorithms

- [ ] Sequencer - Predict next destination
- [ ] Similarity - Deep similarity search
- [ ] Explainer - Generate natural language explanations
- [ ] Anomaly - Detect unusual patterns
- [ ] Bandit - A/B test optimization
