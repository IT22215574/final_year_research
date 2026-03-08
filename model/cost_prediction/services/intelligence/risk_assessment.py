import numpy as np
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import math

class RiskAssessmentEngine:
    """Advanced risk assessment engine for comprehensive trip risk analysis"""
    
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.risk_profiles_path = os.path.join(model_dir, "risk_profiles.json")
        self._initialize_risk_profiles()
    
    def _initialize_risk_profiles(self):
        """Initialize risk assessment profiles and thresholds"""
        if not os.path.exists(self.risk_profiles_path):
            default_profiles = {
                "weatherThresholds": {
                    "low": {"wsi_max": 0.3, "wind_max": 15, "wave_max": 1.5},
                    "medium": {"wsi_max": 0.6, "wind_max": 25, "wave_max": 2.5},
                    "high": {"wsi_max": 0.8, "wind_max": 35, "wave_max": 3.5},
                    "extreme": {"wsi_max": 1.0, "wind_max": float("inf"), "wave_max": float("inf")}
                },
                "economicThresholds": {
                    "profit_margin_low": 0.1,
                    "profit_margin_medium": 0.25,
                    "profit_margin_high": 0.5,
                    "fuel_cost_ratio_critical": 0.8
                },
                "operationalThresholds": {
                    "distance_risk_zones": [
                        {"max_distance": 50, "risk_multiplier": 1.0},
                        {"max_distance": 100, "risk_multiplier": 1.3},
                        {"max_distance": 200, "risk_multiplier": 1.6},
                        {"max_distance": float("inf"), "risk_multiplier": 2.0}
                    ],
                    "crew_experience_factors": {
                        "novice": 1.5,
                        "intermediate": 1.2,
                        "experienced": 1.0,
                        "expert": 0.8
                    }
                },
                "seasonalRiskFactors": {
                    "monsoon_months": [5, 6, 7, 8, 9, 10],
                    "high_risk_multiplier": 1.8,
                    "medium_risk_multiplier": 1.3,
                    "low_risk_multiplier": 1.0
                }
            }
            with open(self.risk_profiles_path, "w") as f:
                json.dump(default_profiles, f, indent=2)
    
    def comprehensive_risk_assessment(self, trip_data: dict) -> dict:
        """Perform comprehensive risk assessment across all dimensions"""
        
        # 1. Weather Risk Assessment
        weather_risk = self._assess_weather_risk(trip_data)
        
        # 2. Economic Risk Assessment  
        economic_risk = self._assess_economic_risk(trip_data)
        
        # 3. Operational Risk Assessment
        operational_risk = self._assess_operational_risk(trip_data)
        
        # 4. Seasonal Risk Assessment
        seasonal_risk = self._assess_seasonal_risk(trip_data)
        
        # 5. Equipment & Boat Risk Assessment
        equipment_risk = self._assess_equipment_risk(trip_data)
        
        # 6. Market Risk Assessment
        market_risk = self._assess_market_risk(trip_data)
        
        # 7. Regulatory & Compliance Risk
        regulatory_risk = self._assess_regulatory_risk(trip_data)
        
        # 8. Combined Risk Score and Category
        combined_assessment = self._calculate_combined_risk(
            weather_risk, economic_risk, operational_risk, seasonal_risk,
            equipment_risk, market_risk, regulatory_risk
        )
        
        # 9. Risk Mitigation Recommendations
        mitigation_strategies = self._generate_mitigation_strategies(
            combined_assessment, weather_risk, economic_risk, operational_risk
        )
        
        # 10. Risk Monitoring Recommendations
        monitoring_plan = self._generate_monitoring_plan(combined_assessment)
        
        return {
            "overallRiskScore": round(combined_assessment["overall_score"], 3),
            "riskCategory": combined_assessment["category"],
            "riskLevel": combined_assessment["level"],
            "confidenceScore": round(combined_assessment["confidence"], 3),
            "detailedAssessment": {
                "weatherRisk": weather_risk,
                "economicRisk": economic_risk,
                "operationalRisk": operational_risk,
                "seasonalRisk": seasonal_risk,
                "equipmentRisk": equipment_risk,
                "marketRisk": market_risk,
                "regulatoryRisk": regulatory_risk
            },
            "riskFactors": combined_assessment["primary_factors"],
            "mitigationStrategies": mitigation_strategies,
            "monitoringPlan": monitoring_plan,
            "recommendedActions": self._generate_recommended_actions(combined_assessment)
        }
    
    def _assess_weather_risk(self, trip_data: dict) -> dict:
        """Assess weather-related risks"""
        wsi = trip_data.get("weatherSeverityIndex", 0.5)
        wind_speed = trip_data.get("windSpeed", 20)
        wave_height = trip_data.get("waveHeight", 2.0)
        trip_duration = trip_data.get("tripDuration", 8)
        
        # Load weather thresholds
        with open(self.risk_profiles_path, "r") as f:
            profiles = json.load(f)
        
        weather_thresholds = profiles["weatherThresholds"]
        
        # Primary risk score based on WSI
        base_risk = wsi
        
        # Adjust for specific conditions
        wind_risk_multiplier = 1.0
        if wind_speed > 35:
            wind_risk_multiplier = 1.8
        elif wind_speed > 25:
            wind_risk_multiplier = 1.4
        elif wind_speed > 15:
            wind_risk_multiplier = 1.2
        
        wave_risk_multiplier = 1.0
        if wave_height > 3.5:
            wave_risk_multiplier = 1.6
        elif wave_height > 2.5:
            wave_risk_multiplier = 1.3
        elif wave_height > 1.5:
            wave_risk_multiplier = 1.1
        
        # Duration risk - longer trips have higher weather exposure
        duration_risk_multiplier = min(1.0 + (trip_duration - 8) * 0.05, 2.0)
        
        # Combined weather risk
        weather_risk_score = base_risk * wind_risk_multiplier * wave_risk_multiplier * duration_risk_multiplier
        weather_risk_score = min(weather_risk_score, 1.0)
        
        # Determine category
        if weather_risk_score <= 0.35:
            category = "low"
        elif weather_risk_score <= 0.55:
            category = "medium"
        elif weather_risk_score <= 0.75:
            category = "high"
        else:
            category = "extreme"
        
        return {
            "score": round(weather_risk_score, 3),
            "category": category,
            "factors": {
                "weatherSeverityIndex": wsi,
                "windSpeed": wind_speed,
                "waveHeight": wave_height,
                "tripDuration": trip_duration
            },
            "multipliers": {
                "wind": wind_risk_multiplier,
                "wave": wave_risk_multiplier,
                "duration": duration_risk_multiplier
            }
        }
    
    def _assess_economic_risk(self, trip_data: dict) -> dict:
        """Assess economic and financial risks"""
        predicted_cost = trip_data.get("predictedTotalCost", 100000)
        expected_revenue = trip_data.get("expectedRevenue", 120000)
        fuel_cost = trip_data.get("fuelCost", 60000)
        market_price = trip_data.get("marketPrice", 400)
        
        # Profit margin calculation
        profit = expected_revenue - predicted_cost
        profit_margin = profit / expected_revenue if expected_revenue > 0 else -1
        
        # Fuel cost ratio
        fuel_cost_ratio = fuel_cost / predicted_cost if predicted_cost > 0 else 0.6
        
        # Base economic risk
        if profit_margin >= 0.5:
            margin_risk = 0.1  # Excellent margin
        elif profit_margin >= 0.30:
            margin_risk = 0.25  # Good margin
        elif profit_margin >= 0.15:
            margin_risk = 0.40  # Moderate margin
        elif profit_margin >= 0.05:
            margin_risk = 0.55  # Low margin
        elif profit_margin >= 0:
            margin_risk = 0.70  # Break-even or minimal profit
        elif profit_margin >= -0.10:
            margin_risk = 0.85  # Small loss
        else:
            margin_risk = 1.0  # Significant loss scenario
        
        # Fuel dependency risk
        fuel_risk = min(fuel_cost_ratio * 1.5, 1.0)  # High fuel dependency = higher risk
        
        # Market price volatility risk
        price_volatility_risk = 0.3  # Default market volatility assumption
        
        # Combined economic risk
        economic_risk_score = (margin_risk * 0.5 + fuel_risk * 0.3 + price_volatility_risk * 0.2)
        
        # Determine category
        if economic_risk_score <= 0.35:
            category = "low"
        elif economic_risk_score <= 0.55:
            category = "medium"
        elif economic_risk_score <= 0.75:
            category = "high"
        else:
            category = "critical"
        
        return {
            "score": round(economic_risk_score, 3),
            "category": category,
            "factors": {
                "profitMargin": round(profit_margin, 3),
                "fuelCostRatio": round(fuel_cost_ratio, 3),
                "expectedProfit": round(profit, 2),
                "priceVolatilityRisk": price_volatility_risk
            },
            "analysis": {
                "marginRisk": round(margin_risk, 3),
                "fuelRisk": round(fuel_risk, 3),
                "marketRisk": round(price_volatility_risk, 3)
            }
        }
    
    def _assess_operational_risk(self, trip_data: dict) -> dict:
        """Assess operational and logistics risks"""
        distance = trip_data.get("totalDistance", 100)
        boat_age = trip_data.get("boatAge", 5)
        crew_experience = trip_data.get("crewExperience", "intermediate")  # novice, intermediate, experienced, expert
        boat_maintenance_score = trip_data.get("maintenanceScore", 0.8)  # 0-1 scale
        
        # Distance risk
        distance_risk = 0.2  # Base risk
        if distance > 200:
            distance_risk = 0.8
        elif distance > 100:
            distance_risk = 0.5
        elif distance > 50:
            distance_risk = 0.3
        
        # Boat condition risk
        condition_risk = max(0, 1 - boat_maintenance_score)  # Inverse of maintenance score
        
        # Age risk
        if boat_age > 20:
            age_risk = 0.7
        elif boat_age > 15:
            age_risk = 0.5
        elif boat_age > 10:
            age_risk = 0.3
        else:
            age_risk = 0.1
        
        # Crew experience risk
        with open(self.risk_profiles_path, "r") as f:
            profiles = json.load(f)
        
        crew_factors = profiles["operationalThresholds"]["crew_experience_factors"]
        crew_risk_multiplier = crew_factors.get(crew_experience, 1.2)
        
        # Combined operational risk
        base_operational_risk = (distance_risk * 0.4 + condition_risk * 0.3 + age_risk * 0.3)
        operational_risk_score = min(base_operational_risk * crew_risk_multiplier, 1.0)
        
        # Determine category
        if operational_risk_score <= 0.3:
            category = "low"
        elif operational_risk_score <= 0.5:
            category = "medium"
        elif operational_risk_score <= 0.7:
            category = "high"
        else:
            category = "critical"
        
        return {
            "score": round(operational_risk_score, 3),
            "category": category,
            "factors": {
                "distance": distance,
                "boatAge": boat_age,
                "crewExperience": crew_experience,
                "maintenanceScore": boat_maintenance_score
            },
            "riskComponents": {
                "distanceRisk": round(distance_risk, 3),
                "conditionRisk": round(condition_risk, 3),
                "ageRisk": round(age_risk, 3),
                "crewMultiplier": crew_risk_multiplier
            }
        }
    
    def _assess_seasonal_risk(self, trip_data: dict) -> dict:
        """Assess seasonal and temporal risks"""
        current_month = datetime.now().month
        trip_date = trip_data.get("tripDate", datetime.now().isoformat())
        
        # Parse trip date
        try:
            trip_datetime = datetime.fromisoformat(trip_date.replace("Z", "+00:00"))
            trip_month = trip_datetime.month
        except:
            trip_month = current_month
        
        with open(self.risk_profiles_path, "r") as f:
            profiles = json.load(f)
        
        seasonal_factors = profiles["seasonalRiskFactors"]
        monsoon_months = seasonal_factors["monsoon_months"]
        
        # Determine seasonal risk
        if trip_month in monsoon_months:
            seasonal_risk_score = 0.7  # High risk during monsoon
            season_category = "monsoon"
            risk_multiplier = seasonal_factors["high_risk_multiplier"]
        elif trip_month in [11, 12, 1, 2]:  # Peak fishing season (post-monsoon)
            seasonal_risk_score = 0.2  # Low risk during ideal season
            season_category = "peak"
            risk_multiplier = seasonal_factors["low_risk_multiplier"]
        else:  # Transition months
            seasonal_risk_score = 0.4  # Medium risk
            season_category = "transition"
            risk_multiplier = seasonal_factors["medium_risk_multiplier"]
        
        # Moon phase influence (fishing often better during certain moon phases)
        moon_phase_risk = 0.1  # Minimal impact, but considered
        
        # Time of year fish availability
        fish_availability_risk = self._calculate_fish_availability_risk(trip_month)
        
        total_seasonal_risk = min(seasonal_risk_score + moon_phase_risk + fish_availability_risk, 1.0)
        
        return {
            "score": round(total_seasonal_risk, 3),
            "category": season_category,
            "factors": {
                "tripMonth": trip_month,
                "seasonCategory": season_category,
                "moonPhaseRisk": moon_phase_risk,
                "fishAvailabilityRisk": fish_availability_risk
            },
            "multiplier": risk_multiplier
        }
    
    def _assess_equipment_risk(self, trip_data: dict) -> dict:
        """Assess equipment and technology risks"""
        boat_type = trip_data.get("boatType", "general")
        engine_condition = trip_data.get("engineCondition", 0.8)  # 0-1 scale
        navigation_equipment = trip_data.get("hasGPS", True)
        communication_equipment = trip_data.get("hasRadio", True)
        safety_equipment_score = trip_data.get("safetyEquipmentScore", 0.7)  # 0-1 scale
        
        # Base equipment risk
        equipment_risk = 0.2
        
        # Engine condition impact
        engine_risk = max(0, 1 - engine_condition)
        
        # Navigation equipment impact
        nav_risk = 0.4 if not navigation_equipment else 0.1
        
        # Communication equipment impact
        comm_risk = 0.3 if not communication_equipment else 0.1
        
        # Safety equipment impact
        safety_risk = max(0, 1 - safety_equipment_score) * 0.5
        
        # Boat type specific risks
        boat_type_risks = {
            "small": 0.4,
            "medium": 0.3,
            "large": 0.2,
            "commercial": 0.15,
            "general": 0.3
        }
        boat_risk = boat_type_risks.get(boat_type, 0.3)
        
        total_equipment_risk = min(
            equipment_risk + engine_risk * 0.3 + nav_risk * 0.2 + 
            comm_risk * 0.2 + safety_risk * 0.2 + boat_risk * 0.1, 1.0
        )
        
        # Determine category
        if total_equipment_risk <= 0.25:
            category = "low"
        elif total_equipment_risk <= 0.45:
            category = "medium"
        elif total_equipment_risk <= 0.65:
            category = "high"
        else:
            category = "critical"
        
        return {
            "score": round(total_equipment_risk, 3),
            "category": category,
            "factors": {
                "boatType": boat_type,
                "engineCondition": engine_condition,
                "hasNavigation": navigation_equipment,
                "hasCommunication": communication_equipment,
                "safetyEquipmentScore": safety_equipment_score
            },
            "riskComponents": {
                "engineRisk": round(engine_risk, 3),
                "navigationRisk": round(nav_risk, 3),
                "communicationRisk": round(comm_risk, 3),
                "safetyRisk": round(safety_risk, 3),
                "boatTypeRisk": round(boat_risk, 3)
            }
        }
    
    def _assess_market_risk(self, trip_data: dict) -> dict:
        """Assess market and demand risks"""
        fish_species = trip_data.get("targetSpecies", "general")
        market_demand = trip_data.get("marketDemand", 0.7)  # 0-1 scale
        price_volatility = trip_data.get("priceVolatility", 0.3)  # 0-1 scale
        storage_time = trip_data.get("maxStorageTime", 24)  # hours
        
        # Base market risk
        demand_risk = max(0, 1 - market_demand)
        
        # Price volatility risk
        volatility_risk = price_volatility
        
        # Storage/freshness risk
        if storage_time > 48:
            storage_risk = 0.6
        elif storage_time > 24:
            storage_risk = 0.3
        else:
            storage_risk = 0.1
        
        # Species-specific market risk
        species_risks = {
            "tuna": 0.2,  # Stable high-value market
            "sardines": 0.4,  # More volatile
            "mackerel": 0.3,
            "prawns": 0.25,  # High value but seasonal
            "crab": 0.3,
            "general": 0.35
        }
        species_risk = species_risks.get(fish_species, 0.35)
        
        total_market_risk = min(demand_risk * 0.4 + volatility_risk * 0.3 + 
                               storage_risk * 0.2 + species_risk * 0.1, 1.0)
        
        # Determine category
        if total_market_risk <= 0.3:
            category = "stable"
        elif total_market_risk <= 0.5:
            category = "moderate"
        elif total_market_risk <= 0.7:
            category = "volatile"
        else:
            category = "unpredictable"
        
        return {
            "score": round(total_market_risk, 3),
            "category": category,
            "factors": {
                "targetSpecies": fish_species,
                "marketDemand": market_demand,
                "priceVolatility": price_volatility,
                "storageTime": storage_time
            },
            "riskComponents": {
                "demandRisk": round(demand_risk, 3),
                "volatilityRisk": round(volatility_risk, 3),
                "storageRisk": round(storage_risk, 3),
                "speciesRisk": round(species_risk, 3)
            }
        }
    
    def _assess_regulatory_risk(self, trip_data: dict) -> dict:
        """Assess regulatory and compliance risks"""
        fishing_license_valid = trip_data.get("hasValidLicense", True)
        fishing_zone = trip_data.get("fishingZone", "coastal")  # coastal, territorial, international
        quota_usage = trip_data.get("quotaUsagePercent", 0.5)  # 0-1 scale
        restricted_areas = trip_data.get("nearRestrictedAreas", False)
        
        # License compliance risk
        license_risk = 0.8 if not fishing_license_valid else 0.0
        
        # Fishing zone regulatory complexity
        zone_risks = {
            "coastal": 0.1,
            "territorial": 0.3,
            "international": 0.6,
            "eez": 0.4  # Exclusive Economic Zone
        }
        zone_risk = zone_risks.get(fishing_zone, 0.3)
        
        # Quota compliance risk
        if quota_usage > 0.9:
            quota_risk = 0.7  # High risk of exceeding quota
        elif quota_usage > 0.7:
            quota_risk = 0.4
        else:
            quota_risk = 0.1
        
        # Restricted areas risk
        restricted_risk = 0.5 if restricted_areas else 0.1
        
        total_regulatory_risk = min(license_risk * 0.4 + zone_risk * 0.3 + 
                                   quota_risk * 0.2 + restricted_risk * 0.1, 1.0)
        
        # Determine category
        if total_regulatory_risk <= 0.2:
            category = "compliant"
        elif total_regulatory_risk <= 0.4:
            category = "minor_concerns"
        elif total_regulatory_risk <= 0.6:
            category = "moderate_risk"
        else:
            category = "high_risk"
        
        return {
            "score": round(total_regulatory_risk, 3),
            "category": category,
            "factors": {
                "hasValidLicense": fishing_license_valid,
                "fishingZone": fishing_zone,
                "quotaUsage": quota_usage,
                "nearRestrictedAreas": restricted_areas
            },
            "riskComponents": {
                "licenseRisk": round(license_risk, 3),
                "zoneRisk": round(zone_risk, 3),
                "quotaRisk": round(quota_risk, 3),
                "restrictedAreasRisk": round(restricted_risk, 3)
            }
        }
    
    def _calculate_fish_availability_risk(self, month: int) -> float:
        """Calculate fish availability risk based on seasonal patterns"""
        # Peak fishing months typically: Nov, Dec, Jan, Feb (post-monsoon)
        peak_months = [11, 12, 1, 2]
        low_months = [6, 7, 8, 9]  # Monsoon months
        
        if month in peak_months:
            return 0.1  # Low risk, high availability
        elif month in low_months:
            return 0.6  # High risk, low availability
        else:
            return 0.3  # Medium risk
    
    def _calculate_combined_risk(self, weather_risk: dict, economic_risk: dict, 
                                operational_risk: dict, seasonal_risk: dict,
                                equipment_risk: dict, market_risk: dict, 
                                regulatory_risk: dict) -> dict:
        """Calculate combined risk score with weighted factors"""
        
        # Define weights for different risk categories
        weights = {
            "weather": 0.25,
            "economic": 0.20,
            "operational": 0.15,
            "seasonal": 0.10,
            "equipment": 0.15,
            "market": 0.10,
            "regulatory": 0.05
        }
        
        # Calculate weighted risk score
        overall_score = (
            weights["weather"] * weather_risk["score"] +
            weights["economic"] * economic_risk["score"] +
            weights["operational"] * operational_risk["score"] +
            weights["seasonal"] * seasonal_risk["score"] +
            weights["equipment"] * equipment_risk["score"] +
            weights["market"] * market_risk["score"] +
            weights["regulatory"] * regulatory_risk["score"]
        )
        
        # Determine overall category and level
        if overall_score <= 0.30:
            category = "low"
            level = "acceptable"
        elif overall_score <= 0.50:
            category = "medium"
            level = "manageable"
        elif overall_score <= 0.70:
            category = "high"
            level = "concerning"
        elif overall_score <= 0.85:
            category = "critical"
            level = "dangerous"
        else:
            category = "extreme"
            level = "unacceptable"
        
        # Calculate confidence based on data quality
        confidence = self._calculate_assessment_confidence(
            weather_risk, economic_risk, operational_risk
        )
        
        # Identify primary risk factors (top 3)
        risk_factors = [
            ("weather", weather_risk["score"]),
            ("economic", economic_risk["score"]),
            ("operational", operational_risk["score"]),
            ("seasonal", seasonal_risk["score"]),
            ("equipment", equipment_risk["score"]),
            ("market", market_risk["score"]),
            ("regulatory", regulatory_risk["score"])
        ]
        
        # Sort by risk score and take top 3
        risk_factors.sort(key=lambda x: x[1], reverse=True)
        primary_factors = [factor[0] for factor in risk_factors[:3]]
        
        return {
            "overall_score": overall_score,
            "category": category,
            "level": level,
            "confidence": confidence,
            "primary_factors": primary_factors,
            "weights_used": weights
        }
    
    def _calculate_assessment_confidence(self, weather_risk: dict, 
                                       economic_risk: dict, operational_risk: dict) -> float:
        """Calculate confidence score for the risk assessment"""
        # Base confidence
        base_confidence = 0.7
        
        # Adjust based on data completeness (simplified)
        data_completeness = 0.8  # Assume 80% complete data
        
        # Adjust based on prediction reliability
        prediction_reliability = 0.85  # Based on model accuracy
        
        confidence = base_confidence * data_completeness * prediction_reliability
        return min(confidence, 0.95)  # Cap at 95%
    
    def _generate_mitigation_strategies(self, combined_assessment: dict, 
                                      weather_risk: dict, economic_risk: dict,
                                      operational_risk: dict) -> List[str]:
        """Generate specific risk mitigation strategies"""
        strategies = []
        primary_factors = combined_assessment["primary_factors"]
        
        # Weather risk mitigation
        if "weather" in primary_factors:
            if weather_risk["score"] > 0.7:
                strategies.append("CRITICAL: Consider postponing trip due to severe weather conditions")
                strategies.append("Monitor weather forecasts hourly and have emergency shelter plans")
            elif weather_risk["score"] > 0.5:
                strategies.append("Reduce trip duration and stay closer to shore")
                strategies.append("Ensure all weather monitoring equipment is functional")
        
        # Economic risk mitigation
        if "economic" in primary_factors:
            if economic_risk["score"] > 0.7:
                strategies.append("Consider reducing trip scope to minimize losses")
                strategies.append("Negotiate advance sale contracts to lock in prices")
            elif economic_risk["score"] > 0.5:
                strategies.append("Monitor fuel prices and consider alternative routes")
                strategies.append("Have contingency plans for lower catch scenarios")
        
        # Operational risk mitigation
        if "operational" in primary_factors:
            if operational_risk["score"] > 0.6:
                strategies.append("Conduct thorough pre-trip boat and equipment inspection")
                strategies.append("Consider taking backup crew member or experienced guide")
                strategies.append("Plan shorter trips until operational issues are resolved")
        
        # General mitigation strategies
        if combined_assessment["overall_score"] > 0.7:
            strategies.append("RECOMMENDATION: Postpone trip until risk factors improve")
            strategies.append("Consider alternative fishing locations with lower risk profiles")
        elif combined_assessment["overall_score"] > 0.5:
            strategies.append("Proceed with enhanced monitoring and contingency plans")
            strategies.append("Maintain constant communication with shore support")
        
        return strategies
    
    def _generate_monitoring_plan(self, combined_assessment: dict) -> dict:
        """Generate monitoring plan based on risk assessment"""
        risk_level = combined_assessment["level"]
        
        if risk_level in ["dangerous", "unacceptable"]:
            monitoring_frequency = "continuous"
            check_intervals = "every 30 minutes"
            communication_schedule = "hourly check-ins"
        elif risk_level == "concerning":
            monitoring_frequency = "frequent"
            check_intervals = "every hour"
            communication_schedule = "every 2 hours"
        elif risk_level == "manageable":
            monitoring_frequency = "regular"
            check_intervals = "every 2 hours"
            communication_schedule = "every 4 hours"
        else:
            monitoring_frequency = "standard"
            check_intervals = "every 4 hours"
            communication_schedule = "twice daily"
        
        return {
            "frequency": monitoring_frequency,
            "checkIntervals": check_intervals,
            "communicationSchedule": communication_schedule,
            "criticalParameters": self._identify_critical_monitoring_parameters(combined_assessment),
            "alertThresholds": self._define_alert_thresholds(combined_assessment)
        }
    
    def _identify_critical_monitoring_parameters(self, combined_assessment: dict) -> List[str]:
        """Identify critical parameters to monitor during trip"""
        parameters = ["weather_conditions", "fuel_consumption", "engine_status"]
        
        primary_factors = combined_assessment["primary_factors"]
        
        if "weather" in primary_factors:
            parameters.extend(["wind_speed", "wave_height", "visibility"])
        if "economic" in primary_factors:
            parameters.extend(["fuel_efficiency", "catch_rate"])
        if "operational" in primary_factors:
            parameters.extend(["equipment_status", "crew_condition"])
        
        return parameters
    
    def _define_alert_thresholds(self, combined_assessment: dict) -> dict:
        """Define alert thresholds based on risk level"""
        risk_level = combined_assessment["level"]
        
        base_thresholds = {
            "wind_speed_warning": 25,
            "wind_speed_critical": 35,
            "wave_height_warning": 2.5,
            "wave_height_critical": 3.5,
            "fuel_consumption_warning": 1.2,  # 120% of expected
            "fuel_consumption_critical": 1.5   # 150% of expected
        }
        
        # Adjust thresholds based on risk level
        if risk_level in ["dangerous", "unacceptable"]:
            # Lower thresholds for high-risk trips
            adjustment_factor = 0.8
        elif risk_level == "concerning":
            adjustment_factor = 0.9
        else:
            adjustment_factor = 1.0
        
        adjusted_thresholds = {}
        for key, value in base_thresholds.items():
            adjusted_thresholds[key] = round(value * adjustment_factor, 1)
        
        return adjusted_thresholds
    
    def _generate_recommended_actions(self, combined_assessment: dict) -> List[str]:
        """Generate recommended actions based on overall risk assessment"""
        actions = []
        risk_level = combined_assessment["level"]
        risk_score = combined_assessment["overall_score"]
        
        if risk_level == "unacceptable":
            actions.append("DO NOT PROCEED - Risk level too high for safe operation")
            actions.append("Wait for improved conditions before planning trip")
        elif risk_level == "dangerous":
            actions.append("STRONGLY RECOMMEND POSTPONING - High probability of loss/danger")
            actions.append("If proceeding, reduce trip scope significantly")
        elif risk_level == "concerning":
            actions.append("Proceed with extreme caution and enhanced safety measures")
            actions.append("Consider shorter trip duration and closer fishing zones")
        elif risk_level == "manageable":
            actions.append("Acceptable risk level - proceed with standard precautions")
            actions.append("Monitor primary risk factors throughout trip")
        else:
            actions.append("Low risk - favorable conditions for trip")
            actions.append("Good opportunity for successful and profitable fishing")
        
        # Add specific numerical guidance
        if risk_score > 0.8:
            actions.append(f"Risk score: {risk_score:.2f} - Exceeds acceptable thresholds")
        elif risk_score > 0.6:
            actions.append(f"Risk score: {risk_score:.2f} - Elevated risk, enhanced monitoring required")
        else:
            actions.append(f"Risk score: {risk_score:.2f} - Within acceptable risk parameters")
        
        return actions