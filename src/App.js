import React, { useState, useCallback, useMemo, useEffect, useReducer } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  GeoJSON,
  Tooltip,
  Polyline,
  Polygon,
  LayersControl,
  FeatureGroup,
  useMapEvent
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import L from "leaflet";
import SunCalc from "suncalc";

/* ----- Fix default marker icons in CRA ----- */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Permaculture Design Context for state management
const PermacultureDesignContext = React.createContext();

function designReducer(state, action) {
  switch (action.type) {
    case 'UPDATE_SITE_DATA':
      return { ...state, siteData: { ...state.siteData, ...action.payload } };
    case 'ADD_DESIGN_ELEMENT':
      return { ...state, designElements: [...state.designElements, action.payload] };
    case 'UPDATE_PLANT_SELECTIONS':
      return { ...state, plantSelections: action.payload };
    case 'UPDATE_WATER_MANAGEMENT':
      return { ...state, waterManagement: action.payload };
    case 'SET_ACTIVE_PATTERN':
      return { ...state, activePattern: action.payload };
    case 'SET_PATTERN_POINTS':
      return { ...state, patternPoints: action.payload };
    case 'SET_SOIL_RECOMMENDATIONS':
      return { ...state, soilRecommendations: action.payload };
    case 'SET_COMMUNITY_DATA':
      return { ...state, communityData: action.payload };
    case 'SET_BOUNDARY':
      return { ...state, boundary: action.payload };
    case 'SET_DESIGN_ZONES':
      return { ...state, designZones: action.payload };
    case 'SET_WATER_FEATURES':
      return { ...state, waterFeatures: action.payload };
    case 'SET_PLANT_GUILDS':
      return { ...state, plantGuilds: action.payload };
    case 'SET_HOUSE_POSITION':
      return { ...state, housePosition: action.payload };
    default:
      return state;
  }
}

const initialState = {
  siteData: {},
  designElements: [],
  plantSelections: [],
  waterManagement: [],
  activePattern: null,
  patternPoints: [],
  soilRecommendations: [],
  communityData: {},
  boundary: null,
  designZones: [],
  waterFeatures: [],
  plantGuilds: [],
  housePosition: null
};

const DesignProvider = ({ children }) => {
  const [state, dispatch] = useReducer(designReducer, initialState);
  
  return (
    <PermacultureDesignContext.Provider value={{ state, dispatch }}>
      {children}
    </PermacultureDesignContext.Provider>
  );
};

// Enhanced Natural Pattern Utilities
const NaturalPatterns = {
  SPIRAL: {
    generatePoints: (center, size, rotations = 3) => {
      const points = [];
      for (let i = 0; i < 360 * rotations; i += 15) {
        const angle = (i * Math.PI) / 180;
        const distance = (size * i) / (360 * rotations);
        points.push([
          center[0] + distance * Math.cos(angle),
          center[1] + distance * Math.sin(angle)
        ]);
      }
      return points;
    },
    description: "Herb spirals maximize growing space and create microclimates",
    color: "#8e44ad"
  },
  MANDALA: {
    generatePoints: (center, radius, sectors = 8) => {
      const points = [];
      for (let i = 0; i < sectors; i++) {
        const angle = (i * 2 * Math.PI) / sectors;
        points.push([
          center[0] + radius * Math.cos(angle),
          center[1] + radius * Math.sin(angle)
        ]);
      }
      return points;
    },
    description: "Mandala gardens create efficient, beautiful growing spaces",
    color: "#e74c3c"
  },
  BRANCHING: {
    generatePoints: function(start, angle = -Math.PI/2, length = 0.01, generations = 3) {
      const points = [start];
      if (generations <= 0) return points;
      
      const leftAngle = angle - Math.PI / 4;
      const rightAngle = angle + Math.PI / 4;
      
      const leftEnd = [
        start[0] + length * Math.cos(leftAngle),
        start[1] + length * Math.sin(leftAngle)
      ];
      
      const rightEnd = [
        start[0] + length * Math.cos(rightAngle),
        start[1] + length * Math.sin(rightAngle)
      ];
      
      points.push(...this.generatePoints(leftEnd, leftAngle, length * 0.7, generations - 1));
      points.push(...this.generatePoints(rightEnd, rightAngle, length * 0.7, generations - 1));
      
      return points;
    },
    description: "Branching patterns efficiently distribute resources",
    color: "#3498db"
  }
};

// Enhanced Water Management Utilities
const WaterManagementUtils = {
  calculateWaterHarvestingPotential: (env, siteInputs) => {
    const roofArea = siteInputs.roofArea || 100; // m²
    const catchmentEfficiency = 0.8; // 80% efficiency
    const annualRainfall = env.avgRainfallMm / 1000; // Convert to meters
    
    const roofHarvest = roofArea * annualRainfall * catchmentEfficiency;
    
    // Calculate land water harvesting potential based on slope and soil
    let landHarvest = 0;
    if (env.slopePercent < 5) {
      landHarvest = annualRainfall * 0.3; // 30% capture on flat land
    } else if (env.slopePercent < 15) {
      landHarvest = annualRainfall * 0.5; // 50% capture on moderate slopes
    } else {
      landHarvest = annualRainfall * 0.7; // 70% capture on steep slopes with swales
    }
    
    return {
      roofHarvest: Math.round(roofHarvest),
      landHarvest: Math.round(landHarvest),
      total: Math.round(roofHarvest + landHarvest),
      units: 'm³'
    };
  },

  calculateSwaleSpecifications: (slopePercent, rainfall) => {
    const spacing = slopePercent < 5 ? 50 : // meters between swales on flat land
                   slopePercent < 10 ? 25 :
                   slopePercent < 20 ? 15 : 10;
                   
    const depth = slopePercent < 5 ? 0.3 : // meters deep
                  slopePercent < 10 ? 0.4 :
                  slopePercent < 20 ? 0.5 : 0.6;
                  
    return { spacing, depth };
  }
};

// Soil Health Assessment Utilities
const SoilHealthUtils = {
  assessSoilHealth: (env, siteInputs) => {
    const recommendations = [];
    
    // pH-based recommendations
    if (siteInputs.soilpH < 6) {
      recommendations.push({
        issue: "Acidic soil",
        solution: "Add wood ash or crushed shells at 1-2kg/m²",
        priority: "medium"
      });
    } else if (siteInputs.soilpH > 7.5) {
      recommendations.push({
        issue: "Alkaline soil",
        solution: "Add compost at 6kg/m² to lower pH by approximately 1 unit",
        priority: "medium"
      });
    }
    
    // Organic matter recommendations
    if (siteInputs.organicMatter < 3) {
      recommendations.push({
        issue: "Low organic matter",
        solution: "Apply 5-10cm mulch and incorporate green manures",
        priority: "high"
      });
    }
    
    // Water retention issues
    if (env.soil.includes("sandy") && env.avgRainfallMm < 1500) {
      recommendations.push({
        issue: "Poor water retention",
        solution: "Apply biochar at 5kg/m² and increase organic matter",
        priority: "high"
      });
    }
    
    return recommendations;
  },

  calculateBiocharNeeds: (area) => {
    const applicationRate = 5; // kg/m²
    return {
      amount: Math.round(area * applicationRate),
      units: "kg",
      note: "Activate biochar by soaking in compost tea before application"
    };
  }
};

// Community and Economic Features
const CommunityUtils = {
  createResourceExchange: (resources, skills) => {
    return {
      resourcesAvailable: resources,
      skillsAvailable: skills,
      transactions: [],
      addTransaction: function(from, to, resource, amount) {
        this.transactions.push({ from, to, resource, amount, date: new Date() });
      },
      getBalance: function(user) {
        return this.transactions.reduce((balance, transaction) => {
          if (transaction.to === user) return balance + transaction.amount;
          if (transaction.from === user) return balance - transaction.amount;
          return balance;
        }, 0);
      }
    };
  },

  planCommunityGarden: (participants, totalArea) => {
    const individualPlots = Math.floor(totalArea * 0.7 / participants.length);
    const commonArea = totalArea * 0.3;
    
    return {
      individualPlots: individualPlots,
      commonAreas: {
        composting: commonArea * 0.2,
        toolSharing: commonArea * 0.1,
        nursery: commonArea * 0.3,
        gatheringSpace: commonArea * 0.4
      },
      recommendedCrops: {
        individual: ["vegetables", "herbs", "flowers"],
        common: ["fruit trees", "nut trees", "medicinal plants"]
      }
    };
  }
};

const CarbonCalculator = {
  CARBON_RATES: {
    TREE: 22, // kg CO2 per year per tree
    SHRUB: 5,
    GRASS: 1,
    BAMBOO: 30,
    LEGUME: 8,
    CLIMBER: 3,
    FRUIT: 22,
    VINE: 5,
    VEGETABLE: 1,
    LEAFY_GREEN: 1,
    ROOT: 1
  },
  
  calculateSequestration: function(plants) {
    return plants.reduce((total, plant) => {
      const sequestrationRate = this.CARBON_RATES[plant.type] || 0;
      // Default to count of 1 if not specified
      const count = plant.count || 1;
      return total + (sequestrationRate * count);
    }, 0);
  },
  
  generateReport: function(sequestrationData) {
    const CARBON_PER_LITER_GASOLINE = 2.3; // kg CO2 per liter
    const equivalent = sequestrationData / CARBON_PER_LITER_GASOLINE;
    return `Your design sequesters ${sequestrationData} kg CO2/year, equivalent to ${equivalent.toFixed(1)} liters of gasoline not burned.`;
  }
};

/* ------------------------------------------------------------------
   MOCK spatial layers (replace later with real Kerala GeoJSON files)
-------------------------------------------------------------------*/
const soilPolygons = [
  {
    type: "Feature",
    properties: { soil: "lateritic-loam", name: "Lateritic Loam Zone" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.9, 11.05],
          [76.4, 11.05],
          [76.4, 9.5],
          [75.9, 9.5],
          [75.9, 11.05],
        ],
      ],
    },
  },
  {
    type: "Feature",
    properties: { soil: "alluvial", name: "Alluvial Lowland Zone" },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.9, 9.5],
          [76.4, 9.5],
          [76.4, 8.25],
          [75.9, 8.25],
          [75.9, 9.5],
        ],
      ],
    },
  },
];

const watershedPolygons = [
  {
    type: "Feature",
    properties: { id: "ws-1", name: "Example Watershed A", runoffFactor: 0.8 },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [75.7, 11.0],
          [76.7, 11.0],
          [76.7, 9.0],
          [75.7, 9.0],
          [75.7, 11.0],
        ],
      ],
    },
  },
];

// Define zones for ZonePlantingGuide
const ZONES = [
  { z: "Zone 0", r: 30, color: "#2e7d32", description: "House & kitchen garden" },
  { z: "Zone 1", r: 100, color: "#43a047", description: "Intensive annuals" },
  { z: "Zone 2", r: 200, color: "#66bb6a", description: "Perennial food forest" },
  { z: "Zone 3", r: 400, color: "#81c784", description: "Agroforestry" },
  { z: "Zone 4", r: 800, color: "#a5d6a7", description: "Timber & conservation" }
];

// Enhanced ELEMENT_TYPES with HOUSE and improved definitions
const ELEMENT_TYPES = {
  HOUSE: {
    name: "House",
    icon: "🏠",
    description: "Main dwelling - place first as reference point",
    optimalZone: "0",
    keralaName: "വീട്",
    color: "#e74c3c",
    geometry: "point",
    priority: 1
  },
  WATER_TANK: { 
    name: "Water Tank", 
    icon: "💧", 
    description: "Water storage for irrigation",
    optimalZone: "high",
    keralaName: "ജലസംഭരണി",
    color: "#3498db",
    geometry: "point",
    priority: 2
  },
  COMPOST: { 
    name: "Compost", 
    icon: "♻️", 
    description: "Organic waste recycling",
    optimalZone: "1",
    keralaName: "കമ്പോസ്റ്റ്",
    color: "#8e44ad",
    geometry: "point",
    priority: 3
  },
  CHICKEN_COOP: { 
    name: "Chicken Coop", 
    icon: "🐓", 
    description: "Poultry for eggs and manure",
    optimalZone: "1-2",
    keralaName: "കോഴിക്കൂട്",
    color: "#e67e22",
    geometry: "point",
    priority: 4
  },
  BEEHIVE: { 
    name: "Beehive", 
    icon: "🐝", 
    description: "Pollination and honey production",
    optimalZone: "1-2",
    keralaName: "തേനീച്ചക്കൂട്",
    color: "#f1c40f",
    geometry: "point",
    priority: 5
  },
  WINDBREAK: { 
    name: "Windbreak", 
    icon: "🌴", 
    description: "Protection from wind",
    optimalZone: "perimeter",
    keralaName: "കാറ്റുതടയം",
    color: "#27ae60",
    geometry: "line",
    priority: 6
  },
  SHED: { 
    name: "Tool Shed", 
    icon: "🔧", 
    description: "Storage for tools and equipment",
    optimalZone: "0-1",
    keralaName: "പണിമുട്ട് കോന്തറ",
    color: "#7f8c8d",
    geometry: "point",
    priority: 7
  },
  POND: { 
    name: "Pond", 
    icon: "🐟", 
    description: "Water storage and aquaculture",
    optimalZone: "low",
    keralaName: "കുളം",
    color: "#2980b9",
    geometry: "polygon",
    priority: 8
  },
  HERB_SPIRAL: { 
    name: "Herb Spiral", 
    icon: "🌀", 
    description: "Vertical herb garden with microclimates",
    optimalZone: "1",
    keralaName: "മൂലിക സർപ്പിളം",
    color: "#8e44ad",
    geometry: "point",
    priority: 9
  },
  MANDALA_GARDEN: { 
    name: "Mandala Garden", 
    icon: "⭕", 
    description: "Circular patterned garden",
    optimalZone: "1-2",
    keralaName: "മണ്ഡല തോട്ടം",
    color: "#e74c3c",
    geometry: "point",
    priority: 10
  },
  SWALE: { 
    name: "Swale", 
    icon: "🔻", 
    description: "Water harvesting trench on contour",
    optimalZone: "contour",
    keralaName: "വെള്ളം സംഭരിക്കുന്ന തോട്",
    color: "#16a085",
    geometry: "line",
    priority: 11
  },
  POND_AREA: { 
    name: "Pond Area", 
    icon: "🐟", 
    description: "Water storage and aquaculture area",
    optimalZone: "low",
    keralaName: "കുളം",
    color: "#2980b9",
    geometry: "polygon",
    priority: 12
  },
  VEGETABLE_GARDEN: {
    name: "Vegetable Garden",
    icon: "🥬",
    description: "Area for growing vegetables",
    optimalZone: "1",
    keralaName: "പച്ചക്കറി തോട്ടം",
    color: "#8bc34a",
    geometry: "polygon",
    priority: 13
  },
  FRUIT_ORCHARD: {
    name: "Fruit Orchard",
    icon: "🍎",
    description: "Area for fruit trees",
    optimalZone: "2",
    keralaName: "പഴത്തോട്ടം",
    color: "#ffd54f",
    geometry: "polygon",
    priority: 14
  },
  GRAIN_FIELD: {
    name: "Grain Field",
    icon: "🌾",
    description: "Area for grain crops",
    optimalZone: "3",
    keralaName: "ധാന്യവയൽ",
    color: "#a1887f",
    geometry: "polygon",
    priority: 15
  }
};

