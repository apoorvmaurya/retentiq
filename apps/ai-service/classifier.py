import os
import pickle
import numpy as np
from typing import List
from lightgbm import LGBMClassifier

class ChurnClassifier:
    def __init__(self, model_path="churn_model.pkl"):
        # Put the model file inside the current directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_path = os.path.join(current_dir, model_path)
        self.model = None
        self.explainer = None
        self.feature_names = [
            "login_frequency_30d",
            "login_frequency_14d",
            "login_frequency_7d",
            "feature_adoption_score",
            "usage_trend",
            "days_since_last_login",
            "support_ticket_volume",
            "support_sentiment_score",
            "billing_events",
            "onboarding_time",
            "nps_csat_score",
            "renewal_proximity"
        ]

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
        
        # Fit classifier using LightGBM
        self.model = LGBMClassifier(n_estimators=100, learning_rate=0.1, max_depth=3, random_state=42, verbose=-1)
        self.model.fit(X, y)
        
        # Initialize and cache SHAP explainer
        try:
            import shap
            self.explainer = shap.TreeExplainer(self.model)
            print("[SHAP] Explainer cached successfully during model training.")
        except Exception as se:
            print(f"[SHAP] Failed to initialize explainer during training: {se}")
            
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
                # Initialize and cache SHAP explainer
                try:
                    import shap
                    self.explainer = shap.TreeExplainer(self.model)
                    print("[SHAP] Explainer cached successfully during model loading.")
                except Exception as se:
                    print(f"[SHAP] Failed to initialize explainer during model loading: {se}")
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

    def get_shap_values(self, features_dict: dict) -> dict:
        """Computes SHAP values for the given customer features."""
        if not self.model:
            if not self.load_model():
                self.train_model()
                
        # If explainer is still not initialized, try initializing it
        if not self.explainer:
            try:
                import shap
                self.explainer = shap.TreeExplainer(self.model)
            except Exception as se:
                print(f"[SHAP] Failed to initialize explainer in get_shap_values: {se}")
                return {name: 0.0 for name in self.feature_names}
                
        try:
            # Prepare features as numpy array in the exact correct order
            feature_values = np.array([[
                float(features_dict.get("login_frequency_30d", 0.0)),
                float(features_dict.get("login_frequency_14d", 0.0)),
                float(features_dict.get("login_frequency_7d", 0.0)),
                float(features_dict.get("feature_adoption_score", 0.0)),
                float(features_dict.get("usage_trend", 0.0)),
                float(features_dict.get("days_since_last_login", 0)),
                float(features_dict.get("support_ticket_volume", 0)),
                float(features_dict.get("support_sentiment_score", 0.0)),
                float(features_dict.get("billing_events", 0)),
                float(features_dict.get("onboarding_time", 0.0)),
                float(features_dict.get("nps_csat_score", 0.0)),
                float(features_dict.get("renewal_proximity", 0.0))
            ]])
            
            # Run explainer
            shap_vals = self.explainer.shap_values(feature_values)
            
            # Handle list/array structure of shap_vals returned by TreeExplainer for LightGBM
            if isinstance(shap_vals, list):
                customer_shap = shap_vals[1][0]
            elif len(shap_vals.shape) == 3:
                customer_shap = shap_vals[0, :, 1]
            elif len(shap_vals.shape) == 2:
                customer_shap = shap_vals[0]
            else:
                customer_shap = shap_vals
                
            return {name: float(val) for name, val in zip(self.feature_names, customer_shap)}
        except Exception as e:
            print(f"[SHAP] Error computing SHAP values: {e}")
            return {name: 0.0 for name in self.feature_names}

    def predict_churn_batch(self, features_list: List[dict]) -> List[float]:
        """Predicts churn probabilities for a list of feature dicts in a batch."""
        if not self.model:
            if not self.load_model():
                self.train_model()
        if not features_list:
            return []
            
        X = np.array([[
            float(f.get("login_frequency_30d", 0.0)),
            float(f.get("login_frequency_14d", 0.0)),
            float(f.get("login_frequency_7d", 0.0)),
            float(f.get("feature_adoption_score", 0.0)),
            float(f.get("usage_trend", 0.0)),
            float(f.get("days_since_last_login", 0)),
            float(f.get("support_ticket_volume", 0)),
            float(f.get("support_sentiment_score", 0.0)),
            float(f.get("billing_events", 0)),
            float(f.get("onboarding_time", 0.0)),
            float(f.get("nps_csat_score", 0.0)),
            float(f.get("renewal_proximity", 0.0))
        ] for f in features_list])
        
        try:
            probs = self.model.predict_proba(X)[:, 1]
            return [float(max(0.0, min(1.0, p))) for p in probs]
        except Exception as e:
            print(f"[sklearn] Batch prediction failed: {e}. Using default fallbacks.")
            return [0.50] * len(features_list)

    def get_shap_values_batch(self, features_list: List[dict]) -> List[dict]:
        """Computes SHAP values for a batch of customer features using TreeExplainer batch inference."""
        if not self.model:
            if not self.load_model():
                self.train_model()
        if not features_list:
            return []
            
        if not self.explainer:
            try:
                import shap
                self.explainer = shap.TreeExplainer(self.model)
            except Exception as se:
                print(f"[SHAP] Failed to initialize explainer in get_shap_values_batch: {se}")
                return [{name: 0.0 for name in self.feature_names} for _ in features_list]
                
        try:
            X = np.array([[
                float(f.get("login_frequency_30d", 0.0)),
                float(f.get("login_frequency_14d", 0.0)),
                float(f.get("login_frequency_7d", 0.0)),
                float(f.get("feature_adoption_score", 0.0)),
                float(f.get("usage_trend", 0.0)),
                float(f.get("days_since_last_login", 0)),
                float(f.get("support_ticket_volume", 0)),
                float(f.get("support_sentiment_score", 0.0)),
                float(f.get("billing_events", 0)),
                float(f.get("onboarding_time", 0.0)),
                float(f.get("nps_csat_score", 0.0)),
                float(f.get("renewal_proximity", 0.0))
            ] for f in features_list])
            
            # TreeExplainer is batch-native
            shap_vals = self.explainer.shap_values(X)
            
            if isinstance(shap_vals, list):
                customer_shaps = shap_vals[1]
            elif len(shap_vals.shape) == 3:
                customer_shaps = shap_vals[:, :, 1]
            elif len(shap_vals.shape) == 2:
                customer_shaps = shap_vals
            else:
                customer_shaps = shap_vals
                
            batch_results = []
            for i in range(len(features_list)):
                sample_shap = customer_shaps[i]
                sample_dict = {name: float(val) for name, val in zip(self.feature_names, sample_shap)}
                batch_results.append(sample_dict)
                
            return batch_results
        except Exception as e:
            print(f"[SHAP] Error computing batch SHAP values: {e}")
            return [{name: 0.0 for name in self.feature_names} for _ in features_list]

