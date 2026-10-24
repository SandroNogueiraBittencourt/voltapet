package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.voltapet.pet.PetController.CreatePetRequest;
import com.voltapet.user.AppUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

class PetOtherAnimalTypeTest {
    private PetService service;
    private AppUser author;

    @BeforeEach
    void setup() {
        PetRepository repo = mock(PetRepository.class);
        when(repo.save(any(Pet.class))).thenAnswer(inv -> inv.getArgument(0));
        service = new PetService(repo);
        author = new AppUser("Ana", "ana@example.com", "encoded");
    }

    private CreatePetRequest request(PetType type, String label) {
        return new CreatePetRequest("Bichinho", type, PetStatus.LOST,
            "Animal visto perto da praça.", "Florianópolis", "Centro", null, null, label);
    }

    @Test
    void storesNameForOtherType() {
        Pet pet = service.create(request(PetType.OTHER, "  Tartaruga "), author);
        assertEquals("Tartaruga", pet.getOtherAnimalType());
        assertEquals("Tartaruga", PetController.PetResponse.from(pet).otherAnimalType());
        assertEquals("Tartaruga", PetController.PetDetailResponse.from(pet).otherAnimalType());
    }

    @Test
    void requiresNameForOtherType() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
            () -> service.create(request(PetType.OTHER, "   "), author)).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
            () -> service.create(request(PetType.OTHER, null), author)).getStatusCode());
    }

    @Test
    void rejectsCustomNameForDog() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
            () -> service.create(request(PetType.DOG, "Tartaruga"), author)).getStatusCode());
    }

    @Test
    void acceptsDogWithoutName() {
        Pet pet = service.create(request(PetType.DOG, null), author);
        assertNull(pet.getOtherAnimalType());
    }
}
