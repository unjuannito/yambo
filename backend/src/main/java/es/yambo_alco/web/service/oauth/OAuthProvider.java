package es.yambo_alco.web.service.oauth;

import es.yambo_alco.web.model.User;

public interface OAuthProvider {

    String getProviderName();

    String getDisplayName();

    boolean isEnabled();

    String getClientId();

    String getClientSecret();

    String buildAuthUrl(String redirectUri);

    User processCallback(String authorizationCode, String redirectUri) throws Exception;
}
