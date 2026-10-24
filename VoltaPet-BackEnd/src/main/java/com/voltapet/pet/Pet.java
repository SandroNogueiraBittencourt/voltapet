package com.voltapet.pet;

import com.voltapet.user.AppUser;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "pet_reports")
public class Pet {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(length = 100, nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_type", nullable = false, length = 20)
    private PetType type;

    @Column(name = "other_animal_type", length = 100)
    private String otherAnimalType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PetStatus status;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 100)
    private String neighborhood;

    @Column(precision = 9, scale = 6)
    private BigDecimal latitude;

    @Column(precision = 9, scale = 6)
    private BigDecimal longitude;

    @Column(name = "photo_key", length = 255)
    private String photoKey;

    @Column(name = "photo_key_2", length = 255)
    private String photoKey2;

    @Column(name = "photo_key_3", length = 255)
    private String photoKey3;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private AppUser owner;

    protected Pet() { }

    public Pet(String name, PetType type, PetStatus status, String description,
               String city, String neighborhood, BigDecimal latitude, BigDecimal longitude, AppUser owner) {
        this(name, type, status, description, city, neighborhood, latitude, longitude, owner, null);
    }

    public Pet(String name, PetType type, PetStatus status, String description,
               String city, String neighborhood, BigDecimal latitude, BigDecimal longitude,
               AppUser owner, String otherAnimalType) {
        this.otherAnimalType = otherAnimalType;
        this.name = name;
        this.type = type;
        this.status = status;
        this.description = description;
        this.city = city;
        this.neighborhood = neighborhood;
        this.latitude = latitude;
        this.longitude = longitude;
        this.owner = owner;
    }

    @PrePersist
    void onCreate() { this.createdAt = Instant.now(); }

    public UUID getId() { return id; }
    public String getName() { return name; }
    public PetType getType() { return type; }
    public String getOtherAnimalType() { return otherAnimalType; }
    public PetStatus getStatus() { return status; }
    public String getDescription() { return description; }
    public String getCity() { return city; }
    public String getNeighborhood() { return neighborhood; }
    public BigDecimal getLatitude() { return latitude; }
    public BigDecimal getLongitude() { return longitude; }
    public Instant getCreatedAt() { return createdAt; }
    public String getPhotoKey() { return photoKey; }
    public void setPhotoKey(String photoKey) { this.photoKey = photoKey; }
    public String getPhotoKey2() { return photoKey2; }
    public String getPhotoKey3() { return photoKey3; }
    public String getPhotoKey(int position) {
        return switch (position) {
            case 1 -> photoKey;
            case 2 -> photoKey2;
            case 3 -> photoKey3;
            default -> null;
        };
    }
    public void setPhotoKey(int position, String key) {
        switch (position) {
            case 1 -> photoKey = key;
            case 2 -> photoKey2 = key;
            case 3 -> photoKey3 = key;
            default -> throw new IllegalArgumentException("Posição deve estar entre 1 e 3");
        }
    }
    public int getPhotoCount() {
        int count = 0;
        for (int index = 1; index <= 3; index++) if (getPhotoKey(index) != null) count++;
        return count;
    }
    public AppUser getOwner() { return owner; }
    public void reunite() { this.status = PetStatus.REUNITED; }
}
