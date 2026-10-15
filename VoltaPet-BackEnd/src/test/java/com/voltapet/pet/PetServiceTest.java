package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voltapet.pet.PetController.CreatePetRequest;
import com.voltapet.user.AppUser;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PetServiceTest {
    @Mock PetRepository repo;
    PetService service;
    AppUser owner;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        service = new PetService(repo);
        owner = new AppUser("Ana", "ana@example.com", "encoded");
    }

    @Test
    void preventsCreatingAlreadyReunitedReport() {
        var req = new CreatePetRequest("Luna", PetType.DOG, PetStatus.REUNITED,
            "Cachorra de porte pequeno", "Florianópolis", "Centro", null, null);
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.create(req, owner));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
    }

    @Test
    void createsValidLostReport() {
        var req = new CreatePetRequest("Luna", PetType.DOG, PetStatus.LOST,
            "Cachorra de porte pequeno", "Florianópolis", "Centro", null, null);
        when(repo.save(any(Pet.class))).thenAnswer(inv -> inv.getArgument(0));
        Pet saved = service.create(req, owner);
        assertEquals(PetStatus.LOST, saved.getStatus());
        verify(repo).save(any(Pet.class));
    }

    @Test
    void onlyOwnerCanMarkPetReunited() {
        var id = UUID.randomUUID();
        AppUser author = mock(AppUser.class);
        AppUser other = mock(AppUser.class);
        when(author.getId()).thenReturn(UUID.randomUUID());
        when(other.getId()).thenReturn(UUID.randomUUID());
        Pet pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Cachorra de porte pequeno", "Florianópolis", "Centro", null, null, author);
        when(repo.findById(id)).thenReturn(Optional.of(pet));
        assertEquals(HttpStatus.FORBIDDEN,
            assertThrows(ResponseStatusException.class,
                () -> service.reunite(id, other)).getStatusCode());
        assertEquals(PetStatus.LOST, pet.getStatus());
        service.reunite(id, author);
        assertEquals(PetStatus.REUNITED, pet.getStatus());
    }

    @Test
    void missingPetReturns404() {
        UUID unknown = UUID.randomUUID();
        when(repo.findById(unknown)).thenReturn(Optional.empty());
        assertEquals(HttpStatus.NOT_FOUND,
            assertThrows(ResponseStatusException.class, () -> service.get(unknown)).getStatusCode());
    }
}
