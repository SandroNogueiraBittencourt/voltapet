package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;

import com.voltapet.user.AppUser;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

class PetPhotoBatchTest {
    PetRepository repository = mock(PetRepository.class);
    S3Client storage = mock(S3Client.class);
    PetPhotoService service = new PetPhotoService(repository, storage, "voltapet-images");
    UUID id = UUID.randomUUID();
    AppUser author = mock(AppUser.class);
    Pet pet;

    @BeforeEach
    void setup() {
        when(author.getId()).thenReturn(UUID.randomUUID());
        pet = new Pet("Luna", PetType.DOG, PetStatus.LOST,
            "Cachorra de porte médio", "Florianópolis", "Centro", null, null, author);
        ReflectionTestUtils.setField(pet, "id", id);
        when(repository.findForPhotoUpload(id)).thenReturn(Optional.of(pet));
        when(repository.save(any(Pet.class))).thenAnswer(call -> call.getArgument(0));
        when(storage.headBucket(any(HeadBucketRequest.class))).thenReturn(HeadBucketResponse.builder().build());
    }

    MockMultipartFile image(String filename) throws Exception {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB), "png", bytes);
        return new MockMultipartFile("files", filename, "image/png", bytes.toByteArray());
    }

    @Test
    void storesThreePhotosInSeparateSlots() throws Exception {
        Pet saved = service.uploadMany(id, author, List.of(image("1.png"), image("2.png"), image("3.png")));
        assertEquals(3, saved.getPhotoCount());
        verify(storage, times(3)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        assertEquals(3, PetController.PetDetailResponse.from(saved).photoUrls().size());
    }

    @Test
    void preservesOriginalPhotoAndAddsTwoMore() throws Exception {
        pet.setPhotoKey("pets/old/photo.jpg");
        Pet saved = service.uploadMany(id, author, List.of(image("2.png"), image("3.png")));
        assertEquals("pets/old/photo.jpg", saved.getPhotoKey());
        assertEquals(3, saved.getPhotoCount());
        assertEquals(3, PetController.PetResponse.from(saved).photoUrls().size());
    }

    @Test
    void refusesFourthImage() throws Exception {
        pet.setPhotoKey("old1.jpg");
        pet.setPhotoKey(2, "old2.jpg");
        pet.setPhotoKey(3, "old3.jpg");
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.uploadMany(id, author, List.of(image("4.png"))));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
        verify(storage, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void refusesOtherOwner() throws Exception {
        AppUser visitor = mock(AppUser.class);
        when(visitor.getId()).thenReturn(UUID.randomUUID());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.uploadMany(id, visitor, List.of(image("1.png"))));
        assertEquals(HttpStatus.FORBIDDEN, ex.getStatusCode());
        verify(storage, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void refusesInvalidBatchBeforeSendingAnyImage() throws Exception {
        MockMultipartFile fake = new MockMultipartFile("files", "fake.png", "image/png", "abc".getBytes());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
            () -> service.uploadMany(id, author, List.of(image("ok.png"), fake)));
        assertEquals(HttpStatus.BAD_REQUEST, ex.getStatusCode());
        verify(storage, never()).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }
}
