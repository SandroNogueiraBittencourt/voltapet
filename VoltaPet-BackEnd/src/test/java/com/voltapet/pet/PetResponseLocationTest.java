package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class PetResponseLocationTest {
    @Test
    void roundsCoordinatesBeforeExposingThemToPublic() {
        Pet pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Animal visto perto do parque.", "Florianópolis", "Centro",
            new BigDecimal("-27.596900"), new BigDecimal("-48.549500"), null);

        PetController.PetDetailResponse response = PetController.PetDetailResponse.from(pet);
        assertEquals(new BigDecimal("-27.60"), response.latitude());
        assertEquals(new BigDecimal("-48.55"), response.longitude());
    }

    @Test
    void keepsMissingCoordinatesNull() {
        Pet pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Animal visto perto do parque.", "Florianópolis", "Centro",
            null, null, null);

        PetController.PetDetailResponse response = PetController.PetDetailResponse.from(pet);
        assertNull(response.latitude());
        assertNull(response.longitude());
    }
}
