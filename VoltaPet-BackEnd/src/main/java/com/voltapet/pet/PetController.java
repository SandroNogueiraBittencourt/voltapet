package com.voltapet.pet;

import com.voltapet.user.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.UUID;
import java.util.List;
import java.util.ArrayList;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;
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
    private final PetPhotoService photos;
    public PetController(PetService service, PetPhotoService photos) {
        this.service = service;
        this.photos = photos;
    }

    public record CreatePetRequest(
        @NotBlank @Size(max = 100) String name,
        @NotNull PetType type,
        @NotNull PetStatus status,
        @NotBlank @Size(min = 10, max = 2000) String description,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String neighborhood,
        @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
        @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
        @Size(max = 100) String otherAnimalType) {
        // Mantém compatibilidade dos testes/chamadas Java que usam oito argumentos.
        public CreatePetRequest(String name, PetType type, PetStatus status, String description,
                                String city, String neighborhood, BigDecimal latitude, BigDecimal longitude) {
            this(name, type, status, description, city, neighborhood, latitude, longitude, null);
        }
    }

    public record PetResponse(UUID id, String name, PetType type, PetStatus status,
                              String description, String city, String neighborhood, Instant createdAt,
                              String photoUrl, List<String> photoUrls, String otherAnimalType) {
        static PetResponse from(Pet pet) {
            return new PetResponse(pet.getId(), pet.getName(), pet.getType(),
		pet.getStatus(), pet.getDescription(), pet.getCity(),
		pet.getNeighborhood(), pet.getCreatedAt(),
		PetController.photoUrl(pet), PetController.photoUrls(pet), pet.getOtherAnimalType());
	}
    }

    // A listagem mantém os dados anteriores; só a página de detalhes revela a região aproximada.
    public record PetDetailResponse(UUID id, String name, PetType type, PetStatus status,
                                    String description, String city, String neighborhood, Instant createdAt,
                                    BigDecimal latitude, BigDecimal longitude, String photoUrl, List<String> photoUrls, String otherAnimalType, boolean isOwner) {
        static PetDetailResponse from(Pet pet) { return from(pet, null); }
        static PetDetailResponse from(Pet pet, AppUser viewer) {
            return new PetDetailResponse(pet.getId(), pet.getName(), pet.getType(), pet.getStatus(),
                pet.getDescription(), pet.getCity(), pet.getNeighborhood(), pet.getCreatedAt(),
                approximate(pet.getLatitude()), approximate(pet.getLongitude()),  PetController.photoUrl(pet), PetController.photoUrls(pet), pet.getOtherAnimalType(),
                viewer != null && pet.getOwner().getId().equals(viewer.getId()));
        }
        private static BigDecimal approximate(BigDecimal value) {
            return value == null ? null : value.setScale(2, RoundingMode.HALF_UP);
        }
    }

    private static String photoUrl(Pet pet) {
        return pet.getPhotoKey() == null ? null : "/api/v1/pets/" + pet.getId() + "/photo";
    }

    private static List<String> photoUrls(Pet pet) {
        List<String> urls = new ArrayList<>(3);
        for (int slot = 1; slot <= 3; slot++) {
            if (pet.getPhotoKey(slot) != null) {
                urls.add("/api/v1/pets/" + pet.getId() + "/photos/" + slot);
            }
        }
        return List.copyOf(urls);
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
    public PetDetailResponse get(@PathVariable UUID id, @AuthenticationPrincipal AppUser viewer) {
        return PetDetailResponse.from(service.get(id), viewer);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PetResponse create(@Valid @RequestBody CreatePetRequest request,
                              @AuthenticationPrincipal AppUser user) {
        return PetResponse.from(service.create(request, user));
    }

    @PostMapping(value = "/{id}/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PetDetailResponse uploadPhoto(@PathVariable UUID id,
                                          @RequestPart("file") MultipartFile file,
                                          @AuthenticationPrincipal AppUser user) {
        return PetDetailResponse.from(photos.upload(id, user, file));
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PetDetailResponse uploadPhotos(@PathVariable UUID id,
                                          @RequestPart("files") List<MultipartFile> files,
                                          @AuthenticationPrincipal AppUser user) {
        return PetDetailResponse.from(photos.uploadMany(id, user, files));
    }

    @GetMapping(value = "/{id}/photos/{position}", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getPhotoAt(@PathVariable UUID id, @PathVariable int position) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.IMAGE_JPEG)
            .body(photos.getPhoto(id, position));
    }

    @GetMapping(value = "/{id}/photo", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<byte[]> getPhoto(@PathVariable UUID id) {
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .contentType(MediaType.IMAGE_JPEG)
            .body(photos.getPhoto(id));
    }

    @PostMapping("/{id}/reunite")
    public PetResponse reunite(@PathVariable UUID id, @AuthenticationPrincipal AppUser user) {
        return PetResponse.from(service.reunite(id, user));
    }
}
