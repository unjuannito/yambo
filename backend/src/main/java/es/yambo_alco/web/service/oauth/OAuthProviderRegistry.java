package es.yambo_alco.web.service.oauth;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuthProviderRegistry {

    private final List<OAuthProvider> providerBeans;
    private final Map<String, OAuthProvider> providers = new LinkedHashMap<>();

    @PostConstruct
    void init() {
        for (OAuthProvider provider : providerBeans) {
            providers.put(provider.getProviderName(), provider);
        }
    }

    public Optional<OAuthProvider> getProvider(String name) {
        return Optional.ofNullable(providers.get(name));
    }

    public Collection<OAuthProvider> getAllProviders() {
        return Collections.unmodifiableCollection(providers.values());
    }

    public List<OAuthProvider> getEnabledProviders() {
        return providers.values().stream().filter(OAuthProvider::isEnabled).toList();
    }

    public boolean isEnabled(String providerName) {
        return Optional.ofNullable(providers.get(providerName))
                .map(OAuthProvider::isEnabled).orElse(false);
    }
}
