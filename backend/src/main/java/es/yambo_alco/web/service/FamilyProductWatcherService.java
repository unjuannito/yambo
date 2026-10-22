package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProductWatcher;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.FamilyProductWatcherRepository;
import es.yambo_alco.web.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class FamilyProductWatcherService {

    private static final Logger log = LoggerFactory.getLogger(FamilyProductWatcherService.class);
    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    private final FamilyProductWatcherRepository familyProductWatcherRepository;
    private final FamilyProductRepository familyProductRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<FamilyProductWatcher> getWatchers(String familyProductId) {
        familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Drop not found: " + familyProductId));
        return familyProductWatcherRepository.findByFamilyProductId(familyProductId);
    }

    @Transactional
    public FamilyProductWatcher addWatcher(String familyProductId, String email, String userId) {
        familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Drop not found: " + familyProductId));

        if (email == null || email.isBlank() || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            throw new BadRequestException("Invalid email address");
        }
        String normalizedEmail = email.trim().toLowerCase();

        if (userId != null && !userId.isBlank()) {
            userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        }

        if (familyProductWatcherRepository.existsByFamilyProductIdAndEmail(familyProductId, normalizedEmail)) {
            return familyProductWatcherRepository
                    .findByFamilyProductIdAndEmail(familyProductId, normalizedEmail).orElseThrow();
        }

        FamilyProductWatcher watcher = FamilyProductWatcher.builder()
                .familyProductId(familyProductId)
                .email(normalizedEmail)
                .userId(userId != null && !userId.isBlank() ? userId : null)
                .build();

        try {
            return familyProductWatcherRepository.save(watcher);
        } catch (DataIntegrityViolationException e) {
            log.warn("Duplicate watcher attempt for drop {} email {}", familyProductId, normalizedEmail);
            return familyProductWatcherRepository
                    .findByFamilyProductIdAndEmail(familyProductId, normalizedEmail).orElseThrow();
        }
    }

    @Transactional
    public void removeWatcher(String familyProductId, String email) {
        familyProductRepository.findById(familyProductId)
                .orElseThrow(() -> new ResourceNotFoundException("Drop not found: " + familyProductId));

        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required");
        }
        familyProductWatcherRepository.deleteByFamilyProductIdAndEmail(familyProductId, email.trim().toLowerCase());
    }
}
