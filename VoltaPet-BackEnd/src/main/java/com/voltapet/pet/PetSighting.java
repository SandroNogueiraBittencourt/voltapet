package com.voltapet.pet;

import com.voltapet.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pet_sightings")
public class PetSighting {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "pet_id", nullable = false)
    private Pet pet;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reporter_id", nullable = false)
    private AppUser reporter;

    @Column(name = "postal_code", nullable = false, length = 9)
    private String postalCode;
    @Column(nullable = false, length = 150)
    private String street;
    // Nulos apenas para registros anteriores à migração V6.
    @Column(name = "city", length = 100)
    private String city;
    @Column(name = "neighborhood", length = 100)
    private String neighborhood;
    @Column(name = "house_number", nullable = false, length = 20)
    private String houseNumber;
    @Column(name = "address_details", length = 200)
    private String addressDetails;
    @Column(name = "seen_at", nullable = false)
    private Instant seenAt;
    @Column(length = 1000)
    private String description;
    @Column(name = "photo_key_1", length = 255)
    private String photoKey1;
    @Column(name = "photo_key_2", length = 255)
    private String photoKey2;
    @Column(name = "photo_key_3", length = 255)
    private String photoKey3;
    @Column(name = "video_key", length = 255)
    private String videoKey;
    @Column(name = "video_mime_type", length = 30)
    private String videoMimeType;
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PetSighting() { }

    public PetSighting(Pet pet, AppUser reporter, String postalCode, String street,
                       String houseNumber, String addressDetails, Instant seenAt, String description,
                       String city, String neighborhood) {
        this.pet = pet;
        this.reporter = reporter;
        this.postalCode = postalCode;
        this.street = street;
        this.houseNumber = houseNumber;
        this.city = city;
        this.neighborhood = neighborhood;
        this.addressDetails = addressDetails;
        this.seenAt = seenAt;
        this.description = description;
    }

    @PrePersist void onCreate() { if (createdAt == null) createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public Pet getPet() { return pet; }
    public AppUser getReporter() { return reporter; }
    public String getPostalCode() { return postalCode; }
    public String getStreet() { return street; }
    public String getHouseNumber() { return houseNumber; }
    public String getCity() { return city; }
    public String getNeighborhood() { return neighborhood; }
    public String getAddressDetails() { return addressDetails; }
    public Instant getSeenAt() { return seenAt; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
    public void setPhotoKey(int slot, String key) {
        switch (slot) {
            case 1 -> photoKey1 = key;
            case 2 -> photoKey2 = key;
            case 3 -> photoKey3 = key;
            default -> throw new IllegalArgumentException("Foto inválida");
        }
    }
    public String getPhotoKey(int slot) {
        return switch (slot) {
            case 1 -> photoKey1;
            case 2 -> photoKey2;
            case 3 -> photoKey3;
            default -> null;
        };
    }
    public String getVideoKey() { return videoKey; }
    public String getVideoMimeType() { return videoMimeType; }
    public void setVideo(String key, String mimeType) { videoKey = key; videoMimeType = mimeType; }
}
