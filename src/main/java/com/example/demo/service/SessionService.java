package com.example.demo.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.util.*;

@Service
public class SessionService {

    private static final String SECRET = "ecocrop-dev-secret-change-me-please-0123456789";
    private static final long ACCESS_TTL = 60 * 60 * 1000L; // 1 hour
    private static final long REFRESH_TTL = 7 * 24 * 60 * 60 * 1000L; // 7 days

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    public static class SessionPayload {
        public String uid;
        public String role;
        public String email;
        public long exp;
    }

    private String hmac(String data) throws Exception {
        Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
        SecretKeySpec secret_key = new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        sha256_HMAC.init(secret_key);
        byte[] raw = sha256_HMAC.doFinal(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
    }

    private String b64urlEncode(Object obj) throws Exception {
        String json = (obj instanceof String) ? (String) obj : objectMapper.writeValueAsString(obj);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(json.getBytes(StandardCharsets.UTF_8));
    }

    private String b64urlDecode(String str) {
        byte[] decoded = Base64.getUrlDecoder().decode(str);
        return new String(decoded, StandardCharsets.UTF_8);
    }

    public String signAccessToken(String uid, String role, String email) {
        try {
            long exp = System.currentTimeMillis() + ACCESS_TTL;
            Map<String, Object> payload = new HashMap<>();
            payload.put("uid", uid);
            payload.put("role", role);
            payload.put("email", email);
            payload.put("exp", exp);

            Map<String, String> header = new HashMap<>();
            header.put("alg", "HS256");
            header.put("typ", "JWT");

            String headerB64 = b64urlEncode(header);
            String payloadB64 = b64urlEncode(payload);
            String sig = hmac(headerB64 + "." + payloadB64);

            return headerB64 + "." + payloadB64 + "." + sig;
        } catch (Exception e) {
            throw new RuntimeException("Error signing access token", e);
        }
    }

    public String signRefreshToken(String uid) {
        try {
            byte[] bytes = new byte[32];
            new SecureRandom().nextBytes(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            String token = sb.toString();
            long expiresAt = System.currentTimeMillis() + REFRESH_TTL;

            jdbcTemplate.update(
                "INSERT INTO RefreshToken (id, userId, token, expiresAt, revoked, createdAt) VALUES (?, ?, ?, ?, ?, ?)",
                UUID.randomUUID().toString(),
                uid,
                token,
                new Timestamp(expiresAt),
                0,
                new Timestamp(System.currentTimeMillis())
            );

            return token;
        } catch (Exception e) {
            throw new RuntimeException("Error signing refresh token", e);
        }
    }

    public SessionPayload verifyAccessToken(String token) {
        if (token == null || token.trim().isEmpty()) return null;
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) return null;

            String header = parts[0];
            String payloadB64 = parts[1];
            String sig = parts[2];

            String expected = hmac(header + "." + payloadB64);
            if (!sig.equals(expected)) return null;

            String json = b64urlDecode(payloadB64);
            SessionPayload payload = objectMapper.readValue(json, SessionPayload.class);
            if (payload.exp < System.currentTimeMillis()) return null;

            return payload;
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> getUserBySession(SessionPayload session) {
        if (session == null) return null;
        try {
            List<Map<String, Object>> users = jdbcTemplate.queryForList(
                "SELECT * FROM User WHERE id = ? AND isActive = 1", session.uid
            );
            if (users.isEmpty()) return null;
            Map<String, Object> user = new HashMap<>(users.get(0));

            // Fetch expertProfile if exists
            List<Map<String, Object>> experts = jdbcTemplate.queryForList(
                "SELECT * FROM ExpertProfile WHERE userId = ?", session.uid
            );
            if (!experts.isEmpty()) {
                user.put("expertProfile", experts.get(0));
            } else {
                user.put("expertProfile", null);
            }
            return user;
        } catch (Exception e) {
            return null;
        }
    }

    public Map<String, Object> getSessionFromRefresh(String refreshToken) {
        if (refreshToken == null) return null;
        try {
            List<Map<String, Object>> tokens = jdbcTemplate.queryForList(
                "SELECT * FROM RefreshToken WHERE token = ? AND revoked = 0", refreshToken
            );
            if (tokens.isEmpty()) return null;
            Map<String, Object> rt = tokens.get(0);
            
            Object expiresAtObj = rt.get("expiresAt");
            long expiresAt;
            if (expiresAtObj instanceof Number) {
                expiresAt = ((Number) expiresAtObj).longValue();
            } else if (expiresAtObj instanceof java.util.Date) {
                expiresAt = ((java.util.Date) expiresAtObj).getTime();
            } else {
                expiresAt = Timestamp.valueOf(expiresAtObj.toString()).getTime();
            }

            if (expiresAt < System.currentTimeMillis()) return null;

            String uid = (String) rt.get("userId");
            List<Map<String, Object>> users = jdbcTemplate.queryForList(
                "SELECT * FROM User WHERE id = ? AND isActive = 1", uid
            );
            if (users.isEmpty()) return null;
            Map<String, Object> user = users.get(0);

            SessionPayload payload = new SessionPayload();
            payload.uid = uid;
            payload.role = (String) user.get("role");
            payload.email = (String) user.get("email");
            payload.exp = System.currentTimeMillis() + ACCESS_TTL;

            return Map.of("payload", payload, "user", user);
        } catch (Exception e) {
            return null;
        }
    }
}
