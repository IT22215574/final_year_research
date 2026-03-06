class ProfitabilityEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir

    def predict(self, data: dict):
        revenue = data["expectedCatchKg"] * data["marketPrice"]
        profit = revenue - data["predictedTotalCost"]

        prob = 0.8 if profit > 0 else 0.3
        risk = "low" if prob >= 0.7 else ("medium" if prob >= 0.45 else "high")

        return {
            "expectedRevenue": round(revenue, 2),
            "profit": round(profit, 2),
            "profitabilityProbability": prob,
            "riskCategory": risk
        }