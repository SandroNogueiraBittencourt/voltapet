package com.voltapet.pet;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.voltapet.user.AppUser;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.HeadBucketRequest;
import software.amazon.awssdk.services.s3.model.HeadBucketResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.core.sync.RequestBody;

class PetPhotoServiceTest {
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
        when(repository.findById(id)).thenReturn(Optional.of(pet));
        when(repository.save(any(Pet.class))).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void refusesFileAboveLimit() {
        MockMultipartFile file = new MockMultipartFile("file", "large.jpg", "image/jpeg", new byte[5 * 1024 * 1024 + 1]);
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE,
            assertThrows(ResponseStatusException.class, () -> service.upload(id, author, file)).getStatusCode());
    }

    @Test
    void refusesFakeImage() {
        MockMultipartFile file = new MockMultipartFile("file", "fake.jpg", "image/jpeg", "not-an-image".getBytes());
        assertEquals(HttpStatus.BAD_REQUEST,
            assertThrows(ResponseStatusException.class, () -> service.upload(id, author, file)).getStatusCode());
    }

    @Test
    void forbidsUploadingForAnotherOwner() {
        AppUser visitor = mock(AppUser.class);
        when(visitor.getId()).thenReturn(UUID.randomUUID());
        MockMultipartFile file = new MockMultipartFile("file", "photo.png", "image/png", new byte[]{1});
        assertEquals(HttpStatus.FORBIDDEN,
            assertThrows(ResponseStatusException.class, () -> service.upload(id, visitor, file)).getStatusCode());
    }

    @Test
    void savesPrivateKeyForValidPhoto() throws Exception {
        BufferedImage image = new BufferedImage(20, 20, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        MockMultipartFile file = new MockMultipartFile("file", "luna.png", "image/png", output.toByteArray());
        when(storage.headBucket(any(HeadBucketRequest.class))).thenReturn(HeadBucketResponse.builder().build());

        Pet result = service.upload(id, author, file);
        assertEquals("pets/" + id + "/photo.jpg", result.getPhotoKey());
        verify(storage).putObject(any(PutObjectRequest.class), any(RequestBody.class));
        assertNotNull(PetController.PetResponse.from(result).photoUrl());
    }
}
