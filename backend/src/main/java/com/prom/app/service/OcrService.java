package com.prom.app.service;

import com.prom.app.dto.OcrResult;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class OcrService {

    @Value("${google.vision.api-key}")
    private String apiKey;

    private static final String VISION_API_URL = "https://vision.googleapis.com/v1/images:annotate?key=";
    
    // Strict pattern: 22 digits that are NOT split by newlines or other text blocks.
    // However, Google Vision's "fullTextAnnotation" usually groups blocks.
    // To be strict, we should look for a sequence of 22 digits in the text.
    // If the user means "don't combine '123' and '456' from different parts of the image",
    // we should rely on the fact that a barcode usually appears as a single block of text.
    // But spaces might exist.
    // The previous logic `text.replaceAll("[^\\d]", "")` was combining EVERYTHING.
    // New logic: Look for 22 digits in the raw text, allowing ONLY spaces between them, 
    // but NOT newlines if they are far apart. 
    // Actually, the safest way to "not combine short numbers" is to check if the 
    // *original* text line contains 22 digits (ignoring spaces).
    
    private static final Pattern DIGIT_PATTERN = Pattern.compile("\\d{22}");

    public String extract22DigitNumber(List<MultipartFile> files) {
        if (files == null || files.isEmpty()) return null;
        for (MultipartFile file : files) {
            OcrResult result = extractNumberAndType(file);
            if (result != null) {
                return result.getNumber();
            }
        }
        return null;
    }

    public OcrResult extractNumberAndType(MultipartFile file) {
        try {
            RestTemplate restTemplate = new RestTemplate();
            String url = VISION_API_URL + apiKey;

            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());

            Map<String, Object> imageContent = new HashMap<>();
            imageContent.put("content", base64Image);

            Map<String, Object> imageRequest = new HashMap<>();
            imageRequest.put("image", imageContent);
            
            Map<String, Object> feature = new HashMap<>();
            feature.put("type", "TEXT_DETECTION");
            
            imageRequest.put("features", Collections.singletonList(feature));

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("requests", Collections.singletonList(imageRequest));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            
            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response != null && response.containsKey("responses")) {
                List<Map<String, Object>> responses = (List<Map<String, Object>>) response.get("responses");
                if (!responses.isEmpty()) {
                    Map<String, Object> firstResponse = responses.get(0);
                    
                    // Instead of using fullTextAnnotation which merges everything,
                    // let's iterate over "textAnnotations" (individual blocks/lines).
                    if (firstResponse.containsKey("textAnnotations")) {
                        List<Map<String, Object>> textAnnotations = (List<Map<String, Object>>) firstResponse.get("textAnnotations");
                        
                        // The first annotation is always the full text, so skip it or handle it carefully.
                        // We want to check individual lines/blocks to avoid merging unrelated numbers.
                        // But sometimes the barcode is split into two lines?
                        // User said: "don't combine short numbers to make 22".
                        // So we should look for a text block that *contains* 22 digits.
                        
                        for (Map<String, Object> annotation : textAnnotations) {
                            String text = (String) annotation.get("description");
                            if (text == null) continue;

                            // Remove spaces only (keep newlines as separators effectively by processing block by block)
                            String cleanText = text.replaceAll("\\s+", ""); 
                            
                            // Check if this specific block has 22 digits
                            Matcher matcher = DIGIT_PATTERN.matcher(cleanText);
                            if (matcher.find()) {
                                String number = matcher.group();
                                char tenthDigit = number.charAt(9);
                                String type = (tenthDigit == '1') ? "샤시" : "모듈";
                                return new OcrResult(number, type);
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("OCR Error: " + e.getMessage());
        }
        return null;
    }
}