// Enhanced DEM Utilities with more realistic Kerala terrain
const DEMUtils = {
  generateDEM: function(lat, lng, radius = 0.05, boundary = null) {
    const demData = [];
    let points = 15; // Increased resolution
    
    // If we have a boundary, adjust to cover the boundary area
    if (boundary && boundary.geometry && boundary.geometry.coordinates) {
      const coords = boundary.geometry.coordinates[0];
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      
      coords.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
      
      // Generate points within the boundary area
      const latRange = maxLat - minLat;
      const lngRange = maxLng - minLng;
      points = Math.max(15, Math.floor(latRange * 2000)); // Higher point density
      
      // Create more realistic Kerala terrain (Western Ghats influence)
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      
      for (let i = 0; i <= points; i++) {
        for (let j = 0; j <= points; j++) {
          const pointLat = minLat + (i / points) * latRange;
          const pointLng = minLng + (j / points) * lngRange;
          
          // More realistic elevation model for Kerala
          // Western Ghats influence (higher to east/north)
          const distanceFromCenter = Math.sqrt(
            Math.pow((pointLat - centerLat) / latRange, 2) + 
            Math.pow((pointLng - centerLng) / lngRange, 2)
          );
          
          // Base elevation with hills
          let elevation = 5 + (Math.sin(pointLat * 50) * 3) + (Math.cos(pointLng * 50) * 2);
          
          // Add Western Ghats influence (higher elevation towards east)
          elevation += (pointLng - minLng) / lngRange * 8;
          
          // Add some randomness for natural variation
          elevation += (Math.random() - 0.5) * 2;
          
          // Ensure minimum elevation
          elevation = Math.max(2, elevation);
          
          demData.push({
            lat: pointLat,
            lng: pointLng,
            elevation: parseFloat(elevation.toFixed(1))
          });
        }
      }
    } else {
      // Original implementation for when no boundary exists
      const step = radius / points;
      
      for (let i = -points; i <= points; i++) {
        for (let j = -points; j <= points; j++) {
          const pointLat = lat + i * step;
          const pointLng = lng + j * step;
          
          // Enhanced elevation model
          const elevation = 10 + (i * 0.3) + (Math.sin(pointLat * 50) * 2) + (Math.random() * 0.5);
          
          demData.push({
            lat: pointLat,
            lng: pointLng,
            elevation: parseFloat(elevation.toFixed(1))
          });
        }
      }
    }
    
    return demData;
  },

  // Calculate slope and aspect from DEM data
  calculateTopography: function(demData) {
    const topography = [];
    
    // Sort data for easier neighbor finding
    const sortedData = [...demData].sort((a, b) => a.lat - b.lat || a.lng - b.lng);
    
    for (let i = 0; i < sortedData.length; i++) {
      const point = sortedData[i];
      
      // Find neighboring points within a small radius
      const neighbors = sortedData.filter(p => 
        p !== point &&
        Math.abs(p.lat - point.lat) < 0.003 && 
        Math.abs(p.lng - point.lng) < 0.003
      );
      
      if (neighbors.length >= 3) {
        // Calculate slope using plane fitting
        const elevations = neighbors.map(p => p.elevation);
        const avgElevation = elevations.reduce((sum, e) => sum + e, 0) / elevations.length;
        const slope = Math.abs(point.elevation - avgElevation) * 100; // Percentage slope
        
        // Calculate aspect (direction of steepest slope)
        const eastNeighbor = neighbors.find(p => p.lng > point.lng && Math.abs(p.lat - point.lat) < 0.001);
        const northNeighbor = neighbors.find(p => p.lat > point.lat && Math.abs(p.lng - point.lng) < 0.001);
        
        let aspect = 0;
        if (eastNeighbor && northNeighbor) {
          const dz_dx = eastNeighbor.elevation - point.elevation;
          const dz_dy = northNeighbor.elevation - point.elevation;
          aspect = Math.atan2(dz_dy, dz_dx) * 180 / Math.PI;
          if (aspect < 0) aspect += 360;
        }
        
        topography.push({
          ...point,
          slope: parseFloat(slope.toFixed(1)),
          aspect: parseFloat(aspect.toFixed(1))
        });
      }
    }
    
    return topography;
  },
  
  // Find high points for water tank placement
  findHighPoints: function(topography, count = 5) {
    return [...topography]
      .sort((a, b) => b.elevation - a.elevation)
      .slice(0, count);
  },
  
  // Find low points for pond placement
  findLowPoints: function(topography, count = 5) {
    return [...topography]
      .sort((a, b) => a.elevation - b.elevation)
      .slice(0, count);
  },
  
  // Calculate water flow paths with improved algorithm
  calculateWaterFlow: function(topography) {
    const flowPaths = [];
    const processedPoints = new Set();
    
    // Start from high points and simulate flow
    const highPoints = this.findHighPoints(topography, 10);
    
    highPoints.forEach(startPoint => {
      if (processedPoints.has(`${startPoint.lat},${startPoint.lng}`)) return;
      
      const path = [startPoint];
      let currentPoint = startPoint;
      processedPoints.add(`${currentPoint.lat},${currentPoint.lng}`);
      
      // Simulate water flow downhill (max 20 steps)
      for (let step = 0; step < 20; step++) {
        const neighbors = topography.filter(p => 
          !processedPoints.has(`${p.lat},${p.lng}`) &&
          Math.abs(p.lat - currentPoint.lat) < 0.002 && 
          Math.abs(p.lng - currentPoint.lng) < 0.002 &&
          p.elevation < currentPoint.elevation
        );
        
        if (neighbors.length > 0) {
          // Move to the steepest downhill neighbor
          const nextPoint = neighbors.reduce((steepest, p) => {
            const currentDrop = currentPoint.elevation - p.elevation;
            const steepestDrop = currentPoint.elevation - steepest.elevation;
            return currentDrop > steepestDrop ? p : steepest;
          }, neighbors[0]);
          
          path.push(nextPoint);
          currentPoint = nextPoint;
          processedPoints.add(`${currentPoint.lat},${currentPoint.lng}`);
        } else {
          break;
        }
      }
      
      if (path.length > 3) {
        flowPaths.push(path);
      }
    });
    
    return flowPaths;
  },

  // Generate contour lines
  generateContours: function(demData, interval = 2) {
    const contours = [];
    const minElevation = Math.min(...demData.map(p => p.elevation));
    const maxElevation = Math.max(...demData.map(p => p.elevation));
    
    for (let level = Math.ceil(minElevation); level <= maxElevation; level += interval) {
      const contourPoints = demData.filter(p => 
        Math.abs(p.elevation - level) < 0.5
      );
      
      if (contourPoints.length > 10) {
        contours.push({
          level,
          points: contourPoints
        });
      }
    }
    
    return contours;
  }
};

// Enhanced Boundary Utilities
const BoundaryUtils = {
  // Check if a point is inside the boundary
  isPointInBoundary: (point, boundary) => {
    if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) return true;
    
    const [lng, lat] = Array.isArray(point) ? [point[1], point[0]] : [point.lng, point.lat];
    const coordinates = boundary.geometry.coordinates[0];
    return pointInPolygon([lng, lat], coordinates);
  },
  
  // Filter points to only those inside the boundary
  filterPointsInBoundary: (points, boundary) => {
    if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) return points;
    
    return points.filter(point => {
      const lng = point.lng !== undefined ? point.lng : point[1];
      const lat = point.lat !== undefined ? point.lat : point[0];
      return pointInPolygon([lng, lat], boundary.geometry.coordinates[0]);
    });
  },
  
  // Generate a random point inside the boundary
  generateRandomPointInBoundary: (boundary) => {
    if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) return [10.85, 76.27];
    
    const coordinates = boundary.geometry.coordinates[0];
    
    // Find bounding box
    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    coordinates.forEach(([lng, lat]) => {
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    });
    
    // Generate random points until one is inside the boundary
    let point;
    let attempts = 0;
    do {
      const lng = minLng + Math.random() * (maxLng - minLng);
      const lat = minLat + Math.random() * (maxLat - minLat);
      point = [lat, lng];
      attempts++;
      
      if (attempts > 1000) {
        console.warn("Could not find point inside boundary after 1000 attempts");
        return [minLat + (maxLat-minLat)/2, minLng + (maxLng-minLng)/2];
      }
    } while (!pointInPolygon([point[1], point[0]], coordinates));
    
    return point;
  },

  // Generate multiple random points inside boundary
  generateMultiplePointsInBoundary: (boundary, count = 5) => {
    const points = [];
    for (let i = 0; i < count; i++) {
      points.push(this.generateRandomPointInBoundary(boundary));
    }
    return points;
  },

  // Calculate centroid of boundary
  calculateCentroid: (boundary) => {
    if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) return [10.85, 76.27];
    
    const coordinates = boundary.geometry.coordinates[0];
    let sumLat = 0, sumLng = 0;
    
    coordinates.forEach(([lng, lat]) => {
      sumLng += lng;
      sumLat += lat;
    });
    
    return [sumLat / coordinates.length, sumLng / coordinates.length];
  },
  findClosestPointOnBoundary: (point, boundary) => {
    if (!boundary || !boundary.geometry || !boundary.geometry.coordinates) return point;
    
    const [lng, lat] = Array.isArray(point) ? [point[1], point[0]] : [point.lng, point.lat];
    const coordinates = boundary.geometry.coordinates[0];
    
    let minDistance = Infinity;
    let closestPoint = [lat, lng]; // Return in [lat, lng] format
    
    // Check each segment of the boundary polygon
    for (let i = 0; i < coordinates.length - 1; i++) {
      const [x1, y1] = coordinates[i];     // [lng, lat]
      const [x2, y2] = coordinates[i + 1]; // [lng, lat]
      
      // Find closest point on this segment
      const closest = BoundaryUtils.findClosestPointOnSegment(lng, lat, x1, y1, x2, y2);
      const distance = BoundaryUtils.calculateDistanceBetweenPoints(lng, lat, closest[0], closest[1]);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = [closest[1], closest[0]]; // Convert back to [lat, lng]
      }
    }
    
    return closestPoint;
  },

  // Helper function to find closest point on a line segment
  findClosestPointOnSegment: (px, py, x1, y1, x2, y2) => {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    return [xx, yy];
  },

  // Helper function to calculate distance between two points
  calculateDistanceBetweenPoints: (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
};

/* ----------------- Helpers ------------------ */
// simple point-in-polygon (ray-casting)
function pointInPolygon(point, vs) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const [xi, yi] = vs[i];
    const [xj, yj] = vs[j];
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// sample mock soil/watershed if within demo polygons
function sampleSoilAt(lng, lat) {
  const pt = [lng, lat];
  for (const f of soilPolygons) {
    const vs = f.geometry.coordinates[0];
    if (pointInPolygon(pt, vs)) return f.properties.soil;
  }
  return "mixed-loam";
}

function sampleWatershedAt(lng, lat) {
  const pt = [lng, lat];
  for (const f of watershedPolygons) {
    const vs = f.geometry.coordinates[0];
    if (pointInPolygon(pt, vs)) return f.properties;
  }
  return null;
}

// fallbacks used if NASA API fails
function fallbackRain(lat, lng) {
  if (lat >= 9.2 && lng >= 75.5 && lng <= 76.9) return 2500 + Math.round((11.5 - lat) * 100);
  return 1500 + Math.round((10.5 - lat) * 50);
}

function fallbackSunHours(lat) {
  return 6.5 + (10 - Math.abs(lat - 10.5)) * 0.1;
}

function fallbackSlope(lat) {
  if (lat > 10.5) return 8 + Math.round(Math.abs(lat - 11) * 2);
  return 3 + Math.round(Math.abs(lat - 9.5) * 1.5);
}

/* ----------------- Flood Risk Mapping ----------------- */
function generateFloodRiskMap(lat, lng, slope, rainfall) {
  const riskLevel = 
    slope < 5 && rainfall > 2200 ? "high" :
    slope < 10 && rainfall > 1800 ? "medium" : "low";
    
  return {
    type: "Feature",
    properties: { risk: riskLevel },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [lng-0.05, lat-0.05],
        [lng+0.05, lat-0.05],
        [lng+0.05, lat+0.05],
        [lng-0.05, lat+0.05],
        [lng-0.05, lat-0.05]
      ]]
    }
  };
}

/* ----------------- NASA POWER fetch ------------------
   We'll fetch:
   - PRECTOTCORR (precipitation)   -> mm/day climatology -> annual
   - ALLSKY_SFC_SW_DWN (solar)     -> kWh/m2/day -> convert to sun-hours
   If the request fails (offline/CORS), we use fallbacks above.
-------------------------------------------------------*/
async function getClimateFromNASA(lat, lng) {
  try {
    const url =
      `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=PRECTOTCORR,ALLSKY_SFC_SW_DWN&community=AG&longitude=${lng}&latitude=${lat}&start=1991&end=2020&format=JSON`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("NASA API error");
    const data = await res.json();

    // monthly climatologies (12 values). Sum precip, average solar.
    const p = Object.values(data.properties.parameter.PRECTOTCORR); // mm/day
    const s = Object.values(data.properties.parameter.ALLSKY_SFC_SW_DWN); // kWh/m2/day

    // total annual rainfall (approx): sum(mm/day * days in month)
    const days = [31,28,31,30,31,30,31,31,30,31,30,31];
    const annualMm = Math.round(p.reduce((sum, mmPerDay, i) => sum + mmPerDay * days[i], 0));

    // average daily solar (kWh/m2/day). Convert to "sun-hours" (divide by ~1 kW/m2).
    const avgKwhPerDay = s.reduce((a, b) => a + b, 0) / s.length;
    const sunHours = Math.max(3, Math.min(10, avgKwhPerDay)); // clamp to 3-10

    return {
      source: "NASA POWER",
      avgRainfallMm: annualMm,
      sunHours,
      monthlyRainfall: days.map((days, i) => Math.round(p[i] * days))
    };
  } catch (e) {
    const fallbackRainfall = fallbackRain(lat, lng);
    return {
      source: "fallback",
      avgRainfallMm: fallbackRainfall,
      sunHours: fallbackSunHours(lat),
      monthlyRainfall: Array(12).fill(Math.round(fallbackRainfall/12))
    };
  }
}

/* ----------------- Rainfall Chart ----------------- */
const RainfallChart = React.memo(({ monthlyRainfall }) => {
  if (!monthlyRainfall || monthlyRainfall.length === 0) return null;
  
  const maxRain = Math.max(...monthlyRainfall);
  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 5 }}>Monthly Rainfall (mm)</div>
      <div style={{ display: 'flex', height: 60, alignItems: 'flex-end' }}>
        {monthlyRainfall.map((rain, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ 
              height: `${(rain/(maxRain+1))*50}px`,
              background: '#29b6f6',
              margin: '0 2px',
              position: 'relative'
            }}>
              <span style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                fontSize: 10
              }}>{rain}</span>
            </div>
            <div style={{ fontSize: 10 }}>{months[i]}</div>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ----------------- Monsoon Advisory ----------------- */
