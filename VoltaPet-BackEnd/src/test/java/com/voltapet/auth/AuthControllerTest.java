package com.voltapet.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.voltapet.security.JwtService;
import com.voltapet.user.AppUser;
import com.voltapet.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class AuthControllerTest {
    @Mock UserRepository users;
    @Mock PasswordEncoder encoder;
    @Mock JwtService jwt;
    AuthController controller;

    @BeforeEach
    void setup() {
        MockitoAnnotations.openMocks(this);
        controller = new AuthController(users, encoder, jwt);
    }

    @Test
    void loginRejectsInvalidPassword() {
        AppUser user = new AppUser("Ana", "ana@example.com", "hash");
        when(users.findByEmail("ana@example.com")).thenReturn(Optional.of(user));
        when(encoder.matches("wrong", "hash")).thenReturn(false);
        var ex = assertThrows(ResponseStatusException.class,
            () -> controller.login(new AuthController.LoginRequest("ANA@example.com", "wrong")));
        assertEquals(HttpStatus.UNAUTHORIZED, ex.getStatusCode());
    }

    @Test
    void registerRejectsExistingEmail() {
        when(users.existsByEmail("ana@example.com")).thenReturn(true);
        var ex = assertThrows(ResponseStatusException.class,
            () -> controller.register(new AuthController.RegisterRequest("Ana", "ANA@EXAMPLE.COM", "pass123456")));
        assertEquals(HttpStatus.CONFLICT, ex.getStatusCode());
    }

    @Test
    void registerNormalizesEmail() {
        when(users.existsByEmail("ana@example.com")).thenReturn(false);
        when(encoder.encode("pass123456")).thenReturn("hash");
        when(users.saveAndFlush(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(jwt.createToken(any(AppUser.class))).thenReturn("jwt-test");
        var response = controller.register(new AuthController.RegisterRequest("Ana", " ANA@EXAMPLE.COM ", "pass123456"));
        assertEquals("jwt-test", response.token());
        assertEquals("Ana", response.user().name());
    }
}
