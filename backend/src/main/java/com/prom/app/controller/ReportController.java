package com.prom.app.controller;

import com.prom.app.dto.OcrResult;
import com.prom.app.dto.ReportRequest;
import com.prom.app.service.EmailService;
import com.prom.app.service.OcrService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ReportController {

    private final OcrService ocrService;
    private final EmailService emailService;

    // New Endpoint for Real-time OCR
    @PostMapping("/ocr")
    public ResponseEntity<OcrResult> performOcr(@RequestParam("image") MultipartFile image) {
        OcrResult result = ocrService.extractNumberAndType(image);
        if (result != null) {
            return ResponseEntity.ok(result);
        } else {
            return ResponseEntity.ok(null); // No number found
        }
    }

    @PostMapping("/report")
    public ResponseEntity<String> submitReport(@ModelAttribute ReportRequest request) {
        try {
            // 1. Validate Chassis Number Existence
            boolean hasChassis = false;
            String extractedNumber = null; // To show in response

            if (request.getImages() != null && !request.getImages().isEmpty()) {
                for (MultipartFile img : request.getImages()) {
                    OcrResult result = ocrService.extractNumberAndType(img);
                    if (result != null) {
                        if ("샤시".equals(result.getType())) {
                            hasChassis = true;
                            extractedNumber = result.getNumber(); // Keep at least one chassis number for record
                        }
                    }
                }
            }

            if (!hasChassis) {
                return ResponseEntity.badRequest().body("오류: '샤시' 바코드 번호가 포함된 사진이 반드시 필요합니다.");
            }

            // 2. Send Email
            emailService.sendReportEmail(request, extractedNumber);

            return ResponseEntity.ok("성적서가 성공적으로 등록되었습니다.");
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("오류 발생: " + e.getMessage());
        }
    }
}