function getMonsoonAdvisory(monthlyRainfall) {
  if (!monthlyRainfall || monthlyRainfall.length === 0) return null;
  
  const maxMonth = monthlyRainfall.indexOf(Math.max(...monthlyRainfall));
  const monsoonMonths = [6,7,8,9]; // Jun-Sep
  
  return {
    status: monsoonMonths.includes(maxMonth) ? "active" : "dormant",
    advice: monsoonMonths.includes(maxMonth) 
      ? "🌧️ Monsoon Active: Focus on water diversion and soil protection" 
      : "☀️ Dry Season: Focus on water conservation and irrigation"
  };
}

/* ----------------- Plant database ------------------
   Kerala-friendly list + companions + spacing/pattern hints
-----------------------------------------------------*/
const PLANTS = [
  {
    name: "Coconut",
    scientific: "Cocos nucifera",
    functions: ["food", "shade", "windbreak"],
    water: "moderate–high",
    sunlight: "full sun",
    spacing: "7–8 m",
    pattern: "grid or triangle",
    companions: ["Banana", "Black Pepper", "Pineapple", "Ginger", "Turmeric"],
    suitability: (e) => e.avgRainfallMm >= 1200 && e.sunHours >= 5,
    type: "TREE"
  },
  {
    name: "Banana",
    scientific: "Musa spp.",
    functions: ["food", "mulch biomass"],
    water: "high",
    sunlight: "full/partial",
    spacing: "2–3 m clumps",
    pattern: "clumps along contours",
    companions: ["Taro", "Sweet Potato", "Turmeric", "Ginger"],
    suitability: (e) => e.avgRainfallMm >= 1400 && e.soil.includes("loam"),
    type: "SHRUB"
  },
  {
    name: "Black Pepper",
    scientific: "Piper nigrum",
    functions: ["cash crop", "climber"],
    water: "moderate",
    sunlight: "partial shade",
    spacing: "3 m",
    pattern: "on live standards (Coconut/Areca)",
    companions: ["Coconut", "Areca"],
    suitability: (e) => e.avgRainfallMm >= 1800 && (e.soil.includes("loam") || e.soil.includes("lateritic")),
    type: "CLIMBER"
  },
  {
    name: "Arecanut",
    scientific: "Areca catechu",
    functions: ["cash crop", "canopy"],
    water: "moderate–high",
    sunlight: "full sun",
    spacing: "2.7 x 2.7 m",
    pattern: "grid",
    companions: ["Black Pepper", "Pineapple"],
    suitability: (e) => e.avgRainfallMm >= 1500,
    type: "TREE"
  },
  {
    name: "Moringa",
    scientific: "Moringa oleifera",
    functions: ["food", "fast biomass", "soil improver"],
    water: "low–moderate",
    sunlight: "full sun",
    spacing: "2–4 m",
    pattern: "hedgerows along paths",
    companions: ["Pigeon Pea", "Cowpea"],
    suitability: (e) => e.sunHours >= 5 && e.avgRainfallMm >= 800,
    type: "TREE"
  },
  {
    name: "Pigeon Pea",
    scientific: "Cajanus cajan",
    functions: ["nitrogen fixer", "mulch"],
    water: "low–moderate",
    sunlight: "full sun",
    spacing: "1–1.5 m",
    pattern: "alley cropping",
    companions: ["Moringa", "Cassava"],
    suitability: () => true,
    type: "LEGUME"
  },
  {
    name: "Turmeric",
    scientific: "Curcuma longa",
    functions: ["cash crop", "mulch"],
    water: "moderate–high",
    sunlight: "partial shade",
    spacing: "30–45 cm",
    pattern: "beds under banana",
    companions: ["Banana", "Ginger"],
    suitability: (e) => e.avgRainfallMm >= 1500 && e.soil.includes("loam"),
    type: "ROOT"
  },
  {
    name: "Ginger",
    scientific: "Zingiber officinale",
    functions: ["cash crop", "mulch"],
    water: "moderate–high",
    sunlight: "partial shade",
    spacing: "20–30 cm",
    pattern: "raised beds",
    companions: ["Turmeric", "Banana"],
    suitability: (e) => e.avgRainfallMm >= 1500,
    type: "ROOT"
  },
  {
    name: "Cassava (Tapioca)",
    scientific: "Manihot esculenta",
    functions: ["food", "erosion control"],
    water: "moderate",
    sunlight: "full sun",
    spacing: "1–1.5 m",
    pattern: "on contour bunds",
    companions: ["Pigeon Pea"],
    suitability: (e) => e.slopePercent >= 3,
    type: "ROOT"
  },
  {
    name: "Jackfruit",
    scientific: "Artocarpus heterophyllus",
    functions: ["food", "shade", "habitat"],
    water: "moderate–high",
    sunlight: "full sun",
    spacing: "8–10 m",
    pattern: "scattered canopy",
    companions: ["Turmeric", "Ginger"],
    suitability: (e) => e.avgRainfallMm >= 1200,
    type: "TREE"
  },
  {
    name: "Nutmeg",
    scientific: "Myristica fragrans",
    functions: ["spice", "understory"],
    water: "high",
    sunlight: "partial shade",
    spacing: "8 m",
    pattern: "under coconut canopy",
    companions: ["Banana"],
    suitability: (e) => e.avgRainfallMm >= 2000,
    type: "TREE"
  },
  {
    name: "Cardamom",
    scientific: "Elettaria cardamomum",
    functions: ["spice", "understory"],
    water: "high",
    sunlight: "shade",
    spacing: "2 m",
    pattern: "under silver oak/areca",
    companions: ["Silver Oak"],
    suitability: (e) => e.avgRainfallMm >= 2000 && e.sunHours <= 6,
    type: "HERB"
  },
  {
    name: "Pokkali Rice",
    scientific: "Oryza sativa",
    functions: ["food", "salt-tolerant", "traditional crop"],
    water: "very high",
    sunlight: "full sun",
    spacing: "20-25 cm",
    pattern: "transplanted in flooded fields",
    plantingTime: "Jun-Jul (With monsoon onset)",
    plantingLocation: "Low-lying waterlogged areas",
    waterRequirement: "very high",
    sunlightRequirement: "full",
    soilRequirement: "clayey, water-retentive",
    companions: [
      { name: "Fish", benefit: "Integrated farming provides natural fertilization" },
      { name: "Prawns", benefit: "Integrated farming ecosystem" }
    ],
    suitability: (e) => e.soil.includes("alluvial") && e.avgRainfallMm >= 2200,
    specialNotes: "Traditional saline-tolerant rice variety of Kerala, grown in coastal regions",
    type: "GRAIN"
  },
  {
    name: "Drumstick (Moringa)",
    scientific: "Moringa oleifera",
    functions: ["food", "medicinal", "fast-growing"],
    water: "low",
    sunlight: "full sun",
    spacing: "3-4 m",
    pattern: "boundaries or scattered",
    plantingTime: "May-Jul (With monsoon rains)",
    plantingLocation: "Zone 1-2, well-drained areas",
    waterRequirement: "low",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, sandy loam",
    companions: [
      { name: "Turmeric", benefit: "Shade tolerance" },
      { name: "Chili", benefit: "Space optimization" }
    ],
    suitability: (e) => e.sunHours >= 6,
    specialNotes: "Highly nutritious leaves and pods, drought resistant",
    type: "TREE"
  },
  {
    name: "Taro (Chembu)",
    scientific: "Colocasia esculenta",
    functions: ["food", "shade-tolerant", "wetland crop"],
    water: "high",
    sunlight: "partial shade",
    spacing: "45-60 cm",
    pattern: "raised beds in waterlogged areas",
    plantingTime: "Apr-Jun (Pre-monsoon)",
    plantingLocation: "Waterlogged areas, pond edges",
    waterRequirement: "high",
    sunlightRequirement: "partial",
    soilRequirement: "water-retentive, organic-rich",
    companions: [
      { name: "Coconut", benefit: "Utilizes shaded, wet areas" },
      { name: "Fish", benefit: "Integrated farming in ponds" }
    ],
    suitability: (e) => e.avgRainfallMm >= 1800,
    specialNotes: "Traditional Kerala staple, grows well in waterlogged conditions",
    type: "ROOT"
  },
  {
    name: "Yam (Chena)",
    scientific: "Dioscorea spp.",
    functions: ["food", "climber", "shade-tolerant"],
    water: "moderate",
    sunlight: "partial shade",
    spacing: "60-90 cm",
    pattern: "mounds with support trees",
    plantingTime: "Apr-May (Pre-monsoon)",
    plantingLocation: "Zone 2-3, with tree support",
    waterRequirement: "moderate",
    sunlightRequirement: "partial",
    soilRequirement: "well-drained, sandy loam",
    companions: [
      { name: "Gliricidia", benefit: "Provides support and nitrogen" },
      { name: "Coconut", benefit: "Utilizes shaded areas" }
    ],
    suitability: (e) => e.soil.includes("sandy") || e.soil.includes("loam"),
    specialNotes: "Important tropical tuber crop, requires support for climbing",
    type: "ROOT"
  },
  {
    name: "Curry Leaf",
    scientific: "Murraya koenigii",
    functions: ["culinary", "medicinal", "hedge plant"],
    water: "moderate",
    sunlight: "full sun to partial shade",
    spacing: "1.5-2 m",
    pattern: "hedges or boundaries",
    plantingTime: "Jun-Aug (Monsoon season)",
    plantingLocation: "Zone 1, near kitchen",
    waterRequirement: "moderate",
    sunlightRequirement: "full to partial",
    soilRequirement: "well-drained, fertile",
    companions: [
      { name: "Turmeric", benefit: "Similar water requirements" },
      { name: "Chili", benefit: "Culinary companions" }
    ],
    suitability: (e) => e.avgRainfallMm >= 1000,
    specialNotes: "Essential in Kerala cuisine, perennial shrub",
    type: "SHRUB"
  },
  {
    name: "Bitter Gourd (Pavakka)",
    scientific: "Momordica charantia",
    functions: ["food", "medicinal", "climber"],
    water: "moderate",
    sunlight: "full sun",
    spacing: "60-90 cm",
    pattern: "trellises or fences",
    plantingTime: "Jan-Mar & Jun-Jul",
    plantingLocation: "Zone 1, with vertical support",
    waterRequirement: "moderate",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, fertile",
    companions: [
      { name: "Beans", benefit: "Similar trellis requirements" },
      { name: "Cucumber", benefit: "Similar growing conditions" }
    ],
    suitability: (e) => e.sunHours >= 5,
    specialNotes: "Heat-loving vine, valued for medicinal properties",
    type: "VINE"
  },
  {
    name: "Okra (Vendakka)",
    scientific: "Abelmoschus esculentus",
    functions: ["food", "quick yield"],
    water: "moderate",
    sunlight: "full sun",
    spacing: "30-45 cm",
    pattern: "raised beds",
    plantingTime: "Jun-Jul & Oct-Nov",
    plantingLocation: "Zone 1, well-drained areas",
    waterRequirement: "moderate",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, fertile",
    companions: [
      { name: "Pepper", benefit: "Space optimization" },
      { name: "Cucumber", benefit: "Similar growing season" }
    ],
    suitability: (e) => e.sunHours >= 6,
    specialNotes: "Fast-growing warm season vegetable",
    type: "VEGETABLE"
  },
  {
    name: "Amaranth (Cheera)",
    scientific: "Amaranthus spp.",
    functions: ["food", "leafy vegetable", "drought-tolerant"],
    water: "low-moderate",
    sunlight: "full sun",
    spacing: "15-20 cm",
    pattern: "broadcast or rows",
    plantingTime: "Year-round (except peak monsoon)",
    plantingLocation: "Zone 1, quick access areas",
    waterRequirement: "low-moderate",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, fertile",
    companions: [
      { name: "Onion", benefit: "Pest management" },
      { name: "Beans", benefit: "Soil nitrogen benefit" }
    ],
    suitability: () => true,
    specialNotes: "Highly nutritious leafy green, grows quickly",
    type: "LEAFY_GREEN"
  },
  {
    name: "Cucumber (Vellarikka)",
    scientific: "Cucumis sativus",
    functions: ["food", "climber", "high yield"],
    water: "high",
    sunlight: "full sun",
    spacing: "60-90 cm",
    pattern: "trellises or ground cover",
    plantingTime: "Dec-Jan & Jun-Jul",
    plantingLocation: "Zone 1, with support structures",
    waterRequirement: "high",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, organic-rich",
    companions: [
      { name: "Corn", benefit: "Natural trellis support" },
      { name: "Beans", benefit: "Nitrogen fixation" }
    ],
    suitability: (e) => e.sunHours >= 5 && e.avgRainfallMm >= 1200,
    specialNotes: "Requires consistent moisture, popular in Kerala salads",
    type: "VINE"
  },
  {
    name: "Pineapple",
    scientific: "Ananas comosus",
    functions: ["food", "cash crop", "drought-tolerant"],
    water: "low-moderate",
    sunlight: "full sun",
    spacing: "30-45 cm",
    pattern: "double rows with mulch",
    plantingTime: "Apr-Jun (Pre-monsoon)",
    plantingLocation: "Sloping areas with good drainage",
    waterRequirement: "low-moderate",
    sunlightRequirement: "full",
    soilRequirement: "acidic, well-drained",
    companions: [
      { name: "Black Pepper", benefit: "Shared growing conditions" },
      { name: "Ginger", benefit: "Similar microclimate needs" }
    ],
    suitability: (e) => e.slopePercent >= 5 && e.soil.includes("lateritic"),
    specialNotes: "Thrives in acidic laterite soils common in Kerala",
    type: "FRUIT"
  },
  {
    name: "Tamarind",
    scientific: "Tamarindus indica",
    functions: ["food", "shade", "long-lived"],
    water: "low",
    sunlight: "full sun",
    spacing: "10-12 m",
    pattern: "scattered in boundaries",
    plantingTime: "Jun-Jul (Monsoon onset)",
    plantingLocation: "Zone 4-5, large areas",
    waterRequirement: "low",
    sunlightRequirement: "full",
    soilRequirement: "well-drained, deep soil",
    companions: [
      { name: "Turmeric", benefit: "Grows well in partial shade" },
      { name: "Ginger", benefit: "Utilizes shaded understory" }
    ],
    suitability: (e) => e.avgRainfallMm >= 500,
    specialNotes: "Drought-resistant tree, provides valuable shade",
    type: "TREE"
  },
  {
    name: "Betel Leaf (Vettila)",
    scientific: "Piper betle",
    functions: ["cash crop", "shade-loving", "climber"],
    water: "high",
    sunlight: "shade",
    spacing: "30-45 cm",
    pattern: "shaded trellises",
    plantingTime: "May-Jul (Monsoon season)",
    plantingLocation: "Shaded areas, under trees",
    waterRequirement: "high",
    sunlightRequirement: "shade",
    soilRequirement: "well-drained, organic-rich",
    companions: [
      { name: "Arecanut", benefit: "Provides ideal shade" },
      { name: "Coconut", benefit: "Understory utilization" }
    ],
    suitability: (e) => e.sunHours <= 4 && e.avgRainfallMm >= 2000,
    specialNotes: "High-value crop requiring high humidity and shade",
    type: "CLIMBER"
  },
];

