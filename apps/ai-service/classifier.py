import os
import pickle
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier

class ChurnClassifier:
    def __init__(self, model_path="churn_model.pkl"):
        # Put the model file inside the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, model_path)
        self.model = None

    def train_model(self, supabase_client=None):
        """Trains a GradientBoostingClassifier on customer features."""
        X = []
        y = []
        
        real_data_loaded = False
        if supabase_client:
            try:
                # Query real customer records
                cust_res = supabase_client.table("customers").select("id, org_id, plan_tier").execute()
                customers = cust_res.data or []
                
                if len(customers) >= 20:
                    from feature_engine import compute_features
                    print(f"[sklearn] Querying features of {len(customers)} customers to train...")
                    for cust in customers:
                        cust_id = cust["id"]
                        org_id = cust["org_id"]
                        plan_tier = cust["plan_tier"]
                        
                        # Compute features for this customer
                        features = compute_features(cust_id, org_id, supabase_client)
                        
                        X.append([
                            features["login_frequency_30d"],
                            features["login_frequency_14d"],
                            features["login_frequency_7d"],
                            features["feature_adoption_score"],
                            features["usage_trend"],
                            features["days_since_last_login"],
                            features["support_ticket_volume"],
                            features["support_sentiment_score"],
                            features["billing_events"],
                            features["onboarding_time"],
                            features["nps_csat_score"],
                            features["renewal_proximity"]
                        ])
                        
                        # Label: 1 if plan_tier is 'churned', else 0
                        churn = 1 if plan_tier == "churned" else 0
                        y.append(churn)
                        
                    if len(np.unique(y)) >= 2:
                        real_data_loaded = True
                        print(f"[sklearn] Successfully loaded {len(X)} real customer feature vectors for training.")
                    else:
                        print(f"[sklearn] Real training data contains only 1 class: {np.unique(y)}. Falling back to synthetic baseline dataset to ensure model can train.")
                        X = []
                        y = []
            except Exception as e:
                print(f"[sklearn] Failed to load real training data: {e}.")

        if not real_data_loaded:
            # Fall back to loading pre-trained baseline model if it exists
            if self.load_model():
                print("[sklearn] Loading baseline model. Retraining skipped due to insufficient real customer data.")
                return
            
            # If baseline model does not exist on disk, generate synthetic baseline dataset to train on
            print("[sklearn] Baseline model not found. Generating synthetic baseline dataset for training...")
            np.random.seed(42)
            for _ in range(250):
                login_30d = np.random.uniform(0.0, 1.0)
                login_14d = login_30d * np.random.uniform(0.5, 1.2)
                login_7d = login_30d * np.random.uniform(0.5, 1.2)
                login_14d = float(np.clip(login_14d, 0.0, 1.0))
                login_7d = float(np.clip(login_7d, 0.0, 1.0))
                
                feat_adopt = float(np.random.uniform(0.0, 1.0))
                usage_trend = float(np.random.uniform(-1.0, 1.0))
                days_inactive = int(np.random.randint(0, 30)) if login_30d > 0.05 else 999
                tickets = int(np.random.randint(0, 15))
                sentiment = float(np.random.uniform(-1.0, 1.0))
                billing = int(np.random.randint(0, 5))
                onboarding = float(np.random.uniform(1.0, 45.0))
                nps = float(np.random.uniform(0.0, 10.0))
                renewal = float(np.random.uniform(0.0, 365.0))
                
                risk = 0.1
                if login_30d < 0.2: risk += 0.15
                if feat_adopt < 0.3: risk += 0.1
                if usage_trend < -0.2: risk += 0.1
                if days_inactive > 10: risk += 0.15
                if tickets > 5: risk += 0.1
                if sentiment < -0.2: risk += 0.1
                if billing > 1: risk += 0.15
                if onboarding > 20: risk += 0.05
                if nps < 6: risk += 0.1
                if renewal < 60: risk += 0.1
                    
                churn = 1 if (risk + np.random.normal(0, 0.05)) > 0.50 else 0
                
                X.append([
                    login_30d, login_14d, login_7d,
                    feat_adopt, usage_trend, days_inactive,
                    tickets, sentiment, billing,
                    onboarding, nps, renewal
                ])
                y.append(churn)

        X = np.array(X)
        y = np.array(y)
        
        # Fit classifier using GradientBoostingClassifier
        self.model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42)
        self.model.fit(X, y)
        
        # Save model to disk
        try:
            with open(self.model_path, "wb") as f:
                pickle.dump(self.model, f)
            print(f"[sklearn] Churn model trained and saved to {self.model_path}.")
        except Exception as e:
            print(f"[sklearn] Failed to save trained model: {e}")

    def load_model(self):
        """Loads a pre-trained model if it exists, returns True if loaded."""
        if os.path.exists(self.model_path):
            try:
                with open(self.model_path, "rb") as f:
                    self.model = pickle.load(f)
                print(f"[sklearn] Pre-trained churn model loaded successfully from {self.model_path}.")
                return True
            except Exception as e:
                print(f"[sklearn] Failed to load model: {e}")
        return False

    def predict_churn(self,
                      login_frequency_30d: float,
                      login_frequency_14d: float,
                      login_frequency_7d: float,
                      feature_adoption_score: float,
                      usage_trend: float,
                      days_since_last_login: int,
                      support_ticket_volume: int,
                      support_sentiment_score: float,
                      billing_events: int,
                      onboarding_time: float,
                      nps_csat_score: float,
                      renewal_proximity: float) -> float:
        """Predicts churn probability between 0.0 and 1.0 using Gradient Boosting Classifier."""
        if not self.model:
            if not self.load_model():
                self.train_model()
            
        features = np.array([[
            login_frequency_30d, login_frequency_14d, login_frequency_7d,
            feature_adoption_score, usage_trend, days_since_last_login,
            support_ticket_volume, support_sentiment_score, billing_events,
            onboarding_time, nps_csat_score, renewal_proximity
        ]])
        try:
            # predict_proba returns [prob_no_churn, prob_churn]
            prob = self.model.predict_proba(features)[0][1]
            # Ensure it is bounded
            return float(max(0.0, min(1.0, prob)))
        except Exception as e:
            print(f"[sklearn] Prediction failed: {e}. Using default fallback.")
            return 0.50

