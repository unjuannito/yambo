package es.yambo_alco.web.service;

/**
 * Recipiente de un comunicado (issue #123): solo datos planos (id, nombre,
 * email) para poder cruzar la frontera asíncrona sin arrastrar entidades JPA
 * perezosas.
 */
public record CampaignRecipient(String userId, String name, String email) {
}
