package es.yambo_alco.web.model.enums;

/**
 * Target audience for a broadcast campaign (issue #123).
 * <p>
 * {@code ALL} targets every member with an email; {@code PROFILE} / {@code PROJECT} /
 * {@code GROUP} use the single id in {@code audience_ref}; {@code USERS} uses the
 * explicit list in {@code audience_users}.
 */
public enum CampaignAudience {
    ALL,
    PROFILE,
    PROJECT,
    GROUP,
    USERS
}
