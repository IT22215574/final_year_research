import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import math

class CarbonOffsetEngine:
    """Advanced carbon footprint calculation and offset economics for fishing trips"""
    
    def __init__(self, model_dir: str):
        self.model_dir = model_dir
        self.carbon_config_path = os.path.join(model_dir, "carbon_config.json")
        self._initialize_carbon_config()
    
    def _initialize_carbon_config(self):
        """Initialize carbon calculation configurations and market prices"""
        if not os.path.exists(self.carbon_config_path):
            default_config = {
                "emissionFactors": {
                    "diesel": 2.68,  # kg CO2 per liter of diesel
                    "gasoline": 2.31,  # kg CO2 per liter of gasoline
                    "biodiesel": 2.0,  # kg CO2 per liter of biodiesel (lower emissions)
                },
                "carbonPricing": {
                    "voluntaryMarketPriceUSD": 15.0,  # USD per tonne CO2
                    "complianceMarketPriceUSD": 25.0,  # USD per tonne CO2 (regulatory markets)
                    "premiumOffsetPriceUSD": 35.0,   # USD per tonne for premium verified offsets
                    "futureOffsetPriceUSD": 50.0     # Projected future carbon price
                },
                "offsetPrograms": {
                    "marineConservation": {
                        "name": "Marine Conservation Program",
                        "priceMultiplier": 1.2,
                        "verificationStandard": "Verified Carbon Standard (VCS)",
                        "cobenefits": ["biodiversity", "marine_habitat"]
                    },
                    "renewableEnergy": {
                        "name": "Renewable Energy Certificate",
                        "priceMultiplier": 1.0,
                        "verificationStandard": "Gold Standard",
                        "cobenefits": ["clean_energy"]
                    },
                    "reforestation": {
                        "name": "Coastal Reforestation",
                        "priceMultiplier": 1.15,
                        "verificationStandard": "Climate Action Reserve",
                        "cobenefits": ["biodiversity", "soil_conservation"]
                    },
                    "communityDevelopment": {
                        "name": "Coastal Community Development",
                        "priceMultiplier": 1.3,
                        "verificationStandard": "Plan Vivo",
                        "cobenefits": ["social_impact", "local_economy"]
                    }
                },
                "sustainabilityMetrics": {
                    "carbonIntensityThresholds": {
                        "excellent": 5.0,    # kg CO2 per kg fish
                        "good": 10.0,        # kg CO2 per kg fish
                        "average": 20.0,     # kg CO2 per kg fish
                        "poor": 35.0         # kg CO2 per kg fish
                    },
                    "efficiencyBenchmarks": {
                        "fuelPerKm": {
                            "excellent": 0.3,    # liters per km
                            "good": 0.45,        # liters per km
                            "average": 0.6,      # liters per km
                            "poor": 0.8          # liters per km
                        }
                    }
                },
                "incentivePrograms": {
                    "lowCarbonBonus": {
                        "threshold": 10.0,   # kg CO2 per kg fish
                        "bonusPercent": 5.0  # % bonus on revenue
                    },
                    "carbonNeutralBonus": {
                        "bonusPercent": 10.0  # % bonus for carbon-neutral trips
                    }
                }
            }
            with open(self.carbon_config_path, "w") as f:
                json.dump(default_config, f, indent=2)
    
    def calculate_comprehensive_carbon_impact(self, trip_data: dict) -> dict:
        """Calculate comprehensive carbon footprint and offset economics"""
        
        # 1. Direct Emissions Calculation
        direct_emissions = self._calculate_direct_emissions(trip_data)
        
        # 2. Indirect Emissions Calculation
        indirect_emissions = self._calculate_indirect_emissions(trip_data)
        
        # 3. Total Carbon Footprint
        total_emissions = direct_emissions["total"] + indirect_emissions["total"]
        
        # 4. Carbon Intensity Analysis
        carbon_intensity = self._calculate_carbon_intensity(total_emissions, trip_data)
        
        # 5. Offset Cost Calculations
        offset_costs = self._calculate_offset_costs(total_emissions)
        
        # 6. Carbon Economics Analysis
        carbon_economics = self._analyze_carbon_economics(trip_data, total_emissions, offset_costs)
        
        # 7. Sustainability Rating
        sustainability_rating = self._calculate_sustainability_rating(carbon_intensity, trip_data)
        
        # 8. Carbon Reduction Recommendations
        reduction_recommendations = self._generate_reduction_recommendations(
            direct_emissions, indirect_emissions, carbon_intensity, trip_data
        )
        
        # 9. Offset Strategy Recommendations
        offset_strategy = self._recommend_offset_strategy(total_emissions, trip_data)
        
        # 10. Regulatory Compliance Analysis
        compliance_analysis = self._analyze_regulatory_compliance(total_emissions, trip_data)
        
        return {
            "carbonFootprint": {
                "totalEmissionsKgCO2": round(total_emissions, 2),
                "directEmissions": direct_emissions,
                "indirectEmissions": indirect_emissions,
                "carbonIntensity": carbon_intensity
            },
            "offsetEconomics": offset_costs,
            "carbonEconomics": carbon_economics,
            "sustainabilityRating": sustainability_rating,
            "reductionRecommendations": reduction_recommendations,
            "offsetStrategy": offset_strategy,
            "complianceAnalysis": compliance_analysis,
            "marketIncentives": self._identify_market_incentives(carbon_intensity, total_emissions),
            "calculationDate": datetime.now().isoformat()
        }
    
    def _calculate_direct_emissions(self, trip_data: dict) -> dict:
        """Calculate direct emissions from fuel consumption"""
        
        fuel_used_liters = trip_data.get("fuelConsumptionLiters", 200)
        fuel_type = trip_data.get("fuelType", "diesel").lower()
        engine_efficiency = trip_data.get("engineEfficiency", 0.35)  # 35% typical efficiency
        
        # Load emission factors
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        emission_factors = config["emissionFactors"]
        emission_factor = emission_factors.get(fuel_type, emission_factors["diesel"])
        
        # Base emissions calculation
        base_emissions = fuel_used_liters * emission_factor
        
        # Adjust for engine efficiency (less efficient = more emissions per unit work)
        efficiency_adjustment = 0.35 / max(engine_efficiency, 0.2)  # Normalize to 35% baseline
        adjusted_emissions = base_emissions * efficiency_adjustment
        
        # Cold start emissions (additional emissions during engine warm-up)
        cold_start_emissions = fuel_used_liters * 0.15 * emission_factor  # 15% additional
        
        # Idling emissions (if boat idles during fishing)
        idling_hours = trip_data.get("idlingHours", 2.0)  # 2 hours default
        idling_fuel_rate = 0.8  # liters per hour while idling
        idling_emissions = idling_hours * idling_fuel_rate * emission_factor
        
        total_direct_emissions = adjusted_emissions + cold_start_emissions + idling_emissions
        
        return {
            "total": total_direct_emissions,
            "fuelCombustion": adjusted_emissions,
            "coldStart": cold_start_emissions,
            "idling": idling_emissions,
            "details": {
                "fuelUsed": fuel_used_liters,
                "fuelType": fuel_type,
                "emissionFactor": emission_factor,
                "engineEfficiency": engine_efficiency,
                "idlingHours": idling_hours
            }
        }
    
    def _calculate_indirect_emissions(self, trip_data: dict) -> dict:
        """Calculate indirect emissions (scope 2 and 3)"""
        
        distance = trip_data.get("totalDistance", 100)
        boat_weight = trip_data.get("boatWeight", 5000)  # kg
        crew_size = trip_data.get("crewSize", 4)
        
        # Fuel production and transportation (upstream emissions)
        fuel_liters = trip_data.get("fuelConsumptionLiters", 200)
        upstream_factor = 0.15  # 15% additional emissions from fuel lifecycle
        upstream_emissions = fuel_liters * 2.68 * upstream_factor
        
        # Boat manufacturing (amortized over boat lifetime)
        boat_lifetime_years = 20
        boat_manufacturing_emissions = boat_weight * 2.5  # 2.5 kg CO2 per kg boat weight
        trip_manufacturing_emissions = boat_manufacturing_emissions / (365 * boat_lifetime_years / 7)  # Weekly trips
        
        # Equipment and gear manufacturing (amortized)
        equipment_emissions = 50.0  # Fixed emissions per trip from equipment lifecycle
        
        # Crew transportation (to/from harbor)
        avg_crew_travel_km = 20  # Average distance crew travels to harbor
        crew_transport_emissions = crew_size * avg_crew_travel_km * 0.21  # 0.21 kg CO2 per km per person
        
        # Port facilities energy use
        port_energy_emissions = 15.0  # Fixed emissions from port electricity/infrastructure use
        
        # Fish processing and cold storage (if applicable)
        expected_catch = trip_data.get("expectedCatch", 100)  # kg
        cold_storage_factor = 0.5  # kg CO2 per kg fish for storage/processing
        processing_emissions = expected_catch * cold_storage_factor
        
        total_indirect_emissions = (
            upstream_emissions + trip_manufacturing_emissions + equipment_emissions +
            crew_transport_emissions + port_energy_emissions + processing_emissions
        )
        
        return {
            "total": total_indirect_emissions,
            "fuelUpstream": upstream_emissions,
            "boatManufacturing": trip_manufacturing_emissions,
            "equipment": equipment_emissions,
            "crewTransport": crew_transport_emissions,
            "portFacilities": port_energy_emissions,
            "fishProcessing": processing_emissions,
            "details": {
                "boatWeight": boat_weight,
                "crewSize": crew_size,
                "expectedCatch": expected_catch
            }
        }
    
    def _calculate_carbon_intensity(self, total_emissions: float, trip_data: dict) -> dict:
        """Calculate carbon intensity metrics"""
        
        expected_catch = trip_data.get("expectedCatch", 100)  # kg fish
        distance = trip_data.get("totalDistance", 100)  # km
        trip_duration = trip_data.get("tripDuration", 8)  # hours
        fuel_used = trip_data.get("fuelConsumptionLiters", 200)  # liters
        
        # Carbon intensity per unit of output
        emissions_per_kg_fish = total_emissions / max(expected_catch, 1)
        emissions_per_km = total_emissions / max(distance, 1)
        emissions_per_hour = total_emissions / max(trip_duration, 1)
        emissions_per_liter_fuel = total_emissions / max(fuel_used, 1)
        
        # Load thresholds for rating
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        thresholds = config["sustainabilityMetrics"]["carbonIntensityThresholds"]
        
        # Determine rating based on emissions per kg fish
        if emissions_per_kg_fish <= thresholds["excellent"]:
            rating = "excellent"
        elif emissions_per_kg_fish <= thresholds["good"]:
            rating = "good"
        elif emissions_per_kg_fish <= thresholds["average"]:
            rating = "average"
        else:
            rating = "poor"
        
        return {
            "emissionsPerKgFish": round(emissions_per_kg_fish, 2),
            "emissionsPerKm": round(emissions_per_km, 2),
            "emissionsPerHour": round(emissions_per_hour, 2),
            "emissionsPerLiterFuel": round(emissions_per_liter_fuel, 2),
            "intensityRating": rating,
            "benchmarkThresholds": thresholds
        }
    
    def _calculate_offset_costs(self, total_emissions_kg: float) -> dict:
        """Calculate costs for different carbon offset options"""
        
        emissions_tonnes = total_emissions_kg / 1000  # Convert to tonnes
        
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        pricing = config["carbonPricing"]
        programs = config["offsetPrograms"]
        
        # Calculate costs for different market types
        voluntary_cost = emissions_tonnes * pricing["voluntaryMarketPriceUSD"]
        compliance_cost = emissions_tonnes * pricing["complianceMarketPriceUSD"]
        premium_cost = emissions_tonnes * pricing["premiumOffsetPriceUSD"]
        future_cost = emissions_tonnes * pricing["futureOffsetPriceUSD"]
        
        # Calculate costs for specific offset programs
        program_costs = {}
        for program_id, program_data in programs.items():
            program_cost = emissions_tonnes * pricing["voluntaryMarketPriceUSD"] * program_data["priceMultiplier"]
            program_costs[program_id] = {
                "cost": round(program_cost, 2),
                "name": program_data["name"],
                "verificationStandard": program_data["verificationStandard"],
                "cobenefits": program_data["cobenefits"]
            }
        
        return {
            "emissionsTonnes": round(emissions_tonnes, 3),
            "marketPricing": {
                "voluntary": round(voluntary_cost, 2),
                "compliance": round(compliance_cost, 2),
                "premium": round(premium_cost, 2),
                "future": round(future_cost, 2)
            },
            "programOptions": program_costs,
            "recommendedOption": self._select_recommended_offset_program(program_costs, emissions_tonnes)
        }
    
    def _analyze_carbon_economics(self, trip_data: dict, total_emissions: float, offset_costs: dict) -> dict:
        """Analyze economic impact of carbon costs on trip profitability"""
        
        expected_revenue = trip_data.get("expectedRevenue", 120000)
        predicted_cost = trip_data.get("predictedCost", 100000)
        
        base_profit = expected_revenue - predicted_cost
        base_profit_margin = base_profit / expected_revenue if expected_revenue > 0 else 0
        
        # Calculate impact of different carbon pricing scenarios
        scenarios = {}
        for price_type, cost in offset_costs["marketPricing"].items():
            profit_with_carbon = base_profit - cost
            profit_margin_with_carbon = profit_with_carbon / expected_revenue if expected_revenue > 0 else 0
            
            scenarios[price_type] = {
                "carbonCost": cost,
                "profitWithCarbon": round(profit_with_carbon, 2),
                "profitMarginWithCarbon": round(profit_margin_with_carbon * 100, 2),
                "profitabilityImpact": round((profit_margin_with_carbon - base_profit_margin) * 100, 2)
            }
        
        # Break-even analysis - what carbon price would eliminate profit?
        breakeven_carbon_price = base_profit / offset_costs["emissionsTonnes"] if offset_costs["emissionsTonnes"] > 0 else float("inf")
        
        # Carbon cost as percentage of revenue
        carbon_cost_percentage = {}
        for price_type, cost in offset_costs["marketPricing"].items():
            carbon_cost_percentage[price_type] = round((cost / expected_revenue) * 100, 2) if expected_revenue > 0 else 0
        
        return {
            "baseProfit": round(base_profit, 2),
            "baseProfitMargin": round(base_profit_margin * 100, 2),
            "carbonImpactScenarios": scenarios,
            "breakevenCarbonPrice": round(breakeven_carbon_price, 2) if breakeven_carbon_price != float("inf") else None,
            "carbonCostAsPercentRevenue": carbon_cost_percentage,
            "economicRisk": self._assess_carbon_economic_risk(scenarios, base_profit_margin)
        }
    
    def _calculate_sustainability_rating(self, carbon_intensity: dict, trip_data: dict) -> dict:
        """Calculate overall sustainability rating and scoring"""
        
        # Component scores (0-100)
        carbon_score = self._score_carbon_performance(carbon_intensity)
        efficiency_score = self._score_fuel_efficiency(trip_data)
        innovation_score = self._score_sustainability_practices(trip_data)
        
        # Weighted overall score
        weights = {"carbon": 0.5, "efficiency": 0.3, "innovation": 0.2}
        overall_score = (
            weights["carbon"] * carbon_score +
            weights["efficiency"] * efficiency_score +
            weights["innovation"] * innovation_score
        )
        
        # Determine rating category
        if overall_score >= 90:
            rating = "A+"
            description = "Excellent sustainability performance"
        elif overall_score >= 80:
            rating = "A"
            description = "Very good sustainability performance"
        elif overall_score >= 70:
            rating = "B+"
            description = "Good sustainability performance"
        elif overall_score >= 60:
            rating = "B"
            description = "Average sustainability performance"
        elif overall_score >= 50:
            rating = "C"
            description = "Below average sustainability performance"
        else:
            rating = "D"
            description = "Poor sustainability performance - improvement needed"
        
        return {
            "overallScore": round(overall_score, 1),
            "letter_rating": rating,
            "description": description,
            "componentScores": {
                "carbon": round(carbon_score, 1),
                "efficiency": round(efficiency_score, 1),
                "innovation": round(innovation_score, 1)
            },
            "improvementAreas": self._identify_improvement_areas(carbon_score, efficiency_score, innovation_score)
        }
    
    def _score_carbon_performance(self, carbon_intensity: dict) -> float:
        """Score carbon performance based on intensity rating"""
        intensity_rating = carbon_intensity["intensityRating"]
        
        rating_scores = {
            "excellent": 95,
            "good": 80,
            "average": 60,
            "poor": 30
        }
        
        return rating_scores.get(intensity_rating, 30)
    
    def _score_fuel_efficiency(self, trip_data: dict) -> float:
        """Score fuel efficiency performance"""
        
        fuel_used = trip_data.get("fuelConsumptionLiters", 200)
        distance = trip_data.get("totalDistance", 100)
        
        fuel_per_km = fuel_used / max(distance, 1)
        
        # Load benchmarks
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        benchmarks = config["sustainabilityMetrics"]["efficiencyBenchmarks"]["fuelPerKm"]
        
        if fuel_per_km <= benchmarks["excellent"]:
            return 95
        elif fuel_per_km <= benchmarks["good"]:
            return 80
        elif fuel_per_km <= benchmarks["average"]:
            return 60
        else:
            return 30
    
    def _score_sustainability_practices(self, trip_data: dict) -> float:
        """Score sustainability practices and innovations"""
        
        score = 50  # Base score
        
        # Bonus points for sustainable practices
        if trip_data.get("usesBiodiesel", False):
            score += 20
        
        if trip_data.get("hasEnergyEfficientEquipment", False):
            score += 15
        
        if trip_data.get("participatesInSustainabilityPrograms", False):
            score += 10
        
        if trip_data.get("usesSustainableFishingMethods", False):
            score += 15
        
        engine_age = trip_data.get("engineAge", 10)
        if engine_age < 5:  # Newer, more efficient engines
            score += 10
        
        return min(score, 100)  # Cap at 100
    
    def _generate_reduction_recommendations(self, direct_emissions: dict, indirect_emissions: dict, 
                                          carbon_intensity: dict, trip_data: dict) -> List[dict]:
        """Generate carbon reduction recommendations"""
        
        recommendations = []
        
        # Fuel efficiency recommendations
        fuel_per_km = trip_data.get("fuelConsumptionLiters", 200) / max(trip_data.get("totalDistance", 100), 1)
        if fuel_per_km > 0.6:  # Above average fuel consumption
            recommendations.append({
                "category": "fuel_efficiency",
                "priority": "high",
                "action": "Optimize boat speed and routing to reduce fuel consumption",
                "potentialReduction": "15-25% fuel savings",
                "estimatedCO2Savings": round(direct_emissions["total"] * 0.2, 1),
                "implementation": "Adjust cruising speed to 8-10 knots for optimal efficiency"
            })
        
        # Engine maintenance recommendations
        if trip_data.get("engineEfficiency", 0.35) < 0.3:
            recommendations.append({
                "category": "maintenance",
                "priority": "medium",
                "action": "Improve engine maintenance for better efficiency",
                "potentialReduction": "10-15% emissions reduction",
                "estimatedCO2Savings": round(direct_emissions["total"] * 0.125, 1),
                "implementation": "Regular engine tuning, clean filters, proper lubrication"
            })
        
        # Alternative fuel recommendations
        if trip_data.get("fuelType", "diesel") == "diesel":
            recommendations.append({
                "category": "alternative_fuel",
                "priority": "medium",
                "action": "Consider biodiesel blend to reduce emissions",
                "potentialReduction": "20% reduction in carbon footprint",
                "estimatedCO2Savings": round(direct_emissions["total"] * 0.2, 1),
                "implementation": "Use B20 (20% biodiesel) or higher blend"
            })
        
        # Trip optimization recommendations
        if carbon_intensity["intensityRating"] in ["average", "poor"]:
            recommendations.append({
                "category": "trip_optimization",
                "priority": "high",
                "action": "Optimize catch per unit emissions through better planning",
                "potentialReduction": "Improve sustainability rating",
                "estimatedCO2Savings": "Same emissions, higher catch efficiency",
                "implementation": "Use fish-finding technology, optimize timing and locations"
            })
        
        # Equipment upgrades
        recommendations.append({
            "category": "equipment",
            "priority": "low",
            "action": "Invest in energy-efficient equipment and LED lighting",
            "potentialReduction": "5-10% reduction in indirect emissions",
            "estimatedCO2Savings": round(indirect_emissions["total"] * 0.075, 1),
            "implementation": "Replace older equipment with energy-efficient alternatives"
        })
        
        return recommendations
    
    def _recommend_offset_strategy(self, total_emissions: float, trip_data: dict) -> dict:
        """Recommend carbon offset strategy"""
        
        emissions_tonnes = total_emissions / 1000
        
        # Strategy based on emissions level and economic factors
        expected_revenue = trip_data.get("expectedRevenue", 120000)
        
        if emissions_tonnes <= 0.5:
            strategy = "minimal_offset"
            description = "Low emissions - optional voluntary offset"
        elif emissions_tonnes <= 1.5:
            strategy = "partial_offset"
            description = "Moderate emissions - offset 50-75% of emissions"
        else:
            strategy = "full_offset"
            description = "High emissions - consider full carbon neutrality"
        
        # Recommend specific programs
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        programs = config["offsetPrograms"]
        
        # Select program based on trip characteristics
        if trip_data.get("fishingZone", "coastal") == "coastal":
            recommended_program = "marineConservation"
        elif expected_revenue > 150000:  # High-value trip
            recommended_program = "communityDevelopment"
        else:
            recommended_program = "renewableEnergy"
        
        program_data = programs[recommended_program]
        cost = emissions_tonnes * 15.0 * program_data["priceMultiplier"]
        
        return {
            "strategy": strategy,
            "description": description,
            "recommendedProgram": {
                "id": recommended_program,
                "name": program_data["name"],
                "cost": round(cost, 2),
                "verification": program_data["verificationStandard"],
                "cobenefits": program_data["cobenefits"]
            },
            "offsetPercentage": 100 if strategy == "full_offset" else 75 if strategy == "partial_offset" else 25,
            "voluntaryIncentives": self._identify_voluntary_incentives(emissions_tonnes, trip_data)
        }
    
    def _analyze_regulatory_compliance(self, total_emissions: float, trip_data: dict) -> dict:
        """Analyze regulatory compliance related to carbon emissions"""
        
        emissions_tonnes = total_emissions / 1000
        
        # Simulate regulatory scenarios (these would be based on actual regulations)
        compliance_scenarios = {
            "current_voluntary": {
                "required": False,
                "threshold": None,
                "compliance_cost": 0,
                "status": "compliant"
            },
            "future_mandatory_low": {
                "required": True,
                "threshold": 2.0,  # tonnes CO2 per trip
                "compliance_cost": max(0, (emissions_tonnes - 2.0) * 30) if emissions_tonnes > 2.0 else 0,
                "status": "compliant" if emissions_tonnes <= 2.0 else "non_compliant"
            },
            "future_mandatory_high": {
                "required": True,
                "threshold": 1.0,  # tonnes CO2 per trip
                "compliance_cost": max(0, (emissions_tonnes - 1.0) * 50) if emissions_tonnes > 1.0 else 0,
                "status": "compliant" if emissions_tonnes <= 1.0 else "non_compliant"
            }
        }
        
        return {
            "currentCompliance": compliance_scenarios["current_voluntary"],
            "futureScenarios": {
                "moderateRegulation": compliance_scenarios["future_mandatory_low"],
                "strictRegulation": compliance_scenarios["future_mandatory_high"]
            },
            "preparednessRecommendations": self._generate_compliance_recommendations(emissions_tonnes),
            "regulatoryRisk": self._assess_regulatory_risk(emissions_tonnes)
        }
    
    def _select_recommended_offset_program(self, program_costs: dict, emissions_tonnes: float) -> dict:
        """Select the best offset program recommendation"""
        
        # Simple logic - for demonstration
        if emissions_tonnes < 0.5:
            recommended = "renewableEnergy"  # Cost-effective for small emissions
        elif emissions_tonnes < 1.5:
            recommended = "marineConservation"  # Good balance of cost and co-benefits
        else:
            recommended = "communityDevelopment"  # Maximum co-benefits for high emissions
        
        return {
            "programId": recommended,
            **program_costs[recommended],
            "reason": "Optimized for emissions level and co-benefits"
        }
    
    def _assess_carbon_economic_risk(self, scenarios: dict, base_margin: float) -> dict:
        """Assess economic risk from carbon pricing"""
        
        # Risk based on impact to profit margin
        voluntary_impact = abs(scenarios["voluntary"]["profitabilityImpact"])
        compliance_impact = abs(scenarios["compliance"]["profitabilityImpact"])
        
        if compliance_impact > 15:  # >15% impact to margin
            risk_level = "high"
        elif compliance_impact > 8:   # 8-15% impact
            risk_level = "medium"
        else:
            risk_level = "low"
        
        return {
            "riskLevel": risk_level,
            "maxProfitImpact": round(compliance_impact, 2),
            "marginSensitivity": "high" if base_margin < 0.15 else "medium" if base_margin < 0.3 else "low"
        }
    
    def _identify_improvement_areas(self, carbon_score: float, efficiency_score: float, innovation_score: float) -> List[str]:
        """Identify areas for sustainability improvement"""
        
        areas = []
        
        if carbon_score < 70:
            areas.append("carbon_intensity")
        if efficiency_score < 70:
            areas.append("fuel_efficiency")
        if innovation_score < 70:
            areas.append("sustainable_practices")
        
        return areas
    
    def _identify_market_incentives(self, carbon_intensity: dict, total_emissions: float) -> dict:
        """Identify market-based incentives for low-carbon fishing"""
        
        incentives = []
        
        # Load incentive programs
        with open(self.carbon_config_path, "r") as f:
            config = json.load(f)
        
        incentive_programs = config["incentivePrograms"]
        
        # Check for low-carbon bonus
        if carbon_intensity["emissionsPerKgFish"] <= incentive_programs["lowCarbonBonus"]["threshold"]:
            bonus_percent = incentive_programs["lowCarbonBonus"]["bonusPercent"]
            incentives.append({
                "type": "low_carbon_bonus",
                "description": f"{bonus_percent}% revenue bonus for low-carbon fishing",
                "qualification": f"Emissions per kg fish ≤ {incentive_programs['lowCarbonBonus']['threshold']} kg CO2"
            })
        
        # Check for carbon neutral potential
        emissions_tonnes = total_emissions / 1000
        if emissions_tonnes <= 0.5:  # Very low emissions, easily offset
            bonus_percent = incentive_programs["carbonNeutralBonus"]["bonusPercent"]
            incentives.append({
                "type": "carbon_neutral_bonus",
                "description": f"{bonus_percent}% revenue bonus for carbon-neutral trips",
                "qualification": "Total emissions ≤ 0.5 tonnes CO2 (easily offset)"
            })
        
        return {
            "availableIncentives": incentives,
            "marketPremium": len(incentives) > 0
        }
    
    def _identify_voluntary_incentives(self, emissions_tonnes: float, trip_data: dict) -> List[str]:
        """Identify voluntary incentives for carbon offsetting"""
        
        incentives = []
        
        if emissions_tonnes <= 1.0:
            incentives.append("Sustainability certification eligibility")
        
        if trip_data.get("fishingZone", "coastal") == "coastal":
            incentives.append("Coastal conservation program participation")
        
        incentives.append("Enhanced market reputation and branding")
        incentives.append("Potential price premiums from eco-conscious buyers")
        
        return incentives
    
    def _generate_compliance_recommendations(self, emissions_tonnes: float) -> List[str]:
        """Generate recommendations for regulatory compliance preparedness"""
        
        recommendations = []
        
        if emissions_tonnes > 2.0:
            recommendations.append("Implement immediate emissions reduction measures")
            recommendations.append("Develop carbon offset procurement strategy")
        elif emissions_tonnes > 1.0:
            recommendations.append("Monitor regulatory developments closely")
            recommendations.append("Consider voluntary emissions reductions")
        else:
            recommendations.append("Well-positioned for future regulations")
            recommendations.append("Consider leadership role in sustainability initiatives")
        
        return recommendations
    
    def _assess_regulatory_risk(self, emissions_tonnes: float) -> str:
        """Assess risk from future carbon regulations"""
        
        if emissions_tonnes > 2.0:
            return "high"  # Likely to face compliance costs
        elif emissions_tonnes > 1.0:
            return "medium"  # May face future compliance requirements
        else:
            return "low"  # Well-positioned for regulations