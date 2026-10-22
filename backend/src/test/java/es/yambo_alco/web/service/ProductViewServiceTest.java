package es.yambo_alco.web.service;

import es.yambo_alco.web.model.ProductView;
import es.yambo_alco.web.repository.ProductViewRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductViewServiceTest {

    @Mock
    private ProductViewRepository productViewRepository;

    @InjectMocks
    private ProductViewService productViewService;

    @Test
    void logView_NewView_ShouldSave() {
        when(productViewRepository.existsByProductIdAndUserIdAndViewedAtAfter(
                eq("PROD001"), eq("USER001"), any())).thenReturn(false);

        productViewService.logView("PROD001", "USER001", null);

        verify(productViewRepository).save(any(ProductView.class));
    }

    @Test
    void logView_DuplicateUserView_ShouldNotSave() {
        when(productViewRepository.existsByProductIdAndUserIdAndViewedAtAfter(
                eq("PROD001"), eq("USER001"), any())).thenReturn(true);

        productViewService.logView("PROD001", "USER001", null);

        verify(productViewRepository, never()).save(any());
    }

    @Test
    void logView_AnonymousNewSession_ShouldSave() {
        when(productViewRepository.existsByProductIdAndSessionIdAndViewedAtAfter(
                eq("PROD001"), eq("session-abc"), any())).thenReturn(false);

        productViewService.logView("PROD001", null, "session-abc");

        verify(productViewRepository).save(any(ProductView.class));
    }

    @Test
    void logView_AnonymousDuplicateSession_ShouldNotSave() {
        when(productViewRepository.existsByProductIdAndSessionIdAndViewedAtAfter(
                eq("PROD001"), eq("session-abc"), any())).thenReturn(true);

        productViewService.logView("PROD001", null, "session-abc");

        verify(productViewRepository, never()).save(any());
    }

    @Test
    void logView_NoUserNoSession_ShouldSave() {
        productViewService.logView("PROD001", null, null);

        verify(productViewRepository).save(any(ProductView.class));
    }
}
