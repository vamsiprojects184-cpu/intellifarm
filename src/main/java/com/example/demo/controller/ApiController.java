package com.example.demo.controller;

import com.example.demo.service.SessionService;
import com.example.demo.service.SessionService.SessionPayload;
import com.example.demo.service.DiseaseService;
import com.example.demo.service.DiseaseService.DiseaseAnalysisResult;
import com.example.demo.service.IrrigationService;
import com.example.demo.service.IrrigationService.IrrigationResult;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.util.*;

@RestController
@RequestMapping("/api/v1")
public class ApiController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private SessionService sessionService;

    @Autowired
    private DiseaseService diseaseService;

    @Autowired
    private IrrigationService irrigationService;

    @Autowired
    private ObjectMapper objectMapper;

    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    // ============================================================
    // HELPER RESPONSES
    // ============================================================
    private ResponseEntity<Map<String, Object>> ok(Object data, String message, HttpStatus status) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", true);
        resp.put("message", message != null ? message : "OK");
        resp.put("data", data);
        return new ResponseEntity<>(resp, status);
    }

    private ResponseEntity<Map<String, Object>> ok(Object data, String message) {
        return ok(data, message, HttpStatus.OK);
    }

    private ResponseEntity<Map<String, Object>> ok(Object data) {
        return ok(data, "OK", HttpStatus.OK);
    }

    private ResponseEntity<Map<String, Object>> err(String message, Object errors, HttpStatus status) {
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("success", false);
        resp.put("message", message);
        resp.put("errors", errors != null ? errors : List.of());
        return new ResponseEntity<>(resp, status);
    }

    private ResponseEntity<Map<String, Object>> err(String message, HttpStatus status) {
        return err(message, null, status);
    }

    private ResponseEntity<Map<String, Object>> unauthorized(String msg) {
        return err(msg, HttpStatus.UNAUTHORIZED);
    }

    private ResponseEntity<Map<String, Object>> unauthorized() {
        return unauthorized("Unauthorized");
    }

    // ============================================================
    // AUTHENTICATION UTILS
    // ============================================================
    private SessionPayload getSessionPayload(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) return null;
        for (Cookie c : cookies) {
            if ("ec_session".equals(c.getName())) {
                return sessionService.verifyAccessToken(c.getValue());
            }
        }
        return null;
    }

    private Map<String, Object> getCurrentUser(HttpServletRequest request) {
        SessionPayload payload = getSessionPayload(request);
        return sessionService.getUserBySession(payload);
    }

    // ============================================================
    // AUTH ROUTE HANDLERS
    // ============================================================
    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) {
            return ok(Collections.singletonMap("user", null));
        }
        // Remove passwordHash before sending
        Map<String, Object> cleanUser = new HashMap<>(user);
        cleanUser.remove("passwordHash");
        return ok(Map.of("user", cleanUser));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body, HttpServletResponse response) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return err("Email and password are required", HttpStatus.BAD_REQUEST);
        }

        List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT * FROM User WHERE email = ?", email);
        if (users.isEmpty()) {
            return err("Invalid email or password", HttpStatus.BAD_REQUEST);
        }

        Map<String, Object> user = users.get(0);
        int isActive = user.get("isActive") instanceof Number ? ((Number) user.get("isActive")).intValue() : 1;
        if (isActive == 0) {
            return err("Account is disabled", HttpStatus.FORBIDDEN);
        }

        String hash = (String) user.get("passwordHash");
        if (!passwordEncoder.matches(password, hash) && !password.equals(hash)) {
            // Support raw password comparison for seeded dev accounts if password encoding fails
            if (!password.equals(hash)) {
                return err("Invalid email or password", HttpStatus.BAD_REQUEST);
            }
        }

        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        String accessToken = sessionService.signAccessToken(uid, role, email);
        String refreshToken = sessionService.signRefreshToken(uid);

        String sessionCookie = String.format("ec_session=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600", accessToken);
        String refreshCookie = String.format("ec_refresh=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800", refreshToken);
        response.addHeader("Set-Cookie", sessionCookie);
        response.addHeader("Set-Cookie", refreshCookie);

        Map<String, Object> cleanUser = new HashMap<>(user);
        cleanUser.remove("passwordHash");

        // Fetch expertProfile if exists
        List<Map<String, Object>> experts = jdbcTemplate.queryForList("SELECT * FROM ExpertProfile WHERE userId = ?", uid);
        if (!experts.isEmpty()) {
            cleanUser.put("expertProfile", experts.get(0));
        } else {
            cleanUser.put("expertProfile", null);
        }

        return ok(Map.of("user", cleanUser), "Login successful");
    }

    @PostMapping("/auth/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody Map<String, Object> body, HttpServletResponse response) {
        String email = (String) body.get("email");
        String mobile = (String) body.get("mobile");
        String password = (String) body.get("password");
        String fullName = (String) body.get("fullName");
        String roleStr = (String) body.getOrDefault("role", "FARMER");

        if (email == null || mobile == null || password == null || fullName == null) {
            return err("Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        // Check duplicate
        List<Map<String, Object>> existing = jdbcTemplate.queryForList(
            "SELECT id FROM User WHERE email = ? OR mobile = ?", email, mobile
        );
        if (!existing.isEmpty()) {
            return err("Email or mobile already registered", HttpStatus.BAD_REQUEST);
        }

        String uid = UUID.randomUUID().toString();
        String passwordHash = passwordEncoder.encode(password);
        String lang = (String) body.getOrDefault("preferredLang", "en");
        String state = (String) body.get("state");
        String district = (String) body.get("district");
        String village = (String) body.get("village");
        String farmingExp = (String) body.get("farmingExp");
        String primaryCrop = (String) body.get("primaryCrop");
        
        Double farmSize = null;
        if (body.get("farmSizeAcres") != null) {
            farmSize = ((Number) body.get("farmSizeAcres")).doubleValue();
        }

        jdbcTemplate.update(
            "INSERT INTO User (id, email, mobile, passwordHash, fullName, role, preferredLang, state, district, village, farmingExp, primaryCrop, farmSizeAcres, isActive, isVerified, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)",
            uid, email, mobile, passwordHash, fullName, roleStr, lang, state, district, village, farmingExp, primaryCrop, farmSize,
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        if ("EXPERT".equals(roleStr)) {
            String expId = UUID.randomUUID().toString();
            jdbcTemplate.update(
                "INSERT INTO ExpertProfile (id, userId, specialization, experience, qualification, bio, isVerified, rating, totalConsultations, createdAt, updatedAt) VALUES (?, ?, ?, 0, ?, ?, 0, 0, 0, ?, ?)",
                expId, uid, body.getOrDefault("specialization", "General"), body.getOrDefault("qualification", "B.Sc Agriculture"), body.getOrDefault("bio", ""),
                new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
            );
        }

        String accessToken = sessionService.signAccessToken(uid, roleStr, email);
        String refreshToken = sessionService.signRefreshToken(uid);

        String sessionCookie = String.format("ec_session=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600", accessToken);
        String refreshCookie = String.format("ec_refresh=%s; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800", refreshToken);
        response.addHeader("Set-Cookie", sessionCookie);
        response.addHeader("Set-Cookie", refreshCookie);

        List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT * FROM User WHERE id = ?", uid);
        Map<String, Object> user = new HashMap<>(users.get(0));
        user.remove("passwordHash");

        return ok(Map.of("user", user), "Registration successful", HttpStatus.CREATED);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletResponse response) {
        String sessionCookie = "ec_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
        String refreshCookie = "ec_refresh=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0";
        response.addHeader("Set-Cookie", sessionCookie);
        response.addHeader("Set-Cookie", refreshCookie);
        return ok(null, "Logged out successfully");
    }

    // ============================================================
    // FARMS
    // ============================================================
    @GetMapping("/farms")
    public ResponseEntity<Map<String, Object>> getFarms(HttpServletRequest request, @RequestParam(value = "archived", required = false) Boolean archived) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        List<Map<String, Object>> farms;
        if ("ADMIN".equals(role)) {
            if (archived != null) {
                farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE archived = ?", archived ? 1 : 0);
            } else {
                farms = jdbcTemplate.queryForList("SELECT * FROM Farm");
            }
        } else {
            int archivedVal = (archived != null && archived) ? 1 : 0;
            farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE ownerId = ? AND archived = ?", uid, archivedVal);
        }

        for (Map<String, Object> farm : farms) {
            String farmId = (String) farm.get("id");
            List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE farmId = ?", farmId);
            List<Map<String, Object>> sensors = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE farmId = ?", farmId);
            farm.put("crops", crops);
            farm.put("sensors", sensors);
        }

        return ok(farms);
    }

    @PostMapping("/farms")
    public ResponseEntity<Map<String, Object>> createFarm(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String uid = (String) user.get("id");
        String id = UUID.randomUUID().toString();
        String name = (String) body.get("name");
        String state = (String) body.get("state");
        String district = (String) body.get("district");
        String village = (String) body.get("village");
        Double area = body.get("areaAcres") != null ? ((Number) body.get("areaAcres")).doubleValue() : 1.0;
        Double lat = body.get("latitude") != null ? ((Number) body.get("latitude")).doubleValue() : null;
        Double lon = body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : null;
        String soilType = (String) body.get("soilType");
        String irrigationType = (String) body.get("irrigationType");
        String waterSource = (String) body.get("waterSource");
        String description = (String) body.get("description");

        jdbcTemplate.update(
            "INSERT INTO Farm (id, ownerId, name, state, district, village, latitude, longitude, areaAcres, soilType, irrigationType, waterSource, description, archived, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
            id, uid, name, state, district, village, lat, lon, area, soilType, irrigationType, waterSource, description,
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", id);
        Map<String, Object> farm = new HashMap<>(farms.get(0));
        farm.put("crops", List.of());
        farm.put("sensors", List.of());

        return ok(farm, "Farm created", HttpStatus.CREATED);
    }

    @GetMapping("/farms/{id}")
    public ResponseEntity<Map<String, Object>> getFarm(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", id);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        Map<String, Object> farm = farms.get(0);

        String ownerId = (String) farm.get("ownerId");
        if (!ownerId.equals(user.get("id")) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE farmId = ?", id);
        List<Map<String, Object>> sensors = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE farmId = ?", id);
        for (Map<String, Object> s : sensors) {
            String sId = (String) s.get("id");
            List<Map<String, Object>> readings = jdbcTemplate.queryForList(
                "SELECT * FROM SensorReading WHERE sensorId = ? ORDER BY timestamp DESC LIMIT 50", sId
            );
            s.put("readings", readings);
        }

        List<Map<String, Object>> activities = jdbcTemplate.queryForList(
            "SELECT * FROM FarmActivity WHERE farmId = ? ORDER BY createdAt DESC LIMIT 10", id
        );

        List<Map<String, Object>> owners = jdbcTemplate.queryForList(
            "SELECT id, fullName, email FROM User WHERE id = ?", ownerId
        );

        List<Map<String, Object>> drRow = jdbcTemplate.queryForList(
            "SELECT COUNT(id) as cnt FROM DiseaseReport WHERE farmId = ?", id
        );
        int drCount = drRow.isEmpty() ? 0 : ((Number) drRow.get(0).get("cnt")).intValue();

        List<Map<String, Object>> recsRow = jdbcTemplate.queryForList(
            "SELECT COUNT(r.id) as cnt FROM Recommendation r JOIN Crop c ON r.cropId = c.id WHERE c.farmId = ?", id
        );
        int recsCount = recsRow.isEmpty() ? 0 : ((Number) recsRow.get(0).get("cnt")).intValue();

        Map<String, Object> countObj = new LinkedHashMap<>();
        countObj.put("crops", crops.size());
        countObj.put("sensors", sensors.size());
        countObj.put("activities", activities.size());
        countObj.put("diseaseReports", drCount);
        countObj.put("recommendations", recsCount);

        Map<String, Object> data = new HashMap<>(farm);
        data.put("crops", crops);
        data.put("sensors", sensors);
        data.put("activities", activities);
        data.put("owner", !owners.isEmpty() ? owners.get(0) : null);
        data.put("_count", countObj);

        return ok(data);
    }

    @PutMapping("/farms/{id}")
    public ResponseEntity<Map<String, Object>> updateFarm(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", id);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        Map<String, Object> farm = farms.get(0);

        String ownerId = (String) farm.get("ownerId");
        if (!ownerId.equals(user.get("id")) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        String name = (String) body.getOrDefault("name", farm.get("name"));
        String state = (String) body.getOrDefault("state", farm.get("state"));
        String district = (String) body.getOrDefault("district", farm.get("district"));
        String village = (String) body.getOrDefault("village", farm.get("village"));
        Double area = body.get("areaAcres") != null ? ((Number) body.get("areaAcres")).doubleValue() : ((Number) farm.get("areaAcres")).doubleValue();
        Double lat = body.get("latitude") != null ? ((Number) body.get("latitude")).doubleValue() : (farm.get("latitude") != null ? ((Number) farm.get("latitude")).doubleValue() : null);
        Double lon = body.get("longitude") != null ? ((Number) body.get("longitude")).doubleValue() : (farm.get("longitude") != null ? ((Number) farm.get("longitude")).doubleValue() : null);
        String soilType = (String) body.getOrDefault("soilType", farm.get("soilType"));
        String irrigationType = (String) body.getOrDefault("irrigationType", farm.get("irrigationType"));
        String waterSource = (String) body.getOrDefault("waterSource", farm.get("waterSource"));
        String description = (String) body.getOrDefault("description", farm.get("description"));

        jdbcTemplate.update(
            "UPDATE Farm SET name=?, state=?, district=?, village=?, latitude=?, longitude=?, areaAcres=?, soilType=?, irrigationType=?, waterSource=?, description=?, updatedAt=? WHERE id=?",
            name, state, district, village, lat, lon, area, soilType, irrigationType, waterSource, description,
            new Timestamp(System.currentTimeMillis()), id
        );

        List<Map<String, Object>> updatedFarms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", id);
        return ok(updatedFarms.get(0), "Farm updated");
    }

    @DeleteMapping("/farms/{id}")
    public ResponseEntity<Map<String, Object>> deleteFarm(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", id);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        Map<String, Object> farm = farms.get(0);

        String ownerId = (String) farm.get("ownerId");
        if (!ownerId.equals(user.get("id")) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        jdbcTemplate.update("UPDATE Farm SET archived = 1 WHERE id = ?", id);
        return ok(null, "Farm archived");
    }

    // ============================================================
    // CROPS
    // ============================================================
    @GetMapping("/crops")
    public ResponseEntity<Map<String, Object>> getCrops(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> crops;
        if (farmId != null) {
            crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE farmId = ? ORDER BY plantingDate DESC", farmId);
        } else {
            if ("ADMIN".equals(user.get("role"))) {
                crops = jdbcTemplate.queryForList("SELECT * FROM Crop ORDER BY plantingDate DESC");
            } else {
                crops = jdbcTemplate.queryForList(
                    "SELECT c.* FROM Crop c JOIN Farm f ON c.farmId = f.id WHERE f.ownerId = ? AND f.archived = 0 ORDER BY c.plantingDate DESC",
                    user.get("id")
                );
            }
        }
        return ok(crops);
    }

    @PostMapping("/crops")
    public ResponseEntity<Map<String, Object>> createCrop(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        String name = (String) body.get("name");
        String variety = (String) body.get("variety");
        String plantingDateStr = (String) body.get("plantingDate");
        Double area = body.get("areaAcres") != null ? ((Number) body.get("areaAcres")).doubleValue() : 1.0;
        String notes = (String) body.get("notes");
        String stage = (String) body.getOrDefault("stage", "PLANTED");

        if (farmId == null || name == null || plantingDateStr == null) {
            return err("Missing farmId, name, or plantingDate", HttpStatus.BAD_REQUEST);
        }

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        if (!farms.get(0).get("ownerId").equals(user.get("id")) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        String id = UUID.randomUUID().toString();
        
        // Parse date strings safely
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        Timestamp plantingDate;
        try {
            plantingDate = new Timestamp(sdf.parse(plantingDateStr.substring(0, 10)).getTime());
        } catch (Exception e) {
            plantingDate = new Timestamp(System.currentTimeMillis());
        }

        jdbcTemplate.update(
            "INSERT INTO Crop (id, farmId, name, variety, plantingDate, stage, areaAcres, health, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'GOOD', ?, ?, ?)",
            id, farmId, name, variety, plantingDate, stage, area, notes,
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        // Auto-create Activity
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) VALUES (?, ?, ?, ?, 'PLANTING', ?, ?, 1, ?)",
            UUID.randomUUID().toString(), farmId, id, user.get("id"),
            "Crop planted: " + name, "Planted " + area + " acres of " + name + " (" + variety + ")",
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE id = ?", id);
        return ok(crops.get(0), "Crop added", HttpStatus.CREATED);
    }

    @PatchMapping("/crops/{id}/stage")
    public ResponseEntity<Map<String, Object>> updateCropStage(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE id = ?", id);
        if (crops.isEmpty()) return err("Crop not found", HttpStatus.NOT_FOUND);
        Map<String, Object> crop = crops.get(0);

        String stage = body.get("stage");
        if (stage == null) return err("Stage is required", HttpStatus.BAD_REQUEST);

        jdbcTemplate.update(
            "UPDATE Crop SET stage=?, updatedAt=? WHERE id=?",
            stage, new Timestamp(System.currentTimeMillis()), id
        );

        // Auto-create activity
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) VALUES (?, ?, ?, ?, 'OTHER', ?, ?, 1, ?)",
            UUID.randomUUID().toString(), crop.get("farmId"), id, user.get("id"),
            "Stage updated: " + stage, "Crop: " + crop.get("name") + " transitioned to stage " + stage,
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE id = ?", id);
        return ok(updated.get(0), "Crop stage updated");
    }

    @DeleteMapping("/crops/{id}")
    public ResponseEntity<Map<String, Object>> deleteCrop(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE id = ?", id);
        if (crops.isEmpty()) return err("Crop not found", HttpStatus.NOT_FOUND);

        jdbcTemplate.update("DELETE FROM Crop WHERE id = ?", id);
        return ok(null, "Crop deleted");
    }

    // ============================================================
    // ACTIVITIES
    // ============================================================
    @GetMapping("/activities")
    public ResponseEntity<Map<String, Object>> getActivities(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> activities;
        if (farmId != null) {
            activities = jdbcTemplate.queryForList("SELECT * FROM FarmActivity WHERE farmId = ? ORDER BY createdAt DESC LIMIT 100", farmId);
        } else {
            if ("ADMIN".equals(user.get("role"))) {
                activities = jdbcTemplate.queryForList("SELECT * FROM FarmActivity ORDER BY createdAt DESC LIMIT 100");
            } else {
                activities = jdbcTemplate.queryForList(
                    "SELECT a.* FROM FarmActivity a JOIN Farm f ON a.farmId = f.id WHERE f.ownerId = ? ORDER BY a.createdAt DESC LIMIT 100",
                    user.get("id")
                );
            }
        }
        return ok(activities);
    }

    @PostMapping("/activities")
    public ResponseEntity<Map<String, Object>> createActivity(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        String cropId = (String) body.get("cropId");
        String type = (String) body.get("type");
        String title = (String) body.get("title");
        String description = (String) body.get("description");

        if (farmId == null || type == null || title == null) {
            return err("Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
            id, farmId, cropId, user.get("id"), type, title, description,
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> acts = jdbcTemplate.queryForList("SELECT * FROM FarmActivity WHERE id = ?", id);
        return ok(acts.get(0), "Activity created", HttpStatus.CREATED);
    }

    // ============================================================
    // SENSORS
    // ============================================================
    @GetMapping("/sensors")
    public ResponseEntity<Map<String, Object>> getSensors(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> sensors;
        if (farmId != null) {
            sensors = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE farmId = ?", farmId);
        } else {
            if ("ADMIN".equals(user.get("role"))) {
                sensors = jdbcTemplate.queryForList("SELECT * FROM Sensor");
            } else {
                sensors = jdbcTemplate.queryForList(
                    "SELECT s.* FROM Sensor s JOIN Farm f ON s.farmId = f.id WHERE f.ownerId = ? AND f.archived = 0",
                    user.get("id")
                );
            }
        }
        return ok(sensors);
    }

    @PostMapping("/sensors")
    public ResponseEntity<Map<String, Object>> createSensor(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        String sensorId = (String) body.get("sensorId");
        String name = (String) body.get("name");
        String type = (String) body.get("type");
        String location = (String) body.get("location");

        if (farmId == null || sensorId == null || name == null || type == null) {
            return err("Required fields are missing", HttpStatus.BAD_REQUEST);
        }

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO Sensor (id, farmId, sensorId, name, type, location, isActive, createdAt) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
            id, farmId, sensorId, name, type, location,
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> sens = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE id = ?", id);
        return ok(sens.get(0), "Sensor registered", HttpStatus.CREATED);
    }

    @PostMapping("/sensors/readings")
    public ResponseEntity<Map<String, Object>> createReading(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String sensorId = (String) body.get("sensorId");
        Double moisture = body.get("soilMoisture") != null ? ((Number) body.get("soilMoisture")).doubleValue() : null;
        Double temp = body.get("temperature") != null ? ((Number) body.get("temperature")).doubleValue() : null;
        Double humidity = body.get("humidity") != null ? ((Number) body.get("humidity")).doubleValue() : null;
        Double level = body.get("waterLevel") != null ? ((Number) body.get("waterLevel")).doubleValue() : null;
        Boolean isManual = body.get("isManual") != null ? (Boolean) body.get("isManual") : false;

        if (sensorId == null) return err("sensorId is required", HttpStatus.BAD_REQUEST);

        List<Map<String, Object>> sens = jdbcTemplate.queryForList("SELECT * FROM Sensor WHERE id = ? OR sensorId = ?", sensorId, sensorId);
        if (sens.isEmpty()) return err("Sensor not found", HttpStatus.NOT_FOUND);
        Map<String, Object> sensor = sens.get(0);
        String realSensorId = (String) sensor.get("id");
        String farmId = (String) sensor.get("farmId");

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO SensorReading (id, sensorId, farmId, reportedBy, soilMoisture, temperature, humidity, waterLevel, isManual, isAnomaly, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
            id, realSensorId, farmId, user.get("id"), moisture, temp, humidity, level, isManual ? 1 : 0,
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> reads = jdbcTemplate.queryForList("SELECT * FROM SensorReading WHERE id = ?", id);
        return ok(reads.get(0), "Reading recorded", HttpStatus.CREATED);
    }

    // ============================================================
    // WEATHER FORECAST
    // ============================================================
    @GetMapping("/weather/{farmId}")
    public ResponseEntity<Map<String, Object>> getWeather(@PathVariable String farmId, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        Map<String, Object> farm = farms.get(0);

        double lat = farm.get("latitude") != null ? ((Number) farm.get("latitude")).doubleValue() : 18.52;
        double lon = farm.get("longitude") != null ? ((Number) farm.get("longitude")).doubleValue() : 73.85;

        // Call Open-Meteo or return realistic data
        IrrigationService.WeatherData wData = irrigationService.fetchRealWeather(lat, lon);

        Map<String, Object> today = new LinkedHashMap<>();
        today.put("temperature", wData.temperature);
        today.put("humidity", wData.humidity);
        today.put("rainProbability", wData.rainToday);
        today.put("conditionText", wData.rainToday > 60 ? "Rainy" : wData.rainToday > 20 ? "Cloudy" : "Clear");

        List<Map<String, Object>> forecasts = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        for (int i = 0; i < 7; i++) {
            Map<String, Object> f = new LinkedHashMap<>();
            f.put("date", new SimpleDateFormat("yyyy-MM-dd").format(cal.getTime()));
            f.put("tempMax", Math.round(wData.temperature + (Math.random() * 4 - 2)));
            f.put("tempMin", Math.round(wData.temperature - 6 + (Math.random() * 4 - 2)));
            f.put("rainProbability", i == 0 ? wData.rainToday : i == 1 ? wData.rainTomorrow : Math.round(Math.random() * 100));
            f.put("condition", f.get("rainProbability") != null && ((Number) f.get("rainProbability")).doubleValue() > 60 ? "RAIN" : "CLEAR");
            forecasts.add(f);
            cal.add(Calendar.DATE, 1);
        }

        List<Map<String, Object>> insights = new ArrayList<>();
        if (wData.rainToday > 50) {
            insights.add(Map.of("priority", "HIGH", "title", "High Rain Probability", "message", "High chance of rain today. Pause planned irrigation."));
        }
        if (wData.temperature > 35) {
            insights.add(Map.of("priority", "MEDIUM", "title", "Heat Alert", "message", "Temperature is above 35°C. Crops may require extra water."));
        }
        if (insights.isEmpty()) {
            insights.add(Map.of("priority", "INFO", "title", "Normal Weather", "message", "Weather is within normal range for optimal crop growth."));
        }

        Map<String, Object> location = new LinkedHashMap<>();
        location.put("state", farm.get("state"));
        location.put("district", farm.get("district"));
        location.put("village", farm.get("village"));
        location.put("latitude", farm.get("latitude"));
        location.put("longitude", farm.get("longitude"));

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("today", today);
        data.put("forecast", forecasts);
        data.put("insights", insights);
        data.put("location", location);

        return ok(data);
    }

    // ============================================================
    // RECOMMENDATIONS
    // ============================================================
    @GetMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> getRecommendations(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> recs = jdbcTemplate.queryForList(
            "SELECT * FROM Recommendation WHERE userId = ? ORDER BY createdAt DESC", user.get("id")
        );
        return ok(recs);
    }

    @PostMapping("/recommendations")
    public ResponseEntity<Map<String, Object>> generateRecommendations(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");

        // Run irrigation recommendation for all farms owned by this user
        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE ownerId = ? AND archived = 0", uid);
        int generated = 0;
        for (Map<String, Object> farm : farms) {
            String farmId = (String) farm.get("id");
            IrrigationResult result = irrigationService.analyze(farmId, null, null, null);
            if (result.irrigationRequired) {
                // Check if there is already a pending recommendation for irrigation on this farm
                List<Map<String, Object>> existing = jdbcTemplate.queryForList(
                    "SELECT id FROM Recommendation WHERE userId = ? AND farmId = ? AND category = 'IRRIGATION' AND status = 'PENDING'",
                    uid, farmId
                );
                if (existing.isEmpty()) {
                    jdbcTemplate.update(
                        "INSERT INTO Recommendation (id, userId, farmId, cropId, category, title, description, priority, status, source, createdAt) VALUES (?, ?, ?, ?, 'IRRIGATION', ?, ?, 'MEDIUM', 'PENDING', 'RULE_ENGINE', ?)",
                        UUID.randomUUID().toString(), uid, farmId, null,
                        "Irrigate " + farm.get("name"),
                        String.join(" ", result.reasoning) + " Recommended duration: " + result.durationMin + " mins.",
                        new Timestamp(System.currentTimeMillis())
                    );
                    generated++;
                }
            }
        }
        return ok(Map.of("generated", generated), generated + " recommendations generated");
    }

    @PatchMapping("/recommendations/{id}")
    public ResponseEntity<Map<String, Object>> updateRecommendation(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String status = body.get("status");
        if (status == null) return err("status is required", HttpStatus.BAD_REQUEST);

        jdbcTemplate.update(
            "UPDATE Recommendation SET status=?, createdAt=? WHERE id=? AND userId=?",
            status, new Timestamp(System.currentTimeMillis()), id, user.get("id")
        );
        return ok(null, "Recommendation updated");
    }

    // ============================================================
    // NOTIFICATIONS & ALERTS
    // ============================================================
    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> getNotifications(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> unread = jdbcTemplate.queryForList(
            "SELECT COUNT(id) as count FROM Notification WHERE userId = ? AND isRead = 0", user.get("id")
        );
        long count = unread.isEmpty() ? 0 : ((Number) unread.get(0).get("count")).longValue();

        List<Map<String, Object>> list = jdbcTemplate.queryForList(
            "SELECT * FROM Notification WHERE userId = ? ORDER BY createdAt DESC LIMIT 100", user.get("id")
        );

        return ok(Map.of("unreadCount", count, "notifications", list));
    }

    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, Object>> readNotification(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        jdbcTemplate.update(
            "UPDATE Notification SET isRead = 1 WHERE id = ? AND userId = ?", id, user.get("id")
        );
        return ok(null, "Notification marked as read");
    }

    @GetMapping("/alerts")
    public ResponseEntity<Map<String, Object>> getAlerts(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> list = jdbcTemplate.queryForList(
            "SELECT * FROM Alert WHERE userId = ? OR userId IS NULL ORDER BY createdAt DESC LIMIT 50", user.get("id")
        );
        return ok(list);
    }

    @PatchMapping("/alerts/{id}/read")
    public ResponseEntity<Map<String, Object>> readAlert(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        jdbcTemplate.update(
            "UPDATE Alert SET isRead = 1 WHERE id = ? AND userId = ?", id, user.get("id")
        );
        return ok(null, "Alert marked as read");
    }

    // ============================================================
    // ANALYTICS
    // ============================================================
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getAnalytics(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");

        List<Map<String, Object>> farms;
        if ("ADMIN".equals(user.get("role"))) {
            farms = farmId != null ? jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId) : jdbcTemplate.queryForList("SELECT * FROM Farm");
        } else {
            farms = farmId != null ? jdbcTemplate.queryForList("SELECT * FROM Farm WHERE ownerId = ? AND id = ?", uid, farmId) : jdbcTemplate.queryForList("SELECT * FROM Farm WHERE ownerId = ? AND archived = 0", uid);
        }

        List<Map<String, Object>> farmScores = new ArrayList<>();
        long totalFarms = farms.size();
        long totalCrops = 0;
        long activeCrops = 0;
        long needsAttention = 0;

        for (Map<String, Object> farm : farms) {
            String fId = (String) farm.get("id");

            // Fetch recent sensor readings
            List<Map<String, Object>> readings = jdbcTemplate.queryForList(
                "SELECT * FROM SensorReading WHERE farmId = ? ORDER BY timestamp DESC LIMIT 1", fId
            );
            Double moisture = readings.isEmpty() ? null : (readings.get(0).get("soilMoisture") != null ? ((Number) readings.get(0).get("soilMoisture")).doubleValue() : null);
            Double temp = readings.isEmpty() ? null : (readings.get(0).get("temperature") != null ? ((Number) readings.get(0).get("temperature")).doubleValue() : null);
            Double humidity = readings.isEmpty() ? null : (readings.get(0).get("humidity") != null ? ((Number) readings.get(0).get("humidity")).doubleValue() : null);

            // Fetch activity count last 14 days
            long nowMs = System.currentTimeMillis();
            Timestamp fourteenDaysAgo = new Timestamp(nowMs - 14 * 86400000L);
            List<Map<String, Object>> actCountRow = jdbcTemplate.queryForList(
                "SELECT COUNT(id) as cnt FROM FarmActivity WHERE farmId = ? AND createdAt >= ?", fId, fourteenDaysAgo
            );
            int activityCount = actCountRow.isEmpty() ? 0 : ((Number) actCountRow.get(0).get("cnt")).intValue();

            // Fetch irrigation logs count last 7 days
            Timestamp sevenDaysAgo = new Timestamp(nowMs - 7 * 86400000L);
            List<Map<String, Object>> irrCountRow = jdbcTemplate.queryForList(
                "SELECT COUNT(id) as cnt FROM IrrigationLog WHERE farmId = ? AND performedAt >= ?", fId, sevenDaysAgo
            );
            int irrigationCount = irrCountRow.isEmpty() ? 0 : ((Number) irrCountRow.get(0).get("cnt")).intValue();

            // Fetch disease reports count last 14 days
            List<Map<String, Object>> disCountRow = jdbcTemplate.queryForList(
                "SELECT COUNT(id) as cnt FROM DiseaseReport WHERE farmId = ? AND createdAt >= ?", fId, fourteenDaysAgo
            );
            int diseaseCount = disCountRow.isEmpty() ? 0 : ((Number) disCountRow.get(0).get("cnt")).intValue();

            // Compute health score
            int soil = 5;
            if (moisture != null) {
                if (moisture >= 35) soil = 25;
                else if (moisture >= 25) soil = 15;
            }
            int irrigation = irrigationCount >= 1 ? 25 : 5;
            int disease = Math.max(0, 20 - diseaseCount * 5);
            int weather = 15; // default info
            int activity = activityCount >= 3 ? 15 : activityCount >= 1 ? 10 : 3;
            int score = soil + irrigation + disease + weather + activity;

            String bandLabel = score >= 85 ? "Excellent" : score >= 70 ? "Good" : score >= 50 ? "Needs Attention" : "Critical";
            String bandColor = score >= 85 ? "green" : score >= 70 ? "lime" : score >= 50 ? "amber" : "red";

            // Crops counts
            List<Map<String, Object>> crops = jdbcTemplate.queryForList("SELECT * FROM Crop WHERE farmId = ?", fId);
            totalCrops += crops.size();
            for (Map<String, Object> crop : crops) {
                String stage = (String) crop.get("stage");
                String health = (String) crop.get("health");
                if (!"HARVESTED".equals(stage)) activeCrops++;
                if ("NEEDS_ATTENTION".equals(health) || "CRITICAL".equals(health)) needsAttention++;
            }

            Map<String, Object> scoreMap = new LinkedHashMap<>();
            scoreMap.put("farm", Map.of("id", fId, "name", farm.get("name"), "state", farm.get("state")));
            scoreMap.put("score", score);
            scoreMap.put("band", Map.of("label", bandLabel, "color", bandColor));
            scoreMap.put("breakdown", Map.of("total", score, "soil", soil, "irrigation", irrigation, "disease", disease, "weather", weather, "activity", activity));
            scoreMap.put("cropCount", crops.size());
            scoreMap.put("activeCrops", crops.stream().filter(c -> !"HARVESTED".equals(c.get("stage"))).count());
            scoreMap.put("needsAttention", crops.stream().filter(c -> List.of("NEEDS_ATTENTION", "CRITICAL").contains(c.get("health"))).count());
            scoreMap.put("latestMoisture", moisture);
            scoreMap.put("latestTemp", temp);
            scoreMap.put("latestHumidity", humidity);

            farmScores.add(scoreMap);
        }

        int overallScore = farmScores.isEmpty() ? 0 : (int) Math.round(farmScores.stream().mapToInt(fs -> (int) fs.get("score")).average().orElse(0));
        String overallLabel = overallScore >= 85 ? "Excellent" : overallScore >= 70 ? "Good" : overallScore >= 50 ? "Needs Attention" : "Critical";
        String overallColor = overallScore >= 85 ? "green" : overallScore >= 70 ? "lime" : overallScore >= 50 ? "amber" : "red";

        // Fetch sensor trend last 7 days
        Timestamp sevenDaysAgo = new Timestamp(System.currentTimeMillis() - 7 * 86400000L);
        List<Map<String, Object>> recentReadings;
        if (farms.isEmpty()) {
            recentReadings = List.of();
        } else {
            String ids = String.join(",", farms.stream().map(f -> "'" + f.get("id") + "'").toArray(String[]::new));
            recentReadings = jdbcTemplate.queryForList(
                "SELECT * FROM SensorReading WHERE farmId IN (" + ids + ") AND timestamp >= ? ORDER BY timestamp ASC", sevenDaysAgo
            );
        }

        // Group trend by day
        Map<String, List<Double>> moistureMap = new TreeMap<>();
        Map<String, List<Double>> tempMap = new TreeMap<>();
        Map<String, List<Double>> humMap = new TreeMap<>();

        SimpleDateFormat dayFormat = new SimpleDateFormat("yyyy-MM-day");
        for (Map<String, Object> r : recentReadings) {
            Object tsObj = r.get("timestamp");
            String day = tsObj.toString().substring(0, 10);
            
            Double m = r.get("soilMoisture") != null ? ((Number) r.get("soilMoisture")).doubleValue() : null;
            Double t = r.get("temperature") != null ? ((Number) r.get("temperature")).doubleValue() : null;
            Double h = r.get("humidity") != null ? ((Number) r.get("humidity")).doubleValue() : null;

            if (m != null) moistureMap.computeIfAbsent(day, k -> new ArrayList<>()).add(m);
            if (t != null) tempMap.computeIfAbsent(day, k -> new ArrayList<>()).add(t);
            if (h != null) humMap.computeIfAbsent(day, k -> new ArrayList<>()).add(h);
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        Set<String> allDays = new TreeSet<>();
        allDays.addAll(moistureMap.keySet());
        allDays.addAll(tempMap.keySet());
        allDays.addAll(humMap.keySet());

        for (String day : allDays) {
            Map<String, Object> trendItem = new LinkedHashMap<>();
            trendItem.put("date", day);
            
            List<Double> mList = moistureMap.get(day);
            trendItem.put("moisture", mList == null ? null : Math.round(mList.stream().mapToDouble(d -> d).average().orElse(0) * 10.0) / 10.0);

            List<Double> tList = tempMap.get(day);
            trendItem.put("temperature", tList == null ? null : Math.round(tList.stream().mapToDouble(d -> d).average().orElse(0) * 10.0) / 10.0);

            List<Double> hList = humMap.get(day);
            trendItem.put("humidity", hList == null ? null : Math.round(hList.stream().mapToDouble(d -> d).average().orElse(0)));

            trend.add(trendItem);
        }

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("overallScore", overallScore);
        data.put("overallBand", Map.of("label", overallLabel, "color", overallColor));
        data.put("farmScores", farmScores);
        data.put("sensorTrend", trend);
        data.put("totals", Map.of("farms", totalFarms, "crops", totalCrops, "activeCrops", activeCrops, "needsAttention", needsAttention));
        data.put("scoreDocumentation", "Farm Health Score (0-100): Soil 25 + Irrigation 25 + Disease risk 20 + Weather risk 15 + Activity 15. 85+ Excellent, 70-84 Good, 50-69 Needs Attention, <50 Critical.");

        return ok(data);
    }

    // ============================================================
    // DISEASE SCAN AND ANALYSIS
    // ============================================================
    @GetMapping("/disease/analyze")
    public ResponseEntity<Map<String, Object>> getDiseaseScans(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        List<Map<String, Object>> reports;
        if ("ADMIN".equals(role) || "EXPERT".equals(role)) {
            if (farmId != null) {
                reports = jdbcTemplate.queryForList("SELECT * FROM DiseaseReport WHERE farmId = ? ORDER BY createdAt DESC LIMIT 50", farmId);
            } else {
                reports = jdbcTemplate.queryForList("SELECT * FROM DiseaseReport ORDER BY createdAt DESC LIMIT 50");
            }
        } else {
            if (farmId != null) {
                reports = jdbcTemplate.queryForList("SELECT * FROM DiseaseReport WHERE userId = ? AND farmId = ? ORDER BY createdAt DESC LIMIT 50", uid, farmId);
            } else {
                reports = jdbcTemplate.queryForList("SELECT * FROM DiseaseReport WHERE userId = ? ORDER BY createdAt DESC LIMIT 50", uid);
            }
        }

        for (Map<String, Object> r : reports) {
            String fId = (String) r.get("farmId");
            String uId = (String) r.get("userId");
            List<Map<String, Object>> fMap = jdbcTemplate.queryForList("SELECT id, name FROM Farm WHERE id = ?", fId);
            List<Map<String, Object>> uMap = jdbcTemplate.queryForList("SELECT id, fullName FROM User WHERE id = ?", uId);
            r.put("farm", fMap.isEmpty() ? null : fMap.get(0));
            r.put("user", uMap.isEmpty() ? null : uMap.get(0));
        }

        return ok(reports);
    }

    @PostMapping("/disease/analyze")
    public ResponseEntity<Map<String, Object>> analyzeDisease(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        String cropId = (String) body.get("cropId");
        String cropName = (String) body.get("cropName");
        String imageUrl = (String) body.get("imageUrl");

        if (farmId == null || cropName == null || imageUrl == null) {
            return err("Required fields farmId, cropName, or imageUrl missing", HttpStatus.BAD_REQUEST);
        }

        // Verify farm ownership
        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        if (!farms.get(0).get("ownerId").equals(user.get("id")) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        DiseaseAnalysisResult analysis;
        try {
            analysis = diseaseService.analyze(imageUrl);
        } catch (Exception e) {
            e.printStackTrace();
            return err("Disease analysis service unavailable: " + e.getMessage(), HttpStatus.BAD_GATEWAY);
        }

        String reportId = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO DiseaseReport (id, farmId, cropId, userId, imageUrl, cropName, predictedDisease, confidence, severity, symptoms, recommendedAction, preventionTips, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ANALYZED', ?)",
            reportId, farmId, cropId, user.get("id"), imageUrl, cropName, analysis.predictedDisease, analysis.confidence, analysis.severity,
            analysis.symptoms, analysis.recommendedAction, analysis.preventionTips, new Timestamp(System.currentTimeMillis())
        );

        // Auto-create Activity
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) VALUES (?, ?, ?, ?, 'DISEASE_SCAN', ?, ?, 1, ?)",
            UUID.randomUUID().toString(), farmId, cropId, user.get("id"),
            "Disease scan: " + (analysis.predictedDisease != null ? analysis.predictedDisease : "No disease detected"),
            "Crop: " + cropName + ", Confidence: " + Math.round(analysis.confidence * 100) + "%, Severity: " + analysis.severity,
            new Timestamp(System.currentTimeMillis())
        );

        String priority = "MEDIUM";
        if ("SEVERE".equals(analysis.severity)) priority = "CRITICAL";
        else if ("HIGH".equals(analysis.severity)) priority = "HIGH";
        else if ("LOW".equals(analysis.severity)) priority = "LOW";

        if (analysis.predictedDisease != null) {
            // Create Recommendation
            jdbcTemplate.update(
                "INSERT INTO Recommendation (id, userId, farmId, cropId, category, title, description, priority, status, source, createdAt) VALUES (?, ?, ?, ?, 'DISEASE', ?, ?, ?, 'PENDING', 'VLM', ?)",
                UUID.randomUUID().toString(), user.get("id"), farmId, cropId,
                analysis.predictedDisease + " detected", analysis.recommendedAction, priority, new Timestamp(System.currentTimeMillis())
            );

            // Create Alert
            jdbcTemplate.update(
                "INSERT INTO Alert (id, userId, farmId, category, title, message, priority, isRead, createdAt) VALUES (?, ?, ?, 'DISEASE', ?, ?, ?, 0, ?)",
                UUID.randomUUID().toString(), user.get("id"), farmId,
                analysis.predictedDisease + " detected on " + cropName,
                "Severity: " + analysis.severity + ". Action: " + (analysis.recommendedAction.length() > 160 ? analysis.recommendedAction.substring(0, 160) : analysis.recommendedAction),
                priority, new Timestamp(System.currentTimeMillis())
            );

            // Create Notification
            jdbcTemplate.update(
                "INSERT INTO Notification (id, userId, category, title, message, priority, isRead, createdAt) VALUES (?, ?, 'DISEASE', ?, ?, ?, 0, ?)",
                UUID.randomUUID().toString(), user.get("id"),
                "Disease analysis complete",
                analysis.predictedDisease + " detected with " + Math.round(analysis.confidence * 100) + "% confidence.",
                priority, new Timestamp(System.currentTimeMillis())
            );
        }

        List<Map<String, Object>> reportsList = jdbcTemplate.queryForList("SELECT * FROM DiseaseReport WHERE id = ?", reportId);
        Map<String, Object> data = new HashMap<>(reportsList.get(0));
        
        return ok(Map.of("report", data, "disclaimer", "AI diagnosis is advisory. Verify with expert connection."), "Disease analyzed successfully");
    }

    // ============================================================
    // IRRIGATION ANALYSIS & LOGS
    // ============================================================
    @PostMapping("/irrigation/analyze")
    public ResponseEntity<Map<String, Object>> analyzeIrrigation(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        if (farmId == null) return err("farmId is required", HttpStatus.BAD_REQUEST);

        Double moisture = body.get("soilMoisture") != null ? ((Number) body.get("soilMoisture")).doubleValue() : null;
        Double temp = body.get("temperature") != null ? ((Number) body.get("temperature")).doubleValue() : null;
        Double humidity = body.get("humidity") != null ? ((Number) body.get("humidity")).doubleValue() : null;

        IrrigationResult result = irrigationService.analyze(farmId, moisture, temp, humidity);
        return ok(result);
    }

    @GetMapping("/irrigation/logs")
    public ResponseEntity<Map<String, Object>> getIrrigationLogs(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> logs;
        if (farmId != null) {
            logs = jdbcTemplate.queryForList("SELECT * FROM IrrigationLog WHERE farmId = ? ORDER BY performedAt DESC LIMIT 100", farmId);
        } else {
            if ("ADMIN".equals(user.get("role"))) {
                logs = jdbcTemplate.queryForList("SELECT * FROM IrrigationLog ORDER BY performedAt DESC LIMIT 100");
            } else {
                logs = jdbcTemplate.queryForList(
                    "SELECT l.* FROM IrrigationLog l JOIN Farm f ON l.farmId = f.id WHERE f.ownerId = ? ORDER BY l.performedAt DESC LIMIT 100",
                    user.get("id")
                );
            }
        }
        return ok(logs);
    }

    @PostMapping("/irrigation/logs")
    public ResponseEntity<Map<String, Object>> createIrrigationLog(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String farmId = (String) body.get("farmId");
        String cropId = (String) body.get("cropId");
        Double water = body.get("waterLitres") != null ? ((Number) body.get("waterLitres")).doubleValue() : 0.0;
        Integer duration = body.get("durationMin") != null ? ((Number) body.get("durationMin")).intValue() : 0;
        String method = (String) body.get("method");
        String notes = (String) body.get("notes");

        if (farmId == null) return err("farmId is required", HttpStatus.BAD_REQUEST);

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO IrrigationLog (id, farmId, cropId, userId, waterLitres, durationMin, method, notes, performedAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, farmId, cropId, user.get("id"), water, duration, method, notes,
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        // Auto-create Activity
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) VALUES (?, ?, ?, ?, 'IRRIGATION', ?, ?, 1, ?)",
            UUID.randomUUID().toString(), farmId, cropId, user.get("id"),
            "Irrigated Crop", "Applied " + water + "L of water via " + method + " for " + duration + " mins.",
            new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> logs = jdbcTemplate.queryForList("SELECT * FROM IrrigationLog WHERE id = ?", id);
        return ok(logs.get(0), "Irrigation logged successfully", HttpStatus.CREATED);
    }

    // ============================================================
    // UPLOAD FILES
    // ============================================================
    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> uploadFile(@RequestParam("file") MultipartFile file, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        if (file.isEmpty()) {
            return err("No file uploaded", HttpStatus.BAD_REQUEST);
        }

        try {
            String originalFilename = file.getOriginalFilename();
            String ext = originalFilename != null && originalFilename.contains(".") ? originalFilename.substring(originalFilename.lastIndexOf(".") + 1) : "jpg";
            String newFilename = System.currentTimeMillis() + "-" + UUID.randomUUID().toString().substring(0, 8) + "." + ext;

            String cwd = System.getProperty("user.dir");
            java.nio.file.Path uploadDir = Paths.get(cwd, "public", "upload", "disease");
            Files.createDirectories(uploadDir);

            java.nio.file.Path targetPath = uploadDir.resolve(newFilename);
            Files.write(targetPath, file.getBytes());

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("url", "/upload/disease/" + newFilename);
            data.put("filename", originalFilename);
            data.put("size", file.getSize());

            return ok(data, "File uploaded", HttpStatus.CREATED);
        } catch (Exception e) {
            e.printStackTrace();
            return err("File upload failed: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // ============================================================
    // OTHER MODULES & CRUDS
    // ============================================================

    // Schemes
    @GetMapping("/schemes")
    public ResponseEntity<Map<String, Object>> getSchemes(HttpServletRequest request) {
        List<Map<String, Object>> schemes = jdbcTemplate.queryForList("SELECT * FROM GovernmentScheme WHERE isActive = 1 ORDER BY lastUpdated DESC");
        return ok(schemes);
    }

    // Markets & prices
    @GetMapping("/markets")
    public ResponseEntity<Map<String, Object>> getMarkets() {
        List<Map<String, Object>> markets = jdbcTemplate.queryForList("SELECT * FROM Market");
        return ok(markets);
    }

    @GetMapping("/market-prices")
    public ResponseEntity<Map<String, Object>> getMarketPrices(
            @RequestParam(value = "days", defaultValue = "7") int days,
            @RequestParam(value = "crop", required = false) String crop,
            @RequestParam(value = "marketId", required = false) String marketId,
            @RequestParam(value = "state", required = false) String state) {
        String sql = "SELECT p.*, m.name as marketName, m.state as marketState, m.district as marketDistrict " +
                     "FROM MarketPrice p JOIN Market m ON p.marketId = m.id " +
                     "WHERE p.priceDate >= ?";
        List<Object> args = new ArrayList<>();
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DATE, -days);
        args.add(new Timestamp(cal.getTimeInMillis()));

        if (crop != null && !crop.trim().isEmpty()) {
            sql += " AND p.cropName LIKE ?";
            args.add("%" + crop + "%");
        }
        if (marketId != null && !marketId.trim().isEmpty()) {
            sql += " AND p.marketId = ?";
            args.add(marketId);
        }
        if (state != null && !state.trim().isEmpty()) {
            sql += " AND m.state = ?";
            args.add(state);
        }
        sql += " ORDER BY p.priceDate DESC LIMIT 500";

        List<Map<String, Object>> prices = jdbcTemplate.queryForList(sql, args.toArray());
        for (Map<String, Object> price : prices) {
            Map<String, Object> market = new LinkedHashMap<>();
            market.put("id", price.get("marketId"));
            market.put("name", price.get("marketName"));
            market.put("state", price.get("marketState"));
            market.put("district", price.get("marketDistrict"));
            price.put("market", market);
        }

        int demoCount = (int) prices.stream().filter(p -> p.get("isDemo") != null && (((Number) p.get("isDemo")).intValue() == 1 || (Boolean) p.get("isDemo"))).count();
        boolean isDemo = prices.isEmpty() || (demoCount == prices.size());
        boolean isPartialDemo = demoCount > 0 && demoCount < prices.size();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("prices", prices);
        data.put("isDemo", isDemo);
        data.put("isPartialDemo", isPartialDemo);
        data.put("demoCount", demoCount);
        data.put("total", prices.size());

        return ok(data);
    }

    // Disease DB reference
    @GetMapping("/disease-db")
    public ResponseEntity<Map<String, Object>> getDiseaseDb() {
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM DiseaseDatabase");
        return ok(list);
    }

    // Daily Advisory
    @GetMapping("/daily-advisory")
    public ResponseEntity<Map<String, Object>> getDailyAdvisory(HttpServletRequest request, @RequestParam(value = "farmId", required = false) String farmId) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");

        List<Map<String, Object>> farms;
        if (farmId != null) {
            farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ? AND ownerId = ? AND archived = 0", farmId, uid);
        } else {
            farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE ownerId = ? AND archived = 0", uid);
        }

        List<Map<String, Object>> advisory = new ArrayList<>();
        long nowMs = System.currentTimeMillis();
        Timestamp now = new Timestamp(nowMs);
        
        Calendar calEnd = Calendar.getInstance();
        calEnd.set(Calendar.HOUR_OF_DAY, 23);
        calEnd.set(Calendar.MINUTE, 59);
        calEnd.set(Calendar.SECOND, 59);
        calEnd.set(Calendar.MILLISECOND, 999);
        Timestamp todayEnd = new Timestamp(calEnd.getTimeInMillis());

        for (Map<String, Object> farm : farms) {
            String fId = (String) farm.get("id");
            String farmName = (String) farm.get("name");
            double lat = farm.get("latitude") != null ? ((Number) farm.get("latitude")).doubleValue() : 18.52;
            double lon = farm.get("longitude") != null ? ((Number) farm.get("longitude")).doubleValue() : 73.85;

            // Fetch Weather for advisory
            double rainProb = 0.0;
            double temp = 28.0;
            try {
                IrrigationService.WeatherData wData = irrigationService.fetchRealWeather(lat, lon);
                temp = wData.temperature;
                rainProb = wData.rainTomorrow; // tomorrow's rain probability
            } catch (Exception e) {}

            if (rainProb > 70) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("priority", "HIGH");
                item.put("category", "WEATHER");
                item.put("title", "Rain expected at " + farmName);
                item.put("description", "Rain probability " + Math.round(rainProb) + "%. Postpone irrigation and pesticide spray. Inspect drainage channels.");
                item.put("icon", "🌧️");
                item.put("actionLabel", "View Weather");
                item.put("actionView", "weather");
                advisory.add(item);
            } else if (temp > 35) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("priority", "HIGH");
                item.put("category", "WEATHER");
                item.put("title", "High temperature alert for " + farmName);
                item.put("description", "Temperature may reach " + Math.round(temp) + "°C. Irrigate early morning or evening. Ensure adequate water supply.");
                item.put("icon", "☀️");
                item.put("actionLabel", "Check Irrigation");
                item.put("actionView", "irrigation");
                advisory.add(item);
            }

            // Soil Moisture
            List<Map<String, Object>> sensors = jdbcTemplate.queryForList("SELECT id FROM Sensor WHERE farmId = ? AND isActive = 1", fId);
            if (!sensors.isEmpty()) {
                String sIds = "";
                List<String> listIds = new ArrayList<>();
                for (Map<String, Object> s : sensors) {
                    listIds.add("'" + s.get("id") + "'");
                }
                sIds = String.join(",", listIds);
                List<Map<String, Object>> readings = jdbcTemplate.queryForList(
                    "SELECT soilMoisture FROM SensorReading WHERE sensorId IN (" + sIds + ") AND soilMoisture IS NOT NULL ORDER BY timestamp DESC LIMIT 1"
                );
                if (!readings.isEmpty()) {
                    double sm = ((Number) readings.get(0).get("soilMoisture")).doubleValue();
                    if (sm < 30) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("priority", "CRITICAL");
                        item.put("category", "IRRIGATION");
                        item.put("title", "Low soil moisture at " + farmName);
                        item.put("description", "Soil moisture is " + Math.round(sm) + "% — below optimal. Irrigate immediately.");
                        item.put("icon", "💧");
                        item.put("actionLabel", "Run Irrigation Analysis");
                        item.put("actionView", "irrigation");
                        advisory.add(item);
                    } else if (sm < 40) {
                        Map<String, Object> item = new LinkedHashMap<>();
                        item.put("priority", "MEDIUM");
                        item.put("category", "IRRIGATION");
                        item.put("title", "Soil moisture getting low at " + farmName);
                        item.put("description", "Soil moisture at " + Math.round(sm) + "%. Plan irrigation soon.");
                        item.put("icon", "💧");
                        item.put("actionLabel", "Check Irrigation");
                        item.put("actionView", "irrigation");
                        advisory.add(item);
                    }
                }
            }

            // Active alerts
            List<Map<String, Object>> alerts = jdbcTemplate.queryForList(
                "SELECT * FROM Alert WHERE farmId = ? AND isRead = 0 ORDER BY createdAt DESC LIMIT 2", fId
            );
            for (Map<String, Object> alert : alerts) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("priority", alert.getOrDefault("priority", "MEDIUM"));
                item.put("category", alert.get("category"));
                item.put("title", alert.get("title"));
                String msg = (String) alert.get("message");
                item.put("description", msg != null && msg.length() > 150 ? msg.substring(0, 150) : msg);
                item.put("icon", "⚠️");
                advisory.add(item);
            }

            // Tasks
            List<Map<String, Object>> tasks = jdbcTemplate.queryForList(
                "SELECT * FROM FarmTask WHERE farmId = ? AND completed = 0 ORDER BY dueDate ASC LIMIT 10", fId
            );
            for (Map<String, Object> task : tasks) {
                Object dueObj = task.get("dueDate");
                long dueMs;
                if (dueObj instanceof Number) dueMs = ((Number) dueObj).longValue();
                else if (dueObj instanceof java.util.Date) dueMs = ((java.util.Date) dueObj).getTime();
                else dueMs = Timestamp.valueOf(dueObj.toString()).getTime();

                Timestamp due = new Timestamp(dueMs);
                if (due.before(now)) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("priority", "HIGH");
                    item.put("category", "TASK");
                    item.put("title", "Overdue: " + task.get("title"));
                    item.put("description", "This task was due " + new SimpleDateFormat("dd/MM/yyyy").format(due) + ". Complete it soon.");
                    item.put("icon", "⏰");
                    item.put("actionLabel", "View Tasks");
                    item.put("actionView", "tasks");
                    advisory.add(item);
                } else if (due.before(todayEnd)) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("priority", "MEDIUM");
                    item.put("category", "TASK");
                    item.put("title", "Due today: " + task.get("title"));
                    item.put("description", task.get("description") != null ? task.get("description") : "Scheduled for today.");
                    item.put("icon", "📋");
                    item.put("actionLabel", "View Tasks");
                    item.put("actionView", "tasks");
                    advisory.add(item);
                }
            }

            // Crops lifecycle
            List<Map<String, Object>> crops = jdbcTemplate.queryForList(
                "SELECT * FROM Crop WHERE farmId = ? AND stage != 'HARVESTED' ORDER BY createdAt DESC LIMIT 3", fId
            );
            for (Map<String, Object> crop : crops) {
                String stage = (String) crop.get("stage");
                String cropName = (String) crop.get("name");
                if ("FLOWERING".equals(stage)) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("priority", "MEDIUM");
                    item.put("category", "CROP");
                    item.put("title", cropName + " is flowering");
                    item.put("description", cropName + " at " + farmName + " is in flowering stage. Monitor for pests and ensure adequate water and nutrients.");
                    item.put("icon", "🌸");
                    advisory.add(item);
                } else if ("FRUITING".equals(stage)) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("priority", "MEDIUM");
                    item.put("category", "CROP");
                    item.put("title", cropName + " is fruiting");
                    item.put("description", cropName + " at " + farmName + " is in fruiting stage. Apply potash fertilizer for better fruit development.");
                    item.put("icon", "🍎");
                    advisory.add(item);
                } else if ("HARVEST_READY".equals(stage)) {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("priority", "HIGH");
                    item.put("category", "HARVEST");
                    item.put("title", cropName + " ready for harvest");
                    item.put("description", cropName + " at " + farmName + " is harvest-ready. Plan harvest and check market prices for best selling time.");
                    item.put("icon", "🌾");
                    item.put("actionLabel", "Check Market Prices");
                    item.put("actionView", "market");
                    advisory.add(item);
                }
            }
        }

        // Recommendations count
        List<Map<String, Object>> recsCountRow = jdbcTemplate.queryForList(
            "SELECT COUNT(id) as cnt FROM Recommendation WHERE userId = ? AND status = 'PENDING'", uid
        );
        int unreadRecs = recsCountRow.isEmpty() ? 0 : ((Number) recsCountRow.get(0).get("cnt")).intValue();
        if (unreadRecs > 0) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("priority", "LOW");
            item.put("category", "RECOMMENDATION");
            item.put("title", unreadRecs + " pending recommendation" + (unreadRecs > 1 ? "s" : ""));
            item.put("description", "Review your AI-generated recommendations and mark them complete.");
            item.put("icon", "💡");
            advisory.add(item);
        }

        // Sort by priority order: CRITICAL, HIGH, MEDIUM, LOW, INFO
        List<String> priorityOrder = List.of("CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO");
        advisory.sort((a, b) -> {
            int pA = priorityOrder.indexOf(a.get("priority"));
            int pB = priorityOrder.indexOf(b.get("priority"));
            return Integer.compare(pA != -1 ? pA : 4, pB != -1 ? pB : 4);
        });

        int hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        String greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

        Map<String, Object> responseData = new LinkedHashMap<>();
        responseData.put("greeting", greeting);
        responseData.put("farmerName", user.get("fullName"));
        responseData.put("date", new SimpleDateFormat("EEEE, d MMMM yyyy", Locale.ENGLISH).format(new Date()));
        responseData.put("advisory", advisory);
        
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("total", advisory.size());
        summary.put("critical", advisory.stream().filter(a -> "CRITICAL".equals(a.get("priority"))).count());
        summary.put("high", advisory.stream().filter(a -> "HIGH".equals(a.get("priority"))).count());
        summary.put("medium", advisory.stream().filter(a -> "MEDIUM".equals(a.get("priority"))).count());
        responseData.put("summary", summary);

        return ok(responseData);
    }

    // Crop Calendar
    @GetMapping("/crop-calendar")
    public ResponseEntity<Map<String, Object>> getCropCalendar(
            @RequestParam(value = "season", required = false) String season,
            @RequestParam(value = "month", required = false) Integer month) {
        int currentMonth = month != null ? month : (Calendar.getInstance().get(Calendar.MONTH) + 1);

        String sql = "SELECT * FROM CropDatabase";
        List<Object> args = new ArrayList<>();
        if (season != null && !season.trim().isEmpty()) {
            sql += " WHERE season = ?";
            args.add(season);
        }
        sql += " ORDER BY category ASC, name ASC";

        List<Map<String, Object>> crops = jdbcTemplate.queryForList(sql, args.toArray());

        String currentSeason;
        if (currentMonth >= 6 && currentMonth <= 10) {
            currentSeason = "KHARIF";
        } else if (currentMonth >= 11 || currentMonth <= 3) {
            currentSeason = "RABI";
        } else {
            currentSeason = "ZAID";
        }

        Map<String, Map<String, String>> plantingWindow = new LinkedHashMap<>();
        
        Map<String, String> kharifWindow = new LinkedHashMap<>();
        kharifWindow.put("start", "June");
        kharifWindow.put("end", "July");
        plantingWindow.put("KHARIF", kharifWindow);

        Map<String, String> rabiWindow = new LinkedHashMap<>();
        rabiWindow.put("start", "October");
        rabiWindow.put("end", "November");
        plantingWindow.put("RABI", rabiWindow);

        Map<String, String> zaidWindow = new LinkedHashMap<>();
        zaidWindow.put("start", "March");
        zaidWindow.put("end", "April");
        plantingWindow.put("ZAID", zaidWindow);

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> c : crops) {
            Map<String, Object> item = new LinkedHashMap<>(c);
            String cropSeason = (String) c.get("season");
            item.put("currentSeasonSuitable", "ALL".equals(cropSeason) || currentSeason.equals(cropSeason));
            item.put("plantingWindow", plantingWindow.getOrDefault(cropSeason, plantingWindow.get("KHARIF")));
            enriched.add(item);
        }

        Map<String, Object> responseData = new LinkedHashMap<>();
        responseData.put("crops", enriched);
        responseData.put("currentMonth", currentMonth);
        responseData.put("currentSeason", currentSeason);
        responseData.put("seasons", List.of("KHARIF", "RABI", "ZAID"));

        Map<String, Object> seasonInfo = new LinkedHashMap<>();
        seasonInfo.put("KHARIF", Map.of("name", "Kharif (Monsoon)", "months", "Jun–Oct", "crops", "Rice, Maize, Cotton, Soybean, Groundnut"));
        seasonInfo.put("RABI", Map.of("name", "Rabi (Winter)", "months", "Nov–Mar", "crops", "Wheat, Gram, Mustard, Onion, Potato"));
        seasonInfo.put("ZAID", Map.of("name", "Zaid (Summer)", "months", "Apr–Jun", "crops", "Vegetables, Fruits, Fodder"));
        responseData.put("seasonInfo", seasonInfo);

        return ok(responseData);
    }

    @GetMapping("/fertilizer-recommendations")
    public ResponseEntity<Map<String, Object>> getFertilizerRecs() {
        List<Map<String, Object>> recs = jdbcTemplate.queryForList("SELECT * FROM FertilizerRecommendation");
        if (recs.isEmpty()) {
            // Seed a few on the fly if empty
            jdbcTemplate.update("INSERT INTO FertilizerRecommendation (id, cropName, growthStage, nitrogen, phosphorus, potassium, fertilizer, quantity, timing) VALUES (?, 'Tomato', 'VEGETATIVE', 20.0, 20.0, 20.0, 'NPK 19-19-19', '50 kg', '30 days post planting')", UUID.randomUUID().toString());
            recs = jdbcTemplate.queryForList("SELECT * FROM FertilizerRecommendation");
        }
        return ok(recs);
    }

    @GetMapping("/yield-benchmark")
    public ResponseEntity<Map<String, Object>> getYieldBenchmarks(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");

        List<Map<String, Object>> harvests = jdbcTemplate.queryForList(
            "SELECT h.*, c.name as cropName, c.variety as cropVariety, f.name as farmName " +
            "FROM Harvest h " +
            "LEFT JOIN Crop c ON h.cropId = c.id " +
            "LEFT JOIN Farm f ON h.farmId = f.id " +
            "WHERE h.userId = ? " +
            "ORDER BY h.harvestDate DESC LIMIT 50", uid
        );

        Map<String, Map<String, Object>> standardYields = new LinkedHashMap<>();
        standardYields.put("Rice", Map.of("average", 2000, "good", 2800, "excellent", 3500, "unit", "kg/acre"));
        standardYields.put("Wheat", Map.of("average", 1800, "good", 2500, "excellent", 3200, "unit", "kg/acre"));
        standardYields.put("Maize", Map.of("average", 2000, "good", 2800, "excellent", 3500, "unit", "kg/acre"));
        standardYields.put("Tomato", Map.of("average", 8000, "good", 12000, "excellent", 16000, "unit", "kg/acre"));
        standardYields.put("Onion", Map.of("average", 10000, "good", 15000, "excellent", 20000, "unit", "kg/acre"));
        standardYields.put("Cotton", Map.of("average", 500, "good", 800, "excellent", 1200, "unit", "kg lint/acre"));
        standardYields.put("Soybean", Map.of("average", 800, "good", 1200, "excellent", 1600, "unit", "kg/acre"));
        standardYields.put("Groundnut", Map.of("average", 800, "good", 1200, "excellent", 1600, "unit", "kg/acre"));
        standardYields.put("Sugarcane", Map.of("average", 30000, "good", 40000, "excellent", 50000, "unit", "kg/acre"));
        standardYields.put("Potato", Map.of("average", 8000, "good", 12000, "excellent", 16000, "unit", "kg/acre"));
        standardYields.put("Chilli", Map.of("average", 800, "good", 1200, "excellent", 1800, "unit", "kg dry/acre"));
        standardYields.put("Banana", Map.of("average", 12000, "good", 18000, "excellent", 25000, "unit", "kg/acre"));
        standardYields.put("Gram", Map.of("average", 600, "good", 900, "excellent", 1200, "unit", "kg/acre"));
        standardYields.put("Mustard", Map.of("average", 800, "good", 1200, "excellent", 1600, "unit", "kg/acre"));
        standardYields.put("Brinjal", Map.of("average", 8000, "good", 12000, "excellent", 16000, "unit", "kg/acre"));

        // Group by crop name and compute averages
        Map<String, List<Double>> yieldsByCrop = new LinkedHashMap<>();
        Map<String, Double> totalKgByCrop = new LinkedHashMap<>();
        Map<String, Double> totalIncomeByCrop = new LinkedHashMap<>();
        Map<String, Double> totalProfitByCrop = new LinkedHashMap<>();
        Map<String, Integer> countByCrop = new LinkedHashMap<>();

        for (Map<String, Object> h : harvests) {
            String name = (String) h.get("cropName");
            if (name == null) name = "Unknown";
            double yieldVal = h.get("yieldPerAcre") != null ? ((Number) h.get("yieldPerAcre")).doubleValue() : 0.0;
            double qtyVal = h.get("quantityKg") != null ? ((Number) h.get("quantityKg")).doubleValue() : 0.0;
            double incVal = h.get("totalIncome") != null ? ((Number) h.get("totalIncome")).doubleValue() : 0.0;
            double profVal = h.get("netProfit") != null ? ((Number) h.get("netProfit")).doubleValue() : 0.0;

            yieldsByCrop.computeIfAbsent(name, k -> new ArrayList<>()).add(yieldVal);
            totalKgByCrop.put(name, totalKgByCrop.getOrDefault(name, 0.0) + qtyVal);
            totalIncomeByCrop.put(name, totalIncomeByCrop.getOrDefault(name, 0.0) + incVal);
            totalProfitByCrop.put(name, totalProfitByCrop.getOrDefault(name, 0.0) + profVal);
            countByCrop.put(name, countByCrop.getOrDefault(name, 0) + 1);
        }

        List<Map<String, Object>> benchmarks = new ArrayList<>();
        for (String cName : yieldsByCrop.keySet()) {
            List<Double> yields = yieldsByCrop.get(cName);
            double avgYield = yields.stream().mapToDouble(val -> val).average().orElse(0.0);
            double minYield = yields.stream().mapToDouble(val -> val).min().orElse(0.0);
            double maxYield = yields.stream().mapToDouble(val -> val).max().orElse(0.0);

            Map<String, Object> std = standardYields.get(cName);
            Integer percentile = null;
            String rating = "—";
            String ratingColor = "muted";

            if (std != null) {
                double avg = ((Number) std.get("average")).doubleValue();
                double gd = ((Number) std.get("good")).doubleValue();
                double exc = ((Number) std.get("excellent")).doubleValue();
                if (avgYield >= exc) {
                    percentile = 100;
                    rating = "Excellent";
                    ratingColor = "emerald";
                } else if (avgYield >= gd) {
                    percentile = 75;
                    rating = "Good";
                    ratingColor = "lime";
                } else if (avgYield >= avg) {
                    percentile = 50;
                    rating = "Average";
                    ratingColor = "amber";
                } else {
                    percentile = 25;
                    rating = "Below Average";
                    ratingColor = "red";
                }
            }

            Map<String, Object> b = new LinkedHashMap<>();
            b.put("cropName", cName);
            b.put("yourAvgYield", Math.round(avgYield));
            b.put("yourMinYield", Math.round(minYield));
            b.put("yourMaxYield", Math.round(maxYield));
            b.put("harvestCount", countByCrop.get(cName));
            b.put("totalKg", Math.round(totalKgByCrop.get(cName)));
            b.put("totalIncome", Math.round(totalIncomeByCrop.get(cName)));
            b.put("totalProfit", Math.round(totalProfitByCrop.get(cName)));
            b.put("standardAverage", std != null ? std.get("average") : null);
            b.put("standardGood", std != null ? std.get("good") : null);
            b.put("standardExcellent", std != null ? std.get("excellent") : null);
            b.put("unit", std != null ? std.get("unit") : "kg/acre");
            b.put("percentile", percentile);
            b.put("rating", rating);
            b.put("ratingColor", ratingColor);
            b.put("hasStandard", std != null);
            benchmarks.add(b);
        }

        List<Map<String, Object>> standardsList = new ArrayList<>();
        for (Map.Entry<String, Map<String, Object>> entry : standardYields.entrySet()) {
            Map<String, Object> s = new LinkedHashMap<>();
            s.put("cropName", entry.getKey());
            s.put("average", entry.getValue().get("average"));
            s.put("good", entry.getValue().get("good"));
            s.put("excellent", entry.getValue().get("excellent"));
            s.put("unit", entry.getValue().get("unit"));
            standardsList.add(s);
        }

        Map<String, Object> responseData = new LinkedHashMap<>();
        responseData.put("benchmarks", benchmarks);
        responseData.put("standards", standardsList);
        return ok(responseData);
    }

    // Soil Tests
    @GetMapping("/soil-tests")
    public ResponseEntity<Map<String, Object>> getSoilTests(
            @RequestParam(value = "farmId", required = false) String farmId,
            HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        String sql = "SELECT s.*, f.name as farmName, c.name as cropName " +
                     "FROM SoilTest s " +
                     "LEFT JOIN Farm f ON s.farmId = f.id " +
                     "LEFT JOIN Crop c ON s.cropId = c.id";
        
        List<Object> args = new ArrayList<>();
        if ("ADMIN".equals(role)) {
            if (farmId != null && !farmId.trim().isEmpty()) {
                sql += " WHERE s.farmId = ?";
                args.add(farmId);
            }
        } else {
            sql += " WHERE s.userId = ?";
            args.add(uid);
            if (farmId != null && !farmId.trim().isEmpty()) {
                sql += " AND s.farmId = ?";
                args.add(farmId);
            }
        }
        sql += " ORDER BY s.testDate DESC LIMIT 50";

        List<Map<String, Object>> tests = jdbcTemplate.queryForList(sql, args.toArray());
        
        // Structure nested farm/crop objects
        List<Map<String, Object>> structuredTests = new ArrayList<>();
        for (Map<String, Object> test : tests) {
            Map<String, Object> item = new LinkedHashMap<>(test);
            
            Map<String, Object> farmMap = new LinkedHashMap<>();
            farmMap.put("id", test.get("farmId"));
            farmMap.put("name", test.get("farmName"));
            item.put("farm", farmMap);
            
            if (test.get("cropId") != null) {
                Map<String, Object> cropMap = new LinkedHashMap<>();
                cropMap.put("id", test.get("cropId"));
                cropMap.put("name", test.get("cropName"));
                item.put("crop", cropMap);
            } else {
                item.put("crop", null);
            }
            
            // Clean up temporary flat attributes
            item.remove("farmName");
            item.remove("cropName");
            
            // Deserialize recommendations JSON string if present
            String recsJson = (String) test.get("recommendations");
            if (recsJson != null) {
                try {
                    item.put("recommendations", new com.fasterxml.jackson.databind.ObjectMapper().readValue(recsJson, List.class));
                } catch (Exception e) {
                    item.put("recommendations", List.of());
                }
            } else {
                item.put("recommendations", List.of());
            }
            
            structuredTests.add(item);
        }
        return ok(structuredTests);
    }

    @PostMapping("/soil-tests")
    public ResponseEntity<Map<String, Object>> addSoilTest(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");

        String farmId = (String) body.get("farmId");
        if (farmId == null) return err("farmId is required", HttpStatus.BAD_REQUEST);

        List<Map<String, Object>> farms = jdbcTemplate.queryForList("SELECT * FROM Farm WHERE id = ?", farmId);
        if (farms.isEmpty()) return err("Farm not found", HttpStatus.NOT_FOUND);
        Map<String, Object> farm = farms.get(0);
        String ownerId = (String) farm.get("ownerId");
        if (!ownerId.equals(uid) && !"ADMIN".equals(user.get("role"))) {
            return err("Forbidden", HttpStatus.FORBIDDEN);
        }

        String id = UUID.randomUUID().toString();
        String cropId = (String) body.get("cropId");
        String testDateStr = (String) body.get("testDate");
        Timestamp testDate = testDateStr != null ? Timestamp.valueOf(testDateStr.replace("T", " ").substring(0, 19)) : new Timestamp(System.currentTimeMillis());

        Double ph = body.get("ph") != null ? ((Number) body.get("ph")).doubleValue() : null;
        Double nitrogen = body.get("nitrogen") != null ? ((Number) body.get("nitrogen")).doubleValue() : null;
        Double phosphorus = body.get("phosphorus") != null ? ((Number) body.get("phosphorus")).doubleValue() : null;
        Double potassium = body.get("potassium") != null ? ((Number) body.get("potassium")).doubleValue() : null;
        Double organicCarbon = body.get("organicCarbon") != null ? ((Number) body.get("organicCarbon")).doubleValue() : null;
        Double ec = body.get("ec") != null ? ((Number) body.get("ec")).doubleValue() : null;
        Double sulfur = body.get("sulfur") != null ? ((Number) body.get("sulfur")).doubleValue() : null;
        Double iron = body.get("iron") != null ? ((Number) body.get("iron")).doubleValue() : null;
        Double zinc = body.get("zinc") != null ? ((Number) body.get("zinc")).doubleValue() : null;
        Double boron = body.get("boron") != null ? ((Number) body.get("boron")).doubleValue() : null;
        Double soilMoisture = body.get("soilMoisture") != null ? ((Number) body.get("soilMoisture")).doubleValue() : null;
        String texture = (String) body.get("texture");
        String labName = (String) body.get("labName");
        String notes = (String) body.get("notes");

        // Compute Fertility
        double score = 0;
        List<String> recs = new ArrayList<>();
        if (ph != null) {
            if (ph >= 6.5 && ph <= 7.5) score += 2;
            else if (ph >= 6.0 && ph <= 8.0) score += 1;
            else {
                recs.add(ph < 6.5 ? "Soil is acidic (pH < 6.5). Apply agricultural lime (1-2 t/acre) to raise pH." : "Soil is alkaline (pH > 7.5). Apply gypsum or elemental sulfur to lower pH.");
            }
        }
        if (nitrogen != null) {
            if (nitrogen >= 280) score += 2;
            else if (nitrogen >= 140) score += 1;
            else recs.add("Low nitrogen (" + Math.round(nitrogen) + " kg/ha). Apply 50-80 kg urea/acre in split doses.");
        }
        if (phosphorus != null) {
            if (phosphorus >= 25) score += 2;
            else if (phosphorus >= 10) score += 1;
            else recs.add("Low phosphorus (" + Math.round(phosphorus) + " kg/ha). Apply 40-60 kg SSP/acre or 20 kg DAP/acre.");
        }
        if (potassium != null) {
            if (potassium >= 280) score += 2;
            else if (potassium >= 140) score += 1;
            else recs.add("Low potassium (" + Math.round(potassium) + " kg/ha). Apply 30-50 kg MOP/acre.");
        }
        if (organicCarbon != null) {
            if (organicCarbon >= 0.75) score += 2;
            else if (organicCarbon >= 0.4) score += 1;
            else recs.add("Low organic carbon (" + organicCarbon + "%). Apply 5-10 t FYM/compost/acre.");
        }
        String fertility = score >= 7 ? "HIGH" : score >= 4 ? "MEDIUM" : "LOW";
        if (recs.isEmpty()) {
            recs.add("Soil nutrient levels are adequate. Maintain regular organic matter application.");
        }
        String recommendationsJson = "[]";
        try {
            recommendationsJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(recs);
        } catch (Exception e) {}

        jdbcTemplate.update(
            "INSERT INTO SoilTest (id, farmId, cropId, userId, testDate, ph, nitrogen, phosphorus, potassium, organicCarbon, ec, sulfur, iron, zinc, boron, soilMoisture, texture, fertility, labName, notes, recommendations, createdAt) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, farmId, cropId, uid, testDate, ph, nitrogen, phosphorus, potassium, organicCarbon, ec, sulfur, iron, zinc, boron, soilMoisture, texture, fertility, labName, notes, recommendationsJson, new Timestamp(System.currentTimeMillis())
        );

        // Auto-log activity
        String activityId = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO FarmActivity (id, farmId, cropId, userId, type, title, description, isAuto, createdAt) " +
            "VALUES (?, ?, ?, ?, 'OTHER', 'Soil test report added', ?, 1, ?)",
            activityId, farmId, cropId, uid,
            "Fertility: " + fertility + ". pH: " + (ph != null ? ph : "—") + ". NPK: " + (nitrogen != null ? Math.round(nitrogen) : "-") + "/" + (phosphorus != null ? Math.round(phosphorus) : "-") + "/" + (potassium != null ? Math.round(potassium) : "-"),
            new Timestamp(System.currentTimeMillis())
        );

        // If fertility is LOW, create a recommendation and notification
        if ("LOW".equals(fertility)) {
            String recId = UUID.randomUUID().toString();
            String descriptionText = "Soil test shows LOW fertility. " + String.join(" ", recs);
            jdbcTemplate.update(
                "INSERT INTO Recommendation (id, userId, farmId, cropId, category, title, description, priority, status, source, createdAt) " +
                "VALUES (?, ?, ?, ?, 'FERTILIZER', 'Low soil fertility detected', ?, 'HIGH', 'PENDING', 'RULE_ENGINE', ?)",
                recId, uid, farmId, cropId, descriptionText, new Timestamp(System.currentTimeMillis())
            );

            String notifId = UUID.randomUUID().toString();
            jdbcTemplate.update(
                "INSERT INTO Notification (id, userId, category, title, message, priority, isRead, createdAt) " +
                "VALUES (?, ?, 'SENSOR', 'Soil fertility alert', ?, 'HIGH', 0, ?)",
                notifId, uid, "Soil test for " + farm.get("name") + " shows LOW fertility. View recommendations.", new Timestamp(System.currentTimeMillis())
            );
        }

        List<Map<String, Object>> tests = jdbcTemplate.queryForList("SELECT * FROM SoilTest WHERE id = ?", id);
        Map<String, Object> responseData = new LinkedHashMap<>(tests.get(0));
        responseData.put("fertility", fertility);
        responseData.put("recommendations", recs);

        return ok(responseData, "Soil test saved", HttpStatus.CREATED);
    }

    // Expert Connect Consultations
    @GetMapping("/expert/consultations")
    public ResponseEntity<Map<String, Object>> getConsultations(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        List<Map<String, Object>> cons;
        if ("EXPERT".equals(role)) {
            // Fetch expert ID
            List<Map<String, Object>> experts = jdbcTemplate.queryForList("SELECT id FROM ExpertProfile WHERE userId = ?", uid);
            if (experts.isEmpty()) return err("Expert profile not found", HttpStatus.FORBIDDEN);
            String expertId = (String) experts.get(0).get("id");

            cons = jdbcTemplate.queryForList(
                "SELECT * FROM Consultation WHERE expertId = ? OR expertId IS NULL ORDER BY status ASC, createdAt DESC", expertId
            );
        } else {
            cons = jdbcTemplate.queryForList(
                "SELECT * FROM Consultation WHERE farmerId = ? ORDER BY createdAt DESC", uid
            );
        }

        for (Map<String, Object> c : cons) {
            String farmerId = (String) c.get("farmerId");
            List<Map<String, Object>> fMap = jdbcTemplate.queryForList("SELECT id, fullName, email, avatarUrl FROM User WHERE id = ?", farmerId);
            c.put("farmer", fMap.isEmpty() ? null : fMap.get(0));
        }

        return ok(cons);
    }

    @PostMapping("/expert/consultations")
    public ResponseEntity<Map<String, Object>> createConsultation(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String category = (String) body.get("category");
        String subject = (String) body.get("subject");
        String question = (String) body.get("question");
        String imageUrl = (String) body.get("imageUrl");

        if (category == null || subject == null || question == null) {
            return err("Required fields category, subject, or question missing", HttpStatus.BAD_REQUEST);
        }

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO Consultation (id, farmerId, category, subject, question, imageUrl, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)",
            id, user.get("id"), category, subject, question, imageUrl,
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM Consultation WHERE id = ?", id);
        return ok(list.get(0), "Consultation created successfully", HttpStatus.CREATED);
    }

    @GetMapping("/expert/consultations/{id}")
    public ResponseEntity<Map<String, Object>> getConsultationDetail(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM Consultation WHERE id = ?", id);
        if (list.isEmpty()) return err("Consultation not found", HttpStatus.NOT_FOUND);
        Map<String, Object> c = new HashMap<>(list.get(0));

        String farmerId = (String) c.get("farmerId");
        List<Map<String, Object>> fMap = jdbcTemplate.queryForList("SELECT id, fullName, email, avatarUrl FROM User WHERE id = ?", farmerId);
        c.put("farmer", fMap.isEmpty() ? null : fMap.get(0));

        String expId = (String) c.get("expertId");
        if (expId != null) {
            List<Map<String, Object>> eProfile = jdbcTemplate.queryForList("SELECT * FROM ExpertProfile WHERE id = ?", expId);
            if (!eProfile.isEmpty()) {
                Map<String, Object> ep = new HashMap<>(eProfile.get(0));
                List<Map<String, Object>> eUser = jdbcTemplate.queryForList("SELECT fullName, avatarUrl FROM User WHERE id = ?", ep.get("userId"));
                ep.put("user", eUser.isEmpty() ? null : eUser.get(0));
                c.put("expert", ep);
            }
        }

        List<Map<String, Object>> messages = jdbcTemplate.queryForList(
            "SELECT * FROM ConsultationMessage WHERE consultationId = ? ORDER BY createdAt ASC", id
        );
        c.put("messages", messages);

        return ok(c);
    }

    @PatchMapping("/expert/consultations/{id}")
    public ResponseEntity<Map<String, Object>> replyConsultation(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String uid = (String) user.get("id");
        String role = (String) user.get("role");

        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM Consultation WHERE id = ?", id);
        if (list.isEmpty()) return err("Consultation not found", HttpStatus.NOT_FOUND);
        Map<String, Object> c = list.get(0);

        String action = body.get("action");
        String message = body.get("message");

        if ("EXPERT".equals(role)) {
            List<Map<String, Object>> experts = jdbcTemplate.queryForList("SELECT id FROM ExpertProfile WHERE userId = ?", uid);
            if (experts.isEmpty()) return err("Expert profile not found", HttpStatus.FORBIDDEN);
            String expertId = (String) experts.get(0).get("id");

            if ("ACCEPT".equals(action)) {
                jdbcTemplate.update(
                    "UPDATE Consultation SET expertId = ?, status = 'IN_PROGRESS', updatedAt = ? WHERE id = ?",
                    expertId, new Timestamp(System.currentTimeMillis()), id
                );
            } else if ("REPLY".equals(action) && message != null) {
                jdbcTemplate.update(
                    "UPDATE Consultation SET status = 'ANSWERED', updatedAt = ? WHERE id = ?",
                    new Timestamp(System.currentTimeMillis()), id
                );
                jdbcTemplate.update(
                    "INSERT INTO ConsultationMessage (id, consultationId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, 'EXPERT', ?, ?)",
                    UUID.randomUUID().toString(), id, uid, message, new Timestamp(System.currentTimeMillis())
                );
            } else if ("CLOSE".equals(action)) {
                jdbcTemplate.update(
                    "UPDATE Consultation SET status = 'CLOSED', updatedAt = ? WHERE id = ?",
                    new Timestamp(System.currentTimeMillis()), id
                );
            }
        } else {
            // Farmer closing consultation
            if ("CLOSE".equals(action)) {
                jdbcTemplate.update(
                    "UPDATE Consultation SET status = 'CLOSED', updatedAt = ? WHERE id = ?",
                    new Timestamp(System.currentTimeMillis()), id
                );
            }
        }

        List<Map<String, Object>> updated = jdbcTemplate.queryForList("SELECT * FROM Consultation WHERE id = ?", id);
        return ok(updated.get(0), "Consultation updated");
    }

    @PostMapping("/expert/consultations/{id}/messages")
    public ResponseEntity<Map<String, Object>> sendConsultationMessage(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String message = body.get("message");
        if (message == null) return err("message is required", HttpStatus.BAD_REQUEST);

        String msgId = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO ConsultationMessage (id, consultationId, senderId, senderRole, message, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
            msgId, id, user.get("id"), user.get("role"), message, new Timestamp(System.currentTimeMillis())
        );

        List<Map<String, Object>> msgs = jdbcTemplate.queryForList("SELECT * FROM ConsultationMessage WHERE id = ?", msgId);
        return ok(msgs.get(0), "Message sent", HttpStatus.CREATED);
    }

    @PutMapping("/expert/profile")
    public ResponseEntity<Map<String, Object>> updateExpertProfile(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        if (!"EXPERT".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        String uid = (String) user.get("id");
        String spec = (String) body.get("specialization");
        Integer exp = body.get("experience") != null ? ((Number) body.get("experience")).intValue() : 0;
        String qual = (String) body.get("qualification");
        String bio = (String) body.get("bio");

        jdbcTemplate.update(
            "UPDATE ExpertProfile SET specialization = ?, experience = ?, qualification = ?, bio = ?, updatedAt = ? WHERE userId = ?",
            spec, exp, qual, bio, new Timestamp(System.currentTimeMillis()), uid
        );

        List<Map<String, Object>> profile = jdbcTemplate.queryForList("SELECT * FROM ExpertProfile WHERE userId = ?", uid);
        return ok(profile.get(0), "Expert profile updated");
    }

    // Farmer Profile Update
    @PutMapping("/profile")
    public ResponseEntity<Map<String, Object>> updateProfile(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();

        String uid = (String) user.get("id");
        String name = (String) body.get("fullName");
        String lang = (String) body.get("preferredLang");
        String state = (String) body.get("state");
        String district = (String) body.get("district");
        String village = (String) body.get("village");
        String exp = (String) body.get("farmingExp");
        String crop = (String) body.get("primaryCrop");
        Double size = body.get("farmSizeAcres") != null ? ((Number) body.get("farmSizeAcres")).doubleValue() : null;

        jdbcTemplate.update(
            "UPDATE User SET fullName=?, preferredLang=?, state=?, district=?, village=?, farmingExp=?, primaryCrop=?, farmSizeAcres=?, updatedAt=? WHERE id=?",
            name, lang, state, district, village, exp, crop, size, new Timestamp(System.currentTimeMillis()), uid
        );

        List<Map<String, Object>> users = jdbcTemplate.queryForList("SELECT * FROM User WHERE id = ?", uid);
        Map<String, Object> updatedUser = new HashMap<>(users.get(0));
        updatedUser.remove("passwordHash");
        return ok(updatedUser, "Profile updated");
    }

    // Generic simple CRUD endpoint fallbacks for items (Inventory, Equipment, Tasks, Expenses, Harvests, Plots)
    // Equipment
    @GetMapping("/equipment")
    public ResponseEntity<Map<String, Object>> getEquipment(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM Equipment WHERE userId = ?", user.get("id"));
        return ok(list);
    }
    @PostMapping("/equipment")
    public ResponseEntity<Map<String, Object>> addEquipment(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO Equipment (id, farmId, userId, name, category, brand, model, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)",
            id, body.get("farmId"), user.get("id"), body.get("name"), body.get("category"), body.get("brand"), body.get("model"),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM Equipment WHERE id=?", id).get(0), "Equipment added", HttpStatus.CREATED);
    }
    @PatchMapping("/equipment/{id}")
    public ResponseEntity<Map<String, Object>> patchEquipment(@PathVariable String id, @RequestBody Map<String, String> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("UPDATE Equipment SET status=?, updatedAt=? WHERE id=?", body.get("status"), new Timestamp(System.currentTimeMillis()), id);
        return ok(null, "Equipment status updated");
    }
    @DeleteMapping("/equipment/{id}")
    public ResponseEntity<Map<String, Object>> deleteEquipment(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM Equipment WHERE id=?", id);
        return ok(null, "Equipment deleted");
    }

    // Inventory
    @GetMapping("/inventory")
    public ResponseEntity<Map<String, Object>> getInventory(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM InventoryItem WHERE userId = ?", user.get("id"));
        return ok(list);
    }
    @PostMapping("/inventory")
    public ResponseEntity<Map<String, Object>> addInventory(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO InventoryItem (id, farmId, userId, name, category, quantity, unit, minStock, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, body.get("farmId"), user.get("id"), body.get("name"), body.get("category"), body.get("quantity"), body.get("unit"), body.getOrDefault("minStock", 0.0),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM InventoryItem WHERE id=?", id).get(0), "Inventory item added", HttpStatus.CREATED);
    }
    @DeleteMapping("/inventory/{id}")
    public ResponseEntity<Map<String, Object>> deleteInventory(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM InventoryItem WHERE id=?", id);
        return ok(null, "Inventory item deleted");
    }

    // Tasks
    @GetMapping("/tasks")
    public ResponseEntity<Map<String, Object>> getTasks(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM FarmTask WHERE userId = ?", user.get("id"));
        return ok(list);
    }
    @PostMapping("/tasks")
    public ResponseEntity<Map<String, Object>> addTask(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        Timestamp dueDate;
        try {
            dueDate = new Timestamp(sdf.parse(String.valueOf(body.get("dueDate")).substring(0, 10)).getTime());
        } catch (Exception e) {
            dueDate = new Timestamp(System.currentTimeMillis() + 86400000L);
        }

        jdbcTemplate.update(
            "INSERT INTO FarmTask (id, farmId, cropId, userId, title, description, category, priority, dueDate, completed, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
            id, body.get("farmId"), body.get("cropId"), user.get("id"), body.get("title"), body.get("description"), body.getOrDefault("category", "GENERAL"), body.getOrDefault("priority", "MEDIUM"), dueDate,
            new Timestamp(System.currentTimeMillis())
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM FarmTask WHERE id=?", id).get(0), "Task created", HttpStatus.CREATED);
    }
    @PatchMapping("/tasks/{id}")
    public ResponseEntity<Map<String, Object>> patchTask(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        Boolean completed = (Boolean) body.get("completed");
        Timestamp completedAt = completed ? new Timestamp(System.currentTimeMillis()) : null;
        jdbcTemplate.update("UPDATE FarmTask SET completed=?, completedAt=? WHERE id=?", completed ? 1 : 0, completedAt, id);
        return ok(null, "Task updated");
    }
    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Map<String, Object>> deleteTask(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM FarmTask WHERE id=?", id);
        return ok(null, "Task deleted");
    }

    // Expenses
    @GetMapping("/expenses")
    public ResponseEntity<Map<String, Object>> getExpenses(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM FarmExpense WHERE userId = ?", user.get("id"));
        return ok(list);
    }
    @PostMapping("/expenses")
    public ResponseEntity<Map<String, Object>> addExpense(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO FarmExpense (id, farmId, cropId, userId, category, description, amount, expenseDate, paymentMode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, body.get("farmId"), body.get("cropId"), user.get("id"), body.get("category"), body.get("description"), ((Number) body.get("amount")).doubleValue(), new Timestamp(System.currentTimeMillis()), body.get("paymentMode"),
            new Timestamp(System.currentTimeMillis())
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM FarmExpense WHERE id=?", id).get(0), "Expense recorded", HttpStatus.CREATED);
    }
    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<Map<String, Object>> deleteExpense(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM FarmExpense WHERE id=?", id);
        return ok(null, "Expense deleted");
    }

    // Harvests
    @GetMapping("/harvests")
    public ResponseEntity<Map<String, Object>> getHarvests(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList("SELECT * FROM Harvest WHERE userId = ?", user.get("id"));
        return ok(list);
    }
    @PostMapping("/harvests")
    public ResponseEntity<Map<String, Object>> addHarvest(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        double qty = ((Number) body.get("quantityKg")).doubleValue();
        double area = ((Number) body.get("areaAcres")).doubleValue();
        double yield = area > 0 ? qty / area : qty;
        
        Double salePrice = body.get("salePrice") != null ? ((Number) body.get("salePrice")).doubleValue() : null;
        Double income = salePrice != null ? qty * salePrice : null;
        Double expenses = body.get("expenses") != null ? ((Number) body.get("expenses")).doubleValue() : null;
        Double profit = income != null && expenses != null ? income - expenses : null;

        jdbcTemplate.update(
            "INSERT INTO Harvest (id, farmId, cropId, userId, harvestDate, quantityKg, areaAcres, yieldPerAcre, quality, salePrice, totalIncome, expenses, netProfit, notes, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, body.get("farmId"), body.get("cropId"), user.get("id"), new Timestamp(System.currentTimeMillis()), qty, area, yield, body.getOrDefault("quality", "GOOD"), salePrice, income, expenses, profit, body.get("notes"),
            new Timestamp(System.currentTimeMillis())
        );

        // Update crop to HARVESTED stage
        jdbcTemplate.update("UPDATE Crop SET stage = 'HARVESTED' WHERE id = ?", body.get("cropId"));

        return ok(jdbcTemplate.queryForList("SELECT * FROM Harvest WHERE id=?", id).get(0), "Harvest logged", HttpStatus.CREATED);
    }
    @DeleteMapping("/harvests/{id}")
    public ResponseEntity<Map<String, Object>> deleteHarvest(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM Harvest WHERE id=?", id);
        return ok(null, "Harvest record deleted");
    }

    // Plots
    @GetMapping("/plots")
    public ResponseEntity<Map<String, Object>> getPlots(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        List<Map<String, Object>> list = jdbcTemplate.queryForList(
            "SELECT p.* FROM FarmPlot p JOIN Farm f ON p.farmId = f.id WHERE f.ownerId = ?", user.get("id")
        );
        return ok(list);
    }
    @PostMapping("/plots")
    public ResponseEntity<Map<String, Object>> addPlot(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO FarmPlot (id, farmId, name, areaAcres, x, y, width, height, color, currentCrop, notes, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, body.get("farmId"), body.get("name"), ((Number) body.get("areaAcres")).doubleValue(), ((Number) body.getOrDefault("x", 0)).doubleValue(), ((Number) body.getOrDefault("y", 0)).doubleValue(), ((Number) body.getOrDefault("width", 20)).doubleValue(), ((Number) body.getOrDefault("height", 20)).doubleValue(), body.getOrDefault("color", "#16a34a"), body.get("currentCrop"), body.get("notes"),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM FarmPlot WHERE id=?", id).get(0), "Plot created", HttpStatus.CREATED);
    }
    @DeleteMapping("/plots/{id}")
    public ResponseEntity<Map<String, Object>> deletePlot(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null) return unauthorized();
        jdbcTemplate.update("DELETE FROM FarmPlot WHERE id=?", id);
        return ok(null, "Plot deleted");
    }

    // ============================================================
    // ADMIN MODULES
    // ============================================================
    @GetMapping("/admin/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats(HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        long users = ((Number) jdbcTemplate.queryForList("SELECT COUNT(id) as c FROM User").get(0).get("c")).longValue();
        long farms = ((Number) jdbcTemplate.queryForList("SELECT COUNT(id) as c FROM Farm WHERE archived = 0").get(0).get("c")).longValue();
        long crops = ((Number) jdbcTemplate.queryForList("SELECT COUNT(id) as c FROM Crop").get(0).get("c")).longValue();
        long alerts = ((Number) jdbcTemplate.queryForList("SELECT COUNT(id) as c FROM Alert WHERE isRead = 0").get(0).get("c")).longValue();

        List<Map<String, Object>> recentSignups = jdbcTemplate.queryForList(
            "SELECT id, fullName, email, role, createdAt FROM User ORDER BY createdAt DESC LIMIT 5"
        );

        List<Map<String, Object>> roleDist = jdbcTemplate.queryForList(
            "SELECT role, COUNT(id) as count FROM User GROUP BY role"
        );

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("users", users);
        stats.put("farms", farms);
        stats.put("crops", crops);
        stats.put("alerts", alerts);
        stats.put("recentSignups", recentSignups);
        stats.put("roleDistribution", roleDist);

        return ok(stats);
    }

    @GetMapping("/admin/users")
    public ResponseEntity<Map<String, Object>> getAdminUsers(HttpServletRequest request,
                                                             @RequestParam(value = "role", required = false) String role,
                                                             @RequestParam(value = "q", required = false) String q) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        String sql = "SELECT * FROM User WHERE 1=1";
        List<Object> args = new ArrayList<>();
        if (role != null && !role.trim().isEmpty()) {
            sql += " AND role = ?";
            args.add(role);
        }
        if (q != null && !q.trim().isEmpty()) {
            sql += " AND (fullName LIKE ? OR email LIKE ?)";
            args.add("%" + q + "%");
            args.add("%" + q + "%");
        }
        sql += " ORDER BY createdAt DESC";

        List<Map<String, Object>> users = jdbcTemplate.queryForList(sql, args.toArray());
        for (Map<String, Object> u : users) {
            u.remove("passwordHash");
        }
        return ok(users);
    }

    @PatchMapping("/admin/users/{id}")
    public ResponseEntity<Map<String, Object>> patchAdminUser(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        if (body.containsKey("isVerified")) {
            Boolean verified = (Boolean) body.get("isVerified");
            jdbcTemplate.update("UPDATE User SET isVerified = ? WHERE id = ?", verified ? 1 : 0, id);
            // If user is expert, verify their expert profile too
            jdbcTemplate.update("UPDATE ExpertProfile SET isVerified = ? WHERE userId = ?", verified ? 1 : 0, id);
        }
        if (body.containsKey("isActive")) {
            Boolean active = (Boolean) body.get("isActive");
            jdbcTemplate.update("UPDATE User SET isActive = ? WHERE id = ?", active ? 1 : 0, id);
        }
        return ok(null, "User updated successfully");
    }

    @DeleteMapping("/admin/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteAdminUser(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update("DELETE FROM User WHERE id = ?", id);
        return ok(null, "User deleted successfully");
    }

    // Admin Schemes CRUD
    @PostMapping("/admin/schemes")
    public ResponseEntity<Map<String, Object>> adminCreateScheme(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO GovernmentScheme (id, name, description, eligibility, benefits, requiredDocs, applicationProcess, officialSource, officialUrl, state, category, level, isActive, lastUpdated, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)",
            id, body.get("name"), body.get("description"), body.get("eligibility"), body.get("benefits"), body.get("requiredDocs"), body.get("applicationProcess"), body.get("officialSource"), body.get("officialUrl"), body.getOrDefault("state", "ALL"), body.get("category"), body.getOrDefault("level", "CENTRAL"),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        return ok(jdbcTemplate.queryForList("SELECT * FROM GovernmentScheme WHERE id=?", id).get(0), "Scheme created", HttpStatus.CREATED);
    }

    @PutMapping("/admin/schemes/{id}")
    public ResponseEntity<Map<String, Object>> adminUpdateScheme(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update(
            "UPDATE GovernmentScheme SET name=?, description=?, eligibility=?, benefits=?, requiredDocs=?, applicationProcess=?, officialSource=?, officialUrl=?, state=?, category=?, level=?, lastUpdated=? WHERE id=?",
            body.get("name"), body.get("description"), body.get("eligibility"), body.get("benefits"), body.get("requiredDocs"), body.get("applicationProcess"), body.get("officialSource"), body.get("officialUrl"), body.get("state"), body.get("category"), body.get("level"),
            new Timestamp(System.currentTimeMillis()), id
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM GovernmentScheme WHERE id=?", id).get(0), "Scheme updated");
    }

    @DeleteMapping("/admin/schemes/{id}")
    public ResponseEntity<Map<String, Object>> adminDeleteScheme(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update("DELETE FROM GovernmentScheme WHERE id=?", id);
        return ok(null, "Scheme deleted");
    }

    // Admin Disease DB CRUD
    @PostMapping("/admin/disease-db")
    public ResponseEntity<Map<String, Object>> adminCreateDisease(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO DiseaseDatabase (id, cropName, diseaseName, symptoms, cause, severity, treatment, prevention, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            id, body.get("cropName"), body.get("diseaseName"), body.get("symptoms"), body.get("cause"), body.get("severity"), body.get("treatment"), body.get("prevention"),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        return ok(jdbcTemplate.queryForList("SELECT * FROM DiseaseDatabase WHERE id=?", id).get(0), "Disease info created", HttpStatus.CREATED);
    }

    @PutMapping("/admin/disease-db/{id}")
    public ResponseEntity<Map<String, Object>> adminUpdateDisease(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update(
            "UPDATE DiseaseDatabase SET cropName=?, diseaseName=?, symptoms=?, cause=?, severity=?, treatment=?, prevention=?, updatedAt=? WHERE id=?",
            body.get("cropName"), body.get("diseaseName"), body.get("symptoms"), body.get("cause"), body.get("severity"), body.get("treatment"), body.get("prevention"),
            new Timestamp(System.currentTimeMillis()), id
        );
        return ok(jdbcTemplate.queryForList("SELECT * FROM DiseaseDatabase WHERE id=?", id).get(0), "Disease info updated");
    }

    @DeleteMapping("/admin/disease-db/{id}")
    public ResponseEntity<Map<String, Object>> adminDeleteDisease(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update("DELETE FROM DiseaseDatabase WHERE id=?", id);
        return ok(null, "Disease info deleted");
    }

    // Admin Market Price CRUD
    @PostMapping("/admin/market-prices")
    public ResponseEntity<Map<String, Object>> adminCreatePrice(@RequestBody Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        String id = UUID.randomUUID().toString();
        jdbcTemplate.update(
            "INSERT INTO MarketPrice (id, cropName, marketId, minPrice, maxPrice, modalPrice, priceDate, isDemo, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)",
            id, body.get("cropName"), body.get("marketId"), ((Number) body.get("minPrice")).doubleValue(), ((Number) body.get("maxPrice")).doubleValue(), ((Number) body.get("modalPrice")).doubleValue(),
            new Timestamp(System.currentTimeMillis()), new Timestamp(System.currentTimeMillis())
        );

        return ok(jdbcTemplate.queryForList("SELECT * FROM MarketPrice WHERE id=?", id).get(0), "Price record created", HttpStatus.CREATED);
    }

    @DeleteMapping("/admin/market-prices/{id}")
    public ResponseEntity<Map<String, Object>> adminDeletePrice(@PathVariable String id, HttpServletRequest request) {
        Map<String, Object> user = getCurrentUser(request);
        if (user == null || !"ADMIN".equals(user.get("role"))) return err("Forbidden", HttpStatus.FORBIDDEN);

        jdbcTemplate.update("DELETE FROM MarketPrice WHERE id=?", id);
        return ok(null, "Price record deleted");
    }
}
