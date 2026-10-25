package com.voltapet.pet;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PetSightingRepository extends JpaRepository<PetSighting, UUID> {
    List<PetSighting> findTop30ByPetIdOrderBySeenAtDesc(UUID petId);
}
