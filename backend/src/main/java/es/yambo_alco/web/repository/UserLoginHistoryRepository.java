package es.yambo_alco.web.repository;

import es.yambo_alco.web.model.UserLoginHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface UserLoginHistoryRepository extends JpaRepository<UserLoginHistory, UUID> {

    @Query("SELECT CAST(u.loggedInAt AS date) AS loginDate, COUNT(DISTINCT u.userId) " +
           "FROM UserLoginHistory u " +
           "WHERE u.loggedInAt BETWEEN :start AND :end " +
           "GROUP BY CAST(u.loggedInAt AS date) " +
           "ORDER BY CAST(u.loggedInAt AS date)")
    List<Object[]> countActiveUsersByDay(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(DISTINCT u.userId) FROM UserLoginHistory u " +
           "WHERE u.loggedInAt BETWEEN :start AND :end")
    long countDistinctUsersBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(u) FROM UserLoginHistory u " +
           "WHERE u.loggedInAt BETWEEN :start AND :end")
    long countLoginsBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
