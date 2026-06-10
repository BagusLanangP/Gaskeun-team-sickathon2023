import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import urllib.request
import io

# Google Sheet CSV URL
SHEET_URL = 'https://docs.google.com/spreadsheets/d/1RPLu_giMGLKn713muVT1AY8uM42GCwKKtnSC9ExUk6Q/export?format=csv'

def clean_price(price_str):
    if not isinstance(price_str, str):
        return 0.0
    # Clean Indonesian currency format: e.g. "Rp5.022.000,00" -> 5022000.0
    cleaned = price_str.replace('Rp', '').replace('.', '').replace(',', '.').strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0

def load_and_preprocess_data():
    """Loads and preprocesses the Bali Hotel dataset from Google Sheets."""
    try:
        # Request with headers to avoid user-agent blocks
        req = urllib.request.Request(
            SHEET_URL, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req) as response:
            csv_data = response.read().decode('utf-8')
        df = pd.read_csv(io.StringIO(csv_data))
    except Exception as e:
        print(f"Error loading sheet online: {e}. Falling back to empty mockup dataframe.")
        # Mock dataframe in case of network issues
        df = pd.DataFrame(columns=['Hotel Name', 'Original price', 'Price after discount', 'Tax', 'Rating', 'location'])
    
    # Process numeric price columns
    df['original_price_clean'] = df['Original price'].apply(clean_price)
    df['price_discount_clean'] = df['Price after discount'].apply(clean_price)
    
    # Calculate discount percentage
    df['discount_percentage'] = 0.0
    mask = df['original_price_clean'] > 0
    df.loc[mask, 'discount_percentage'] = (
        (df.loc[mask, 'original_price_clean'] - df.loc[mask, 'price_discount_clean']) 
        / df.loc[mask, 'original_price_clean']
    ) * 100.0
    
    # Ensure rating is float
    df['Rating'] = pd.to_numeric(df['Rating'], errors='coerce').fillna(5.0)
    
    # Clean location strings
    df['location'] = df['location'].fillna('Unknown, Bali').str.strip()
    
    return df

def calculate_topsis(df, w_price=0.4, w_rating=0.4, w_discount=0.2):
    """
    Ranks hotels using the TOPSIS method.
    Criteria:
      1. Price after discount (Cost - we want to minimize it)
      2. Rating (Benefit - we want to maximize it)
      3. Discount Percentage (Benefit - we want to maximize it)
    """
    # Exclude hotels with zero price to avoid division errors
    sub_df = df[df['price_discount_clean'] > 0].copy()
    if sub_df.empty:
        return df.assign(topsis_score=0.0, topsis_rank=1)
        
    # Criteria matrix
    matrix = sub_df[['price_discount_clean', 'Rating', 'discount_percentage']].values
    
    # 1. Normalize the decision matrix
    norm_matrix = np.zeros_like(matrix, dtype=float)
    for j in range(3):
        col_sum = np.sqrt(np.sum(matrix[:, j] ** 2))
        if col_sum > 0:
            norm_matrix[:, j] = matrix[:, j] / col_sum
        else:
            norm_matrix[:, j] = 0.0
            
    # 2. Weighted normalized matrix
    weights = np.array([w_price, w_rating, w_discount])
    # Normalize weights so they sum to 1
    if np.sum(weights) > 0:
        weights = weights / np.sum(weights)
    weighted_matrix = norm_matrix * weights
    
    # 3. Find Ideal Positive (A*) and Ideal Negative (A-)
    # price: minimize (idx 0), rating: maximize (idx 1), discount: maximize (idx 2)
    ideal_positive = np.array([
        np.min(weighted_matrix[:, 0]),
        np.max(weighted_matrix[:, 1]),
        np.max(weighted_matrix[:, 2])
    ])
    ideal_negative = np.array([
        np.max(weighted_matrix[:, 0]),
        np.min(weighted_matrix[:, 1]),
        np.min(weighted_matrix[:, 2])
    ])
    
    # 4. Calculate Euclidean distance from Ideal Positive (S*) and Ideal Negative (S-)
    s_positive = np.sqrt(np.sum((weighted_matrix - ideal_positive) ** 2, axis=1))
    s_negative = np.sqrt(np.sum((weighted_matrix - ideal_negative) ** 2, axis=1))
    
    # 5. Calculate relative closeness (Performance Score)
    closeness = np.zeros_like(s_positive)
    sum_s = s_positive + s_negative
    mask = sum_s > 0
    closeness[mask] = s_negative[mask] / sum_s[mask]
    
    sub_df['topsis_score'] = closeness
    # Rank descending (highest score is 1st rank)
    sub_df['topsis_rank'] = sub_df['topsis_score'].rank(ascending=False, method='min').astype(int)
    
    # Merge back to original dataframe (for any zero-priced items)
    result_df = pd.merge(
        df, 
        sub_df[['Hotel Name', 'topsis_score', 'topsis_rank']], 
        on='Hotel Name', 
        how='left'
    )
    result_df['topsis_score'] = result_df['topsis_score'].fillna(0.0)
    result_df['topsis_rank'] = result_df['topsis_rank'].fillna(len(result_df)).astype(int)
    
    return result_df

