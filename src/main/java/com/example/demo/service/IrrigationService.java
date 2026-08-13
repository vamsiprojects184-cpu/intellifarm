package com.example.demo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;

@Service
public class IrrigationService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public static class IrrigationResult {
        public boolean irrigationRequired;
        public double waterLitres;
        public int durationMin;
        public String recommendedTime;
        public List<String> reasoning = new ArrayList<>();
        public Map<String, Object> factors = new HashMap<>();
        public boolean cropMatched;
    }

    public static class WeatherData {
        public double temperature = 28.0;
        public double humidity = 60.0;
        public double rainToday = 20.0;
        public double rainTomorrow = 30.0;
    }

    public WeatherData fetchRealWeather(double lat, double lon) {
        try {
            String url = String.format(Locale.US, "https://api.open-meteo.com/v1/forecast?latitude=%.6f&longitude=%.6f&current=temperature_2m,relative_humidity_2m,precipitation_probability&daily=precipitation_probability_max&timezone=auto&forecast_days=2", lat, lon);
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder().uri(URI.create(url)).GET().build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            
            if (response.statusCode() == 200) {
                Map<String, Object> data = objectMapper.readValue(response.body(), Map.class);
                Map<String, Object> current = (Map<String, Object>) data.get("current");
                Map<String, Object> daily = (Map<String, Object>) data.get("daily");

                WeatherData w = new WeatherData();
                if (current != null) {
                    w.temperature = current.get("temperature_2m") != null ? ((Number) current.get("temperature_2m")).doubleValue() : 28.0;
                    w.humidity = current.get("relative_humidity_2m") != null ? ((Number) current.get("relative_humidity_2m")).doubleValue() : 60.0;
                }
                if (daily != null) {
                    List<Object> rainProb = (List<Object>) daily.get("precipitation_probability_max");
                    if (rainProb != null && rainProb.size() >= 2) {
                        w.rainToday = rainProb.get(0) != null ? ((Number) rainProb.get(0)).doubleValue() : 20.0;
                        w.rainTomorrow = rainProb.get(1) != null ? ((Number) rainProb.get(1)).doubleValue() : 30.0;
                    }
                }
                w.temperature = Math.round(w.temperature * 10.0) / 10.0;
                w.humidity = Math.round(w.humidity);
                w.rainToday = Math.round(w.rainToday);
                w.rainTomorrow = Math.round(w.rainTomorrow);
                return w;
            }
        } catch (Exception e) {
            // Ignore and fall through to default fallback
        }
        return new WeatherData();
    }

    public IrrigationResult analyze(String farmId, Double overrideSoilMoisture, Double overrideTemperature, Double overrideHumidity) {
        IrrigationResult result = new IrrigationResult();
        try {
            // Get Farm details
            List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId);
            if (farms.isEmpty()) {
                throw new RuntimeException("Farm not found");
            }
            Map<String, Object> farm = farms.get(0);
            double areaAcres = farm.get("areaAcres") != null ? ((Number) farm.get("areaAcres")).doubleValue() : 1.0;
            double lat = farm.get("latitude") != null ? ((Number) farm.get("latitude")).doubleValue() : 18.52;
            double lon = farm.get("longitude") != null ? ((Number) farm.get("longitude")).doubleValue() : 73.85;

            // Fetch Weather
            WeatherData w = fetchRealWeather(lat, lon);

            // Get Crops on this farm
            List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE farmId = ? ORDER BY createdAt DESC", farmId);
            Map<String, Object> crop = crops.isEmpty() ? null : crops.get(0);

            // Get Sensor readings
            List<Map<String, Object>> sensors = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE farmId = ? AND isActive = 1", farmId);
            Double sensorMoisture = null;
            Double sensorTemp = null;
            Double sensorHum = null;

            if (!sensors.isEmpty()) {
                String sensorIds = "";
                List<String> sList = new ArrayList<>();
                for (Map<String, Object> s : sensors) {
                    sList.add("'" + s.get("id") + "'");
                }
                sensorIds = String.join(",", sList);
                List<Map<String, Object>> readings = jdbcTemplate.queryForList(
                    "SELECT * FROM SensorReading WHERE sensorId IN (" + sensorIds + ") ORDER BY timestamp DESC LIMIT 5"
                );
                for (Map<String, Object> r : readings) {
                    if (sensorMoisture == null && r.get("soilMoisture") != null) {
                        sensorMoisture = ((Number) r.get("soilMoisture")).doubleValue();
                    }
                    if (sensorTemp == null && r.get("temperature") != null) {
                        sensorTemp = ((Number) r.get("temperature")).doubleValue();
                    }
                    if (sensorHum == null && r.get("humidity") != null) {
                        sensorHum = ((Number) r.get("humidity")).doubleValue();
                    }
                }
            }

            Double soilMoisture = overrideSoilMoisture != null ? overrideSoilMoisture : (sensorMoisture != null ? sensorMoisture : null);
            Double temperature = overrideTemperature != null ? overrideTemperature : (sensorTemp != null ? sensorTemp : null);
            Double humidity = overrideHumidity != null ? overrideHumidity : (sensorHum != null ? sensorHum : null);

            if (temperature == null) temperature = w.temperature;
            if (humidity == null) humidity = w.humidity;

            // Load Config
            String cropName = crop != null ? (String) crop.get("name") : "Generic";
            List<Map<String, Object>> configs = jdbcTemplate.queryForList("SELECT * FROM IrrigationConfig WHERE cropName = ?", cropName);
            Map<String, Object> config;
            if (!configs.isEmpty()) {
                config = configs.get(0);
                result.cropMatched = true;
            } else {
                List<Map<String, Object>> defaultConfigs = jdbcTemplate.queryForList("SELECT * FROM IrrigationConfig LIMIT 1");
                if (!defaultConfigs.isEmpty()) {
                    config = defaultConfigs.get(0);
                } else {
                    config = new HashMap<>();
                    config.put("cropName", "Generic");
                    config.put("moistureThreshold", 35.0);
                    config.put("tempThreshold", 32.0);
                    config.put("rainThreshold", 60.0);
                    config.put("baseWaterLitres", 500.0);
                    config.put("baseDurationMin", 45);
                }
                result.cropMatched = false;
            }

            double moistureThreshold = config.get("moistureThreshold") != null ? ((Number) config.get("moistureThreshold")).doubleValue() : 35.0;
            double tempThreshold = config.get("tempThreshold") != null ? ((Number) config.get("tempThreshold")).doubleValue() : 32.0;
            double rainThreshold = config.get("rainThreshold") != null ? ((Number) config.get("rainThreshold")).doubleValue() : 60.0;
            double baseWaterLitres = config.get("baseWaterLitres") != null ? ((Number) config.get("baseWaterLitres")).doubleValue() : 500.0;
            int baseDurationMin = config.get("baseDurationMin") != null ? ((Number) config.get("baseDurationMin")).intValue() : 45;

            result.irrigationRequired = true;

            // Rule 1: Rain
            if (w.rainTomorrow >= rainThreshold) {
                result.irrigationRequired = false;
                result.reasoning.add(String.format("Rain probability tomorrow is %.1f%% (≥ threshold %.1f%%). Postpone irrigation to conserve water.", w.rainTomorrow, rainThreshold));
            } else if (w.rainToday >= rainThreshold) {
                result.irrigationRequired = false;
                result.reasoning.add(String.format("Rain probability today is %.1f%% (≥ threshold %.1f%%). Skip irrigation today.", w.rainToday, rainThreshold));
            }

            // Rule 2: Soil Moisture
            Double smRounded = soilMoisture != null ? Math.round(soilMoisture * 10.0) / 10.0 : null;
            if (smRounded != null) {
                if (smRounded >= moistureThreshold && result.irrigationRequired) {
                    result.irrigationRequired = false;
                    result.reasoning.add(String.format("Soil moisture is %.1f%% (≥ threshold %.1f%%). No irrigation needed.", smRounded, moistureThreshold));
                }
            }

            // Rule 3: High Temperature Adjustments
            double finalWaterLitres = baseWaterLitres * areaAcres;
            int finalDurationMin = (int) (baseDurationMin * Math.max(0.5, areaAcres));

            if (result.irrigationRequired) {
                if (smRounded != null) {
                    result.reasoning.add(String.format("Soil moisture is %.1f%% (below threshold %.1f%%). Irrigation is required.", smRounded, moistureThreshold));
                } else {
                    result.reasoning.add("No soil moisture reading available. Defaulting to scheduled irrigation based on crop settings.");
                }

                if (temperature > tempThreshold) {
                    finalWaterLitres *= 1.2;
                    finalDurationMin = (int) (finalDurationMin * 1.2);
                    result.reasoning.add(String.format("High temperature detected (%.1f°C > threshold %.1f°C). Water quantity and duration increased by 20%%.", temperature, tempThreshold));
                } else {
                    result.reasoning.add(String.format("Temperature is %.1f°C (below hot threshold %.1f°C). Applying base water rates.", temperature, tempThreshold));
                }

                result.recommendedTime = "6:00 AM (Early Morning) or 6:00 PM (Late Evening)";
            } else {
                finalWaterLitres = 0.0;
                finalDurationMin = 0;
                result.recommendedTime = "N/A";
            }

            result.waterLitres = Math.round(finalWaterLitres * 10.0) / 10.0;
            result.durationMin = finalDurationMin;

            result.factors.put("soilMoisture", smRounded);
            result.factors.put("temperature", temperature != null ? Math.round(temperature * 10.0) / 10.0 : null);
            result.factors.put("humidity", humidity != null ? Math.round(humidity) : null);
            result.factors.put("rainProbabilityToday", w.rainToday);
            result.factors.put("rainProbabilityTomorrow", w.rainTomorrow);
            result.factors.put("cropName", cropName);
            result.factors.put("growthStage", crop != null ? crop.get("stage") : null);
            result.factors.put("moistureThreshold", moistureThreshold);
            result.factors.put("tempThreshold", tempThreshold);
            result.factors.put("rainThreshold", rainThreshold);

        } catch (Exception e) {
            result.irrigationRequired = false;
            result.waterLitres = 0.0;
            result.durationMin = 0;
            result.reasoning.add("Error running irrigation engine: " + e.getMessage());
        }
        return result;
    }
}
