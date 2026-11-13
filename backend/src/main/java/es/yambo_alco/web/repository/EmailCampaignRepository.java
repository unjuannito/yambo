package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.EmailCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmailCampaignRepository extends JpaRepository<EmailCampaign, String> {

    Optional<EmailCampaign> findById(String id);

    /** Campaigns for the admin list, newest first. */
    List<EmailCampaign> findAllByOrderByCreatedAtDesc();

    List<EmailCampaign> findByStatusOrderByCreatedAtDesc(String status);

    long countByStatus(String status);
}
