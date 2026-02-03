package es.yambo_alco.web.service;

import es.yambo_alco.web.exception.BadRequestException;
import es.yambo_alco.web.exception.ResourceNotFoundException;
import es.yambo_alco.web.model.FamilyProduct;
import es.yambo_alco.web.model.Profile;
import es.yambo_alco.web.model.PromotionInvitation;
import es.yambo_alco.web.model.User;
import es.yambo_alco.web.repository.FamilyProductRepository;
import es.yambo_alco.web.repository.PromotionInvitationRegistrationRepository;
import es.yambo_alco.web.repository.PromotionInvitationRepository;
import es.yambo_alco.web.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PromotionInvitationServiceTest {

    @Mock
    private PromotionInvitationRepository promotionInvitationRepository;

    @Mock
    private PromotionInvitationRegistrationRepository promotionInvitationRegistrationRepository;

    @Mock
    private FamilyProductRepository familyProductRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private PromotionInvitationService promotionInvitationService;

    @Test
    void createPromotionInvitation_WhenNoFamilyProducts_ShouldThrow() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.createPromotionInvitation("USER1", Set.of(), null, LocalDateTime.now().plusDays(1)));
        assertEquals("Family product IDs are required", exception.getMessage());
    }

    @Test
    void createPromotionInvitation_WhenFamilyMissing_ShouldThrow() {
        when(familyProductRepository.findAllById(Set.of("FAM001"))).thenReturn(java.util.List.of());

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.createPromotionInvitation("USER1", Set.of("FAM001"), null, LocalDateTime.now().plusDays(1)));
        assertEquals("One or more family products not found", exception.getMessage());
    }

    @Test
    void createPromotionInvitation_WhenStartAfterEnd_ShouldThrow() {
        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.createPromotionInvitation(
                        "USER1",
                        Set.of("FAM001"),
                        LocalDateTime.now().plusDays(2),
                        LocalDateTime.now().plusDays(1)));
        assertEquals("Start date must be before end date", exception.getMessage());
    }

    @Test
    void createPromotionInvitation_WhenNoEnd_ShouldAllow() {
        FamilyProduct familyProduct = FamilyProduct.builder().id("FAM001").build();
        when(familyProductRepository.findAllById(Set.of("FAM001"))).thenReturn(java.util.List.of(familyProduct));
        when(promotionInvitationRepository.save(any(PromotionInvitation.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        PromotionInvitation invitation = promotionInvitationService.createPromotionInvitation(
                "USER1",
                Set.of("FAM001"),
                null,
                null);

        assertNotNull(invitation.getStartTms());
        assertNull(invitation.getExpiresAt());
        assertEquals("USER1", invitation.getInvitedBy());
        assertEquals(1, invitation.getFamilyProducts().size());
    }

    @Test
    void acceptInvitation_WhenExpired_ShouldThrow() {
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(1L)
                .token("tok")
            .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().minusHours(1))
                .familyProducts(Set.of())
                .build();

        when(promotionInvitationRepository.findByToken("tok")).thenReturn(Optional.of(invitation));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.acceptInvitation("tok", "a@b.com", "pass", "Name", null));
        assertEquals("Promotion invitation expired", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenCurrentUser_ShouldAssignProfilesAndRegister() {
        Profile profile = Profile.builder().id("BASIC").build();
                FamilyProduct familyProduct = FamilyProduct.builder().id("FAM001").profile(profile).build();
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(1L)
                .token("tok")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .familyProducts(Set.of(familyProduct))
                .build();

        User user = User.builder().id("USER1").profiles(new java.util.HashSet<>()).build();

        when(promotionInvitationRepository.findByToken("tok")).thenReturn(Optional.of(invitation));
        when(promotionInvitationRegistrationRepository.existsByPromotionInvitationIdAndUserId(1L, "USER1")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenReturn(user);

        User result = promotionInvitationService.acceptInvitation("tok", null, null, null, user);

        assertEquals("USER1", result.getId());
        assertTrue(result.getProfiles().stream().anyMatch(p -> p.getId().equals("BASIC")));
        verify(promotionInvitationRegistrationRepository).save(any());
    }

    @Test
    void acceptInvitation_WhenNewUser_ShouldCreateAndRegister() {
        Profile profile = Profile.builder().id("BASIC").build();
                FamilyProduct familyProduct = FamilyProduct.builder().id("FAM001").profile(profile).build();
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(2L)
                .token("tok2")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .familyProducts(Set.of(familyProduct))
                .build();

        when(promotionInvitationRepository.findByToken("tok2")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("new@user.com")).thenReturn(false);
        when(passwordEncoder.encode("pass"))
                .thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId("NEW01");
            return u;
        });
        when(promotionInvitationRegistrationRepository.existsByPromotionInvitationIdAndUserId(2L, "NEW01")).thenReturn(false);

        User result = promotionInvitationService.acceptInvitation("tok2", "new@user.com", "pass", "Name", null);

        assertEquals("NEW01", result.getId());
        assertTrue(result.getProfiles().stream().anyMatch(p -> p.getId().equals("BASIC")));
        verify(promotionInvitationRegistrationRepository).save(any());
    }

    @Test
    void acceptInvitation_WhenEmailRegistered_ShouldThrow() {
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(3L)
                .token("tok3")
                .startTms(LocalDateTime.now().minusDays(1))
                .expiresAt(LocalDateTime.now().plusHours(1))
                .familyProducts(Set.of())
                .build();

        when(promotionInvitationRepository.findByToken("tok3")).thenReturn(Optional.of(invitation));
        when(userRepository.existsByEmail("dup@user.com")).thenReturn(true);

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.acceptInvitation("tok3", "dup@user.com", "pass", "Name", null));
        assertEquals("Email already registered", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenTokenMissing_ShouldThrow() {
        when(promotionInvitationRepository.findByToken("missing")).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> promotionInvitationService.acceptInvitation("missing", "a@b.com", "pass", "Name", null));
        assertEquals("Promotion invitation not found", exception.getMessage());
    }

    @Test
    void acceptInvitation_WhenNotActiveYet_ShouldThrow() {
        PromotionInvitation invitation = PromotionInvitation.builder()
                .id(4L)
                .token("tok4")
                .startTms(LocalDateTime.now().plusDays(1))
                .expiresAt(LocalDateTime.now().plusDays(2))
                .familyProducts(Set.of())
                .build();

        when(promotionInvitationRepository.findByToken("tok4")).thenReturn(Optional.of(invitation));

        BadRequestException exception = assertThrows(BadRequestException.class,
                () -> promotionInvitationService.acceptInvitation("tok4", "a@b.com", "pass", "Name", null));
        assertEquals("Promotion invitation not active yet", exception.getMessage());
    }

        @Test
        void acceptInvitation_WhenNoEndAndStarted_ShouldAllow() {
                PromotionInvitation invitation = PromotionInvitation.builder()
                                .id(5L)
                                .token("tok5")
                                .startTms(LocalDateTime.now().minusDays(1))
                                .expiresAt(null)
                                .familyProducts(Set.of())
                                .build();

                when(promotionInvitationRepository.findByToken("tok5")).thenReturn(Optional.of(invitation));
                when(userRepository.existsByEmail("a@b.com")).thenReturn(false);
                when(passwordEncoder.encode("pass")).thenReturn("hashed");
                when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
                        User u = invocation.getArgument(0);
                        u.setId("USER5");
                        return u;
                });
                when(promotionInvitationRegistrationRepository.existsByPromotionInvitationIdAndUserId(5L, "USER5")).thenReturn(false);

                User result = promotionInvitationService.acceptInvitation("tok5", "a@b.com", "pass", "Name", null);

                assertEquals("USER5", result.getId());
                verify(promotionInvitationRegistrationRepository).save(any());
        }

        @Test
        void disableInvitation_WhenFound_ShouldSetEnd() {
                PromotionInvitation invitation = PromotionInvitation.builder()
                                .id(10L)
                                .token("tok10")
                                .startTms(LocalDateTime.now().minusDays(1))
                                .expiresAt(null)
                                .familyProducts(Set.of())
                                .build();

                when(promotionInvitationRepository.findById(10L)).thenReturn(Optional.of(invitation));
                when(promotionInvitationRepository.save(any(PromotionInvitation.class)))
                                .thenAnswer(invocation -> invocation.getArgument(0));

                PromotionInvitation result = promotionInvitationService.disableInvitation(10L);

                assertNotNull(result.getExpiresAt());
                verify(promotionInvitationRepository).save(any(PromotionInvitation.class));
        }
}
