package com.voltapet.pet;

import com.voltapet.user.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/pets")
public class PetController {
    private final PetService service;
    public PetController(PetService service) { this.service = service; }

    public record CreatePetRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull PetType type,
        @NotNull PetStatus status,
        @NotBlank @Size(min = 10, max = 2000) String description,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String neighborhood,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude) { }

    public record PetResponse(UUID id, String name, PetType type, PetStatus status,
                              String description, String city, String neighborhood, Instant createdAt) {
        static PetResponse from(Pet pet) {
            return new PetResponse(pet.getId(), pet.getName(), pet.getType(),
                pet.getStatus(), pet.getDescription(), pet.getCity(), pet.getNeighborhood(), pet.getCreatedAt());
        }
    }

    @GetMapping
    public Page<PetResponse> list(@RequestParam(required = false) PetStatus status,
                                  @RequestParam(required = false) String query,
                                  @RequestParam(defaultValue = "0") int page,
                                  @RequestParam(defaultValue = "12") int size) {
        if (page < 0 || size < 1 || size > 50) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paginação inválida");
        }
        return service.search(status, query, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))
            .map(PetResponse::from);
    }

    @GetMapping("/{id}")
    public PetResponse get(@PathVariable UUID id) { return PetResponse.from(service.get(id)); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PetResponse create(@Valid @RequestBody CreatePetRequest request,
                              @AuthenticationPrincipal AppUser user) {
        return PetResponse.from(service.create(request, user));
    }

    @PostMapping("/{id}/reunite")
    public PetResponse reunite(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return PetResponse.from(service.reunite(id, user));
    }
}
