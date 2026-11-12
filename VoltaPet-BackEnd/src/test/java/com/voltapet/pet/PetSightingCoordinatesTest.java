package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.voltapet.user.AppUser;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.services.s3.S3Client;

class PetSightingCoordinatesTest {
    @Test
    void salvaCoordenadasConfirmadasNoMapa() {
        UUID petId = UUID.randomUUID();
        AppUser owner = mock(AppUser.class);
        AppUser reporter = mock(AppUser.class);
        when(owner.getId()).thenReturn(UUID.randomUUID());
        when(reporter.getId()).thenReturn(UUID.randomUUID());

        Pet pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Pet desaparecido", "Florianópolis", "Centro", null, null, owner);
        ReflectionTestUtils.setField(pet, "id", petId);
        PetRepository pets = mock(PetRepository.class);
        PetSightingRepository sightings = mock(PetSightingRepository.class);
        S3Client s3 = mock(S3Client.class);
        when(pets.findById(petId)).thenReturn(Optional.of(pet));
        when(sightings.saveAndFlush(any(PetSighting.class))).thenAnswer(inv -> inv.getArgument(0));

        var request = new PetSightingController.SightingRequest(
            "88000-000", "Rua Teste", "42", null,
            Instant.now().minusSeconds(3600), null, "Florianópolis", "Centro",
            new BigDecimal("-27.596900"), new BigDecimal("-48.549100"));

        var service = new PetSightingService(pets, sightings, s3, "voltapet-images");
        PetSighting report = service.report(petId, reporter, request, List.of());
        assertEquals(request.latitude(), report.getLatitude());
        assertEquals(request.longitude(), report.getLongitude());
        verify(sightings).saveAndFlush(any(PetSighting.class));
        verifyNoInteractions(s3);
    }
}
