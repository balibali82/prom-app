package com.prom.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class OcrResult {
    private String number;
    private String type; // "샤시" or "모듈"
}
