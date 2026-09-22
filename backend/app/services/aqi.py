from typing import Dict, Tuple, Optional, Any

# Breakpoints as given in the prompt
BREAKPOINTS = {
    'pm25': [(0,30,0,50), (30.1,60,51,100), (60.1,90,101,200), (90.1,120,201,300), (120.1,250,301,400), (250.1,500,401,500)],
    'pm10': [(0,50,0,50), (50.1,100,51,100), (100.1,250,101,200), (250.1,350,201,300), (350.1,430,301,400), (430.1,600,401,500)],
    'no2': [(0,40,0,50), (40.1,80,51,100), (80.1,180,101,200), (180.1,280,201,300), (280.1,400,301,400), (400.1,800,401,500)],
    'so2': [(0,40,0,50), (40.1,80,51,100), (80.1,380,101,200), (380.1,800,201,300), (800.1,1600,301,400), (1600.1,2000,401,500)],
    'co': [(0,1.0,0,50), (1.01,2.0,51,100), (2.01,10.0,101,200), (10.01,17.0,201,300), (17.01,34.0,301,400), (34.01,50.0,401,500)],
    'o3': [(0,50,0,50), (50.1,100,51,100), (100.1,168,101,200), (168.1,208,201,300), (208.1,748,301,400), (748.1,1000,401,500)],
    'nh3': [(0,200,0,50), (200.1,400,51,100), (400.1,800,101,200), (800.1,1200,201,300), (1200.1,1800,301,400), (1800.1,2400,401,500)],
    'pb': [(0,0.5,0,50), (0.51,1.0,51,100), (1.01,2.0,101,200), (2.01,3.0,201,300), (3.01,3.5,301,400), (3.51,5.0,401,500)]
}

def calculate_sub_index(pollutant: str, concentration: float) -> Optional[int]:
    if pollutant not in BREAKPOINTS or concentration is None:
        return None
    
    concentration = round(concentration, 2)
    bp = BREAKPOINTS[pollutant]
    
    for blo, bhi, ilo, ihi in bp:
        if blo <= concentration <= bhi:
            return round(((ihi - ilo) / (bhi - blo)) * (concentration - blo) + ilo)
            
    if concentration > bp[-1][1]:
        return 500
        
    return None

def get_aqi_category(aqi_value: int) -> Tuple[str, str]:
    if aqi_value <= 50:
        return "Good", "#00b050"
    elif aqi_value <= 100:
        return "Satisfactory", "#92d050"
    elif aqi_value <= 200:
        return "Moderate", "#ffff00"
    elif aqi_value <= 300:
        return "Poor", "#ff9900"
    elif aqi_value <= 400:
        return "Very Poor", "#ff0000"
    else:
        return "Severe", "#c00000"

def calculate_naqi(measurements: Dict[str, float]) -> Dict[str, Any]:
    sub_indices = {}
    for p, val in measurements.items():
        if val is not None:
            idx = calculate_sub_index(p, val)
            if idx is not None:
                sub_indices[p] = idx

    valid_pollutants = set(sub_indices.keys())
    
    if len(valid_pollutants) < 3 or not ('pm25' in valid_pollutants or 'pm10' in valid_pollutants):
        return {
            "aqi": None,
            "category": None,
            "color": None,
            "prominent_pollutant": None,
            "sub_indices": sub_indices,
            "status": "insufficient_data"
        }
        
    max_p = max(sub_indices, key=sub_indices.get)
    max_aqi = sub_indices[max_p]
    cat, col = get_aqi_category(max_aqi)
    
    return {
        "aqi": max_aqi,
        "category": cat,
        "color": col,
        "prominent_pollutant": max_p,
        "sub_indices": sub_indices,
        "status": "success"
    }


EPA_PM25_BREAKPOINTS = [
    (0.0, 12.0, 0, 50, "Good", "#00e400"),
    (12.1, 35.4, 51, 100, "Moderate", "#ffff00"),
    (35.5, 55.4, 101, 150, "Unhealthy for Sensitive Groups", "#ff7e00"),
    (55.5, 150.4, 151, 200, "Unhealthy", "#cc0033"),
    (150.5, 250.4, 201, 300, "Very Unhealthy", "#8f3f97"),
    (250.5, 500.4, 301, 500, "Hazardous", "#7e0023"),
]


def calculate_epa_aqi(pm25: Optional[float]) -> Dict[str, Any]:
    """Calculate US EPA AQI from PM2.5 (ug/m3) concentration."""
    if pm25 is None:
        return {"aqi": None, "category": None, "color": None}
    c = round(float(pm25), 1)
    for clo, chi, ilo, ihi, cat, col in EPA_PM25_BREAKPOINTS:
        if clo <= c <= chi:
            aqi = round(((ihi - ilo) / (chi - clo)) * (c - clo) + ilo)
            return {"aqi": aqi, "category": cat, "color": col}
    if c > 500.4:
        return {"aqi": 500, "category": "Hazardous", "color": "#7e0023"}
    return {"aqi": 0, "category": "Good", "color": "#00e400"}


def calculate_pm25_from_epa_aqi(aqi: float) -> float:
    """Invert US EPA AQI to PM2.5 (ug/m3)."""
    if aqi <= 50:
        return round((aqi / 50.0) * 12.0, 1)
    elif aqi <= 100:
        return round(((aqi - 51.0) / 49.0) * (35.4 - 12.1) + 12.1, 1)
    elif aqi <= 150:
        return round(((aqi - 101.0) / 49.0) * (55.4 - 35.5) + 35.5, 1)
    elif aqi <= 200:
        return round(((aqi - 151.0) / 49.0) * (150.4 - 55.5) + 55.5, 1)
    elif aqi <= 300:
        return round(((aqi - 201.0) / 99.0) * (250.4 - 150.5) + 150.5, 1)
    else:
        return round(((aqi - 301.0) / 199.0) * (500.4 - 250.5) + 250.5, 1)

