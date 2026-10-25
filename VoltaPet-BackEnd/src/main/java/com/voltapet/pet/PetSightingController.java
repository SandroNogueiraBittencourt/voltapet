package com.voltapet.pet;

import com.voltapet.user.AppUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1/pets/{petId}/sightings")
public class PetSightingController {
    private final PetSightingService sightings;

    public PetSightingController(PetSightingService sightings) { this.sightings = sightings; }

    public record SightingRequest(
        @NotBlank @Pattern(regexp = "^[0-9]{5}-?[0-9]{3}$") String postalCode,
        @NotBlank @Size(max = 150) String street,
        @NotBlank @Size(max = 20) String houseNumber,
        @Size(max = 200) String addressDetails,
        @NotNull Instant seenAt,
        @Size(max = 1000) String description,
        @NotBlank @Size(max = 100) String city,
        @NotBlank @Size(max = 100) String neighborhood
    ) { }

    public record Receipt(UUID id, String message) { }
    public record Attachment(int slot, String mimeType, String url) { }
    public record SightingDetails(UUID id, String postalCode, String street, String houseNumber,
                                  String addressDetails, Instant seenAt, String description,
                                  Instant createdAt, List<Attachment> attachments,
                                  String city, String neighborhood) { }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Receipt report(@PathVariable UUID petId,
                          @Valid @RequestPart("data") SightingRequest data,
                          @RequestPart(value = "files", required = false) List<MultipartFile> files,
                          @AuthenticationPrincipal AppUser reporter) {
        PetSighting report = sightings.report(petId, reporter, data, files);
        return new Receipt(report.getId(), "Avistamento enviado com sucesso");
    }

    // Endereços completos e evidências são privados, somente o autor do pet tem acesso.
    @GetMapping
    public List<SightingDetails> list(@PathVariable UUID petId,
                                      @AuthenticationPrincipal AppUser viewer) {
        return sightings.listForOwner(petId, viewer);
    }

    @GetMapping("/{sightingId}/media/{slot}")
    public ResponseEntity<byte[]> media(@PathVariable UUID petId, @PathVariable UUID sightingId,
                                         @PathVariable int slot,
                                         @AuthenticationPrincipal AppUser viewer) {
        PetSightingService.Media media = sightings.mediaForOwner(petId, sightingId, slot, viewer);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .contentType(MediaType.parseMediaType(media.mimeType())).body(media.bytes());
    }
}