// Filter plants by water requirements
function filterByWaterRequirement(plants, waterAvailability) {
  return plants.filter(plant => {
    switch (plant.waterRequirement) {
      case "low":
        return waterAvailability === "low" || waterAvailability === "medium";
      case "moderate":
        return waterAvailability === "medium" || waterAvailability === "high";
      case "high":
        return waterAvailability === "high";
      case "very high":
        return waterAvailability === "very high";
      default:
        return true;
    }
  });
}

// Filter plants by sunlight requirements
function filterBySunlight(plants, sunlightHours) {
  return plants.filter(plant => {
    switch (plant.sunlightRequirement) {
      case "shade":
        return sunlightHours <= 4;
      case "partial":
        return sunlightHours > 4 && sunlightHours <= 6;
      case "full":
        return sunlightHours > 6;
      default:
        return true;
    }
  });
}

/* ----------------- Plant Layouts ----------------- */
const PLANT_LAYOUTS = {
  "Banana-Turmeric-Ginger": {
    pattern: [
      { plant: "Banana", offset: [0, 0] },
      { plant: "Turmeric", offset: [0.0001, 0.0001] },
      { plant: "Turmeric", offset: [-0.0001, 0.0001] },
      { plant: "Ginger", offset: [0.0001, -0.0001] },
      { plant: "Ginger", offset: [-0.0001, -0.0001] }
    ]
  },
  "Coconut-Pepper": {
    pattern: [
      { plant: "Coconut", offset: [0, 0] },
      { plant: "Black Pepper", offset: [0.00005, 0.00005] },
      { plant: "Black Pepper", offset: [-0.00005, -0.00005] },
      { plant: "Black Pepper", offset: [0.00005, -0.00005] },
      { plant: "Black Pepper", offset: [-0.00005, 0.00005] }
    ]
  }
};

/* ----------------- Design Templates ----------------- */
const DESIGN_TEMPLATES = {
  homestead: {
    name: "1-Acre Homestead",
    zones: [
      { z: "Zone 0", r: 30, color: "#2e7d32", description: "House & kitchen garden" },
      { z: "Zone 1", r: 100, color: "#43a047", description: "Intensive annuals" },
      { z: "Zone 2", r: 200, color: "#66bb6a", description: "Perennial food forest" },
      { z: "Zone 3", r: 400, color: "#81c784", description: "Agroforestry" },
      { z: "Zone 4", r: 800, color: "#a5d6a7", description: "Timber & conservation" }
    ],
    plants: ["Coconut", "Banana", "Moringa", "Vegetables"]
  },
  agroforestry: {
    name: "Coconut-Based Agroforestry",
    zones: [
      { z: "Zone 0", r: 20, color: "#2e7d32", description: "Processing area" },
      { z: "Zone 1", r: 150, color: "#43a047", description: "Coconut + pepper" },
      { z: "Zone 2", r: 300, color: "#66bb6a", description: "Fruit trees" },
      { z: "Zone 3", r: 600, color: "#81c784", description: "Timber trees" }
    ],
    plants: ["Coconut", "Black Pepper", "Nutmeg", "Jackfruit"]
  }
};

function recommendPlants(env, plantFilter) {
  let filteredPlants = PLANTS.filter(p => p.suitability(env));
  
  // Apply water requirement filter
  const waterAvailability = env.avgRainfallMm > 2000 ? "very high" :
                           env.avgRainfallMm > 1500 ? "high" :
                           env.avgRainfallMm > 1000 ? "medium" : "low";
  filteredPlants = filterByWaterRequirement(filteredPlants, waterAvailability);
  
  // Apply sunlight filter
  filteredPlants = filterBySunlight(filteredPlants, env.sunHours);
  
  // Apply other filters
  filteredPlants = filteredPlants.filter(p => {
    if (plantFilter.function && !p.functions.includes(plantFilter.function)) {
      return false;
    }
    
    if (plantFilter.edibility === 'edible' && 
        !p.functions.includes('food') && 
        !p.functions.includes('cash crop')) {
      return false;
    }
    
    return true;
  });
  
  return filteredPlants
    .map(p => ({ ...p, score: p.functions.length }))
    .sort((a, b) => b.score - a.score);
}

/* ----------------- Water management plans ----------------- */
function waterManagement(env, siteInputs) {
  const plans = [];
  const floodRisk = siteInputs.floodRisk || 'medium';

  // Enhanced water harvesting calculations
  const waterHarvesting = WaterManagementUtils.calculateWaterHarvestingPotential(env, siteInputs);
  const swaleSpecs = WaterManagementUtils.calculateSwaleSpecifications(env.slopePercent, env.avgRainfallMm);
  
  plans.push({ 
    name: `Water harvesting potential: ${waterHarvesting.total} ${waterHarvesting.units}/year`, 
    why: `Roof: ${waterHarvesting.roofHarvest} ${waterHarvesting.units}, Land: ${waterHarvesting.landHarvest} ${waterHarvesting.units}` 
  });
  
  plans.push({ 
    name: `Swale design: ${swaleSpecs.spacing}m spacing, ${swaleSpecs.depth}m depth`, 
    why: "Optimal for your slope and rainfall conditions" 
  });

  // base practices
  plans.push({ name: "Mulch + contour planting", why: "Reduce evaporation & slow runoff." });

  if (env.slopePercent >= 10) {
    plans.push({ name: "Contour swales (0.5–1 m wide, 0.3 m deep) every 15–25 m", why: "Steep slopes need strong slowing." });
    plans.push({ name: "Staggered contour trenches (SCI)", why: "Breaks sheet flow, increases infiltration." });
  } else if (env.slopePercent >= 5) {
    plans.push({ name: "Shallow swales every 25–40 m + percolation pits (1 m³) at low points", why: "Moderate slope — spread & sink." });
  } else {
    plans.push({ name: "Micro-catchments around trees (donut basins)", why: "Gentle slope — simple infiltration works." });
  }

  if (env.avgRainfallMm >= 2200) {
    plans.push({ name: "Farm pond (400–1000 m²) with overflow to wetland", why: "Store excess monsoon water." });
    plans.push({ name: "Spillways with vetiver hedges", why: "Stabilize overflow points." });
  } else if (env.avgRainfallMm <= 1400) {
    plans.push({ name: "Roof rainwater harvesting + lined tanks", why: "Low rainfall — store from roofs." });
    plans.push({ name: "Drip irrigation + heavy mulch", why: "Efficient use of limited water." });
  }

  if (env.soil.includes("alluvial")) {
    plans.push({ name: "Raised beds + drainage furrows", why: "Avoid waterlogging in lowlands." });
  } else if (env.soil.includes("lateritic")) {
    plans.push({ name: "Keyline-inspired ripping (along key contour)", why: "Encourage lateral subsurface flow." });
  }

  // Flood risk additions
  if (floodRisk === 'high') {
    plans.push({ 
      name: "Flood-tolerant species in low areas", 
      why: "Use taro, water spinach, and pokkali rice" 
    });
    plans.push({ 
      name: "Elevated planting mounds", 
      why: "Create 1m high mounds for sensitive plants" 
    });
  }

  return plans;
}

