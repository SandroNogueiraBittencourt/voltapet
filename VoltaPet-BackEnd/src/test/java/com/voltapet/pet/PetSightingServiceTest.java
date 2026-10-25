package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voltapet.user.AppUser;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

class PetSightingServiceTest {
    final PetRepository pets = mock(PetRepository.class);
    final PetSightingRepository sightings = mock(PetSightingRepository.class);
    final S3Client s3 = mock(S3Client.class);
    final PetSightingService service = new PetSightingService(pets, sightings, s3, "voltapet-images");
    final UUID petId = UUID.randomUUID();
    final AppUser owner = mock(AppUser.class);
    final AppUser visitor = mock(AppUser.class);
    Pet pet;

    @BeforeEach
    void setUp() {
        when(owner.getId()).thenReturn(UUID.randomUUID());
        when(visitor.getId()).thenReturn(UUID.randomUUID());
        pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Cachorra desaparecida", "Florianópolis", "Centro", null, null, owner);
        when(pets.findById(petId)).thenReturn(Optional.of(pet));
        when(sightings.saveAndFlush(any(PetSighting.class))).thenAnswer(call -> call.getArgument(0));
    }

    private PetSightingController.SightingRequest request(Instant seenAt) {
        return new PetSightingController.SightingRequest("88000000", "Rua das Flores", "10", null, seenAt, null, "Florianópolis", "Centro");
    }

    @Test
    void savesReportWithoutAttachmentsFromAuthenticatedUser() {
        PetSighting report = service.report(petId, visitor, request(Instant.now().minusSeconds(60)), List.of());
        assertEquals("Rua das Flores", report.getStreet());
        assertEquals("Florianópolis", report.getCity());
        assertEquals("Centro", report.getNeighborhood());
        verify(sightings).saveAndFlush(any(PetSighting.class));
        verify(s3, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void refusesSightingFromPetOwner() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.report(petId, owner, request(Instant.now().minusSeconds(60)), List.of()));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
        verify(sightings, never()).saveAndFlush(any(PetSighting.class));
        verify(s3, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void refusesReportWithoutAuthentication() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.report(petId, null, request(Instant.now()), List.of()));
        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
    }

    @Test
    void refusesFutureDate() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.report(petId, visitor, request(Instant.now().plusSeconds(3600)), List.of()));
        assertEquals(HttpStatus.BAD_REQUEST, error.getStatusCode());
        verify(sightings, never()).saveAndFlush(any(PetSighting.class));
    }

    @Test
    void refusesNonOwnerToReadAddress() {
        ResponseStatusException error = assertThrows(ResponseStatusException.class,
            () -> service.listForOwner(petId, visitor));
        assertEquals(HttpStatus.FORBIDDEN, error.getStatusCode());
    }

    @Test
    void permitsOwnerToReadReports() {
        when(sightings.findTop30ByPetIdOrderBySeenAtDesc(petId)).thenReturn(List.of());
        assertEquals(List.of(), service.listForOwner(petId, owner));
    }
}
