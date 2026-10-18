package com.example.demo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.*;

@Service
public class DiseaseService {

    private static final String GROQ_API_KEY = System.getenv("GROQ_API_KEY") != null ? System.getenv("GROQ_API_KEY") : "";
    private static final String GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String VISION_MODEL = "llama-3.2-11b-vision-preview";

    private static final String PROMPT = "You are an agricultural plant pathology assistant. Analyze this crop/plant image and identify possible disease or pest problem.\n" +
            "\n" +
            "Respond ONLY with a valid JSON object (no markdown fences, no extra text) with this exact schema:\n" +
            "{\n" +
            "  \"cropName\": \"the crop you observe, e.g. Tomato / Rice / Wheat / Unknown\",\n" +
            "  \"predictedDisease\": \"most likely disease name, or null if healthy\",\n" +
            "  \"confidence\": \"number between 0 and 1\",\n" +
            "  \"severity\": \"one of LOW, MODERATE, HIGH, SEVERE, UNKNOWN\",\n" +
            "  \"symptoms\": \"concise description of visible symptoms observed in the image\",\n" +
            "  \"recommendedAction\": \"immediate actionable treatment steps for the farmer\",\n" +
            "  \"preventionTips\": \"3-5 short prevention tips for future\"\n" +
            "}\n" +
            "\n" +
            "Important: If the image is healthy or not a plant, set predictedDisease to null, confidence low, severity UNKNOWN, and explain in symptoms. Be conservative — never claim 100% certainty.";

    @Autowired
    private ObjectMapper objectMapper;

    public static class DiseaseAnalysisResult {
        public String cropName;
        public String predictedDisease;
        public double confidence;
        public String severity;
        public String symptoms;
        public String recommendedAction;
        public String preventionTips;
        public String rawResponse;
    }

    public DiseaseAnalysisResult analyze(String imagePath) throws Exception {
        // Resolve absolute path
        String cwd = System.getProperty("user.dir");
        String cleanPath = imagePath.replaceFirst("^/", "");
        java.nio.file.Path absPath = Paths.get(cwd, "public", cleanPath);
        if (!Files.exists(absPath)) {
            absPath = Paths.get(cwd, cleanPath);
        }
        if (!Files.exists(absPath)) {
            throw new RuntimeException("Image file not found at " + absPath.toAbsolutePath());
        }

        byte[] fileBytes = Files.readAllBytes(absPath);
        String ext = "";
        int i = imagePath.lastIndexOf('.');
        if (i > 0) {
            ext = imagePath.substring(i + 1).toLowerCase();
        }
        String mime = "image/jpeg";
        if ("png".equals(ext)) mime = "image/png";
        else if ("webp".equals(ext)) mime = "image/webp";

        String base64Image = Base64.getEncoder().encodeToString(fileBytes);
        String dataUrl = "data:" + mime + ";base64," + base64Image;

        // Build Groq Payload
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", VISION_MODEL);
        requestBody.put("temperature", 0.2);

        Map<String, Object> message = new HashMap<>();
        message.put("role", "user");

        List<Map<String, Object>> contentList = new ArrayList<>();
        
        Map<String, Object> textContent = new HashMap<>();
        textContent.put("type", "text");
        textContent.put("text", PROMPT);
        contentList.add(textContent);

        Map<String, Object> imageContent = new HashMap<>();
        imageContent.put("type", "image_url");
        Map<String, String> imageUrlMap = new HashMap<>();
        imageUrlMap.put("url", dataUrl);
        imageContent.put("image_url", imageUrlMap);
        contentList.add(imageContent);

        message.put("content", contentList);
        requestBody.put("messages", List.of(message));

        String jsonPayload = objectMapper.writeValueAsString(requestBody);

        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GROQ_API_URL))
                .header("Authorization", "Bearer " + GROQ_API_KEY)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Groq API returned error status: " + response.statusCode() + " response: " + response.body());
        }

        String responseBody = response.body();
        Map<String, Object> respMap = objectMapper.readValue(responseBody, Map.class);
        List<Map<String, Object>> choices = (List<Map<String, Object>>) respMap.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("No choice returned from Groq API");
        }
        Map<String, Object> choice = choices.get(0);
        Map<String, Object> respMessage = (Map<String, Object>) choice.get("message");
        String content = (String) respMessage.get("content");

        return parseResult(content);
    }

    private DiseaseAnalysisResult parseResult(String raw) {
        String jsonStr = raw.trim();
        // Remove markdown formatting
        if (jsonStr.startsWith("```")) {
            int firstLineEnd = jsonStr.indexOf('\n');
            int lastFence = jsonStr.lastIndexOf("```");
            if (firstLineEnd > 0 && lastFence > firstLineEnd) {
                jsonStr = jsonStr.substring(firstLineEnd, lastFence).trim();
            }
        }
        int braceStart = jsonStr.indexOf('{');
        int braceEnd = jsonStr.lastIndexOf('}');
        if (braceStart >= 0 && braceEnd > braceStart) {
            jsonStr = jsonStr.substring(braceStart, braceEnd + 1);
        }

        DiseaseAnalysisResult result = new DiseaseAnalysisResult();
        result.rawResponse = raw;
        try {
            Map<String, Object> parsed = objectMapper.readValue(jsonStr, Map.class);
            result.cropName = String.valueOf(parsed.getOrDefault("cropName", "Unknown"));
            result.predictedDisease = parsed.get("predictedDisease") == null ? null : String.valueOf(parsed.get("predictedDisease"));
            
            Object confObj = parsed.get("confidence");
            double confidence = 0.0;
            if (confObj instanceof Number) {
                confidence = ((Number) confObj).doubleValue();
            } else if (confObj != null) {
                try {
                    confidence = Double.parseDouble(String.valueOf(confObj));
                } catch (Exception e) {}
            }
            result.confidence = Math.max(0.0, Math.min(1.0, confidence));

            String sev = String.valueOf(parsed.getOrDefault("severity", "UNKNOWN")).toUpperCase();
            if (List.of("LOW", "MODERATE", "HIGH", "SEVERE", "UNKNOWN").contains(sev)) {
                result.severity = sev;
            } else {
                result.severity = "UNKNOWN";
            }

            result.symptoms = String.valueOf(parsed.getOrDefault("symptoms", ""));
            result.recommendedAction = String.valueOf(parsed.getOrDefault("recommendedAction", ""));
            result.preventionTips = String.valueOf(parsed.getOrDefault("preventionTips", ""));
        } catch (Exception e) {
            result.cropName = "Unknown";
            result.predictedDisease = null;
            result.confidence = 0.0;
            result.severity = "UNKNOWN";
            result.symptoms = "Unable to parse analysis. Raw response retained.";
            result.recommendedAction = "Please consult an agricultural expert.";
            result.preventionTips = "";
        }
        return result;
    }
}