def get_kmeans_clusters(df, n_clusters=4):
    """
    Groups hotels using K-Means clustering on clean price and rating.
    Also dynamically labels clusters as 'Budget', 'Luxury', etc. based on cluster centroids.
    """
    sub_df = df[df['price_discount_clean'] > 0].copy()
    if sub_df.empty:
        return df.assign(cluster_id=0, cluster_name='Standard')
        
    features = sub_df[['Rating', 'price_discount_clean']]
    scaler = StandardScaler()
    scaled_features = scaler.fit_transform(features)
    
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init='auto')
    sub_df['cluster_id'] = kmeans.fit_predict(scaled_features)
    
    # Analyze centroids to name clusters
    # We find avg rating and price of each cluster
    cluster_stats = sub_df.groupby('cluster_id')[['Rating', 'price_discount_clean']].mean()
    
    # Sort clusters by price to help label them
    sorted_by_price = cluster_stats.sort_values(by='price_discount_clean').index.tolist()
    sorted_by_rating = cluster_stats.sort_values(by='Rating').index.tolist()
    
    # Assign semantic labels
    # E.g. Lowest price cluster -> Budget
    # Highest price cluster -> Luxury Retreats
    # Higher rating but moderate/low price -> Best Value Deals
    # Lower rating but high price -> Overpriced
    labels = {}
    
    # Find luxury (highest price)
    luxury_id = sorted_by_price[-1]
    labels[luxury_id] = "Luxury Retreats"
    
    # Find budget (lowest price)
    budget_id = sorted_by_price[0]
    labels[budget_id] = "Budget Friendly"
    
    remaining = [cid for cid in range(n_clusters) if cid not in labels]
    
    # Of remaining, compare rating/price ratio
    for cid in remaining:
        rating = cluster_stats.loc[cid, 'Rating']
        price = cluster_stats.loc[cid, 'price_discount_clean']
        # If rating is high, call it Premium Value, else Mid-range Standard
        if rating >= 8.2:
            labels[cid] = "Premium Value Deals"
        else:
            labels[cid] = "Mid-range Standard"
            
    sub_df['cluster_name'] = sub_df['cluster_id'].map(labels)
    
    # Merge back to original dataframe
    result_df = pd.merge(
        df,
        sub_df[['Hotel Name', 'cluster_id', 'cluster_name']],
        on='Hotel Name',
        how='left'
    )
    result_df['cluster_id'] = result_df['cluster_id'].fillna(-1).astype(int)
    result_df['cluster_name'] = result_df['cluster_name'].fillna('Unclassified')
    
    return result_df

def get_price_prediction_model(df):
    """
    Fits a simple Linear Regression pipeline to estimate price based on location and rating.
    """
    # Clean location names a bit to group rare locations
    loc_counts = df['location'].value_counts()
    frequent_locs = loc_counts[loc_counts >= 3].index
    
    df_fit = df.copy()
    df_fit['location_grouped'] = df_fit['location'].apply(
        lambda x: x if x in frequent_locs else 'Other, Bali'
    )
    
    X = df_fit[['Rating', 'location_grouped']]
    y = df_fit['price_discount_clean']
    
    # Preprocessor for categories
    preprocessor = ColumnTransformer(
        transformers=[
            ('cat', OneHotEncoder(handle_unknown='ignore'), ['location_grouped'])
        ],
        remainder='passthrough'
    )
    
    pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', LinearRegression())
    ])
    
    pipeline.fit(X, y)
    return pipeline, frequent_locs
