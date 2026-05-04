# Fish Zone Depth Analysis - Important Findings

## Key Discovery: Model Does NOT Use Depth for Predictions

### Current Model Features:
The trained Random Forest model makes predictions using **ONLY** these 6 features:
1. **Latitude** (lat)
2. **Longitude** (lon)
3. **Sea Surface Temperature** (sst)
4. **Chlorophyll-a** (chlor_a)
5. **Ocean Current U component** (water_u - East/West)
6. **Ocean Current V component** (water_v - North/South)

**❌ Bathymetry/Depth is NOT used as a prediction feature**

### Why Shallow Zones Show High Fish Probability

Your observation of 13.5m depth showing 99% fish probability is **correct but misleading**:
- The depth shown is the **seafloor depth at that location**
- Fish are not necessarily at 13.5m depth - they could be anywhere in that water column
- The high probability is due to **favorable SST, chlorophyll, and current patterns** at that location
- Correlation analysis confirms: Bathymetry correlation with fish_probability = **0.062** (essentially zero)

### Current Predictions Show:

**High Probability Zones (>70%):**
- Depth Range: 9.6m to 2,225m (very wide range!)
- Average Depth: 307m
- Count: 47 zones

**Top 5 Predicted Zones:**
1. 100% probability at **2,225m** depth (deep water)
2. 99.7% probability at **1,942m** depth (deep water)
3. 99% probability at **21.6m** depth (shallow)
4. 99% probability at **13.5m** depth (very shallow) ← Your example
5. 99% probability at **2,225m** depth (deep water)

### Real-World Ideal Depths for Tuna/Billfish

**Yellowfin Tuna:**
- Preferred: 50-250m
- Can dive to: 1,000m
- Often found: Thermocline depth (100-200m)

**Skipjack Tuna:**
- Preferred: 0-260m
- Typically: Surface to 150m
- Surface feeder but dives for food

**Bigeye Tuna:**
- Preferred: 100-400m
- Can dive to: 1,500m
- Deeper water specialist

**Marlin (Billfish):**
- Preferred: 0-200m
- Often found: Near thermocline (50-150m)
- Surface to mid-water hunter

### The Problem

The model **cannot distinguish between:**
- A shallow continental shelf (13.5m) with good conditions
- A deep oceanic zone (2,225m) with good conditions

Both show high probability because they have favorable:
- SST (27-29°C - ideal for tuna)
- Chlorophyll patterns
- Ocean currents

But the **actual fishing depths** would be different:
- At the 13.5m location: Fish might be at 5-13m (near bottom)
- At the 2,225m location: Fish might be at 50-300m (mid-water column)

### Recommendation

To make the model depth-aware, you would need to:

1. **Retrain the model** including bathymetry as a feature:
   ```python
   FEATURE_COLUMNS = [
       "lat", "lon", "sst", "chlor_a", 
       "water_u", "water_v", 
       "depth"  # Add this
   ]
   ```

2. **Use training data** that includes depth information where fish were actually caught

3. **Add depth preferences** to the UI to help fishermen understand:
   - Seafloor depth at location
   - Recommended fishing depth based on target species
   - Thermocline depth (where temperature changes rapidly)

### Current Interpretation

When you see a zone with:
- **13.5m depth + 99% probability**

This means:
- ✅ Good environmental conditions at this **location**
- ✅ Historical fish presence at this **location**
- ❌ Does NOT mean fish are exactly at 13.5m
- ❌ Does NOT account for whether species prefers shallow/deep water

The model is location-based, not depth-based.