/* ----------------- Timeline Generator ----------------- */
const TimelineGenerator = React.memo(({ waterPlans, plantRecs }) => {
  const phases = [
    {
      name: "Phase 1: Water (Months 1-3)",
      tasks: [
        "Excavate swales & ponds",
        "Install rainwater harvesting",
        ...waterPlans.filter(p => p.name.includes("swales") || p.name.includes("pond"))
          .map(p => p.name)
      ]
    },
    {
      name: "Phase 2: Soil (Months 4-6)",
      tasks: [
        "Plant nitrogen-fixing cover crops",
        "Apply compost/mulch",
        "Prepare planting beds"
      ]
    },
    {
      name: "Phase 3: Perennials (Months 7-12)",
      tasks: [
        "Plant coconut/areca trees",
        "Establish banana circles",
        ...plantRecs.filter(p => ["Coconut", "Arecanut", "Jackfruit"].includes(p.name))
          .map(p => `Plant ${p.name}`)
      ]
    }
  ];

  return (
    <section style={{ marginBottom: 12 }}>
      <b>Implementation Timeline</b>
      {phases.map((phase, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 600 }}>{phase.name}</div>
          <ul style={{ paddingLeft: 18, fontSize: 13 }}>
            {phase.tasks.slice(0, 4).map((task, j) => (
              <li key={j}>{task}</li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
});

/* ----------------- Sun path (arc around marker) -----------------
   We compute sun azimuth every 10 minutes for today from sunrise to sunset,
   then draw a 1 km arc in those directions so you see morning/noon/evening.
------------------------------------------------------------------*/
function metersOffset(lat, lng, bearingDeg, distanceM) {
  const R = 6378137; // earth radius
  const brng = (bearingDeg * Math.PI) / 180;
  const lat1 = (lat * Math.PI) / 180;
  const lng1 = (lng * Math.PI) / 180;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
      Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(brng)
  );
  const lng2 =
    lng1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distanceM / R) * Math.cos(lat1),
      Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
    );

  return [ (lat2 * 180) / Math.PI, (lng2 * 180) / Math.PI ];
}

function buildSunArc(lat, lng, date = new Date()) {
  const times = SunCalc.getTimes(date, lat, lng);
  const start = times.sunrise;
  const end = times.sunset;
  if (!start || !end) return [];

  const pts = [];
  const stepMin = 10;
  for (let t = +start; t <= +end; t += stepMin * 60 * 1000) {
    const pos = SunCalc.getPosition(new Date(t), lat, lng);
    const azimuthDeg = (pos.azimuth * 180) / Math.PI + 180; // convert to 0–360
    pts.push(metersOffset(lat, lng, azimuthDeg, 1000)); // 1 km arc
  }
  return pts;
}

/* ----------------- Map click handler ----------------- */
function MapClickHandler({ onClick }) {
  useMapEvent("click", (e) => onClick(e.latlng));
  return null;
}

function getCompanionBenefits(plantName) {
  const plant = PLANTS.find(p => p.name === plantName);
  if (!plant || !plant.companions) return null;
  
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontWeight: 600 }}>Companion Planting Benefits:</div>
      <ul style={{ paddingLeft: 18, fontSize: 12 }}>
        {plant.companions.map((companion, i) => (
          <li key={i}>
            <span style={{ fontWeight: 500 }}>{typeof companion === 'object' ? companion.name : companion}</span>
            {typeof companion === 'object' && companion.benefit && (
              <span> - {companion.benefit}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------- Planting Calendar Component ----------------- */
const PlantingCalendar = React.memo(({ plants, currentMonth }) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const monthIndex = currentMonth - 1; // Convert to 0-based index
  
  const plantsToSowNow = plants.filter(p => {
    if (!p.plantingTime) return false;
    const plantingMonths = p.plantingTime.split('&').map(m => m.trim());
    return plantingMonths.some(period => {
      const [start, end] = period.split('-').map(m => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                           "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return monthNames.findIndex(name => name === m.trim().substring(0, 3)) + 1;
      });
      return currentMonth >= start && currentMonth <= end;
    });
  });

  return (
    <section style={{ marginBottom: 12 }}>
      <b>Planting Calendar ({months[monthIndex]})</b>
      {plantsToSowNow.length > 0 ? (
        <ul style={{ paddingLeft: 18 }}>
          {plantsToSowNow.map((plant, i) => (
            <li key={i} style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 600 }}>{plant.name}</span> — 
              <span style={{ color: "#555" }}> {plant.plantingTime}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: 13, color: "#666", marginTop: 5 }}>
          No recommended planting for this month
        </div>
      )}
    </section>
  );
});

/* ----------------- Zone Planting Guide Component ----------------- */
const ZonePlantingGuide = React.memo(({ plants, zones }) => {
  const zonePlants = {};
  
  zones.forEach(zone => {
    zonePlants[zone.z] = plants.filter(p => {
      if (!p.plantingLocation) return false;
      return p.plantingLocation.includes(zone.z);
    });
  });

  return (
    <section style={{ marginBottom: 12 }}>
      <b>Zone-Based Planting Guide</b>
      {Object.entries(zonePlants).map(([zone, plants]) => (
        <div key={zone} style={{ marginTop: 8 }}>
          <div style={{ fontWeight: 600 }}>{zone}:</div>
          {plants.length > 0 ? (
            <ul style={{ paddingLeft: 18, fontSize: 13 }}>
              {plants.slice(0, 5).map((plant, i) => (
                <li key={i}>{plant.name} - {plant.waterRequirement} water, {plant.sunlightRequirement} sun</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 12, color: "#666" }}>No specific recommendations</div>
          )}
        </div>
      ))}
    </section>
  );
});

/* ----------------- AI Design Assistant Component ----------------- */
const AIDesignAssistant = React.memo(() => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const handleGenerateRecommendations = useCallback(async () => {
    if (!aiPrompt.trim()) return;
    
    setIsLoading(true);
    
    // Simulate API call with timeout
    setTimeout(() => {
      const mockRecommendations = {
        plants: ["Moringa", "Taro", "Banana", "Turmeric"],
        techniques: ["Swales for water retention", "Companion planting with nitrogen fixers"],
        suggestions: ["Consider adding a small pond for aquaculture", "Use mulch to retain soil moisture"]
      };
      
      setRecommendations(mockRecommendations);
      setIsLoading(false);
    }, 2000);
  }, [aiPrompt]);

  return (
    <section style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 10 }}>
      <h4>AI Design Assistant</h4>
      <textarea 
        placeholder="Describe your design goals..."
        value={aiPrompt}
        onChange={(e) => setAiPrompt(e.target.value)}
        style={{ width: "100%", height: 60, padding: 8, fontSize: 14 }}
      ></textarea>
      <button 
        onClick={handleGenerateRecommendations}
        disabled={isLoading}
        style={{
          background: "#2e7d32",
          color: "white",
          border: "none",
          padding: "8px 12px",
          marginTop: 8,
          borderRadius: 4,
          width: "100%",
          opacity: isLoading ? 0.7 : 1
        }}
      >
        {isLoading ? "Generating..." : "Generate Custom Recommendations"}
      </button>
      
      {recommendations && (
        <div style={{ marginTop: 15, padding: 10, background: "#f5f5f5", borderRadius: 4 }}>
          <h5>AI Recommendations:</h5>
          <div><strong>Recommended Plants:</strong> {recommendations.plants.join(", ")}</div>
          <div><strong>Techniques:</strong> {recommendations.techniques.join("; ")}</div>
          <div><strong>Suggestions:</strong> {recommendations.suggestions.join("; ")}</div>
        </div>
      )}
      
      <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
        Example: "I want a medicinal garden with drought-resistant plants"
      </div>
    </section>
  );
});

/* ----------------- Native Plant Encyclopedia Component ----------------- */
const NativePlantEncyclopedia = React.memo(() => {
  const [showAll, setShowAll] = useState(false);
  
  const nativePlants = [
    { name: "Pokkali Rice", desc: "Salt-tolerant rice variety, grows in flooded fields" },
    { name: "Kattan Kanthari", desc: "Wild chili pepper with medicinal uses" },
    { name: "Kunthirikkam", desc: "Traditional medicinal tree" },
    { name: "Njaval", desc: "Indian blackberry, fruit tree" },
    { name: "Athi", desc: "Cluster fig tree, sacred and edible" },
    { name: "Peria", desc: "Guava, common fruit tree" },
    { name: "Nelli", desc: "Indian gooseberry, highly nutritious" },
    { name: "Koovalam", desc: "Wood apple, medicinal fruit" },
    { name: "Puli", desc: "Tamarind, sour fruit used in cooking" },
    { name: "Mullancheera", desc: "Amaranthus, leafy vegetable" }
  ];

  const displayedPlants = showAll ? nativePlants : nativePlants.slice(0, 6);

  return (
    <section style={{ marginBottom: 12 }}>
      <b>Kerala Native Plant Encyclopedia</b>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        {displayedPlants.map((plant, i) => (
          <div key={i} style={{ 
            background: '#f5f5f5', 
            padding: 8, 
            borderRadius: 4,
            fontSize: 13 
          }}>
            <div style={{ fontWeight: 600 }}>{plant.name}</div>
            <div>{plant.desc}</div>
          </div>
        ))}
      </div>
      <button 
        onClick={() => setShowAll(!showAll)}
        style={{ 
          marginTop: 8,
          fontSize: 12, 
          background: 'none', 
          border: '1px solid #2e7d32',
          color: '#2e7d32',
          padding: 4,
          width: '100%'
        }}
      >
        {showAll ? 'Show Less' : 'View All 65 Native Species →'}
      </button>
    </section>
  );
});

/* ----------------- Element Placement Feedback Component ----------------- */
const ElementPlacementFeedback = React.memo(({ elements, marker, zones, siteInputs, topography }) => {
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    const newFeedback = [];

    // Guard clause for essential data
    if (!elements || !marker || !topography) return;

    const housePos = marker;

    // Check water tank placement
    const waterTanks = elements.filter(e => e && e.type === 'WATER_TANK');
    waterTanks.forEach(tank => {
      // Check if placed at high point for gravity irrigation
      const tankElevation = topography.find(t =>
        Math.abs(t.lat - tank.position[0]) < 0.001 &&
        Math.abs(t.lng - tank.position[1]) < 0.001
      )?.elevation;
      const houseElevation = topography.find(t =>
        Math.abs(t.lat - housePos[0]) < 0.001 &&
        Math.abs(t.lng - housePos[1]) < 0.001
      )?.elevation;

      if (tankElevation && houseElevation && tankElevation < houseElevation) {
        newFeedback.push({
          type: 'warning',
          message: 'Water tank is placed at lower elevation than house. For gravity irrigation, place it at a higher elevation.',
          keralaTip: 'വീടിന് താഴെ ജലസംഭരണി സ്ഥാപിച്ചിരിക്കുന്നു. ഗുരുത്വാകർഷണ സിഞ്ചനത്തിനായി ഉയർന്ന സ്ഥലത്ത് സ്ഥാപിക്കുക.'
        });
      }

      // Check distance from house
      const distance = calculateDistance(tank.position, housePos);
      if (distance > 100) {
        newFeedback.push({
          type: 'info',
          message: 'Water tank is far from house. Consider placing it closer to reduce piping needs.',
          keralaTip: 'ജലസംഭരണി വീടിൽ നിന്ന് വളരെ അകലെയാണ്. പൈപ്പ് ചെലവ് കുറയ്ക്കാൻ അടുത്തേക്ക് മാറ്റുക.'
        });
      }
    });

    // Check compost placement
    const composts = elements.filter(e => e && e.type === 'COMPOST');
    composts.forEach(compost => {
      const distance = calculateDistance(compost.position, housePos);
      if (distance > 50) {
        newFeedback.push({
          type: 'warning',
          message: 'Compost is far from house. Place it closer to Zone 1 for easy access when processing kitchen waste.',
          keralaTip: 'കമ്പോസ്റ്റ് വീടിൽ നിന്ന് വളരെ അകലെയാണ്. അടുക്കള മാലിന്യങ്ങൾ കൈകാര്യം ചെയ്യാൻ സൗകര്യപ്രദമായി സോൺ 1-ലേക്ക് മാറ്റുക.'
        });
      }

      // Check if near garden
      const gardens = elements.filter(e => e && e.type === 'VEGETABLE_GARDEN' || e.type === 'FRUIT_ORCHARD');
      let nearGarden = false;
      for (const garden of gardens) {
        if (calculateDistance(compost.position, garden.position || garden.polygon[0]) < 30) {
          nearGarden = true;
          break;
        }
      }
      if (!nearGarden) {
        newFeedback.push({
          type: 'info',
          message: 'Compost is not near any garden. Place it closer to where you need the compost for easy application.',
          keralaTip: 'കമ്പോസ്റ്റ് തോട്ടത്തിന് അരികെയില്ല. എളുപ്പത്തിൽ പ്രയോഗിക്കാൻ തോട്ടത്തിനടുത്തേക്ക് മാറ്റുക.'
        });
      }
    });

    // Check chicken coop placement
    const coops = elements.filter(e => e && e.type === 'CHICKEN_COOP');
    coops.forEach(coop => {
      const distance = calculateDistance(coop.position, housePos);
      if (distance < 20) {
        newFeedback.push({
          type: 'warning',
          message: 'Chicken coop is very close to house. Consider moving it further to avoid odors and pests.',
          keralaTip: 'കോഴിക്കൂട് വീടിന് വളരെ അടുത്താണ്. വാസനയും പ്രാണികളും ഒഴിവാക്കാൻ അകലെയാക്കുക.'
        });
      }

      // Check if near garden for manure access
      const gardens = elements.filter(e => e && e.type === 'VEGETABLE_GARDEN' || e.type === 'FRUIT_ORCHARD');
      let nearGarden = false;
      for (const garden of gardens) {
        if (calculateDistance(coop.position, garden.position || garden.polygon[0]) < 50) {
          nearGarden = true;
          break;
        }
      }
      if (!nearGarden) {
        newFeedback.push({
          type: 'info',
          message: 'Chicken coop is not near any garden. Place it closer to gardens for easy manure collection.',
          keralaTip: 'കോഴിക്കൂട് തോട്ടങ്ങളിലൊന്നിന് അടുത്താണ്. മാലിന്യം എളുപ്പത്തിൽ ശേഖരിക്കാൻ തോട്ടത്തിനടുത്തേക്ക് മാറ്റുക.'
        });
      }
    });

    // Check house placement (if exists)
    const houses = elements.filter(e => e && e.type === 'HOUSE');
    if (houses.length === 0) {
      newFeedback.push({
        type: 'warning',
        message: 'No house placed yet. Consider placing your house first as the central reference point.',
        keralaTip: 'വീട് സ്ഥാപിച്ചിട്ടില്ല. കേന്ദ്ര റഫറൻസ് പോയിന്റായി നിങ്ങളുടെ വീട് ആദ്യം സ്ഥാപിക്കുക.'
      });
    }

    setFeedback(newFeedback);
  }, [elements, marker, zones, siteInputs.windDirection, topography]);

  
  if (feedback.length === 0) {
    return (
      <section style={{ marginBottom: 12 }}>
        <b>Element Placement Feedback</b>
        <div style={{ padding: 10, background: '#f5f5f5', borderRadius: 4, marginTop: 8 }}>
          No feedback yet. Add elements to see placement suggestions.
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 12 }}>
      <b>Element Placement Feedback</b>
      <div style={{ maxHeight: '200px', overflowY: 'auto', marginTop: 8 }}>
        {feedback.map((item, index) => (
          <div key={index} style={{ 
            padding: 8, 
            background: item.type === 'warning' ? '#fff3cd' : '#d1ecf1',
            borderLeft: `4px solid ${item.type === 'warning' ? '#ffc107' : '#0dcaf0'}`,
            marginBottom: 8,
            borderRadius: 4
          }}>
            <div style={{ fontWeight: 600 }}>{item.message}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              {item.keralaTip}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
});

// Helper function to calculate distance between two points in meters
function calculateDistance(pos1, pos2) {
  const [lat1, lng1] = pos1;
  const [lat2, lng2] = pos2;
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

// Helper function to calculate angle between two points
function calculateAngle(from, to) {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const dy = lat2 - lat1;
  const dx = lng2 - lng1;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return (angle + 360) % 360;
}

// Helper function to calculate the approximate "size" of the boundary based on its bounding box
const getBoundaryApproximateSize = (boundaryGeoJson) => {
  if (!boundaryGeoJson || boundaryGeoJson.type !== 'Feature' || boundaryGeoJson.geometry?.type !== 'Polygon' || !Array.isArray(boundaryGeoJson.geometry.coordinates) || boundaryGeoJson.geometry.coordinates.length === 0) {
    console.warn("Invalid boundary GeoJSON for size calculation.");
    return { width: 0.01, height: 0.01 }; // Return default small size if invalid
  }

  const coords = boundaryGeoJson.geometry.coordinates[0]; // Get outer ring
  if (coords.length < 3) {
      console.warn("Boundary polygon has insufficient points.");
      return { width: 0.01, height: 0.01 };
  }

  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;

  coords.forEach(([lng, lat]) => { // Note: GeoJSON order [lng, lat]
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  });

  const width = maxLng - minLng;
  const height = maxLat - minLat;

  // Ensure non-zero dimensions to avoid division by zero later
  return {
    width: width > 0 ? width : 0.0001,
    height: height > 0 ? height : 0.0001
  };
};

/* ----------------- Element Placement Component ----------------- */
const ElementPlacementTool = React.memo(({ 
  selectedElementType, 
  onSelectElementType, 
  onClearElements,
  onAutoDesign,
  isDesigning,
  onApplyPattern,
  boundary
}) => {
  return (
    <section style={{ marginBottom: 12, padding: 10, background: '#f8f8f8', borderRadius: 8 }}>
      <h4 style={{ marginTop: 0 }}>Element Placement Tool</h4>
      
      <button
        onClick={onAutoDesign}
        disabled={isDesigning || !boundary}
        style={{
          background: !boundary ? '#95a5a6' : (isDesigning ? '#95a5a6' : '#2ecc71'),
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: 4,
          width: '100%',
          cursor: !boundary || isDesigning ? 'not-allowed' : 'pointer',
          marginBottom: '10px',
          fontWeight: 'bold'
        }}
      >
        {!boundary ? 'Draw Boundary First' : (isDesigning ? 'Designing...' : 'Auto Design Layout')}
      </button>
      
      {!boundary && (
        <div style={{ fontSize: 12, color: '#e74c3c', marginBottom: 10, padding: 8, background: '#ffeaea', borderRadius: 4 }}>
          <strong>Instructions:</strong> Please draw a boundary first using the polygon drawing tool on the map (top-right corner)
        </div>
      )}
      
      <div style={{ marginBottom: 8 }}>
        <label><b>Select Element to Place:</b></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          {Object.entries(ELEMENT_TYPES).map(([key, element]) => (
            <button
              key={key}
              onClick={() => onSelectElementType(key)}
              style={{
                background: selectedElementType === key ? '#4caf50' : '#e0e0e0',
                color: selectedElementType === key ? 'white' : 'black',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {element.icon} {element.name}
            </button>
          ))}
        </div>
      </div>
      
      <div style={{ marginBottom: 8 }}>
        <label><b>Apply Natural Pattern:</b></label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
          {Object.keys(NaturalPatterns).map(pattern => (
            <button
              key={pattern}
              onClick={() => onApplyPattern(pattern)}
              style={{
                background: '#9b59b6',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              {pattern}
            </button>
          ))}
        </div>
      </div>
      
      {selectedElementType && (
        <div style={{ 
          padding: 8, 
          background: '#e8f5e8', 
          borderRadius: 4,
          marginBottom: 8 
        }}>
          <div style={{ fontWeight: 600 }}>
            Selected: {ELEMENT_TYPES[selectedElementType].name}
          </div>
          <div style={{ fontSize: 13 }}>
            {ELEMENT_TYPES[selectedElementType].description}
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Optimal Zone: {ELEMENT_TYPES[selectedElementType].optimalZone}
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            Malayalam: {ELEMENT_TYPES[selectedElementType].keralaName}
          </div>
        </div>
      )}
      
      <button
        onClick={onClearElements}
        style={{
          background: '#f44336',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: 4,
          width: '100%',
          cursor: 'pointer'
        }}
      >
        Clear All Elements
      </button>
      
      <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>
        Click on the map to place selected element. Feedback will appear below.
      </div>
    </section>
  );
});

/* ----------------- Topography Visualization Component ----------------- */
const TopographyLayer = React.memo(({ topography, visible }) => {
  if (!visible || !topography || topography.length === 0) return null;
  
  // Find min and max elevation for color scaling
  const elevations = topography.map(t => t.elevation);
  const minElevation = Math.min(...elevations);
  const maxElevation = Math.max(...elevations);
  
  return (
    <>
      {topography.map((point, index) => {
        // Calculate color based on elevation
        const elevationRatio = (point.elevation - minElevation) / (maxElevation - minElevation);
        const r = Math.floor(100 + elevationRatio * 155);
        const g = Math.floor(100 + (1 - elevationRatio) * 155);
        const b = Math.floor(100);
        const color = `rgb(${r},${g},${b})`;
        
        return (
          <Circle
            key={index}
            center={[point.lat, point.lng]}
            radius={15}
            pathOptions={{
              fillColor: color,
              color: 'transparent',
              fillOpacity: 0.6,
              weight: 0
            }}
          >
            <Tooltip permanent>
              Elevation: {point.elevation.toFixed(1)}m<br />
              {point.slope && `Slope: ${point.slope.toFixed(1)}%`}
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
});

/* ----------------- Water Flow Visualization Component ----------------- */
const WaterFlowLayer = React.memo(({ waterFlow, visible }) => {
  if (!visible || !waterFlow || waterFlow.length === 0) return null;
  
  return (
    <>
      {waterFlow.map((path, index) => (
        <Polyline
          key={index}
          positions={path.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#3498db',
            weight: 2,
            opacity: 0.7,
            dashArray: '5, 10'
          }}
        >
          <Tooltip permanent>Water Flow Path</Tooltip>
        </Polyline>
      ))}
    </>
  );
});

/* ----------------- 3D Terrain Layer Component ----------------- */
const Terrain3DLayer = React.memo(({ demData, visible }) => {
  if (!visible || !demData || demData.length === 0) return null;
  
  // Create contour lines from DEM data
  const contours = DEMUtils.generateContours(demData, 2);
  
  return (
    <>
      {contours.map((contour, index) => (
        <Polyline
          key={index}
          positions={contour.points.map(p => [p.lat, p.lng])}
          pathOptions={{
            color: '#7f8c8d',
            weight: 1,
            opacity: 0.6
          }}
        >
          <Tooltip permanent>Contour: {contour.level}m</Tooltip>
        </Polyline>
      ))}
    </>
  );
});

/* ----------------- Soil Health Component ----------------- */
const SoilHealthComponent = React.memo(({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;
  
  return (
    <section style={{ marginBottom: 12 }}>
      <b>Soil Health Recommendations</b>
      <div style={{ marginTop: 8 }}>
        {recommendations.map((rec, index) => (
          <div key={index} style={{ 
            padding: 8, 
            background: rec.priority === 'high' ? '#ffebee' : '#e8f5e8',
            borderLeft: `4px solid ${rec.priority === 'high' ? '#f44336' : '#4caf50'}`,
            marginBottom: 8,
            borderRadius: 4
          }}>
            <div style={{ fontWeight: 600 }}>{rec.issue}</div>
            <div>{rec.solution}</div>
          </div>
        ))}
      </div>
    </section>
  );
});

/* ----------------- Carbon Sequestration Component ----------------- */
const CarbonSequestrationComponent = React.memo(({ plants }) => {
  // Add default count of 1 to each plant if not present
  const plantsWithCount = plants.map(plant => ({
    ...plant,
    count: plant.count || 1
  }));
  
  const sequestration = CarbonCalculator.calculateSequestration(plantsWithCount);
  const report = CarbonCalculator.generateReport(sequestration);
  
  return (
    <section style={{ marginBottom: 12 }}>
      <b>Carbon Sequestration</b>
      <div style={{ 
        padding: 10, 
        background: '#e8f5e8', 
        borderRadius: 4, 
        marginTop: 8 
      }}>
        <div style={{ fontWeight: 600 }}>{report}</div>
        <div style={{ fontSize: 12, marginTop: 5 }}>
          Based on {plants.length} plant types in your design
        </div>
      </div>
    </section>
  );
});

/* ----------------- Community Garden Planner ----------------- */
const CommunityGardenPlanner = React.memo(({ participants, area }) => {
  const plan = CommunityUtils.planCommunityGarden(participants, area);
  
  return (
    <section style={{ marginBottom: 12 }}>
      <b>Community Garden Plan</b>
      <div style={{ marginTop: 8 }}>
        <div><strong>Individual Plots:</strong> {plan.individualPlots}m² each</div>
        <div><strong>Common Areas:</strong></div>
        <ul style={{ paddingLeft: 18 }}>
          <li>Composting: {plan.commonAreas.composting}m²</li>
          <li>Tool Sharing: {plan.commonAreas.toolSharing}m²</li>
          <li>Nursery: {plan.commonAreas.nursery}m²</li>
          <li>Gathering Space: {plan.commonAreas.gatheringSpace}m²</li>
        </ul>
        <div><strong>Recommended Crops:</strong></div>
        <div>Individual: {plan.recommendedCrops.individual.join(", ")}</div>
        <div>Common: {plan.recommendedCrops.common.join(", ")}</div>
      </div>
    </section>
  );
});

/* ----------------- Map Legend Component ----------------- */
const MapLegend = React.memo(() => {
  return (
    <div className="leaflet-bottom leaflet-left">
      <div className="leaflet-control leaflet-bar" style={{ padding: '10px', background: 'white', maxWidth: '200px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Map Legend</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {/* Point elements */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#e74c3c', borderRadius: '50%', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>🏠</div>
            <span style={{ fontSize: '12px' }}>House</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#3498db', borderRadius: '50%', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>💧</div>
            <span style={{ fontSize: '12px' }}>Water Tank</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#8e44ad', borderRadius: '50%', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>♻️</div>
            <span style={{ fontSize: '12px' }}>Compost</span>
          </div>
          
          {/* Polygon elements */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#2980b9', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>🐟</div>
            <span style={{ fontSize: '12px' }}>Pond Area</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#8bc34a', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>🥬</div>
            <span style={{ fontSize: '12px' }}>Vegetable Garden</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#ffd54f', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>🍎</div>
            <span style={{ fontSize: '12px' }}>Fruit Orchard</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '20px', background: '#a1887f', marginRight: '5px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontSize: '12px' }}>🌾</div>
            <span style={{ fontSize: '12px' }}>Grain Field</span>
          </div>
          
          {/* Line elements */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '3px', background: '#16a085', marginRight: '5px' }}></div>
            <span style={{ fontSize: '12px' }}>Swale</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
            <div style={{ width: '20px', height: '3px', background: '#3498db', marginRight: '5px', opacity: 0.7, dashArray: '5, 10' }}></div>
            <span style={{ fontSize: '12px' }}>Water Flow</span>
          </div>
        </div>
      </div>
    </div>
  );
});

/* =====================  APP ====================== */
function App() {
  const init = [10.8505, 76.2711]; // Kerala center-ish (lat, lng)
  const [marker, setMarker] = useState(init);
  const [siteInputs, setSiteInputs] = useState({
    waterSources: ['rainfall'],
    slopeOverride: null,
    floodRisk: 'medium',
    windDirection: 225,
    soilType: '',
    existingElements: [],
    waterSourceMode: null,
    roofArea: 100,
    soilpH: 6.5,
    organicMatter: 2.5
  });
  
  const [plantFilter, setPlantFilter] = useState({
    function: '',
    edibility: ''
  });
  
  const [env, setEnv] = useState({
    lat: init[0],
    lng: init[1],
    soil: sampleSoilAt(init[1], init[0]),
    watershed: sampleWatershedAt(init[1], init[0]),
    slopePercent: fallbackSlope(init[0]),
    avgRainfallMm: 0,
    sunHours: 0,
    climateSource: "loading...",
    currentMonth: new Date().getMonth() + 1,
  });
  
  const [sunArc, setSunArc] = useState([]);
  const [floodRiskMap, setFloodRiskMap] = useState(null);
  const [waterSources, setWaterSources] = useState([]);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [plantLayout, setPlantLayout] = useState(null);
  const [windowSize, setWindowSize] = useState([window.innerWidth, window.innerHeight]);
  const [elements, setElements] = useState([]);
  const [selectedElementType, setSelectedElementType] = useState(null);
  const [demData, setDemData] = useState([]);
  const [topography, setTopography] = useState([]);
  const [waterFlow, setWaterFlow] = useState([]);
  const [showTopography, setShowTopography] = useState(false);
  const [showWaterFlow, setShowWaterFlow] = useState(false);
  const [showTerrain3D, setShowTerrain3D] = useState(false);
  const [isDesigning, setIsDesigning] = useState(false);
  const [activePattern, setActivePattern] = useState(null);
  const [patternPoints, setPatternPoints] = useState([]);
  const [soilRecommendations, setSoilRecommendations] = useState([]);
  const [boundary, setBoundary] = useState(null);
  
  // New state for dashboard refinement
  const [activeTab, setActiveTab] = useState("site");
  const [expandedSections, setExpandedSections] = useState({
    siteInfo: true,
    elements: true,
    plants: true,
    water: true,
    calendar: true,
    native: false,
    ai: false
  });

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize([window.innerWidth, window.innerHeight]);
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowSize[0] < 768;

  // fetch NASA climate whenever location changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const climate = await getClimateFromNASA(env.lat, env.lng);
      if (!cancelled) {
        setEnv((prev) => ({ ...prev, ...climate, climateSource: climate.source }));
      }
    })();
    return () => { cancelled = true; };
  }, [env.lat, env.lng]);

  // rebuild sun arc when marker changes
  useEffect(() => {
    const arc = buildSunArc(marker[0], marker[1], new Date());
    setSunArc(arc);
  }, [marker]);

  // Update flood risk map
  useEffect(() => {
    if (env.lat && env.lng) {
      const map = generateFloodRiskMap(
        env.lat, 
        env.lng, 
        env.slopePercent, 
        env.avgRainfallMm
      );
      setFloodRiskMap(map);
    }
  }, [env]);

  // Generate DEM data when marker or boundary changes
  useEffect(() => {
    const dem = DEMUtils.generateDEM(marker[0], marker[1], 0.05, boundary);
    setDemData(dem);
    
    const topo = DEMUtils.calculateTopography(dem);
    setTopography(topo);
    
    const flow = DEMUtils.calculateWaterFlow(topo);
    setWaterFlow(flow);
  }, [marker, boundary]);

  // Update soil recommendations when inputs change
  useEffect(() => {
    const recommendations = SoilHealthUtils.assessSoilHealth(env, siteInputs);
    setSoilRecommendations(recommendations);
  }, [env, siteInputs]);

  const onMapClick = useCallback((latlng) => {
    const { lat, lng } = latlng;
    
    if (selectedElementType) {
      const elementType = ELEMENT_TYPES[selectedElementType];
      if (!elementType) {
        console.error("Unknown element type selected:", selectedElementType);
        alert("Unknown element type. Please select a valid element.");
        return;
      }

      // Check if point is inside boundary
      let isInsideBoundary = true;
      if (boundary) {
        try {
          // Transform boundary for checking
          let boundaryForUtils = null;
          if (boundary.type === 'Feature' && boundary.geometry?.type === 'Polygon' && Array.isArray(boundary.geometry.coordinates) && boundary.geometry.coordinates.length > 0) {
            const latLngCoords = boundary.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
            boundaryForUtils = latLngCoords;
          }
          if (boundaryForUtils) {
            isInsideBoundary = BoundaryUtils.isPointInBoundary([lat, lng], boundaryForUtils);
          }
        } catch (error) {
          console.error("Error checking boundary:", error);
          alert("Error checking boundary. Please redraw the boundary or check its definition.");
          return;
        }
      }
    
      if (!isInsideBoundary) {
        alert("This element would be placed outside your boundary. Please place it inside.");
        return;
      }
      
      // Create element based on geometry type
      let newElement;
      if (elementType.geometry === "point") {
        newElement = {
          type: selectedElementType,
          position: [lat, lng],
          name: elementType.name,
          id: Date.now()
        };
      } else if (elementType.geometry === "polygon") {
        // Create a circular polygon around the point
        const radius = 0.002;
        const polygonPoints = [];
        for (let i = 0; i < 36; i++) {
          const angle = (i * 10) * Math.PI / 180;
          polygonPoints.push([lat + radius * Math.cos(angle), lng + radius * Math.sin(angle)]);
        }
        polygonPoints.push(polygonPoints[0]); // Close the polygon
        newElement = {
          type: selectedElementType,
          polygon: polygonPoints,
          name: elementType.name,
          id: Date.now()
        };
      } else if (elementType.geometry === "line") {
        // For line elements like swales, create a short line
        const length = 0.003;
        const points = [
          [lat - length/2, lng - length/2],
          [lat + length/2, lng + length/2]
        ];
        newElement = {
          type: selectedElementType,
          points: points,
          name: elementType.name,
          id: Date.now()
        };
      }
      
      if (!newElement) {
        console.error("Failed to create element object.");
        return;
      }

      setElements(prev => [...prev, newElement]);
      return;
    }
    
    // If no element selected, move the marker
    setMarker([lat, lng]);
    
    const soilType = siteInputs.soilType || sampleSoilAt(lng, lat);
    
    setEnv((prev) => ({
      ...prev,
      lat,
      lng,
      soil: soilType,
      watershed: sampleWatershedAt(lng, lat),
      slopePercent: siteInputs.slopeOverride || fallbackSlope(lat),
    }));
    
    if (siteInputs.waterSourceMode) {
      setWaterSources([...waterSources, {
        type: siteInputs.waterSourceMode,
        position: [lat, lng]
      }]);
    }
  }, [siteInputs, waterSources, selectedElementType, boundary]);

  const autoDesignLayout = useCallback(() => {
    if (!boundary) {
      alert("Please draw a boundary first using the drawing tools on the map");
      return;
    }
    
    setIsDesigning(true);
    
    setTimeout(() => {
      const newElements = [...elements];
      const boundarySize = getBoundaryApproximateSize(boundary);
      const boundaryDiagonal = Math.sqrt(boundarySize.width * boundarySize.width + boundarySize.height * boundarySize.height);
      const baseElementSize = boundaryDiagonal * 0.1;

      // Define zone areas with proportional sizes
      const zoneAreas = [
        { type: 'VEGETABLE_GARDEN', zone: '1', size: baseElementSize },
        { type: 'FRUIT_ORCHARD', zone: '2', size: baseElementSize * 1.2 },
        { type: 'GRAIN_FIELD', zone: '3', size: baseElementSize * 1.5 }
      ];

      // PLACE HOUSE FIRST (if not exists)
      if (!elements.some(e => e && e.type === 'HOUSE')) {
        const housePoint = BoundaryUtils.generateRandomPointInBoundary(boundary);
        newElements.push({
          type: 'HOUSE',
          position: housePoint,
          name: 'House',
          id: Date.now()
        });
        // Update marker to house position
        setMarker(housePoint);
      }

      const housePos = elements.find(e => e.type === 'HOUSE')?.position || marker;

      // Find high points for water tank placement
      const highPoints = DEMUtils.findHighPoints(topography, 20);
      const boundaryHighPoints = BoundaryUtils.filterPointsInBoundary(highPoints, boundary);
      
      if (boundaryHighPoints.length > 0 && !elements.some(e => e && e.type === 'WATER_TANK')) {
        const highestPoint = boundaryHighPoints.reduce((highest, point) => 
          point.elevation > highest.elevation ? point : highest, boundaryHighPoints[0]);
        
        newElements.push({
          type: 'WATER_TANK',
          position: [highestPoint.lat, highestPoint.lng],
          name: 'Water Tank',
          id: Date.now() + 1
        });
      }

      // Find low points for pond placement
      const lowPoints = DEMUtils.findLowPoints(topography, 20);
      const boundaryLowPoints = BoundaryUtils.filterPointsInBoundary(lowPoints, boundary);
      
      if (boundaryLowPoints.length > 0 && !elements.some(e => e.type === 'POND_AREA')) {
        const lowestPoint = boundaryLowPoints.reduce((lowest, point) => 
          point.elevation < lowest.elevation ? point : lowest, boundaryLowPoints[0]);
        
        const pondRadius = baseElementSize * 0.8;
        const pondPoints = [];
        for (let i = 0; i < 36; i++) {
          const angle = (i * 10) * Math.PI / 180;
          pondPoints.push([
            lowestPoint.lat + pondRadius * Math.cos(angle),
            lowestPoint.lng + pondRadius * Math.sin(angle)
          ]);
        }
        pondPoints.push(pondPoints[0]);
        
        newElements.push({
          type: 'POND_AREA',
          polygon: pondPoints,
          name: 'Pond Area',
          id: Date.now() + 2
        });
      }

      // PLACE COMPOST (Zone 1, near house but not too close)
      if (!elements.some(e => e && e.type === 'COMPOST')) {
        const compostOffset = [0.0003, 0.0002]; // About 30-40m from house
        const compostPos = [housePos[0] + compostOffset[0], housePos[1] + compostOffset[1]];
        
        if (BoundaryUtils.isPointInBoundary(compostPos, boundary)) {
          newElements.push({
            type: 'COMPOST',
            position: compostPos,
            name: 'Compost',
            id: Date.now() + 3
          });
        }
      }

      // PLACE CHICKEN COOP (Zone 1-2, near house for access but not too close)
      if (!elements.some(e => e && e.type === 'CHICKEN_COOP')) {
        const coopOffset = [0.0005, 0.0004]; // About 50-60m from house
        const coopPos = [housePos[0] + coopOffset[0], housePos[1] + coopOffset[1]];
        
        if (BoundaryUtils.isPointInBoundary(coopPos, boundary)) {
          newElements.push({
            type: 'CHICKEN_COOP',
            position: coopPos,
            name: 'Chicken Coop',
            id: Date.now() + 4
          });
        }
      }

      // PLACE BEEHIVE (Near flowering areas/gardens)
      if (!elements.some(e => e && e.type === 'BEEHIVE')) {
        const beeOffset = [0.0004, -0.0003]; // About 40-50m from house
        const beePos = [housePos[0] + beeOffset[0], housePos[1] + beeOffset[1]];
        
        if (BoundaryUtils.isPointInBoundary(beePos, boundary)) {
          newElements.push({
            type: 'BEEHIVE',
            position: beePos,
            name: 'Beehive',
            id: Date.now() + 5
          });
        }
      }

      // PLACE TOOL SHED (Zone 0-1, very close to house)
      if (!elements.some(e => e && e.type === 'SHED')) {
        const shedOffset = [0.0001, 0.0002]; // About 10-20m from house
        const shedPos = [housePos[0] + shedOffset[0], housePos[1] + shedOffset[1]];
        
        if (BoundaryUtils.isPointInBoundary(shedPos, boundary)) {
          newElements.push({
            type: 'SHED',
            position: shedPos,
            name: 'Tool Shed',
            id: Date.now() + 6
          });
        }
      }

      // PLACE SWALES (Based on topography and contours)
      if (!elements.some(e => e.type === 'SWALE')) {
        const swaleLines = [];
        const contours = DEMUtils.generateContours(demData, 1);
        
        contours.forEach(contour => {
          if (contour.points.length > 5) {
            // Take every 3rd point to create simplified swale lines
            const simplifiedPoints = contour.points.filter((_, index) => index % 3 === 0);
            if (simplifiedPoints.length > 2) {
              // Check if points are within boundary
              const validPoints = simplifiedPoints.filter(point => 
                BoundaryUtils.isPointInBoundary([point.lat, point.lng], boundary)
              );
              
              if (validPoints.length > 2) {
                swaleLines.push({
                  points: validPoints.map(p => [p.lat, p.lng]),
                  name: `Swale at ${contour.level}m`,
                  id: Date.now() + 7 + swaleLines.length
                });
              }
            }
          }
        });
        
        // Add swales to elements (limit to 3 to avoid clutter)
        swaleLines.slice(0, 3).forEach(swale => {
          newElements.push({
            type: 'SWALE',
            points: swale.points,
            name: swale.name,
            id: swale.id
          });
        });
      }

      // PLACE WINDBREAK (On perimeter, perpendicular to wind direction)
      if (!elements.some(e => e.type === 'WINDBREAK')) {
      const windAngle = (siteInputs.windDirection + 90) * Math.PI / 180; // Perpendicular to wind
      const windbreakLength = boundaryDiagonal * 0.3;
  
       const startPoint = BoundaryUtils.generateRandomPointInBoundary(boundary);
      const endPoint = [
      startPoint[0] + windbreakLength * Math.cos(windAngle),
      startPoint[1] + windbreakLength * Math.sin(windAngle)
      ];
  
    // Ensure end point is within boundary - use the new function
    let adjustedEndPoint = endPoint;
    if (!BoundaryUtils.isPointInBoundary(endPoint, boundary)) {
    adjustedEndPoint = BoundaryUtils.findClosestPointOnBoundary(endPoint, boundary);
    }
  
   // Only create windbreak if we have valid points
   if (BoundaryUtils.isPointInBoundary(startPoint, boundary) && 
      BoundaryUtils.isPointInBoundary(adjustedEndPoint, boundary)) {
      newElements.push({
      type: 'WINDBREAK',
      points: [startPoint, adjustedEndPoint],
      name: 'Windbreak',
      id: Date.now() + 8
      });
    }
  } 


      // Add zone areas (gardens, orchards, fields)
      zoneAreas.forEach(area => {
        if (!elements.some(e => e && e.type === area.type)) {
          const randomPoint = BoundaryUtils.generateRandomPointInBoundary(boundary);
          const polygonPoints = [];
          for (let i = 0; i < 36; i++) {
            const angle = (i * 10) * Math.PI / 180;
            polygonPoints.push([
              randomPoint[0] + area.size * Math.cos(angle),
              randomPoint[1] + area.size * Math.sin(angle)
            ]);
          }
          polygonPoints.push(polygonPoints[0]);
          
          newElements.push({
            type: area.type,
            polygon: polygonPoints,
            name: ELEMENT_TYPES[area.type].name,
            id: Date.now() + 20 + Math.random() * 1000
          });
        }
      });

      setElements(newElements);
      setIsDesigning(false);
    }, 2000);
  }, [topography, siteInputs.windDirection, marker, boundary, elements, demData]);

  const applyPattern = useCallback((patternType) => {
    let points;
    if (patternType === 'BRANCHING') {
      points = NaturalPatterns[patternType].generatePoints(marker);
    } else {
      points = NaturalPatterns[patternType].generatePoints(marker, 0.01);
    }
    setPatternPoints(points);
    setActivePattern(patternType);
  }, [marker]);

  const handleCreate = useCallback((e) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      setBoundary(layer.toGeoJSON());
    }
  }, []);

  const handleEdit = useCallback((e) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        setBoundary(layer.toGeoJSON());
      }
    });
  }, []);

  const handleDelete = useCallback((e) => {
    const layers = e.layers;
    layers.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        setBoundary(null);
      }
    });
  }, []);

  const plantRecs = useMemo(() => recommendPlants(env, plantFilter), [env, plantFilter]);
  const waterPlans = useMemo(() => waterManagement(env, siteInputs), [env, siteInputs]);
  const monsoonAdvisory = useMemo(() => 
    env.monthlyRainfall ? getMonsoonAdvisory(env.monthlyRainfall) : null,
    [env.monthlyRainfall]
  );

  const zones = currentTemplate?.zones || ZONES;

  const soilStyle = (f) => ({
    color: f.properties.soil.includes("lateritic") ? "#B5651D" : "#2E8B57",
    weight: 2,
    fillOpacity: 0.12,
  });
  const watershedStyle = () => ({ color: "#1E90FF", weight: 2, dashArray: "4", fillOpacity: 0.05 });

  const exportJSON = useCallback(() => {
    const payload = {
      env,
      plantRecommendations: plantRecs,
      waterPlans,
      siteInputs,
      elements,
      topography,
      boundary
    };
    const txt = JSON.stringify(payload, null, 2);
    const blob = new Blob([txt], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kerala-perma-design.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [env, plantRecs, waterPlans, siteInputs, elements, topography, boundary]);

  const onElementDrag = useCallback((id, newPosition) => {
    // Only point elements can be dragged
    setElements(prev => prev.map(el => {
      if (el.id === id && el.position) {
        // Check if the new position is within the boundary
        const isInsideBoundary = !boundary || BoundaryUtils.isPointInBoundary(
          [newPosition.lng, newPosition.lat], 
          boundary
        );
        
        if (!isInsideBoundary) {
          alert("Cannot move element outside the boundary");
          return el;
        }
        
        return { ...el, position: [newPosition.lat, newPosition.lng] };
      }
      return el;
    }));
  }, [boundary]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Tab content components
  const renderSiteTab = () => (
    <div>
      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px",
        borderLeft: "4px solid #28a745"
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📍 Site Information</span>
          <button 
            onClick={() => toggleSection('siteInfo')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.siteInfo ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.siteInfo && (
          <div style={{ fontSize: "14px", lineHeight: "1.5" }}>
            <div><strong>Coordinates:</strong> {env.lat.toFixed(5)}, {env.lng.toFixed(5)}</div>
            <div><strong>Soil Type:</strong> {env.soil}</div>
            <div><strong>Annual Rainfall:</strong> {env.avgRainfallMm ? `${env.avgRainfallMm} mm` : "Loading..."}</div>
            <div><strong>Slope:</strong> {env.slopePercent}%</div>
            <div><strong>Sunlight:</strong> {env.sunHours ? `${env.sunHours.toFixed(1)} hours/day` : "Loading..."}</div>
            <div><strong>Data Source:</strong> {env.climateSource}</div>
          </div>
        )}
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0" }}>🌦️ Rainfall Distribution</h4>
        {env.monthlyRainfall && <RainfallChart monthlyRainfall={env.monthlyRainfall} />}
        
        {monsoonAdvisory && (
          <div style={{
            background: monsoonAdvisory.status === "active" ? "#e3f2fd" : "#fff8e1",
            padding: "8px",
            borderRadius: "4px",
            marginTop: "10px",
            borderLeft: `4px solid ${monsoonAdvisory.status === "active" ? "#2196f3" : "#ffc107"}`
          }}>
            <strong>Monsoon Advisory:</strong> {monsoonAdvisory.advice}
          </div>
        )}
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0" }}>⚙️ Site Configuration</h4>
        <div style={{ marginBottom: "8px" }}>
          <label><strong>Water Sources:</strong></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "5px" }}>
            {['wells', 'river', 'rainfall'].map(source => (
              <button
                key={source}
                onClick={() => {
                  const newSources = siteInputs.waterSources.includes(source)
                    ? siteInputs.waterSources.filter(s => s !== source)
                    : [...siteInputs.waterSources, source];
                  setSiteInputs({...siteInputs, waterSources: newSources});
                }}
                style={{
                  background: siteInputs.waterSources.includes(source) ? "#28a745" : "#e9ecef",
                  color: siteInputs.waterSources.includes(source) ? "white" : "black",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
          <div>
            <label><strong>Slope:</strong></label>
            <input 
              type="number" 
              min="0" 
              max="100"
              value={siteInputs.slopeOverride || ''}
              onChange={e => setSiteInputs({...siteInputs, slopeOverride: e.target.value || null})}
              style={{ width: "100%", padding: "5px" }}
              placeholder={`Default: ${env.slopePercent}%`}
            />
          </div>
          <div>
            <label><strong>Flood Risk:</strong></label>
            <select
              value={siteInputs.floodRisk}
              onChange={e => setSiteInputs({...siteInputs, floodRisk: e.target.value})}
              style={{ width: "100%", padding: "5px" }}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label><strong>Wind Direction: {siteInputs.windDirection}°</strong></label>
          <input
            type="range"
            min="0"
            max="360"
            value={siteInputs.windDirection}
            onChange={e => setSiteInputs({...siteInputs, windDirection: parseInt(e.target.value)})}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label><strong>Soil Type:</strong></label>
          <select
            value={siteInputs.soilType}
            onChange={e => setSiteInputs({...siteInputs, soilType: e.target.value})}
            style={{ width: "100%", padding: "5px" }}
          >
            <option value="">Use detected ({env.soil})</option>
            <option value="laterite">Laterite</option>
            <option value="alluvial">Alluvial</option>
            <option value="clay">Clay</option>
            <option value="sandy">Sandy</option>
          </select>
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label><strong>Roof Area (m²):</strong></label>
          <input 
            type="number" 
            value={siteInputs.roofArea}
            onChange={e => setSiteInputs({...siteInputs, roofArea: parseInt(e.target.value) || 0})}
            style={{ width: "100%", padding: "5px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label><strong>Soil pH:</strong></label>
          <input 
            type="number" 
            step="0.1"
            min="4"
            max="9"
            value={siteInputs.soilpH}
            onChange={e => setSiteInputs({...siteInputs, soilpH: parseFloat(e.target.value) || 6.5})}
            style={{ width: "100%", padding: "5px" }}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <label><strong>Organic Matter (%):</strong></label>
          <input 
            type="number" 
            step="0.1"
            min="0"
            max="10"
            value={siteInputs.organicMatter}
            onChange={e => setSiteInputs({...siteInputs, organicMatter: parseFloat(e.target.value) || 2.5})}
            style={{ width: "100%", padding: "5px" }}
          />
        </div>

        <div>
          <label><strong>Existing Elements:</strong></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginTop: "5px" }}>
            {['mature trees', 'water bodies', 'structures', 'terracing'].map(el => (
              <button
                key={el}
                onClick={() => {
                  const newElements = siteInputs.existingElements.includes(el)
                    ? siteInputs.existingElements.filter(e => e !== el)
                    : [...siteInputs.existingElements, el];
                  setSiteInputs({...siteInputs, existingElements: newElements});
                }}
                style={{
                  background: siteInputs.existingElements.includes(el) ? "#28a745" : "#e9ecef",
                  color: siteInputs.existingElements.includes(el) ? "white" : "black",
                  border: "none",
                  padding: "5px 10px",
                  borderRadius: "15px",
                  fontSize: "12px",
                  cursor: "pointer"
                }}
              >
                {el.charAt(0).toUpperCase() + el.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0" }}>🎯 Design Template</h4>
        <select 
          onChange={e => setCurrentTemplate(e.target.value ? DESIGN_TEMPLATES[e.target.value] : null)}
          style={{ width: "100%", padding: "8px" }}
        >
          <option value="">Custom Design</option>
          <option value="homestead">1-Acre Homestead</option>
          <option value="agroforestry">Coconut Agroforestry</option>
        </select>
        {currentTemplate && (
          <div style={{ marginTop: "10px", fontSize: "14px" }}>
            <strong>Selected:</strong> {currentTemplate.name}
          </div>
        )}
      </div>

      <SoilHealthComponent recommendations={soilRecommendations} />
    </div>
  );

  const renderDesignTab = () => (
    <div>
      <ElementPlacementTool 
        selectedElementType={selectedElementType}
        onSelectElementType={setSelectedElementType}
        onClearElements={() => setElements([])}
        onAutoDesign={autoDesignLayout}
        isDesigning={isDesigning}
        onApplyPattern={applyPattern}
        boundary={boundary}
      />

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🗺️ Map Visualization</span>
          <button 
            onClick={() => toggleSection('elements')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.elements ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.elements && (
          <div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "10px", flexWrap: "wrap" }}>
              <button
                onClick={() => setShowTopography(!showTopography)}
                style={{
                  background: showTopography ? "#3498db" : "#e0e0e0",
                  color: showTopography ? "white" : "black",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  flex: "1",
                  cursor: "pointer",
                  minWidth: "120px"
                }}
              >
                {showTopography ? 'Hide' : 'Show'} Topography
              </button>
              <button
                onClick={() => setShowWaterFlow(!showWaterFlow)}
                style={{
                  background: showWaterFlow ? "#3498db" : "#e0e0e0",
                  color: showWaterFlow ? "white" : "black",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  flex: "1",
                  cursor: "pointer",
                  minWidth: "120px"
                }}
              >
                {showWaterFlow ? 'Hide' : 'Show'} Water Flow
              </button>
              <button
                onClick={() => setShowTerrain3D(!showTerrain3D)}
                style={{
                  background: showTerrain3D ? "#9b59b6" : "#e0e0e0",
                  color: showTerrain3D ? "white" : "black",
                  border: "none",
                  padding: "8px 12px",
                  borderRadius: "4px",
                  flex: "1",
                  cursor: "pointer",
                  minWidth: "120px"
                }}
              >
                {showTerrain3D ? 'Hide' : 'Show'} 3D Terrain
              </button>
            </div>
            
            <ElementPlacementFeedback 
              elements={elements}
              marker={marker}
              zones={zones}
              siteInputs={siteInputs}
              topography={topography}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderPlantsTab = () => (
    <div>
      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🌿 Plant Filtering</span>
          <button 
            onClick={() => toggleSection('plants')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.plants ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.plants && (
          <div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", marginBottom: "10px" }}>
              <select
                value={plantFilter.function}
                onChange={e => setPlantFilter({...plantFilter, function: e.target.value})}
                style={{ flex: "1 1 45%", minWidth: "120px", padding: "5px" }}
              >
                <option value="">All Functions</option>
                <option value="nitrogen fixer">Nitrogen Fixer</option>
                <option value="windbreak">Windbreak</option>
                <option value="flood-tolerant">Flood Tolerant</option>
                <option value="cash crop">Cash Crop</option>
              </select>
              
              <select
                value={plantFilter.edibility}
                onChange={e => setPlantFilter({...plantFilter, edibility: e.target.value})}
                style={{ flex: "1 1 45%", minWidth: "120px", padding: "5px" }}
              >
                <option value="">All Plants</option>
                <option value="edible">Edible Only</option>
              </select>
            </div>

            <div style={{ fontSize: "14px", marginBottom: "10px" }}>
              <strong>{plantRecs.length}</strong> plants match your criteria
            </div>
          </div>
        )}
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0" }}>🌱 Recommended Plants</h4>
        <div style={{ maxHeight: "300px", overflowY: "auto" }}>
          {plantRecs.slice(0, 10).map((p) => (
            <div key={p.name} style={{ 
              padding: "10px", 
              background: "white", 
              borderRadius: "4px", 
              marginBottom: "8px",
              borderLeft: "3px solid #4caf50"
            }}>
              <div style={{ fontWeight: "600", fontSize: "15px" }}>
                {p.name} <span style={{ color: "#777", fontWeight: "400" }}>({p.scientific})</span>
              </div>
              <div style={{ fontSize: "13px", color: "#555", margin: "4px 0" }}>
                {p.functions.join(", ")} · Spacing: {p.spacing} · Pattern: {p.pattern}
              </div>
              {p.plantingTime && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  <strong>Planting Time:</strong> {p.plantingTime}
                </div>
              )}
              {p.plantingLocation && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  <strong>Location:</strong> {p.plantingLocation}
                </div>
              )}
              {getCompanionBenefits(p.name)}
            </div>
          ))}
        </div>
        <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
          Tip: plant <strong>Banana + Turmeric + Ginger</strong> in beds on contour; grow <strong>Pepper</strong> up <strong>Coconut/Areca</strong>.
        </div>
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📅 Planting Calendar</span>
          <button 
            onClick={() => toggleSection('calendar')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.calendar ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.calendar && (
          <PlantingCalendar plants={PLANTS} currentMonth={env.currentMonth} />
        )}
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🗺️ Zone Planting Guide</span>
        </h4>
        <ZonePlantingGuide plants={plantRecs} zones={zones} />
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>📚 Native Plant Encyclopedia</span>
          <button 
            onClick={() => toggleSection('native')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.native ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.native && <NativePlantEncyclopedia />}
      </div>

      <CarbonSequestrationComponent plants={plantRecs} />
    </div>
  );

  const renderWaterTab = () => (
    <div>
      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>💧 Water Management</span>
          <button 
            onClick={() => toggleSection('water')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.water ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.water && (
          <div>
            <ul style={{ paddingLeft: "18px", margin: "0" }}>
              {waterPlans.map((w, i) => (
                <li key={i} style={{ marginBottom: "8px", fontSize: "14px" }}>
                  <span style={{ fontWeight: "600" }}>{w.name}</span> — <span style={{ color: "#555" }}>{w.why}</span>
                </li>
              ))}
            </ul>
            
            <TimelineGenerator waterPlans={waterPlans} plantRecs={plantRecs} />
          </div>
        )}
      </div>
    </div>
  );

  const renderAITab = () => (
    <div>
      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🤖 AI Design Assistant</span>
          <button 
            onClick={() => toggleSection('ai')}
            style={{ background: "none", border: "none", fontSize: "16px", cursor: "pointer" }}
          >
            {expandedSections.ai ? "▲" : "▼"}
          </button>
        </h4>
        {expandedSections.ai && <AIDesignAssistant />}
      </div>

      <div style={{ 
        background: "#f8f9fa", 
        padding: "12px", 
        borderRadius: "8px", 
        marginBottom: "12px" 
      }}>
        <h4 style={{ margin: "0 0 8px 0" }}>👥 Community Garden Planning</h4>
        <CommunityGardenPlanner participants={5} area={1000} />
      </div>
    </div>
  );

  // Main render return
  return (
    <DesignProvider>
      <div style={{ 
        display: "flex", 
        flexDirection: isMobile ? "column" : "row",
        height: "100vh",
        fontFamily: "Inter, Arial, sans-serif" 
      }}>
        {/* Sidebar */}
        <aside style={{ 
          width: isMobile ? "100%" : 460,
          height: isMobile ? "40vh" : "100%",
          padding: "12px", 
          background: "#fff", 
          borderRight: "1px solid #eee", 
          overflowY: "auto",
          display: "flex",
          flexDirection: "column"
        }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: "20px", color: "#2d7a2d" }}>
            Kerala Permaculture Designer 🌿
          </h2>

          {/* Tab Navigation */}
          <div style={{ 
            display: "flex", 
            borderBottom: "1px solid #ddd", 
            marginBottom: "12px",
            overflowX: "auto"
          }}>
            {["site", "design", "plants", "water", "ai"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? "#2d7a2d" : "transparent",
                  color: activeTab === tab ? "white" : "#333",
                  border: "none",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  whiteSpace: "nowrap"
                }}
              >
                {tab === "site" && "📍 Site"}
                {tab === "design" && "🗺️ Design"}
                {tab === "plants" && "🌿 Plants"}
                {tab === "water" && "💧 Water"}
                {tab === "ai" && "🤖 AI"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {activeTab === "site" && renderSiteTab()}
            {activeTab === "design" && renderDesignTab()}
            {activeTab === "plants" && renderPlantsTab()}
            {activeTab === "water" && renderWaterTab()}
            {activeTab === "ai" && renderAITab()}
          </div>

          {/* Export Button */}
          <button 
            onClick={exportJSON} 
            style={{ 
              padding: "10px", 
              background: "#2d7a2d", 
              color: "#fff", 
              border: "none", 
              borderRadius: "6px", 
              marginTop: "10px",
              fontWeight: "bold"
            }}
          >
            Export Design JSON
          </button>

          <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
            Click the map to move your farm center. Zones, sun arc, soil & watershed update automatically.
          </div>
        </aside>

        {/* Map */}
        <main style={{ 
          flex: 1, 
          height: isMobile ? "60vh" : "100%"
        }}>
          <MapContainer 
            center={[10.8505, 76.2711]} 
            zoom={8} 
            style={{ height: "100%", width: "100%" }}
            maxZoom={22}
            minZoom={3}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={22}
            />
            
            <FeatureGroup>
              <EditControl
                position="topright"
                onCreated={handleCreate}
                onEdited={handleEdit}
                onDeleted={handleDelete}
                draw={{
                  rectangle: true,
                  circle: true,
                  circlemarker: false,
                  marker: true,
                  polyline: true,
                  polygon: true,
                }}
              />
            </FeatureGroup>

            {/* Enhanced Visualization Layers */}
            <TopographyLayer topography={topography} visible={showTopography} />
            <WaterFlowLayer waterFlow={waterFlow} visible={showWaterFlow} />
            <Terrain3DLayer demData={demData} visible={showTerrain3D} />

            {/* Natural Patterns */}
            {activePattern && patternPoints.length > 0 && (
              <Polygon 
                positions={patternPoints} 
                pathOptions={{ 
                  color: NaturalPatterns[activePattern].color, 
                  fillOpacity: 0.2,
                  weight: 2
                }}
              >
                <Tooltip permanent>
                  {NaturalPatterns[activePattern].description}
                </Tooltip>
              </Polygon>
            )}

            {/* Mock GIS layers */}
            <GeoJSON data={soilPolygons} style={soilStyle} onEachFeature={(f, layer) => layer.bindPopup(f.properties.name)} />
            <GeoJSON data={watershedPolygons} style={watershedStyle} onEachFeature={(f, layer) => layer.bindPopup(f.properties.name)} />

            {/* Flood Risk Layer */}
            {floodRiskMap && (
              <GeoJSON 
                data={floodRiskMap} 
                style={() => ({
                  fillColor: floodRiskMap.properties.risk === "high" ? "#ff5252" :
                            floodRiskMap.properties.risk === "medium" ? "#ffd740" : "#69f0ae",
                  weight: 1,
                  opacity: 0.7,
                  fillOpacity: 0.3
                })}
              >
                <Tooltip permanent>
                  Flood Risk: {floodRiskMap.properties.risk.toUpperCase()}
                </Tooltip>
              </GeoJSON>
            )}

            {/* Zone rings with descriptions */}
            {zones.map((z) => (
              <Circle 
                key={z.z} 
                center={marker} 
                radius={z.r} 
                pathOptions={{ 
                  color: z.color, 
                  weight: 2, 
                  fillOpacity: 0.1,
                  fillColor: z.color 
                }}
              >
                <Tooltip permanent direction="top" offset={[0, -z.r/100]}>
                  <div style={{ fontWeight: 'bold' }}>{z.z}</div>
                  <div style={{ fontSize: '10px' }}>
                    {z.description}
                  </div>
                </Tooltip>
              </Circle>
            ))}

            {/* Windbreak visualization */}
            <Polyline 
              positions={[
                marker,
                [
                  marker[0] + 0.03 * Math.cos((siteInputs.windDirection - 90) * Math.PI / 180),
                  marker[1] + 0.03 * Math.sin((siteInputs.windDirection - 90) * Math.PI / 180)
                ],
                [
                  marker[0] + 0.03 * Math.cos((siteInputs.windDirection + 90) * Math.PI / 180),
                  marker[1] + 0.03 * Math.sin((siteInputs.windDirection + 90) * Math.PI / 180)
                ]
              ]}
              pathOptions={{ color: "#3f51b5", weight: 3 }}
            >
              <Tooltip>Windbreak Placement</Tooltip>
            </Polyline>

            {/* Water Sources */}
            {waterSources.map((source, i) => (
              <Marker 
                key={i} 
                position={source.position}
                icon={L.divIcon({
                  className: 'custom-icon',
                  html: `<div style="background:${source.type === 'well' ? '#29b6f6' : '#1e88e5'};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`
                })}
              >
              <Popup>{source.type === "well" ? "Well" : "Water Body"}</Popup>
              </Marker>
            ))}

            {/* Plant Layout */}
            {plantLayout && PLANT_LAYOUTS[plantLayout]?.pattern.map((p, i) => (
              <Marker 
                key={i}
                position={[
                  marker[0] + p.offset[0], 
                  marker[1] + p.offset[1]
                ]}
                icon={L.divIcon({
                  className: 'plant-marker',
                  html: `<div style="background:#4caf50;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:10px;">${p.plant.charAt(0)}</div>`
                })}
              >
                <Popup>{p.plant}</Popup>
              </Marker>
            ))}

            {/* Design Elements */}
            {elements.map((element, i) => {
              if (!element) return null;
              
              if (element.position) {
                // Render Marker for point elements
                if (!Array.isArray(element.position) || element.position.length < 2) {
                  console.error("Invalid coordinates for Marker element:", element);
                  return null;
                }
                
                return (
                  <Marker
                    key={i}
                    position={element.position}
                    icon={L.divIcon({
                      className: 'element-marker',
                      html: `<div style="background:${ELEMENT_TYPES[element.type]?.color || '#ccc'};color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:14px;border:2px solid white;">${ELEMENT_TYPES[element.type]?.icon || '❓'}</div>`
                    })}
                    draggable={true}
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target;
                        const position = marker.getLatLng();
                        onElementDrag(element.id, position);
                      }
                    }}
                  >
                    <Popup>
                      <div style={{ fontWeight: 'bold' }}>{element.name}</div>
                      <div>{ELEMENT_TYPES[element.type]?.description || 'No description available'}</div>
                    </Popup>
                  </Marker>
                );
              } else if (element.polygon) {
                // Render Polygon elements
                if (!Array.isArray(element.polygon) || element.polygon.length === 0) {
                  console.error("Invalid polygon coordinates for element:", element);
                  return null;
                }
                
                return (
                  <Polygon
                    key={i}
                    positions={element.polygon}
                    pathOptions={{
                      color: ELEMENT_TYPES[element.type]?.color || '#ccc',
                      fillColor: ELEMENT_TYPES[element.type]?.color || '#ccc',
                      fillOpacity: 0.4,
                      weight: 2
                    }}
                  >
                    <Tooltip permanent>{element.name}</Tooltip>
                  </Polygon>
                );
              } else if (element.points) {
                // Render Line elements (swale, windbreak)
                if (!Array.isArray(element.points) || element.points.length === 0) {
                  console.error("Invalid line coordinates for element:", element);
                  return null;
                }
                
                return (
                  <Polyline
                    key={i}
                    positions={element.points}
                    pathOptions={{
                      color: ELEMENT_TYPES[element.type]?.color || '#ccc',
                      weight: element.type === 'SWALE' ? 4 : 3,
                      opacity: 0.7
                    }}
                  >
                    <Tooltip permanent>{element.name}</Tooltip>
                  </Polyline>
                );
              }
              return null;
            })}

            {/* Sun arc (today) */}
            {sunArc.length > 0 && (
              <Polyline positions={sunArc} pathOptions={{ color: "#ffa000", weight: 2, dashArray: "6" }}>
                <Tooltip permanent>Sun path (today)</Tooltip>
              </Polyline>
            )}

            {/* Farm marker */}
            <Marker position={marker}>
              <Popup>
                Farm center<br />Click anywhere to move.
              </Popup>
            </Marker>

            {/* Influence circle */}
            <Circle center={marker} radius={2500} pathOptions={{ color: "#5aa", weight: 1, fillOpacity: 0.05 }} />

            {/* Click handler */}
            <MapClickHandler onClick={onMapClick} />
            <MapLegend />
          </MapContainer>
        </main>
      </div>
    </DesignProvider>
  );
}

export default App;