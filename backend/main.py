from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from typing import Optional, List
import numpy as np

from backend.ml_utils import (
    load_and_preprocess_data, 
    calculate_topsis, 
    get_kmeans_clusters, 
    get_price_prediction_model
)
from backend.scraper import run_harvest

app = FastAPI(
    title="Bali Hotel Decision Support System API",
    description="Backend API providing TOPSIS DSS and Machine Learning insights for Bali Hotels",
    version="1.0.0"
)

# Enable CORS for React frontend (usually runs on port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In development, allow all. Change in production.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load global cache of data to avoid hammering Google Sheets on every request
# In production, you'd add caching/refresh intervals.
print("Loading Bali Hotel dataset...")
try:
    GLOBAL_DF = load_and_preprocess_data()
    PREDICTIVE_MODEL, FREQUENT_LOCATIONS = get_price_prediction_model(GLOBAL_DF)
    print(f"Dataset loaded successfully with {len(GLOBAL_DF)} entries.")
except Exception as e:
    print(f"Initialization failure: {e}")
    GLOBAL_DF = pd.DataFrame()
    PREDICTIVE_MODEL, FREQUENT_LOCATIONS = None, []

# API Models
class TopsisRequest(BaseModel):
    weight_price: float = 0.4
    weight_rating: float = 0.4
    weight_discount: float = 0.2

class PredictRequest(BaseModel):
    location: str
    rating: float

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Bali Hotel DSS API is running",
        "dataset_records": len(GLOBAL_DF)
    }

@app.get("/api/hotels")
def get_hotels(limit: Optional[int] = None):
    if GLOBAL_DF.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded")
    
    # Select columns to return to frontend
    subset = GLOBAL_DF[[
        'Hotel Name', 'location', 'Rating', 
        'Original price', 'Price after discount',
        'original_price_clean', 'price_discount_clean', 
        'discount_percentage', 'Tax'
    ]].copy()
    
    # Rename for cleaner JSON
    subset.columns = [
        'name', 'location', 'rating', 
        'original_price_str', 'price_discount_str',
        'original_price', 'price_discount', 
        'discount_percentage', 'tax_info'
    ]
    
    # Replace NaN or infinite values
    subset = subset.replace({np.nan: None, np.inf: None, -np.inf: None})
    
    records = subset.to_dict(orient='records')
    if limit:
        return records[:limit]
    return records

@app.get("/api/locations")
def get_locations():
    if GLOBAL_DF.empty:
        return []
    # Get sorted list of unique locations
    locs = sorted(GLOBAL_DF['location'].unique().tolist())
    return locs

@app.post("/api/topsis")
def get_topsis_rankings(req: TopsisRequest):
    if GLOBAL_DF.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded")
        
    ranked_df = calculate_topsis(
        GLOBAL_DF,
        w_price=req.weight_price,
        w_rating=req.weight_rating,
        w_discount=req.weight_discount
    )
    
    subset = ranked_df[[
        'Hotel Name', 'location', 'Rating',
        'original_price_clean', 'price_discount_clean',
        'discount_percentage', 'topsis_score', 'topsis_rank'
    ]].copy()
    
    subset.columns = [
        'name', 'location', 'rating',
        'original_price', 'price_discount',
        'discount_percentage', 'topsis_score', 'topsis_rank'
    ]
    
    # Sort by rank ascending
    subset = subset.sort_values(by='topsis_rank').replace({np.nan: None})
    return subset.to_dict(orient='records')

@app.get("/api/clusters")
def get_clusters(k: int = 4):
    if GLOBAL_DF.empty:
        raise HTTPException(status_code=500, detail="Dataset not loaded")
    
    clustered_df = get_kmeans_clusters(GLOBAL_DF, n_clusters=k)
    
    subset = clustered_df[[
        'Hotel Name', 'location', 'Rating',
        'original_price_clean', 'price_discount_clean',
        'discount_percentage', 'cluster_id', 'cluster_name'
    ]].copy()
    
    subset.columns = [
        'name', 'location', 'rating',
        'original_price', 'price_discount',
        'discount_percentage', 'cluster_id', 'cluster_name'
    ]
    
    subset = subset.replace({np.nan: None})
    records = subset.to_dict(orient='records')
    
    # Calculate some helper details for each cluster (centroids, sizes)
    summary = []
    grouped = clustered_df.groupby('cluster_id')
    for cid, group in grouped:
        if cid == -1: # Unclassified
            continue
        summary.append({
            "cluster_id": int(cid),
            "cluster_name": group['cluster_name'].iloc[0],
            "count": int(len(group)),
            "avg_price": float(group['price_discount_clean'].mean()),
            "avg_rating": float(group['Rating'].mean()),
            "avg_discount": float(group['discount_percentage'].mean())
        })
        
    return {
        "hotels": records,
        "summary": summary
    }

@app.post("/api/predict")
def predict_price(req: PredictRequest):
    if PREDICTIVE_MODEL is None:
        raise HTTPException(status_code=500, detail="Prediction model not available")
        
    # Check if location is supported, if not classify under 'Other, Bali'
    loc_grouped = req.location if req.location in FREQUENT_LOCATIONS else 'Other, Bali'
    
    input_data = pd.DataFrame([{
        'Rating': req.rating,
        'location_grouped': loc_grouped
    }])
    
    try:
        pred = PREDICTIVE_MODEL.predict(input_data)[0]
        # Keep prediction realistic (no negative prices)
        predicted_price = max(100000.0, float(pred))
        return {
            "requested_location": req.location,
            "grouped_location": loc_grouped,
            "rating": req.rating,
            "predicted_price": predicted_price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

class ScrapeRequest(BaseModel):
    num_items: int = 15

@app.post("/api/scrape")
def trigger_scraping(req: ScrapeRequest):
    try:
        # Trigger scraper script
        num_scraped = run_harvest(num_items=req.num_items)
        
        # Reload dataset and model cache with the new entries
        global GLOBAL_DF, PREDICTIVE_MODEL, FREQUENT_LOCATIONS
        GLOBAL_DF = load_and_preprocess_data()
        if not GLOBAL_DF.empty:
            PREDICTIVE_MODEL, FREQUENT_LOCATIONS = get_price_prediction_model(GLOBAL_DF)
        
        return {
            "status": "success",
            "message": f"Successfully scraped and merged {num_scraped} new hotels from Bali registry.",
            "total_records": len(GLOBAL_DF)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraper error: {str(e)}")
