import { useState } from "react";

export function PetPhotoGallery({ pet }) {
  const images = pet.photoUrls?.length ? pet.photoUrls : pet.photoUrl ? [pet.photoUrl] : [];
  const [active, setActive] = useState(0);
  const current = images[Math.min(active, images.length - 1)];

  return (
    <section className="pet-photo-gallery" aria-label={`Fotos de ${pet.name}`}>
      <div className={`details-art photo-gallery-cover type-${pet.type.toLowerCase()}`}>
        {current ? (
          <img className="pet-photo-image" src={current} alt={`Foto ${Math.min(active, images.length - 1) + 1} de ${pet.name}`} />
        ) : (
          <span aria-hidden="true">{pet.type === "DOG" ? "🐕" : pet.type === "CAT" ? "🐈" : "🐾"}</span>
        )}
      </div>
      {images.length > 1 && (
        <div className="pet-photo-thumbnails" aria-label="Selecionar foto">
          {images.map((url, index) => (
            <button key={`${url}-${index}`} type="button" className={`pet-photo-thumbnail ${index === active ? "active" : ""}`}
              aria-label={`Ver foto ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)}>
              <img src={url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
