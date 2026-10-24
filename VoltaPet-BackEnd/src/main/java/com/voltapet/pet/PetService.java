package com.voltapet.pet;

import com.voltapet.pet.PetController.CreatePetRequest;
import com.voltapet.user.AppUser;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PetService {
    private final PetRepository repository;
    public PetService(PetRepository repository) { this.repository = repository; }

    @Transactional(readOnly = true)
    public Page<Pet> search(PetStatus status, String query, Pageable pageable) {
        String normalized = query == null || query.isBlank() ? null : query.trim();
        if (normalized != null && normalized.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Busca muito longa");
        }
        return repository.search(status, normalized, pageable);
    }

    @Transactional(readOnly = true)
    public Pet get(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada"));
    }

    @Transactional
    public Pet create(CreatePetRequest request, AppUser user) {
        if (request.status() == PetStatus.REUNITED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nova ocorrência deve estar ativa");
        }
        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe latitude e longitude juntas");
        }
        String animalLabel = request.otherAnimalType() == null ? null : request.otherAnimalType().trim();
        if (request.type() == PetType.OTHER && (animalLabel == null || animalLabel.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Especifique qual é o animal");
        }
        if (request.type() != PetType.OTHER && animalLabel != null && !animalLabel.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use a identificação adicional somente para Outro");
        }
        return repository.save(new Pet(request.name().trim(), request.type(), request.status(),
            request.description().trim(), request.city().trim(), request.neighborhood().trim(),
            request.latitude(), request.longitude(), user, request.type() == PetType.OTHER ? animalLabel : null));
    }

    @Transactional
    public Pet reunite(UUID id, AppUser user) {
        Pet pet = get(id);
        if (!pet.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas quem publicou pode concluir a ocorrência");
        }
        pet.reunite();
        return pet;
    }
}
