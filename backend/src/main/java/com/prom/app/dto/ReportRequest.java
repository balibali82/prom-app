package com.prom.app.dto;

import lombok.Data;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@Data
public class ReportRequest {
    private String employeeId;
    private String name;
    private String promReceiptNo;
    private String onuIp;
    private String installLocation;
    private String breakerLocation;
    private String accessProcedure;
    private String opticalDb;
    private List<String> chassisNumbers;
    private List<String> moduleNumbers;
    private List<MultipartFile> images;
}
