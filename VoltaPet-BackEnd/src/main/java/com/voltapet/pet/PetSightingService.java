package com.voltapet.pet;

import com.voltapet.user.AppUser;
import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Service
public class PetSightingService {
    private static final long MAX_VIDEO_BYTES = 20L * 1024L * 1024L;
    private static final int MAX_PHOTOS = 3;
    private final PetRepository pets;
    private final PetSightingRepository sightings;
    private final S3Client s3;
    private final String bucket;

    public PetSightingService(PetRepository pets, PetSightingRepository sightings, S3Client s3,
                              @Value("${voltapet.storage.s3.bucket}") String bucket) {
        this.pets = pets;
        this.sightings = sightings;
        this.s3 = s3;
        this.bucket = bucket;
    }

    record Prepared(String mime, byte[] bytes, boolean video) { }
    public record Media(String mimeType, byte[] bytes) { }

    @Transactional
    public PetSighting report(UUID petId, AppUser reporter, PetSightingController.SightingRequest request,
                              List<MultipartFile> files) {
        if (reporter == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Entre para relatar um avistamento");
        Pet pet = findPet(petId);
        if (pet.getOwner().getId().equals(reporter.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "O autor não pode registrar um avistamento da própria ocorrência");
        }
        if (pet.getStatus() != PetStatus.LOST) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Apenas pets desaparecidos aceitam avistamentos");
        }
        if (request.seenAt().isAfter(Instant.now().plusSeconds(300))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Data do avistamento não pode ser futura");
        }
        List<Prepared> processed = new ArrayList<>();
        int countPhotos = 0;
        int countVideos = 0;
        for (MultipartFile file : files == null ? List.<MultipartFile>of() : files) {
            if (file == null || file.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexo vazio");
            }
            String type = file.getContentType();
            if ("image/jpeg".equals(type) || "image/png".equals(type)) {
                if (++countPhotos > MAX_PHOTOS) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Máximo de 3 fotos");
                processed.add(new Prepared("image/jpeg", PetPhotoService.convertToSafeJpeg(file), false));
            } else if ("video/mp4".equals(type) || "video/webm".equals(type)) {
                if (++countVideos > 1) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Máximo de 1 vídeo");
                processed.add(new Prepared(type, validateVideo(file, type), true));
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Anexe apenas fotos JPG/PNG ou vídeo MP4/WebM");
            }
        }
        PetSighting sighting = new PetSighting(pet, reporter, request.postalCode().trim(),
            request.street().trim(), request.houseNumber().trim(), trimOrNull(request.addressDetails()),
            request.seenAt(), trimOrNull(request.description()),
            request.city().trim(), request.neighborhood().trim());

        // Storage S3 não participa da transação SQL: compensamos uploads mal-sucedidos.
        List<String> keys = new ArrayList<>();
        try {
            if (!processed.isEmpty()) ensureBucket();
            int photoSlot = 0;
            for (Prepared prepared : processed) {
                String key = "sightings/" + petId + "/" + UUID.randomUUID() +
                    (prepared.video() ? ("video/mp4".equals(prepared.mime()) ? ".mp4" : ".webm") : ".jpg");
                s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key)
                    .contentType(prepared.mime()).build(), RequestBody.fromBytes(prepared.bytes()));
                keys.add(key);
                if (prepared.video()) sighting.setVideo(key, prepared.mime());
                else sighting.setPhotoKey(++photoSlot, key);
            }
            return sightings.saveAndFlush(sighting);
        } catch (RuntimeException error) {
            for (String key : keys) {
                try { s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build()); }
                catch (RuntimeException ignored) { /* possível limpeza posterior */ }
            }
            if (error instanceof S3Exception || error instanceof SdkClientException) {
                throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Não foi possível gravar os anexos");
            }
            throw error;
        }
    }

    @Transactional(readOnly = true)
    public List<PetSightingController.SightingDetails> listForOwner(UUID petId, AppUser viewer) {
        requireOwner(petId, viewer);
        return sightings.findTop30ByPetIdOrderBySeenAtDesc(petId).stream().map(s -> {
            List<PetSightingController.Attachment> media = new ArrayList<>();
            for (int slot = 1; slot <= 3; slot++) {
                if (s.getPhotoKey(slot) != null) media.add(new PetSightingController.Attachment(slot,
                    "image/jpeg", mediaUrl(petId, s.getId(), slot)));
            }
            if (s.getVideoKey() != null) media.add(new PetSightingController.Attachment(4,
                s.getVideoMimeType(), mediaUrl(petId, s.getId(), 4)));
            return new PetSightingController.SightingDetails(s.getId(), s.getPostalCode(), s.getStreet(),
                s.getHouseNumber(), s.getAddressDetails(), s.getSeenAt(), s.getDescription(),
                s.getCreatedAt(), List.copyOf(media), s.getCity(), s.getNeighborhood());
        }).toList();
    }

    @Transactional(readOnly = true)
    public Media mediaForOwner(UUID petId, UUID sightingId, int slot, AppUser viewer) {
        requireOwner(petId, viewer);
        PetSighting report = sightings.findById(sightingId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Avistamento não encontrado"));
        if (!petId.equals(report.getPet().getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Avistamento não encontrado");
        }
        String key = slot == 4 ? report.getVideoKey() : report.getPhotoKey(slot);
        if (key == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mídia não encontrada");
        try {
            byte[] bytes = s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build()).asByteArray();
            return new Media(slot == 4 ? report.getVideoMimeType() : "image/jpeg", bytes);
        } catch (S3Exception ex) {
            throw new ResponseStatusException(ex.statusCode() == 404 ? HttpStatus.NOT_FOUND : HttpStatus.SERVICE_UNAVAILABLE,
                "Mídia indisponível");
        } catch (SdkClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Mídia indisponível");
        }
    }

    private static String mediaUrl(UUID petId, UUID sightingId, int slot) {
        return "/api/v1/pets/" + petId + "/sightings/" + sightingId + "/media/" + slot;
    }

    private Pet findPet(UUID petId) {
        return pets.findById(petId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada"));
    }

    private void requireOwner(UUID petId, AppUser viewer) {
        Pet pet = findPet(petId);
        if (viewer == null || !pet.getOwner().getId().equals(viewer.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o autor da ocorrência pode consultar os relatos");
        }
    }

    private void ensureBucket() {
        try {
            s3.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception ex) {
            if (ex.statusCode() != 404) throw ex;
            try { s3.createBucket(CreateBucketRequest.builder().bucket(bucket).build()); }
            catch (S3Exception create) { if (create.statusCode() != 409) throw create; }
        }
    }

    private static String trimOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    static byte[] validateVideo(MultipartFile file, String type) {
        if (file.getSize() < 12 || file.getSize() > MAX_VIDEO_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Vídeo deve ter até 20 MB e não pode estar vazio");
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length < 12 || bytes.length > MAX_VIDEO_BYTES) throw new IOException("Tamanho inválido");
            boolean mp4 = "video/mp4".equals(type) && bytes[4] == 'f' && bytes[5] == 't' && bytes[6] == 'y' && bytes[7] == 'p';
            boolean webm = "video/webm".equals(type) && (bytes[0] & 0xff) == 0x1a &&
                (bytes[1] & 0xff) == 0x45 && (bytes[2] & 0xff) == 0xdf && (bytes[3] & 0xff) == 0xa3;
            if (!mp4 && !webm) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Vídeo inválido");
            return bytes;
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Não foi possível ler o vídeo");
        }
    }
}
