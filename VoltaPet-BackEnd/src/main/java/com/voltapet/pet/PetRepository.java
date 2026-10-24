package com.voltapet.pet;

import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PetRepository extends JpaRepository<Pet, UUID> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Pet p WHERE p.id = :id")
    Optional<Pet> findForPhotoUpload(@Param("id") UUID id);

    @Query("""
        SELECT p FROM Pet p
        WHERE (:status IS NULL OR p.status = :status)
          AND (:query IS NULL OR
               LOWER(p.name) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')) OR
               LOWER(p.city) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')) OR
               LOWER(p.neighborhood) LIKE LOWER(CONCAT('%', CAST(:query AS string), '%')))
        """)
    Page<Pet> search(@Param("status") PetStatus status,
                     @Param("query") String query, Pageable pageable);
}
