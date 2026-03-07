import numpy as np
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List

class ProfitabilityEngine:
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.market_history_path = os.path.join(model_dir, "market_history.json")
        self._ensure_market_history()
        
    def _ensure_market_history(self):
        """Initialize market history file if it doesn't exist"""
        if not os.path.exists(self.market_history_path):
            initial_data = {
                "priceHistory": [],
                "seasonalPatterns": {
                    "monsoon": {"demandMultiplier": 0.8, "supplyMultiplier": 0.6},
                    "dry": {"demandMultiplier": 1.2, "supplyMultiplier": 1.1},
                    "inter_monsoon": {"demandMultiplier": 1.0, "supplyMultiplier": 1.0}
                },
                "marketVolatility": {
                    "low": 0.1,
                    "medium": 0.25,
                    "high": 0.4
                }
            }
            with open(self.market_history_path, "w") as f:
                json.dump(initial_data, f, indent=2)

    def predict(self, data: dict):
        """Enhanced profitability prediction with sophisticated risk modeling"""
        expected_catch = data["expectedCatchKg"]
        market_price = data["marketPrice"]
        predicted_cost = data["predictedTotalCost"]
        
        # Base revenue calculation
        base_revenue = expected_catch * market_price
        base_profit = base_revenue - predicted_cost
        
        # Load market data for sophisticated analysis
        with open(self.market_history_path, "r") as f:
            market_data = json.load(f)
        
        # 1. Market Risk Analysis
        market_risk = self._analyze_market_risk(market_price, market_data)
        
        # 2. Seasonal Adjustments
        seasonal_factor = self._calculate_seasonal_factor()
        adjusted_revenue = base_revenue * seasonal_factor
        adjusted_profit = adjusted_revenue - predicted_cost
        
        # 3. Catch Risk (uncertainty in actual vs expected catch)
        catch_risk_factor = self._calculate_catch_risk(expected_catch)
        
        # 4. Weather Impact on Profitability
        weather_impact = data.get("weatherSeverityIndex", 0)
        weather_risk_factor = self._calculate_weather_risk(weather_impact)
        
        # 5. Fuel Price Volatility Risk
        fuel_price_risk = self._calculate_fuel_price_risk(predicted_cost)
        
        # 6. Combined Risk Assessment
        combined_risk_score = self._calculate_combined_risk(
            market_risk, catch_risk_factor, weather_risk_factor, fuel_price_risk
        )
        
        # 7. Profitability Probability using Monte Carlo-like approach
        profitability_scenarios = self._run_profitability_scenarios(
            adjusted_revenue, predicted_cost, combined_risk_score, expected_catch
        )
        
        # 8. Risk Category Determination
        risk_category = self._determine_risk_category(
            profitability_scenarios["success_rate"], combined_risk_score
        )
        
        # 9. Confidence Intervals
        confidence_intervals = self._calculate_confidence_intervals(profitability_scenarios)
        
        # 10. Actionable Recommendations
        recommendations = self._generate_profitability_recommendations(
            adjusted_profit, risk_category, market_risk, weather_impact, seasonal_factor
        )
        
        return {
            "expectedRevenue": round(base_revenue, 2),
            "adjustedRevenue": round(adjusted_revenue, 2),
            "profit": round(base_profit, 2),
            "adjustedProfit": round(adjusted_profit, 2),
            "profitabilityProbability": round(profitability_scenarios["success_rate"], 3),
            "riskCategory": risk_category,
            "riskAnalysis": {
                "combinedRiskScore": round(combined_risk_score, 3),
                "marketRisk": round(market_risk, 3),
                "catchRisk": round(catch_risk_factor, 3),  
                "weatherRisk": round(weather_risk_factor, 3),
                "fuelPriceRisk": round(fuel_price_risk, 3),
            },
            "scenarios": {
                "worstCase": round(profitability_scenarios["worst_case"], 2),
                "bestCase": round(profitability_scenarios["best_case"], 2),
                "expectedCase": round(profitability_scenarios["expected"], 2),
                "successRate": round(profitability_scenarios["success_rate"], 3)
            },
            "confidenceIntervals": confidence_intervals,
            "seasonalFactor": round(seasonal_factor, 3),
            "recommendations": recommendations
        }
    
    def _analyze_market_risk(self, current_price: float, market_data: dict) -> float:
        """Analyze market volatility and price risk"""
        price_history = market_data.get("priceHistory", [])
        
        if len(price_history) < 5:
            # Not enough history, use medium risk estimate
            return 0.3
        
        recent_prices = [p["price"] for p in price_history[-30:]]  # Last 30 records
        
        # Calculate price volatility
        if len(recent_prices) > 1:
            price_std = np.std(recent_prices)
            price_mean = np.mean(recent_prices)
            volatility = price_std / price_mean if price_mean > 0 else 0.3
        else:
            volatility = 0.3
        
        # Normalize volatility to 0-1 risk score
        market_risk = min(volatility * 2, 1.0)  # Cap at 1.0
        
        return market_risk
    
    def _calculate_seasonal_factor(self) -> float:
        """Calculate seasonal impact on fish demand/supply"""
        current_month = datetime.utcnow().month
        
        # Load seasonal patterns
        with open(self.market_history_path, "r") as f:
            market_data = json.load(f)
        
        patterns = market_data["seasonalPatterns"]
        
        if current_month in [5, 6, 7, 8, 9, 10]:  # Monsoon season
            season_data = patterns["monsoon"]
        elif current_month in [12, 1, 2, 3]:  # Dry season  
            season_data = patterns["dry"]
        else:  # Inter_monsoon
            season_data = patterns["inter_monsoon"]
        
        # Combine demand and supply factors
        demand_factor = season_data["demandMultiplier"]
        supply_factor = season_data["supplyMultiplier"]
        
        # Higher demand + lower supply = higher prices/revenue
        seasonal_factor = demand_factor / supply_factor
        
        return seasonal_factor
    
    def _calculate_catch_risk(self, expected_catch: float) -> float:
        """Calculate risk of not achieving expected catch"""
        # Base risk increases with higher expected catch (more ambitious targets)
        base_risk = min(expected_catch / 500, 0.7)  # Risk increases up to 500kg, caps at 0.7
        
        # Add randomness for environmental factors
        environmental_uncertainty = 0.2  # 20% base uncertainty in catch
        
        catch_risk = min(base_risk + environmental_uncertainty, 0.8)
        
        return catch_risk
    
    def _calculate_weather_risk(self, weather_severity: float) -> float:
        """Calculate weather impact on profitability risk"""
        # Direct correlation between weather severity and risk
        weather_risk = weather_severity * 0.8  # Weather can contribute up to 80% risk
        
        return weather_risk
    
    def _calculate_fuel_price_risk(self, predicted_cost: float) -> float:
        """Calculate fuel price volatility impact"""
        # Assume fuel is ~60% of total cost in fishing operations
        fuel_portion = 0.6
        fuel_cost_estimate = predicted_cost * fuel_portion
        
        # Higher fuel costs = higher volatility impact
        if fuel_cost_estimate > 100000:  # High fuel cost threshold
            fuel_risk = 0.4
        elif fuel_cost_estimate > 50000:  # Medium fuel cost
            fuel_risk = 0.25
        else:  # Low fuel cost
            fuel_risk = 0.15
        
        return fuel_risk
    
    def _calculate_combined_risk(self, market_risk: float, catch_risk: float, 
                                weather_risk: float, fuel_risk: float) -> float:
        """Combine all risk factors with weighted importance"""
        weights = {
            "market": 0.25,
            "catch": 0.35, 
            "weather": 0.25,
            "fuel": 0.15
        }
        
        combined_risk = (
            weights["market"] * market_risk +
            weights["catch"] * catch_risk +
            weights["weather"] * weather_risk +
            weights["fuel"] * fuel_risk
        )
        
        return min(combined_risk, 1.0)
    
    def _run_profitability_scenarios(self, revenue: float, cost: float, 
                                   risk_score: float, expected_catch: float) -> dict:
        """Run Monte Carlo-like scenarios for profitability"""
        scenarios = []
        num_simulations = 100
        
        for _ in range(num_simulations):
            # Add randomness to revenue and cost based on risk
            revenue_variance = np.random.normal(1.0, risk_score * 0.3)  # ±30% max variance
            cost_variance = np.random.normal(1.0, risk_score * 0.2)     # ±20% max variance
            
            # Clamp to reasonable bounds
            revenue_variance = max(0.5, min(1.5, revenue_variance))
            cost_variance = max(0.8, min(1.3, cost_variance))
            
            scenario_revenue = revenue * revenue_variance
            scenario_cost = cost * cost_variance
            scenario_profit = scenario_revenue - scenario_cost
            
            scenarios.append(scenario_profit)
        
        # Calculate statistics
        scenarios_array = np.array(scenarios)
        success_rate = np.mean(scenarios_array > 0)  # Probability of profit > 0
        
        return {
            "worst_case": np.percentile(scenarios_array, 10),
            "best_case": np.percentile(scenarios_array, 90),
            "expected": np.mean(scenarios_array),
            "success_rate": success_rate,
            "scenarios": scenarios
        }
    
    def _determine_risk_category(self, success_rate: float, combined_risk: float) -> str:
        """Determine risk category based on success rate and risk factors"""
        if success_rate >= 0.8 and combined_risk <= 0.3:
            return "low"
        elif success_rate >= 0.6 and combined_risk <= 0.5:
            return "medium"
        elif success_rate >= 0.4 and combined_risk <= 0.7:
            return "high"
        else:
            return "very_high"
    
    def _calculate_confidence_intervals(self, scenarios: dict) -> dict:
        """Calculate confidence intervals for profit predictions"""
        scenarios_array = np.array(scenarios["scenarios"])
        
        return {
            "95%_interval": {
                "lower": round(np.percentile(scenarios_array, 2.5), 2),
                "upper": round(np.percentile(scenarios_array, 97.5), 2)
            },
            "80%_interval": {
                "lower": round(np.percentile(scenarios_array, 10), 2),  
                "upper": round(np.percentile(scenarios_array, 90), 2)
            },
            "50%_interval": {
                "lower": round(np.percentile(scenarios_array, 25), 2),
                "upper": round(np.percentile(scenarios_array, 75), 2) 
            }
        }
    
    def _generate_profitability_recommendations(self, profit: float, risk_category: str,
                                              market_risk: float, weather_impact: float,
                                              seasonal_factor: float) -> List[str]:
        """Generate actionable recommendations based on profitability analysis"""
        recommendations = []
        
        # Profit-based recommendations
        if profit <= 0:
            recommendations.append("CRITICAL: Trip likely unprofitable. Consider alternative fishing zones or delaying trip.")
        elif profit < 20000:
            recommendations.append("LOW MARGIN: Small profit expected. Monitor costs carefully and have backup plan.")
        elif profit > 100000:
            recommendations.append("HIGH PROFIT: Excellent opportunity. Consider maximizing catch with extended trip.")
        
        # Risk-based recommendations
        if risk_category == "very_high":
            recommendations.append("VERY HIGH RISK: Strongly recommend postponing trip or reducing scope.")
        elif risk_category == "high":
            recommendations.append("HIGH RISK: Proceed with extra caution. Have contingency plans ready.")
        elif risk_category == "low":
            recommendations.append("LOW RISK: Favorable conditions for profitable trip.")
        
        # Market-specific recommendations  
        if market_risk > 0.5:
            recommendations.append("High market volatility detected. Consider locked-in price contracts if available.")
        elif market_risk < 0.2:
            recommendations.append("Stable market conditions. Good time for larger catch targets.")
        
        # Weather-specific recommendations
        if weather_impact > 0.6:
            recommendations.append("Severe weather risk. Consider postponing or choosing closer fishing zones.")
        elif weather_impact < 0.3:
            recommendations.append("Favorable weather conditions support trip planning.")
        
        # Seasonal recommendations
        if seasonal_factor > 1.15:
            recommendations.append("Peak season pricing. Excellent time to maximize catch and revenue.")
        elif seasonal_factor < 0.85:
            recommendations.append("Off-season pricing. Focus on cost efficiency rather than maximum catch.")
        
        return recommendations