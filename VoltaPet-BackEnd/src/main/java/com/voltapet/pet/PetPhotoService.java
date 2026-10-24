package com.voltapet.pet;

import com.voltapet.user.AppUser;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Iterator;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import net.coobird.thumbnailator.Thumbnails;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CreateBucketRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.core.exception.SdkClientException;

@Service
public class PetPhotoService {
    private static final long MAX_UPLOAD_BYTES = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 12_000_000L;
    private final PetRepository repository;
    private final S3Client storage;
    private final String bucket;

    public PetPhotoService(PetRepository repository, S3Client storage,
                           @Value("${voltapet.storage.s3.bucket}") String bucket) {
        this.repository = repository;
        this.storage = storage;
        this.bucket = bucket;
    }

    @Transactional
    public Pet upload(UUID petId, AppUser user, MultipartFile photo) {
        Pet pet = findPet(petId);
        if (user == null || !pet.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o autor pode alterar a foto");
        }
        byte[] jpg = convertToSafeJpeg(photo);
        String key = "pets/" + petId + "/photo.jpg";
        try {
            ensureBucket();
            storage.putObject(PutObjectRequest.builder().bucket(bucket).key(key)
                    .contentType("image/jpeg").build(), RequestBody.fromBytes(jpg));
        } catch (S3Exception | SdkClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível armazenar a foto. Tente novamente.");
        }
        pet.setPhotoKey(key);
        return repository.save(pet);
    }

    /** Anexa 1 a 3 imagens novas sem sobrescrever as existentes. */
    @Transactional
    public Pet uploadMany(UUID petId, AppUser user, List<MultipartFile> files) {
        Pet pet = repository.findForPhotoUpload(petId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada"));
        if (user == null || !pet.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Apenas o autor pode adicionar fotos");
        }
        if (files == null || files.isEmpty() || files.size() > 3) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Envie de 1 a 3 fotos");
        }
        List<Integer> slots = new ArrayList<>();
        for (int index = 1; index <= 3; index++) {
            if (pet.getPhotoKey(index) == null) slots.add(index);
        }
        if (files.size() > slots.size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este animal já atingiu o limite de 3 fotos");
        }

        // Valida todas antes de iniciar gravações no MinIO.
        List<byte[]> images = new ArrayList<>();
        for (MultipartFile file : files) images.add(convertToSafeJpeg(file));
        List<String> uploadedKeys = new ArrayList<>();
        try {
            ensureBucket();
            for (int i = 0; i < images.size(); i++) {
                int position = slots.get(i);
                String key = "pets/" + petId + "/photo-" + position + "-" + UUID.randomUUID() + ".jpg";
                storage.putObject(PutObjectRequest.builder().bucket(bucket).key(key)
                    .contentType("image/jpeg").build(), RequestBody.fromBytes(images.get(i)));
                uploadedKeys.add(key);
            }
        } catch (S3Exception | SdkClientException ex) {
            // Compensa as imagens gravadas nesta tentativa quando algum envio falhar.
            for (String key : uploadedKeys) {
                try { storage.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build()); }
                catch (RuntimeException ignored) { /* limpeza poderá ser feita depois */ }
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "Não foi possível enviar todas as fotos. Tente novamente.");
        }
        for (int i = 0; i < uploadedKeys.size(); i++) {
            pet.setPhotoKey(slots.get(i), uploadedKeys.get(i));
        }
        return repository.save(pet);
    }

    @Transactional(readOnly = true)
    public byte[] getPhoto(UUID petId) { return getPhoto(petId, 1); }

    @Transactional(readOnly = true)
    public byte[] getPhoto(UUID petId, int position) {
        if (position < 1 || position > 3) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não disponível");
        }
        Pet pet = findPet(petId);
        String photoKey = pet.getPhotoKey(position);
        if (photoKey == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não disponível");
        }
        try {
            return storage.getObjectAsBytes(GetObjectRequest.builder()
                .bucket(bucket).key(photoKey).build()).asByteArray();
        } catch (S3Exception ex) {
            if (ex.statusCode() == 404) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Foto não disponível");
            }
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Foto temporariamente indisponível");
        } catch (SdkClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Foto temporariamente indisponível");
        }
    }

    private Pet findPet(UUID petId) {
        return repository.findById(petId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ocorrência não encontrada"));
    }

    private void ensureBucket() {
        try {
            storage.headBucket(HeadBucketRequest.builder().bucket(bucket).build());
        } catch (S3Exception ex) {
            if (ex.statusCode() != 404) throw ex;
            try {
                storage.createBucket(CreateBucketRequest.builder().bucket(bucket).build());
            } catch (S3Exception createError) {
                // Outra requisição pode ter criado o bucket simultaneamente.
                if (createError.statusCode() != 409) throw createError;
            }
        }
    }

    static byte[] convertToSafeJpeg(MultipartFile photo) {
        if (photo == null || photo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selecione uma foto JPEG ou PNG");
        }
        if (photo.getSize() > MAX_UPLOAD_BYTES) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "A foto deve ter no máximo 5 MB");
        }
        String contentType = photo.getContentType();
        if (!"image/jpeg".equals(contentType) && !"image/png".equals(contentType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Formato permitido: JPEG ou PNG");
        }
        try {
            byte[] bytes = photo.getBytes();
            if (bytes.length > MAX_UPLOAD_BYTES) {
                throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "A foto deve ter no máximo 5 MB");
            }
            // Confere o formato REAL e as dimensões antes de decodificar a imagem.
            try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw invalidImage();
                Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw invalidImage();
                ImageReader reader = readers.next();
                try {
                    reader.setInput(input, true, true);
                    String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                    if (!format.equals("jpeg") && !format.equals("jpg") && !format.equals("png")) throw invalidImage();
                    int width = reader.getWidth(0);
                    int height = reader.getHeight(0);
                    if (width < 1 || height < 1 || (long) width * height > MAX_PIXELS) throw invalidImage();
                } finally {
                    reader.dispose();
                }
            }
            BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(bytes));
            if (decoded == null) throw invalidImage();
            // Achatamento em branco e conversão para JPEG removem metadados/EXIF (incluindo GPS).
            BufferedImage flat = new BufferedImage(decoded.getWidth(), decoded.getHeight(), BufferedImage.TYPE_INT_RGB);
            Graphics2D graphics = flat.createGraphics();
            try {
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, flat.getWidth(), flat.getHeight());
                graphics.drawImage(decoded, 0, 0, null);
            } finally {
                graphics.dispose();
            }
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Thumbnails.of(flat).size(1400, 1400).outputFormat("jpg").outputQuality(0.82).toOutputStream(output);
            return output.toByteArray();
        } catch (IOException | IllegalArgumentException ex) {
            throw invalidImage();
        }
    }

    private static ResponseStatusException invalidImage() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Arquivo de imagem inválido ou muito grande");
    }
}
