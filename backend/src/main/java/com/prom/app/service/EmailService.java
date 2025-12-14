package com.prom.app.service;

import com.prom.app.dto.ReportRequest;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendReportEmail(ReportRequest request, String extractedNumber) throws MessagingException, IOException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

        helper.setFrom(fromEmail);
        helper.setTo("a585882@sk.com");
        helper.setSubject("[Prom]인수시험성적서-" + request.getPromReceiptNo());

        StringBuilder body = new StringBuilder();
        body.append("<div style='font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6;'>");
        body.append("<strong>사번:</strong> ").append(request.getEmployeeId()).append("<br>");
        body.append("<strong>이름:</strong> ").append(request.getName()).append("<br>");
        body.append("<strong>Prom 접수번호:</strong> ").append(request.getPromReceiptNo()).append("<br>");
        body.append("<strong>ONU IP:</strong> ").append(request.getOnuIp()).append("<br>");
        body.append("<strong>설치 위치:</strong> ").append(request.getInstallLocation()).append("<br>");
        body.append("<strong>차단기 위치:</strong> ").append(request.getBreakerLocation()).append("<br>");
        body.append("<strong>출입 절차:</strong> ").append(request.getAccessProcedure()).append("<br>");
        body.append("<strong>광 DB:</strong> ").append(request.getOpticalDb()).append("<br>");

        // Chassis Numbers
        if (request.getChassisNumbers() != null && !request.getChassisNumbers().isEmpty()) {
            for (int i = 0; i < request.getChassisNumbers().size(); i++) {
                body.append("<strong>샤시 #").append(i + 1).append(":</strong> ")
                    .append(request.getChassisNumbers().get(i)).append("<br>");
            }
        }

        // Module Numbers
        if (request.getModuleNumbers() != null && !request.getModuleNumbers().isEmpty()) {
            for (int i = 0; i < request.getModuleNumbers().size(); i++) {
                body.append("<strong>모듈 #").append(i + 1).append(":</strong> ")
                    .append(request.getModuleNumbers().get(i)).append("<br>");
            }
        }
        
        body.append("</div>");

        helper.setText(body.toString(), true);

        if (request.getImages() != null && !request.getImages().isEmpty()) {
            for (MultipartFile file : request.getImages()) {
                helper.addAttachment(file.getOriginalFilename(), 
                                     new ByteArrayResource(file.getBytes()));
            }
        }

        mailSender.send(message);
    }
}
